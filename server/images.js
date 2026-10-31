import { randomUUID } from 'crypto';
import OpenAI from 'openai';
import { supabase } from './supabase.js';
import { generateImage as perchanceGenerate } from './perchance.js';
import { providerConfig } from './models.js';

// =====================================================================
// НАСТРОЙКИ
// IMAGE_PROVIDERS на Render (необязательно): порядок провайдеров через запятую.
// По умолчанию: pollinations (основной), perchance (резерв).
// Можно добавить teamo (gpt-image-2): IMAGE_PROVIDERS=pollinations,teamo,perchance
// =====================================================================
const BUCKET = 'images';
const JOB_TTL_MS = 30 * 60 * 1000;
const MAX_ACTIVE_JOBS = 3;
const MAX_PROMPT_LEN = 900;

const jobs = new Map();

// ---------- вспомогательные функции ----------
function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label}: превышено время ожидания (${Math.round(ms / 1000)} с)`)),
      ms
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function sniffMime(buf) {
  if (!buf || buf.length < 12) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (buf.toString('ascii', 0, 3) === 'GIF') return 'image/gif';
  return null;
}

async function fetchBuffer(url, { timeoutMs }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) {
      const body = (await res.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 200);
      throw new Error(`HTTP ${res.status} ${body}`.trim());
    }
    return Buffer.from(await res.arrayBuffer());
  } catch (err) {
    if (err?.name === 'AbortError') throw new Error(`превышено время ожидания (${Math.round(timeoutMs / 1000)} с)`);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// Превращает ссылку (http / data:) в картинку; blob: с сервера скачать нельзя
async function sourceToImage(src, timeoutMs = 30000) {
  let buffer;
  if (!src) throw new Error('пустая ссылка на изображение');
  if (src.startsWith('data:')) {
    const comma = src.indexOf(',');
    if (comma === -1) throw new Error('битая data-ссылка');
    buffer = Buffer.from(src.slice(comma + 1), 'base64');
  } else if (/^https?:/i.test(src)) {
    buffer = await fetchBuffer(src, { timeoutMs });
  } else {
    throw new Error(`ссылку вида "${src.slice(0, 20)}…" нельзя скачать с сервера`);
  }
  const mime = sniffMime(buffer);
  if (!mime) throw new Error('получен не файл изображения');
  return { buffer, mime };
}

// ---------- Supabase Storage ----------
let bucketReady = null;
function ensureBucket() {
  if (!bucketReady) {
    bucketReady = (async () => {
      const { data } = await supabase.storage.getBucket(BUCKET);
      if (data) return true;
      const { error } = await supabase.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: 10 * 1024 * 1024,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
      });
      if (error && !/already exists/i.test(error.message)) throw error;
      return true;
    })().catch((err) => {
      bucketReady = null; // попробуем ещё раз при следующем запросе
      throw err;
    });
  }
  return bucketReady;
}

async function saveToStorage(buffer, mime) {
  await ensureBucket();
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : mime.includes('gif') ? 'gif' : 'jpg';
  const path = `generated/${new Date().toISOString().slice(0, 10)}/${randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType: mime, upsert: false });
  if (error) throw new Error('не удалось сохранить файл в Storage: ' + error.message);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// ---------- ПРОВАЙДЕРЫ ИЗОБРАЖЕНИЙ ----------
// Perchance запускает целый браузер, поэтому выполняется строго по одному
let perchanceChain = Promise.resolve();
function runSerial(fn) {
  const task = perchanceChain.then(fn, fn);
  perchanceChain = task.catch(() => {});
  return task;
}

const IMAGE_PROVIDERS = {
  pollinations: {
    label: 'Pollinations',
    timeoutMs: 60000,
    async run(prompt, opts) {
      const seed = Math.floor(Math.random() * 1e9);
      const w = opts.width || 768;
      const h = opts.height || 1024;
      const url =
        `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
        `?width=${w}&height=${h}&seed=${seed}&nologo=true&model=flux`;
      const buffer = await fetchBuffer(url, { timeoutMs: 55000 });
      const mime = sniffMime(buffer);
      // Иногда сервис отвечает текстом об ошибке вместо картинки
      if (!mime) throw new Error('вернул не изображение: ' + buffer.toString('utf8', 0, 150).replace(/\s+/g, ' '));
      return { buffer, mime };
    },
  },

  perchance: {
    label: 'Perchance (резерв)',
    timeoutMs: 100000,
    run(prompt) {
      return runSerial(async () => {
        const r = await perchanceGenerate(prompt);
        if (!r || !r.success) throw new Error((r && r.error) || 'неизвестная ошибка');
        return sourceToImage(r.imageUrl);
      });
    },
  },

  teamo: {
    label: 'Teamorouter (gpt-image-2)',
    timeoutMs: 90000,
    async run(prompt) {
      const cfg = providerConfig('Teamorouter');
      const apiKey = cfg && process.env[cfg.keyEnv];
      if (!apiKey) throw new Error('не задан TEAMO_API_KEY');
      const client = new OpenAI({ baseURL: cfg.baseUrl, apiKey, timeout: 85000, maxRetries: 0 });
      const r = await client.images.generate({ model: 'gpt-image-2', prompt, size: '1024x1024' });
      const item = r.data && r.data[0];
      if (item && item.b64_json) return sourceToImage('data:image/png;base64,' + item.b64_json);
      if (item && item.url) return sourceToImage(item.url);
      throw new Error('ответ без изображения');
    },
  },
};

function providerChain() {
  const names = (process.env.IMAGE_PROVIDERS || 'pollinations,perchance')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => IMAGE_PROVIDERS[s]);
  return names.length ? names : ['pollinations', 'perchance'];
}

// ---------- ЗАДАНИЯ ----------
function activeCount() {
  let n = 0;
  for (const j of jobs.values()) if (j.status === 'queued' || j.status === 'running') n++;
  return n;
}

async function runJob(job, prompt, opts) {
  job.status = 'running';
  job.updatedAt = Date.now();

  let image = null;
  for (const name of providerChain()) {
    const provider = IMAGE_PROVIDERS[name];
    job.stage = provider.label;
    job.updatedAt = Date.now();
    const started = Date.now();
    try {
      image = await withTimeout(provider.run(prompt, opts), provider.timeoutMs, provider.label);
      job.attempts.push({ provider: name, ok: true, ms: Date.now() - started });
      job.provider = name;
      break;
    } catch (err) {
      const message = String(err?.message || err).slice(0, 300);
      job.attempts.push({ provider: name, ok: false, ms: Date.now() - started, error: message });
      console.error(`Изображение: ${name} не сработал:`, message);
    }
  }

  if (!image) {
    job.status = 'failed';
    job.error = 'Ни один провайдер изображений не вернул результат';
    job.updatedAt = Date.now();
    return;
  }

  try {
    job.stage = 'Сохраняю изображение';
    job.imageUrl = await saveToStorage(image.buffer, image.mime);
    job.status = 'done';
  } catch (err) {
    job.status = 'failed';
    job.error = String(err?.message || err);
    console.error('Изображение: ошибка сохранения:', job.error);
  }
  job.updatedAt = Date.now();
}

function publicJob(job) {
  return {
    jobId: job.id,
    status: job.status,
    stage: job.stage,
    imageUrl: job.imageUrl,
    provider: job.provider,
    error: job.error,
    attempts: job.attempts,
    elapsedMs: Date.now() - job.createdAt,
  };
}

function clampSize(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(1536, Math.max(256, Math.round(n)));
}

export function registerImageRoutes(app) {
  // Запуск: сервер сразу отвечает, а картинка делается в фоне
  app.post('/api/generate-image', (req, res) => {
    const prompt = String(req.body?.prompt || '').trim();
    if (!prompt) return res.status(400).json({ success: false, error: 'Промпт не указан' });
    if (activeCount() >= MAX_ACTIVE_JOBS) {
      return res.status(429).json({ success: false, error: 'Сейчас уже идёт несколько генераций, подождите минуту' });
    }

    const job = {
      id: randomUUID(),
      status: 'queued',
      stage: '',
      attempts: [],
      imageUrl: null,
      provider: null,
      error: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    jobs.set(job.id, job);

    const opts = { width: clampSize(req.body?.width), height: clampSize(req.body?.height) };
    runJob(job, prompt.slice(0, MAX_PROMPT_LEN), opts).catch((err) => {
      job.status = 'failed';
      job.error = String(err?.message || err);
      job.updatedAt = Date.now();
    });

    res.status(202).json({ success: true, jobId: job.id });
  });

  // Опрос статуса
  app.get('/api/generate-image/:id', (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job) return res.status(404).json({ error: 'Задача не найдена (возможно, сервер перезапускался)' });
    res.json(publicJob(job));
  });

  // Старые задания удаляем из памяти
  setInterval(() => {
    const now = Date.now();
    for (const [id, job] of jobs) if (now - job.createdAt > JOB_TTL_MS) jobs.delete(id);
  }, 5 * 60 * 1000).unref();
}

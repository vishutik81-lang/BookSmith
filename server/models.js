import OpenAI from 'openai';

// =====================================================================
// ПРОВАЙДЕРЫ: адрес API и имя переменной окружения с ключом (на Render)
// =====================================================================
const PROVIDERS = {
  OpenRouter:   { baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1', keyEnv: 'OPENROUTER_API_KEY' },
  AllTokens:    { baseUrl: 'https://api.alltokens.ru/api/v1',  keyEnv: 'ALLTOKENS_API_KEY' },
  CloudCompute: { baseUrl: 'https://app.cloudcompute.ru/api/v1', keyEnv: 'CLOUDCOMPUTE_API_KEY' },
  Teamorouter:  { baseUrl: 'https://api.teamorouter.ru/v1',    keyEnv: 'TEAMO_API_KEY' },
  OrcaRout:     { baseUrl: 'https://api.orcarouter.ai/v1',     keyEnv: 'ORCAROUT_API_KEY' },
};

export function providerConfig(name) {
  return PROVIDERS[name] || null;
}

// =====================================================================
// РЕЕСТР МОДЕЛЕЙ
// key  — уникальный идентификатор записи в списке (провайдер + id модели)
// id   — то, что отправляется в API провайдера как "model"
// kind — text | image | music | audio (в выпадающий список текста идут только text)
// Ничего не удалено: нерабочие модели просто помечаются после проверки.
// =====================================================================
function m(provider, id, name, extra = {}) {
  const variant = extra.variant || '';
  return {
    key: `${provider}::${id}${variant ? '@' + variant : ''}`,
    id,
    name,
    provider,
    kind: 'text',
    ...extra,
  };
}

export const AVAILABLE_MODELS = [
  // OpenRouter
  m('OpenRouter', 'liquid/lfm-2.5-2.6b:free', 'Liquid LFM 2.5 (2.6B)'),
  m('OpenRouter', 'thinkingmachines/inkling-small:free', 'Inkling Small'),
  m('OpenRouter', 'nvidia/nemotron-3-ultra-550b-a55b:free', 'Nemotron 3 Ultra (550B)'),
  m('OpenRouter', 'google/gemma-4-31b-it:free', 'Gemma 4 (31B)'),
  m('OpenRouter', 'google/gemma-4-26b-a4b-it:free', 'Gemma 4 (26B)'),
  m('OpenRouter', 'nvidia/nemotron-3.5-super-vl:free', 'Nemotron 3.5 VL'),
  m('OpenRouter', 'nvidia/nemotron-3-super-120b-a12b:free', 'Nemotron 3 Super'),
  // Предположительно модель озвучки, не текстовая
  m('OpenRouter', 'fish-audio/s2.1-pro-free:free', 'Fish Audio S2.1 Pro', { kind: 'audio' }),
  // Та же Gemma, но через OpenRouter с принудительным выбором Google AI Studio
  m('OpenRouter', 'google/gemma-4-31b-it:free', 'Gemma 4 (31B) через Google AI Studio', {
    variant: 'google-ai-studio',
    extraBody: { provider: { order: ['google-ai-studio'], allow_fallbacks: false } },
  }),

  // AllTokens
  m('AllTokens', 'google/gemma-4-31b-it:free', 'Gemma 4 (31B)'),

  // CloudCompute
  m('CloudCompute', 'dots-studio/dots-3-note-preview:free', 'Dots 3 Note Preview'),
  m('CloudCompute', 'google/gemma-4-31b-it:free', 'Gemma 4 (31B)'),
  m('CloudCompute', 'google/lyria-3-pro-preview', 'Lyria 3 Pro (музыка)', { kind: 'music' }),
  m('CloudCompute', 'google/lyria-3-clip-preview', 'Lyria 3 Clip (музыка)', { kind: 'music' }),

  // Teamorouter
  m('Teamorouter', 'deepseek-flash-free', 'DeepSeek Flash'),
  m('Teamorouter', 'glm-5.3-flash-free', 'GLM 5.3 Flash'),
  m('Teamorouter', 'deepseek-v4-flash-free', 'DeepSeek V4'),
  m('Teamorouter', 'gpt-image-2', 'GPT Image 2 (картинки)', { kind: 'image' }),

  // OrcaRout
  m('OrcaRout', 'deepseek/deepseek-v4-flash-free', 'DeepSeek V4 Flash'),
  m('OrcaRout', 'z-ai/glm-5.3-flash-free', 'GLM 5.3 Flash'),
  m('OrcaRout', 'deepseek/deepseek-v4.1-flash-free', 'DeepSeek V4.1'),
];

// Найти модель в реестре по key (предпочтительно) или по id (для старых сохранённых значений)
export function findModel(idOrKey) {
  if (!idOrKey) return null;
  return (
    AVAILABLE_MODELS.find((x) => x.key === idOrKey) ||
    AVAILABLE_MODELS.find((x) => x.id === idOrKey && !x.variant) ||
    null
  );
}

// Если модели нет в реестре, пробуем её через OpenRouter, как и раньше
function resolveModel(idOrKey) {
  return (
    findModel(idOrKey) || {
      key: String(idOrKey),
      id: String(idOrKey),
      name: String(idOrKey),
      provider: 'OpenRouter',
      kind: 'text',
    }
  );
}

// =====================================================================
// ОШИБКИ: переводим в понятные категории
// =====================================================================
export function classifyError(err) {
  const status = err?.status ?? err?.response?.status;
  const msg = String(err?.message || err || '');
  const cls = err?.constructor?.name || '';

  if (err?.code === 'NO_KEY') {
    return { category: 'no_key', hint: 'На сервере не задан API-ключ этого провайдера' };
  }
  if (err?.name === 'AbortError' || cls === 'APIConnectionTimeoutError' || /timed? ?out|timeout|ETIMEDOUT/i.test(msg)) {
    return { category: 'timeout', hint: 'Провайдер не ответил вовремя' };
  }
  if (cls === 'APIConnectionError' || /ENOTFOUND|ECONNREFUSED|ECONNRESET|fetch failed|getaddrinfo/i.test(msg)) {
    return { category: 'network', hint: 'Не удалось подключиться к адресу провайдера (проверьте baseUrl)' };
  }
  if (status === 401 || status === 403) return { category: 'auth', hint: 'Ключ не принят провайдером или нет доступа к модели' };
  if (status === 402) return { category: 'payment', hint: 'Не хватает средств или лимита на аккаунте' };
  if (status === 404) return { category: 'not_found', hint: 'Модель или адрес не найдены (возможно, неверный id модели)' };
  if (status === 400 || status === 422) return { category: 'bad_request', hint: 'Провайдер отклонил запрос (возможно, модель не текстовая)' };
  if (status === 408) return { category: 'timeout', hint: 'Провайдер не ответил вовремя' };
  if (status === 429) return { category: 'rate_limit', hint: 'Превышен лимит запросов, попробуйте позже' };
  if (status >= 500) return { category: 'provider_error', hint: 'Ошибка на стороне провайдера' };
  return { category: 'other', hint: 'Неизвестная ошибка' };
}

function shortMessage(err) {
  return String(err?.message || err || '').replace(/\s+/g, ' ').slice(0, 300);
}

function clientFor(model, timeoutMs) {
  const cfg = PROVIDERS[model.provider];
  if (!cfg) {
    const e = new Error(`Неизвестный провайдер: ${model.provider}`);
    e.code = 'NO_PROVIDER';
    throw e;
  }
  const apiKey = process.env[cfg.keyEnv];
  if (!apiKey) {
    const e = new Error(`API-ключ ${cfg.keyEnv} не задан на сервере (Render → Environment)`);
    e.code = 'NO_KEY';
    throw e;
  }
  return new OpenAI({ baseURL: cfg.baseUrl, apiKey, timeout: timeoutMs, maxRetries: 0 });
}

// =====================================================================
// ГЕНЕРАЦИЯ ТЕКСТА
// Принимает key ИЛИ старый id модели (для совместимости).
// Формат ответа прежний: при ошибке text начинается с "Ошибка:".
// =====================================================================
export async function generateText(prompt, modelIdOrKey, { timeoutMs = 120000 } = {}) {
  const model = resolveModel(modelIdOrKey);
  try {
    const client = clientFor(model, timeoutMs);
    const completion = await client.chat.completions.create({
      model: model.id,
      messages: [{ role: 'user', content: prompt }],
      ...(model.extraBody || {}),
    });
    const text = completion.choices?.[0]?.message?.content || '';
    if (!text.trim()) {
      return {
        text: 'Ошибка: модель вернула пустой ответ',
        model: completion.model || model.id,
        provider: model.provider,
        usage: completion.usage || null,
        errorCategory: 'empty',
      };
    }
    return {
      text,
      model: completion.model || model.id,
      provider: model.provider,
      usage: completion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    };
  } catch (err) {
    const { category, hint } = classifyError(err);
    console.error(`Ошибка генерации (${model.key}) [${category}]:`, shortMessage(err));
    return {
      text: `Ошибка: ${hint}. ${shortMessage(err)}`,
      model: model.id,
      provider: model.provider,
      usage: null,
      errorCategory: category,
    };
  }
}

// =====================================================================
// ПРОВЕРКА МОДЕЛЕЙ
// Результаты хранятся в памяти сервера (после перезапуска нужно проверить заново).
// =====================================================================
const checks = new Map();

// Подбор текстовых моделей для служебных задач (например, перевод промпта для картинок):
// сначала выбранная пользователем (если не провалила проверку), затем проверенные рабочие.
export function pickTextModels(preferredKey, max = 3) {
  const usable = (m) => {
    const cfg = PROVIDERS[m.provider];
    return m.kind === 'text' && !!cfg && !!process.env[cfg.keyEnv];
  };
  const out = [];
  const preferred = findModel(preferredKey);
  if (preferred && usable(preferred) && checks.get(preferred.key)?.ok !== false) out.push(preferred);
  for (const m of AVAILABLE_MODELS) {
    if (out.length >= max) break;
    if (!out.includes(m) && usable(m) && checks.get(m.key)?.ok === true) out.push(m);
  }
  return out;
}

export async function checkModel(model) {
  const started = Date.now();
  try {
    const client = clientFor(model, 25000);
    const r = await client.chat.completions.create({
      model: model.id,
      messages: [{ role: 'user', content: 'Ответь одним словом: ок' }],
      max_tokens: 32,
      ...(model.extraBody || {}),
    });
    const text = r.choices?.[0]?.message?.content ?? '';
    if (!Array.isArray(r.choices) || r.choices.length === 0) {
      throw new Error('Провайдер вернул ответ без choices');
    }
    const result = { ok: true, ms: Date.now() - started, at: Date.now(), sample: String(text).slice(0, 40) };
    checks.set(model.key, result);
    return result;
  } catch (err) {
    const { category, hint } = classifyError(err);
    const result = {
      ok: false,
      ms: Date.now() - started,
      at: Date.now(),
      category,
      hint,
      status: err?.status ?? null,
      message: shortMessage(err),
    };
    checks.set(model.key, result);
    return result;
  }
}

function publicModel(model) {
  const cfg = PROVIDERS[model.provider];
  const last = checks.get(model.key) || null;
  let status = 'unknown';
  if (model.kind !== 'text') status = 'unsupported';
  else if (last) status = last.ok ? 'ok' : 'failed';
  return {
    key: model.key,
    id: model.id,
    name: model.name,
    provider: model.provider,
    kind: model.kind,
    keyConfigured: !!(cfg && process.env[cfg.keyEnv]),
    keyEnv: cfg ? cfg.keyEnv : null,
    status,
    lastCheck: last,
  };
}

export function registerModelRoutes(app) {
  // Список моделей со статусами
  app.get('/api/models', (req, res) => {
    res.json({ models: AVAILABLE_MODELS.map(publicModel) });
  });

  // Проверка ОДНОЙ модели (фронтенд вызывает по очереди, чтобы не упереться в таймаут Render)
  app.post('/api/models/check', async (req, res) => {
    try {
      const model = findModel(String(req.body?.key || ''));
      if (!model) return res.status(404).json({ error: 'Модель не найдена в реестре' });
      if (model.kind !== 'text') return res.json({ key: model.key, skipped: true, reason: 'not_text' });
      const result = await checkModel(model);
      res.json({ key: model.key, ...result });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

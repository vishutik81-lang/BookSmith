import OpenAI from 'openai';

// === КОНФИГУРАЦИЯ ПРОВАЙДЕРОВ ===
const PROVIDERS = {
  openrouter: {
    name: 'OpenRouter',
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
  },
  alltokens: {
    name: 'AllTokens',
    baseURL: 'https://api.alltokens.ru/api/v1',
    apiKey: process.env.ALLTOKENS_API_KEY,
  },
  cloudcompute: {
    name: 'CloudCompute',
    baseURL: 'https://app.cloudcompute.ru/api/v1',
    apiKey: process.env.CLOUDCOMPUTE_API_KEY,
  },
  teamorouter: {
    name: 'TeamoRouter',
    baseURL: 'https://api.teamorouter.ru/v1',
    apiKey: process.env.TEAMOROUTER_API_KEY,
  },
  orcarouter: {
    name: 'OrcaRouter',
    baseURL: 'https://api.orcarouter.ai/v1',
    apiKey: process.env.ORCAROUTER_API_KEY,
  },
};

// === БАЗА МОДЕЛЕЙ С ГРУППИРОВКОЙ ПО ПРОВАЙДЕРАМ ===
export const AVAILABLE_MODELS = [
  { provider: 'openrouter', id: 'liquid/lfm-2.5-2.6b:free', name: 'Liquid LFM 2.5 (2.6B)', description: 'Быстрая модель для черновиков' },
  { provider: 'openrouter', id: 'thinkingmachines/inkling-small:free', name: 'Inkling Small', description: 'Легкая модель' },
  { provider: 'openrouter', id: 'nvidia/nemotron-3-ultra-550b-a55b:free', name: 'Nemotron 3 Ultra (550B)', description: 'Мощная модель NVIDIA' },
  { provider: 'openrouter', id: 'baseten/mammoth-1:free', name: 'Mammoth 1', description: 'Новая модель от Baseten' },
  { provider: 'openrouter', id: 'fish-audio/s2.1-pro-free:free', name: 'Fish Audio S2.1 Pro', description: 'Аудио-ориентированная модель' },
  { provider: 'openrouter', id: 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free', name: 'Nemotron 3 Nano Omni', description: 'Компактная reasoning модель' },
  { provider: 'openrouter', id: 'nvidia/nemotron-3.5-super-vl:free', name: 'Nemotron 3.5 Super VL', description: 'Vision-Language модель' },
  { provider: 'openrouter', id: 'google/gemma-4-31b-it:free', name: 'Gemma 4 (31B)', description: 'Google Gemma 4' },
  { provider: 'alltokens', id: 'google/gemma-4-31b-it:free', name: 'Gemma 4 (31B) [AllTokens]', description: 'Google Gemma через AllTokens' },
  { provider: 'cloudcompute', id: 'dots-studio/dots-3-note-preview:free', name: 'Dots 3 Note Preview', description: 'Модель от Dots Studio' },
  { provider: 'cloudcompute', id: 'google/gemma-4-31b-it:free', name: 'Gemma 4 (31B) [CloudCompute]', description: 'Google Gemma через CloudCompute' },
  { provider: 'cloudcompute', id: 'google/lyria-3-pro-preview', name: 'Lyria 3 Pro', description: 'Музыкальная модель Google' },
  { provider: 'cloudcompute', id: 'google/lyria-3-clip-preview', name: 'Lyria 3 Clip', description: 'Короткие музыкальные клипы' },
  { provider: 'teamorouter', id: 'gpt-image-2', name: 'GPT Image 2', description: 'Генерация изображений' },
  { provider: 'teamorouter', id: 'deepseek-flash-free', name: 'DeepSeek Flash', description: 'Быстрая модель DeepSeek' },
  { provider: 'teamorouter', id: 'deepseek-v4-flash-free', name: 'DeepSeek V4 Flash', description: 'Новая версия DeepSeek' },
  { provider: 'teamorouter', id: 'glm-5.3-flash-free', name: 'GLM 5.3 Flash', description: 'Модель от Zhipu AI' },
  { provider: 'orcarouter', id: 'deepseek/deepseek-v4.1-flash-free', name: 'DeepSeek V4.1 Flash', description: 'Последняя версия DeepSeek' },
  { provider: 'orcarouter', id: 'deepseek/deepseek-v4-flash-free', name: 'DeepSeek V4 Flash [Orca]', description: 'DeepSeek через OrcaRouter' },
  { provider: 'orcarouter', id: 'z-ai/glm-5.3-flash-free', name: 'GLM 5.3 Flash [Orca]', description: 'GLM через OrcaRouter' },
];

function getProviderClient(providerId) {
  const provider = PROVIDERS[providerId];
  if (!provider) throw new Error(`Провайдер ${providerId} не найден`);
  if (!provider.apiKey) throw new Error(`API-ключ для ${provider.name} не настроен`);
  
  return new OpenAI({
    baseURL: provider.baseURL,
    apiKey: provider.apiKey,
  });
}

export async function generateText(modelId, prompt, options = {}) {
  const model = AVAILABLE_MODELS.find(m => m.id === modelId);
  if (!model) throw new Error(`Модель ${modelId} не найдена`);
  
  const client = getProviderClient(model.provider);
  const provider = PROVIDERS[model.provider];
  const startTime = Date.now();
  
  try {
    const response = await client.chat.completions.create({
      model: modelId,
      messages: [{ role: 'user', content: prompt }],
      ...options,
    });
    
    const duration = Date.now() - startTime;
    const usage = response.usage || {};
    
    if (!global.requestLogs) global.requestLogs = [];
    global.requestLogs.push({
      timestamp: new Date().toISOString(),
      provider: provider.name,
      model: modelId,
      promptLength: prompt.length,
      tokensIn: usage.prompt_tokens || 0,
      tokensOut: usage.completion_tokens || 0,
      totalTokens: usage.total_tokens || 0,
      duration: duration,
      success: true,
    });
    if (global.requestLogs.length > 100) global.requestLogs.shift();
    
    console.log(`[${provider.name}] ${modelId}: ${usage.total_tokens} токенов за ${duration}ms`);
    
    return {
      text: response.choices[0]?.message?.content || '',
      usage: usage,
      provider: provider.name,
      duration: duration,
    };
  } catch (error) {
    console.error(`[${provider.name}] Ошибка при вызове ${modelId}:`, error.message);
    throw error;
  }
}

export function getRequestLogs() {
  return global.requestLogs || [];
}

export function getStats() {
  const logs = global.requestLogs || [];
  const stats = {};
  logs.forEach(log => {
    if (!stats[log.provider]) {
      stats[log.provider] = { requests: 0, totalTokens: 0, totalDuration: 0 };
    }
    stats[log.provider].requests++;
    stats[log.provider].totalTokens += log.totalTokens;
    stats[log.provider].totalDuration += log.duration;
  });
  return stats;
}

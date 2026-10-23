import OpenAI from 'openai';

// === РЕЕСТР МОДЕЛЕЙ И ПРОВАЙДЕРОВ ===
export const AVAILABLE_MODELS = [
  // OpenRouter (базовые проверенные модели)
  { id: 'liquid/lfm-2.5-2.6b:free', name: 'Liquid LFM 2.5 (2.6B)', provider: 'OpenRouter' },
  { id: 'thinkingmachines/inkling-small:free', name: 'Inkling Small', provider: 'OpenRouter' },
  { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', name: 'Nemotron 3 Ultra (550B)', provider: 'OpenRouter' },
  { id: 'google/gemma-4-31b-it:free', name: 'Gemma 4 (31B)', provider: 'OpenRouter' },
  { id: 'google/gemma-4-26b-a4b-it:free', name: 'Gemma 4 (26B)', provider: 'OpenRouter' },
    { id: 'nvidia/nemotron-3.5-super-vl:free', name: 'Nemotron 3.5VL', provider: 'OpenRouter' },
    { id: 'fish-audio/s2.1-pro-free:free', name: 'Fish-audio', provider: 'OpenRouter' },
    { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'Nemotron-3-super', provider: 'OpenRouter' },
  
  // AllTokens
  { id: 'google/gemma-4-31b-it:free', name: 'Gemma 4 31B (AllTokens)', provider: 'AllTokens' },
   { id: 'google/gemma-4-31b-it:free', name: 'Gemma 4GIS  (AllTokens)', provider: 'google-ai-studio' },
  
  // CloudCompute
  { id: 'dots-studio/dots-3-note-preview:free', name: 'Dots 3 Note Preview', provider: 'CloudCompute' },
  { id: 'google/gemma-4-31b-it:free', name: 'Gemma 4 31B (CloudCompute)', provider: 'CloudCompute' },
   { id: 'google/lyria-3-pro-preview', name: 'lyria-3-pro (CloudCompute)', provider: 'CloudCompute' },
   { id: 'google/lyria-3-clip-preview', name: 'lyria-3-clip (CloudCompute)', provider: 'CloudCompute' },
  
  // Teamorouter
  { id: 'deepseek-flash-free', name: 'DeepSeek Flash (Teamorouter)', provider: 'Teamorouter' },
  { id: 'glm-5.3-flash-free', name: 'GLM 5.3 Flash (Teamorouter)', provider: 'Teamorouter' },
  { id: 'deepseek-v4-flash-free', name: 'deepseek-v4 (Teamorouter)', provider: 'Teamorouter' },
  { id: 'gpt-image-2', name: 'gpt-image-2 (Teamorouter)', provider: 'Teamorouter' },

  // OrcaRout
  { id: 'deepseek/deepseek-v4-flash-free', name: 'DeepSeek V4 Flash (Orca)', provider: 'OrcaRout' },
  { id: 'z-ai/glm-5.3-flash-free', name: 'GLM 5.3 Flash (Orca)', provider: 'OrcaRout' },
  { id: 'deepseek/deepseek-v4.1-flash-free', name: 'deepseek-v4.1 (Orca)', provider: 'OrcaRout' }
];

// Функция для получения конфигурации провайдера по ID модели
function getModelConfig(modelId) {
  let config = AVAILABLE_MODELS.find(m => m.id === modelId);
  
  if (!config) {
    // Fallback: если модель не найдена в списке, но похожа на OpenRouter, используем его по умолчанию
    config = { 
      id: modelId, 
      name: modelId, 
      provider: 'OpenRouter', 
      baseUrl: 'https://openrouter.ai/api/v1', 
      keyEnv: 'OPENROUTER_API_KEY' 
    };
  } else {
    // Назначаем URL и имя переменной окружения в зависимости от провайдера
    switch (config.provider) {
      case 'AllTokens':
        config.baseUrl = 'https://api.alltokens.ru/api/v1';
        config.keyEnv = 'ALLTOKENS_API_KEY';
        break;
      case 'CloudCompute':
        config.baseUrl = 'https://app.cloudcompute.ru/api/v1';
        config.keyEnv = 'CLOUDCOMPUTE_API_KEY';
        break;
      case 'Teamorouter':
        config.baseUrl = 'https://api.teamorouter.ru/v1'; // Проверь актуальный URL в документации Teamo
        config.keyEnv = 'TEAMO_API_KEY';
        break;
      case 'OrcaRout':
        config.baseUrl = 'https://api.orcarouter.ai/v1';
        config.keyEnv = 'ORCAROUT_API_KEY';
        break;
      default:
        config.baseUrl = 'https://openrouter.ai/api/v1';
        config.keyEnv = 'OPENROUTER_API_KEY';
    }
  }
  return config;
}

export async function generateText(prompt, modelId) {
  try {
    const config = getModelConfig(modelId);
    const apiKey = process.env[config.keyEnv];

    if (!apiKey) {
      throw new Error(`API-ключ для провайдера ${config.provider} не найден в настройках сервера (${config.keyEnv})`);
    }

    const client = new OpenAI({
      baseURL: config.baseUrl,
      apiKey: apiKey,
    });

    const completion = await client.chat.completions.create({
      model: config.id, 
      messages: [{ role: 'user', content: prompt }],
    });
    
    return { 
      text: completion.choices[0]?.message?.content || '',
      model: completion.model || config.id,
      provider: config.provider,
      // Безопасный fallback для usage, если провайдер его не вернул
      usage: completion.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    };
  } catch (error) {
    console.error(`Ошибка генерации (${modelId}):`, error);
    return { 
      text: 'Ошибка: ' + error.message,
      model: modelId,
      provider: 'Unknown',
      usage: null
    };
  }
}

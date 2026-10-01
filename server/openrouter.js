import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

// База данных моделей с описаниями
export const AVAILABLE_MODELS = [
  {
    id: "liquid/lfm-2.5-2.6b:free",
    name: "Liquid LFM 2.5 (2.6B)",
    description: "Легкая и быстрая модель. Отлично подходит для простых задач, генерации черновиков и быстрых идей. Экономит ресурсы."
  },
  {
    id: "thinkingmachines/inkling-small:free",
    name: "Inkling Small",
    description: "Специализируется на креативном письме и сторителлинге. Хороша для живых диалогов и художественных описаний."
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b:free",
    name: "Nemotron 3 Ultra (550B)",
    description: "Мощная и тяжелая модель. Лучше всего справляется со сложным лором, глубокой проработкой мира и длинными контекстами."
  },
  {
    id: "google/gemma-4-31b-it:free",
    name: "Gemma 4 (31B)",
    description: "Сбалансированная модель от Google. Универсальна, хорошо понимает инструкции. Подходит для структурирования сюжета и планирования."
  },
  {
    id: "qwen/qwen3.8-27b:free",
    name: "Qwen 3.8 (27B)",
    description: "Модель с сильной логикой и поддержкой множества языков. Идеальна для детализированных описаний, работы с фактами и сложными сценами."
  }
];

export async function generateText(prompt, modelId) {
  try {
    const completion = await openai.chat.completions.create({
      model: modelId || AVAILABLE_MODELS[0].id, // Используем выбранную или первую по умолчанию
      messages: [{ role: "user", content: prompt }],
    });
    
    return { 
      text: completion.choices[0].message.content,
      model: completion.model 
    };
  } catch (error) {
    console.error("Ошибка OpenRouter:", error);
    return { 
      text: "Ошибка: " + error.message,
      model: null 
    };
  }
}

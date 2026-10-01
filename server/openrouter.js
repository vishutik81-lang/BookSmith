import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function generateText(prompt) {
  try {
    const completion = await openai.chat.completions.create({
      model: "meta-llama/llama-3-8b-instruct:free", 
      messages: [{ role: "user", content: prompt }],
    });
    return completion.choices[0].message.content;
  } catch (error) {
    console.error("Ошибка OpenRouter:", error);
    return "Ошибка: " + error.message;
  }
}

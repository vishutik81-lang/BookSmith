import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { generateText } from './openrouter.js'; // <-- Добавили импорт нашего модуля

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Раздаём статические файлы из папки dist (собранный React)
app.use(express.static(join(__dirname, '../dist')));

// API эндпоинт для проверки здоровья сервера
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'BookSmith server is running' });
});

// <-- НОВЫЙ МАРШРУТ СТАВИМ СЮДА (ПОСЛЕ закрывающей скобки health)
app.post('/api/generate', async (req, res) => {
  const { prompt } = req.body;
  const text = await generateText(prompt);
  res.json({ text });
});

// Для всех остальных запросов отдаём index.html (React Router)
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../dist/index.html'));
});

// Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});

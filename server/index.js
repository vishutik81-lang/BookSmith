import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { generateText, AVAILABLE_MODELS } from './openrouter.js';
   import { supabase } from './supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '../dist')));

// Проверка здоровья
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'BookSmith server is running' });
});

// НОВЫЙ МАРШРУТ: Получение списка моделей
app.get('/api/models', (req, res) => {
  res.json(AVAILABLE_MODELS);
});

// ОБНОВЛЕННЫЙ МАРШРУТ: Генерация текста
app.post('/api/generate', async (req, res) => {
  const { prompt, modelId } = req.body;
  const result = await generateText(prompt, modelId);
  res.json(result);
});
   // Тестовый эндпоинт: Создание нового проекта
   app.post('/api/projects', async (req, res) => {
     try {
       const { title, description } = req.body;
       
       const { data, error } = await supabase
         .from('projects')
         .insert([{ title, description }])
         .select();

       if (error) {
         console.error('Ошибка Supabase:', error);
         return res.status(500).json({ error: error.message });
       }

       res.json({ message: 'Проект успешно создан!', project: data[0] });
     } catch (err) {
       console.error('Ошибка сервера:', err);
       res.status(500).json({ error: 'Внутренняя ошибка сервера' });
     }
   });

app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});

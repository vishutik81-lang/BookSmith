import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { supabase } from './supabase.js';
// Убрали getRequestLogs и getStats, чтобы избежать ошибок, если их нет в openrouter.js
import { generateText, AVAILABLE_MODELS } from './openrouter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '../dist')));

// 1. Проверка здоровья
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'BookSmith server is running' });
});

// 2. Список моделей
app.get('/api/models', (req, res) => {
  res.json({ models: AVAILABLE_MODELS });
});

// 3. Генерация текста
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, modelId } = req.body;
    const result = await generateText(prompt, modelId);
    res.json(result);
  } catch (error) {
    console.error('Ошибка генерации:', error);
    res.status(500).json({ error: error.message });
  }
});

// 4. Создание нового проекта + глава + сцена
app.post('/api/projects', async (req, res) => {
  try {
    const { title, description, genre, subgenre } = req.body;
    
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert([{ title, description, genre, subgenre }])
      .select()
      .single();
    if (projectError) throw projectError;

    const { data: chapter, error: chapterError } = await supabase
      .from('chapters')
      .insert([{ project_id: project.id, title: 'Глава 1', sort_order: 0 }])
      .select()
      .single();
    if (chapterError) throw chapterError;

    const { data: scene, error: sceneError } = await supabase
      .from('scenes')
      .insert([{ chapter_id: chapter.id, title: 'Сцена 1', body: '', context_before: '', sort_order: 0 }])
      .select()
      .single();
    if (sceneError) throw sceneError;

    res.json({
      message: 'Проект создан!',
      project: { ...project, chapters: [{ ...chapter, scenes: [scene] }] }
    });
  } catch (err) {
    console.error('Ошибка создания проекта:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5. Получение всех проектов
app.get('/api/projects', async (req, res) => {
  try {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ projects: projects || [] });
  } catch (err) {
    console.error('Ошибка загрузки проектов:', err);
    res.status(500).json({ error: err.message });
  }
});

// 6. Обновление сцены (сохранение текста)
app.patch('/api/scenes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { body, context_before, title } = req.body;
    
    const updateData = {};
    if (body !== undefined) updateData.body = body;
    if (context_before !== undefined) updateData.context_before = context_before;
    if (title !== undefined) updateData.title = title;

    const { data, error } = await supabase
      .from('scenes')
      .update(updateData)
      .eq('id', id)
      .select();
      
    if (error) throw error;
    res.json({ success: true, scene: data[0] });
  } catch (err) {
    console.error('Ошибка обновления сцены:', err);
    res.status(500).json({ error: err.message });
  }
});

// 7. Отдача фронтенда (Catch-all для React Router)
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../dist/index.html'));
});

// 8. Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});

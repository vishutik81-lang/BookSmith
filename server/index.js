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

// 1. Проверка здоровья
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'BookSmith server is running' });
});

// 2. Список моделей
app.get('/api/models', (req, res) => {
  res.json(AVAILABLE_MODELS);
});

// 3. Генерация текста
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, modelId } = req.body;
    const result = await generateText(prompt, modelId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Создание нового проекта + глава + сцена (всё сразу)
app.post('/api/projects', async (req, res) => {
  try {
    const { title, description } = req.body;
    
    // 1. Создаём проект
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert([{ title, description }])
      .select()
      .single();

    if (projectError) throw projectError;

    // 2. Создаём первую главу
    const { data: chapter, error: chapterError } = await supabase
      .from('chapters')
      .insert([{ project_id: project.id, title: 'Глава 1', sort_order: 0 }])
      .select()
      .single();

    if (chapterError) throw chapterError;

    // 3. Создаём первую сцену
    const { data: scene, error: sceneError } = await supabase
      .from('scenes')
      .insert([{ chapter_id: chapter.id, title: 'Сцена 1', body: '', sort_order: 0 }])
      .select()
      .single();

    if (sceneError) throw sceneError;

    // 4. Возвращаем всю структуру клиенту
    res.json({ 
      message: 'Проект создан!', 
      project: {
        ...project,
        chapters: [{
          ...chapter,
          scenes: [scene]
        }]
      }
    });
  } catch (err) {
    console.error('Ошибка создания проекта:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5. ОБНОВЛЕНИЕ СЦЕНЫ (ЭТОГО БЛОКА НЕ ХВАТАЛО!)
app.patch('/api/scenes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { body } = req.body;

    const { data, error } = await supabase
      .from('scenes')
      .update({ body: body })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Ошибка обновления сцены:', error);
      return res.status(500).json({ error: error.message });
    }
    res.json({ success: true, scene: data[0] });
  } catch (err) {
    console.error('Ошибка сервера:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});
// 5.5. Получение всех книг с главами и сценами
app.get('/api/projects', async (req, res) => {
  try {
    // 1. Получаем все проекты
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (projectsError) throw projectsError;

    // 2. Для каждого проекта загружаем главы и сцены
    const projectsWithDetails = await Promise.all(
      projects.map(async (project) => {
        const { data: chapters } = await supabase
          .from('chapters')
          .select('*')
          .eq('project_id', project.id)
          .order('sort_order', { ascending: true });

        const chaptersWithScenes = await Promise.all(
          (chapters || []).map(async (chapter) => {
            const { data: scenes } = await supabase
              .from('scenes')
              .select('*')
              .eq('chapter_id', chapter.id)
              .order('sort_order', { ascending: true });

            return {
              ...chapter,
              scenes: scenes || []
            };
          })
        );

        return {
          ...project,
          chapters: chaptersWithScenes
        };
      })
    );

    res.json({ projects: projectsWithDetails });
  } catch (err) {
    console.error('Ошибка загрузки проектов:', err);
    res.status(500).json({ error: err.message });
  }
});
// 5.6. Удаление проекта (каскадно удаляет главы и сцены)
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    res.json({ success: true, message: 'Проект удалён' });
  } catch (err) {
    console.error('Ошибка удаления проекта:', err);
    res.status(500).json({ error: err.message });
  }
});
// 5.7. Обновление названия главы
app.patch('/api/chapters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    const { data, error } = await supabase
      .from('chapters')
      .update({ title: title })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json({ success: true, chapter: data[0] });
  } catch (err) {
    console.error('Ошибка обновления главы:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5.8. Обновление названия сцены
app.patch('/api/scenes/title/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    const { data, error } = await supabase
      .from('scenes')
      .update({ title: title })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json({ success: true, scene: data[0] });
  } catch (err) {
    console.error('Ошибка обновления сцены:', err);
    res.status(500).json({ error: err.message });
  }
});
// 6. Отдача фронтенда
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../dist/index.html'));
});

// 7. Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});

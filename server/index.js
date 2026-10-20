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
// 5.9. Обновление названия проекта
app.patch('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    const { data, error } = await supabase
      .from('projects')
      .update({ title: title })
      .eq('id', id)
      .select();

    if (error) throw error;
    res.json({ success: true, project: data[0] });
  } catch (err) {
    console.error('Ошибка обновления проекта:', err);
    res.status(500).json({ error: err.message });
  }
});
// 5.10. Получение всех персонажей проекта
app.get('/api/projects/:projectId/characters', async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    res.json({ characters: data || [] });
  } catch (err) {
    console.error('Ошибка загрузки персонажей:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5.11. Создание персонажа
app.post('/api/projects/:projectId/characters', async (req, res) => {
  try {
    // ДОБАВЛЕНО: gender, race в деструктуризацию
    const { name, description, role, appearance, personality, sexual_orientation, gender, race } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Имя персонажа обязательно' });
    }

    const { data, error } = await supabase
      .from('characters')
      .insert([{ 
        project_id: projectId, 
        name: name.trim(),
        description: description || '',
        role: role || 'secondary',
        appearance: appearance || '',
        personality: personality || '',
        sexual_orientation: sexual_orientation || '',
        gender: gender || 'not_specified', // <-- ДОБАВЛЕНО
        race: race || 'human'               // <-- ДОБАВЛЕНО
      }])
      .select()
      .single();

    if (error) throw error;
    
    res.json({ character: data });
  } catch (err) {
    console.error('Ошибка создания персонажа:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5.12. Обновление персонажа
app.patch('/api/characters/:id', async (req, res) => {
  try {
    // ДОБАВЛЕНО: gender, race в деструктуризацию
    const { name, description, role, appearance, personality, sexual_orientation, gender, race } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (role !== undefined) updateData.role = role;
    if (appearance !== undefined) updateData.appearance = appearance;
    if (personality !== undefined) updateData.personality = personality;
    if (sexual_orientation !== undefined) updateData.sexual_orientation = sexual_orientation;
    if (gender !== undefined) updateData.gender = gender;       // <-- ДОБАВЛЕНО
    if (race !== undefined) updateData.race = race;             // <-- ДОБАВЛЕНО

    const { data, error } = await supabase
      .from('characters')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    res.json({ character: data });
  } catch (err) {
    console.error('Ошибка обновления персонажа:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5.13. Удаление персонажа
app.delete('/api/characters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('characters')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    res.json({ success: true });
  } catch (err) {
    console.error('Ошибка удаления персонажа:', err);
    res.status(500).json({ error: err.message });
  }
});
// === ЗАМЕТКИ О МИРЕ ===

// 7.1. Получить заметки о мире проекта
app.get('/api/projects/:projectId/world-notes', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { data, error } = await supabase
      .from('world_notes')
      .select('*')
      .eq('project_id', projectId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = не найдено
    res.json({ notes: data || null });
  } catch (err) {
    console.error('Ошибка загрузки заметок:', err);
    res.status(500).json({ error: err.message });
  }
});

// 7.2. Создать или обновить заметки о мире (upsert)
app.post('/api/projects/:projectId/world-notes', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { setting, time_period, rules, important_events, tone, custom_notes } = req.body;

    const { data, error } = await supabase
      .from('world_notes')
      .upsert([{
        project_id: projectId,
        setting: setting || '',
        time_period: time_period || '',
        rules: rules || '',
        important_events: important_events || '',
        tone: tone || '',
        custom_notes: custom_notes || '',
        updated_at: new Date().toISOString()
      }], { onConflict: 'project_id' })
      .select()
      .single();

    if (error) throw error;
    res.json({ notes: data });
  } catch (err) {
    console.error('Ошибка сохранения заметок:', err);
    res.status(500).json({ error: err.message });
  }
});

// 7.3. Обновление сцены с учетом предыстории (заменяем старый PATCH /api/scenes/:id)
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
// 6. Отдача фронтенда
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../dist/index.html'));
});

// 7. Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});

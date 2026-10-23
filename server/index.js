import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { supabase } from './supabase.js';
import { generateText, AVAILABLE_MODELS, getRequestLogs, getStats } from './openrouter.js';

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

// 2. Список моделей (сгруппированных)
app.get('/api/models', (req, res) => {
  const grouped = {};
  AVAILABLE_MODELS.forEach(model => {
    if (!grouped[model.provider]) {
      grouped[model.provider] = {
        provider: model.provider,
        name: model.provider.charAt(0).toUpperCase() + model.provider.slice(1),
        models: [],
      };
    }
    grouped[model.provider].models.push({
      id: model.id,
      name: model.name,
      description: model.description,
    });
  });
  res.json({ providers: Object.values(grouped) });
});

// 3. Генерация текста
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, modelId } = req.body;
    if (!prompt || !modelId) {
      return res.status(400).json({ error: 'Промпт и modelId обязательны' });
    }
    const result = await generateText(modelId, prompt);
    res.json({
      text: result.text,
      usage: result.usage,
      provider: result.provider,
      duration: result.duration,
    });
  } catch (error) {
    console.error('Ошибка генерации:', error);
    res.status(500).json({ error: error.message, text: `Ошибка: ${error.message}` });
  }
});

// 4. Создание проекта
app.post('/api/projects', async (req, res) => {
  try {
    const { title, description, genre, subgenre } = req.body;
    const { data: project, error: projectError } = await supabase.from('projects').insert([{ title, description, genre, subgenre }]).select().single();
    if (projectError) throw projectError;

    const { data: chapter, error: chapterError } = await supabase.from('chapters').insert([{ project_id: project.id, title: 'Глава 1', sort_order: 0 }]).select().single();
    if (chapterError) throw chapterError;

    const { data: scene, error: sceneError } = await supabase.from('scenes').insert([{ chapter_id: chapter.id, title: 'Сцена 1', body: '', context_before: '', sort_order: 0 }]).select().single();
    if (sceneError) throw sceneError;

    res.json({ message: 'Проект создан!', project: { ...project, chapters: [{ ...chapter, scenes: [scene] }] } });
  } catch (err) {
    console.error('Ошибка создания проекта:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5. Обновление сцены
app.patch('/api/scenes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { body, context_before, title } = req.body;
    const updateData = {};
    if (body !== undefined) updateData.body = body;
    if (context_before !== undefined) updateData.context_before = context_before;
    if (title !== undefined) updateData.title = title;

    const { data, error } = await supabase.from('scenes').update(updateData).eq('id', id).select();
    if (error) throw error;
    res.json({ success: true, scene: data[0] });
  } catch (err) {
    console.error('Ошибка обновления сцены:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});

// 6. Получение всех проектов
app.get('/api/projects', async (req, res) => {
  try {
    const { data: projects, error: projectsError } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    if (projectsError) throw projectsError;

    const projectsWithDetails = await Promise.all(projects.map(async (project) => {
      const { data: chapters } = await supabase.from('chapters').select('*').eq('project_id', project.id).order('sort_order', { ascending: true });
      const chaptersWithScenes = await Promise.all((chapters || []).map(async (chapter) => {
        const { data: scenes } = await supabase.from('scenes').select('*').eq('chapter_id', chapter.id).order('sort_order', { ascending: true });
        return { ...chapter, scenes: scenes || [] };
      }));
      return { ...project, chapters: chaptersWithScenes };
    }));
    res.json({ projects: projectsWithDetails });
  } catch (err) {
    console.error('Ошибка загрузки проектов:', err);
    res.status(500).json({ error: err.message });
  }
});

// 7. Удаление проекта
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true, message: 'Проект удалён' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Обновление названия проекта
app.patch('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, genre, subgenre } = req.body;
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (genre !== undefined) updateData.genre = genre;
    if (subgenre !== undefined) updateData.subgenre = subgenre;

    const { data, error } = await supabase.from('projects').update(updateData).eq('id', id).select();
    if (error) throw error;
    res.json({ success: true, project: data[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Обновление главы
app.patch('/api/chapters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    const { data, error } = await supabase.from('chapters').update({ title }).eq('id', id).select();
    if (error) throw error;
    res.json({ success: true, chapter: data[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Обновление названия сцены
app.patch('/api/scenes/title/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    const { data, error } = await supabase.from('scenes').update({ title }).eq('id', id).select();
    if (error) throw error;
    res.json({ success: true, scene: data[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Создание главы
app.post('/api/projects/:projectId/chapters', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { title, sort_order } = req.body;
    const { data, error } = await supabase.from('chapters').insert([{ project_id: projectId, title: title || 'Новая глава', sort_order: sort_order || 0 }]).select().single();
    if (error) throw error;
    res.json({ success: true, chapter: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Создание сцены
app.post('/api/chapters/:chapterId/scenes', async (req, res) => {
  try {
    const { chapterId } = req.params;
    const { title, body, sort_order } = req.body;
    const { data, error } = await supabase.from('scenes').insert([{ chapter_id: chapterId, title: title || 'Новая сцена', body: body || '', context_before: '', sort_order: sort_order || 0 }]).select().single();
    if (error) throw error;
    res.json({ success: true, scene: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 13. Персонажи проекта
app.get('/api/projects/:projectId/characters', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { data, error } = await supabase.from('characters').select('*').eq('project_id', projectId).order('created_at', { ascending: true });
    if (error) throw error;
    res.json({ characters: data || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects/:projectId/characters', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, description, role, appearance, personality, sexual_orientation, gender, race } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Имя обязательно' });
    const { data, error } = await supabase.from('characters').insert([{ project_id: projectId, name: name.trim(), description: description || '', role: role || 'secondary', appearance: appearance || '', personality: personality || '', sexual_orientation: sexual_orientation || '', gender: gender || 'not_specified', race: race || 'human' }]).select().single();
    if (error) throw error;
    res.json({ character: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/characters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, role, appearance, personality, sexual_orientation, gender, race } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (role !== undefined) updateData.role = role;
    if (appearance !== undefined) updateData.appearance = appearance;
    if (personality !== undefined) updateData.personality = personality;
    if (sexual_orientation !== undefined) updateData.sexual_orientation = sexual_orientation;
    if (gender !== undefined) updateData.gender = gender;
    if (race !== undefined) updateData.race = race;

    const { data, error } = await supabase.from('characters').update(updateData).eq('id', id).select().single();
    if (error) throw error;
    res.json({ character: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/characters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('characters').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 14. Заметки о мире
app.get('/api/projects/:projectId/world-notes', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { data, error } = await supabase.from('world_notes').select('*').eq('project_id', projectId).single();
    if (error && error.code !== 'PGRST116') throw error;
    res.json({ notes: data || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/projects/:projectId/world-notes', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { setting, time_period, rules, important_events, tone, custom_notes } = req.body;
    const { data, error } = await supabase.from('world_notes').upsert([{ project_id: projectId, setting: setting || '', time_period: time_period || '', rules: rules || '', important_events: important_events || '', tone: tone || '', custom_notes: custom_notes || '', updated_at: new Date().toISOString() }], { onConflict: 'project_id' }).select().single();
    if (error) throw error;
    res.json({ notes: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 15. Персонажи сцены
app.get('/api/scenes/:sceneId/characters', async (req, res) => {
  try {
    const { sceneId } = req.params;
    const { data, error } = await supabase.from('scene_characters').select('*, characters(*)').eq('scene_id', sceneId);
    if (error) throw error;
    const characters = (data || []).map(link => ({ character_id: link.character_id, scene_id: link.scene_id, role: link.role, characters: link.characters }));
    res.json({ characters });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/scenes/:sceneId/characters', async (req, res) => {
  try {
    const { sceneId } = req.params;
    const { character_id, role } = req.body;
    const { data, error } = await supabase.from('scene_characters').insert([{ scene_id: sceneId, character_id, role: role || 'present' }]).select().single();
    if (error) throw error;
    res.json({ success: true, link: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/scenes/:sceneId/characters/:characterId', async (req, res) => {
  try {
    const { sceneId, characterId } = req.params;
    const { error } = await supabase.from('scene_characters').delete().eq('scene_id', sceneId).eq('character_id', characterId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 16. Граф связей
app.get('/api/projects/:projectId/relations', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { data: chars, error: charsError } = await supabase.from('characters').select('id, name').eq('project_id', projectId);
    if (charsError) throw charsError;
    const charIds = chars.map(c => c.id);
    const { data: relations, error: relError } = await supabase.from('character_relations').select('*').in('source_id', charIds).in('target_id', charIds);
    if (relError) throw relError;
    res.json({ characters: chars, relations: relations || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/relations', async (req, res) => {
  try {
    const { source_id, target_id, type, strength, description } = req.body;
    const { data, error } = await supabase.from('character_relations').upsert([{ source_id, target_id, type, strength: strength || 5, description: description || '' }], { onConflict: 'source_id,target_id,type' }).select().single();
    if (error) throw error;
    res.json({ success: true, relation: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/relations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('character_relations').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 17. Мониторинг
app.get('/api/monitoring/logs', (req, res) => {
  const logs = getRequestLogs();
  res.json({ logs: logs.slice(-50) });
});

app.get('/api/monitoring/stats', (req, res) => {
  const stats = getStats();
  res.json({ stats });
});

// 18. Отдача фронтенда
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../dist/index.html'));
});

// 19. Запуск сервера
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});

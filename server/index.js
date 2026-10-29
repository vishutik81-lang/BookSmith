import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { supabase } from './supabase.js';
import { generateText, AVAILABLE_MODELS } from './openrouter.js';
   import { testPerchanceConnection, generateImage } from './perchance.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '../dist')));

// 1. Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// 2. Models
app.get('/api/models', (req, res) => res.json({ models: AVAILABLE_MODELS }));

// 3. Generate
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, modelId } = req.body;
    const result = await generateText(prompt, modelId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Projects
app.get('/api/projects', async (req, res) => {
  try {
    const { data, error } = await supabase.from('projects').select('*, chapters(*, scenes(*))').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ projects: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/projects', async (req, res) => {
  try {
    const { title, description, genre, subgenre } = req.body;
    const { data: project, error: pErr } = await supabase.from('projects').insert([{ title, description, genre: genre || 'Не указан', subgenre: subgenre || '' }]).select().single();
    if (pErr) throw pErr;
    const { data: chapter, error: cErr } = await supabase.from('chapters').insert([{ project_id: project.id, title: 'Глава 1', sort_order: 0 }]).select().single();
    if (cErr) throw cErr;
    const { data: scene, error: sErr } = await supabase.from('scenes').insert([{ chapter_id: chapter.id, title: 'Сцена 1', body: '', context_before: '', sort_order: 0 }]).select().single();
    if (sErr) throw sErr;
    res.json({ message: 'OK', project: { ...project, chapters: [{ ...chapter, scenes: [scene] }] } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/projects/:id', async (req, res) => {
  try {
    const { title, genre, subgenre } = req.body;
    const { data, error } = await supabase.from('projects').update({ title, genre, subgenre }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, project: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('projects').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 5. Chapters
app.post('/api/projects/:projectId/chapters', async (req, res) => {
  try {
    const { title, sort_order } = req.body;
    const { data, error } = await supabase.from('chapters').insert([{ project_id: req.params.projectId, title: title || 'Новая глава', sort_order: sort_order || 0 }]).select().single();
    if (error) throw error;
    res.json({ success: true, chapter: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/chapters/:id', async (req, res) => {
  try {
    const { title } = req.body;
    const { data, error } = await supabase.from('chapters').update({ title }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, chapter: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 6. Scenes
app.post('/api/chapters/:chapterId/scenes', async (req, res) => {
  try {
    const { title, body, sort_order } = req.body;
    const { data, error } = await supabase.from('scenes').insert([{ chapter_id: req.params.chapterId, title: title || 'Новая сцена', body: body || '', context_before: '', sort_order: sort_order || 0 }]).select().single();
    if (error) throw error;
    res.json({ success: true, scene: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/scenes/:id', async (req, res) => {
  try {
    const { body, context_before, title } = req.body;
    const updateData = {};
    if (body !== undefined) updateData.body = body;
    if (context_before !== undefined) updateData.context_before = context_before;
    if (title !== undefined) updateData.title = title;
    
    const { data, error } = await supabase.from('scenes').update(updateData).eq('id', req.params.id).select();
    if (error) throw error;
    if (!data || data.length === 0) throw new Error(`Сцена с ID ${req.params.id} не найдена`);
    res.json({ success: true, scene: data[0] });
  } catch (err) { 
    console.error('❌ Ошибка обновления сцены:', err.message);
    res.status(500).json({ error: err.message }); 
  }
});

app.patch('/api/scenes/title/:id', async (req, res) => {
  try {
    const { title } = req.body;
    const { data, error } = await supabase.from('scenes').update({ title }).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ success: true, scene: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 7. Characters
app.get('/api/projects/:projectId/characters', async (req, res) => {
  try {
    const { data, error } = await supabase.from('characters').select('*').eq('project_id', req.params.projectId);
    if (error) throw error;
    res.json({ characters: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/projects/:projectId/characters', async (req, res) => {
  try {
    const { name, description, role, appearance, personality, sexual_orientation, gender, race } = req.body;
    const { data, error } = await supabase.from('characters').insert([{ project_id: req.params.projectId, name: name.trim(), description: description || '', role: role || 'secondary', appearance: appearance || '', personality: personality || '', sexual_orientation: sexual_orientation || '', gender: gender || 'not_specified', race: race || 'human' }]).select().single();
    if (error) throw error;
    res.json({ character: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/api/characters/:id', async (req, res) => {
  try {
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

    const { data, error } = await supabase.from('characters').update(updateData).eq('id', req.params.id).select().single();
    if (error) throw error;
    res.json({ character: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/characters/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('characters').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 8. Scene Characters
app.get('/api/scenes/:sceneId/characters', async (req, res) => {
  try {
    const { data, error } = await supabase.from('scene_characters').select('*, characters(*)').eq('scene_id', req.params.sceneId);
    if (error) throw error;
    res.json({ characters: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/scenes/:sceneId/characters', async (req, res) => {
  try {
    const { character_id, role } = req.body;
    const { data, error } = await supabase.from('scene_characters').insert([{ scene_id: req.params.sceneId, character_id, role: role || 'present' }]).select().single();
    if (error) throw error;
    res.json({ success: true, link: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/scenes/:sceneId/characters/:characterId', async (req, res) => {
  try {
    const { error } = await supabase.from('scene_characters').delete().eq('scene_id', req.params.sceneId).eq('character_id', req.params.characterId);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 9. World Notes
app.get('/api/projects/:projectId/world-notes', async (req, res) => {
  try {
    const { data, error } = await supabase.from('world_notes').select('*').eq('project_id', req.params.projectId).single();
    if (error && error.code !== 'PGRST116') throw error;
    res.json({ notes: data || null });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/projects/:projectId/world-notes', async (req, res) => {
  try {
    const { setting, time_period, rules, important_events, tone, custom_notes } = req.body;
    const { data, error } = await supabase.from('world_notes').upsert([{ project_id: req.params.projectId, setting: setting || '', time_period: time_period || '', rules: rules || '', important_events: important_events || '', tone: tone || '', custom_notes: custom_notes || '', updated_at: new Date().toISOString() }], { onConflict: 'project_id' }).select().single();
    if (error) throw error;
    res.json({ notes: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 10. GRAPH RELATIONS
app.get('/api/projects/:projectId/relations', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { data: chars, error: charsError } = await supabase.from('characters').select('id, name').eq('project_id', projectId);
    if (charsError) throw charsError;
    let relations = [];
    if (chars && chars.length > 0) {
      const charIds = chars.map(c => c.id);
      const { data: rels, error: relsError } = await supabase.from('character_relations').select('*').in('source_id', charIds).in('target_id', charIds);
      if (relsError) throw relsError;
      relations = rels || [];
    }
    res.json({ characters: chars || [], relations: relations });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/relations', async (req, res) => {
  try {
    const { source_id, target_id, type, strength, description } = req.body;
    const { data, error } = await supabase.from('character_relations').upsert([{ source_id, target_id, type, strength: strength || 5, description: description || '' }], { onConflict: 'source_id,target_id,type' }).select().single();
    if (error) throw error;
    res.json({ success: true, relation: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/relations/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('character_relations').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 11. LOCATIONS & ITEMS
app.get('/api/projects/:projectId/locations', async (req, res) => {
  try {
    const { data, error } = await supabase.from('locations').select('*').eq('project_id', req.params.projectId);
    if (error) throw error;
    res.json({ locations: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/locations', async (req, res) => {
  try {
    const { project_id, name, type, description, parent_location_id } = req.body;
    const { data, error } = await supabase.from('locations').insert([{ project_id, name, type: type || 'unknown', description: description || '', parent_location_id }]).select().single();
    if (error) throw error;
    res.json({ success: true, location: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/projects/:projectId/items', async (req, res) => {
  try {
    const { data, error } = await supabase.from('items').select('*, characters(name), locations(name)').eq('project_id', req.params.projectId);
    if (error) throw error;
    res.json({ items: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/items', async (req, res) => {
  try {
    const { project_id, name, type, description, owner_id, location_id } = req.body;
    const { data, error } = await supabase.from('items').insert([{ project_id, name, type: type || 'unknown', description: description || '', owner_id, location_id }]).select().single();
    if (error) throw error;
    res.json({ success: true, item: data });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 12. ENTITY STATES
app.get('/api/projects/:projectId/states', async (req, res) => {
  try {
    const { data, error } = await supabase.from('entity_states').select('*').eq('project_id', req.params.projectId).eq('status', 'active').order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ states: data || [] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/states', async (req, res) => {
  try {
    const { project_id, entity_type, entity_id, dimension, label, description, reality_contract } = req.body;
    
    const insertData = {
      project_id,
      dimension,
      label,
      description: description || '',
      reality_contract: reality_contract || 'canon',
      status: 'active',
      confirmed: true,
      entity_id: null,
      character_id: null,
      location_id: null,
      item_id: null
    };

    // Преобразуем пустую строку в null, чтобы избежать ошибки UUID
    if (entity_type === 'character') insertData.character_id = entity_id || null;
    else if (entity_type === 'location') insertData.location_id = entity_id || null;
    else if (entity_type === 'item') insertData.item_id = entity_id || null;
    else throw new Error('Неверный тип сущности: ' + entity_type);

    const { data, error } = await supabase.from('entity_states').insert([insertData]).select().single();
    if (error) throw error;
    
    res.json({ success: true, state: data });
  } catch (err) {
    console.error('❌ Ошибка создания состояния:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/states/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('entity_states').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// === ТЕСТОВЫЙ ЭНДПОИНТ ДЛЯ PERCHANCE ===
app.get('/api/test-perchance', async (req, res) => {
  console.log('🚀 Получен запрос на тест Perchance...');
  const result = await testPerchanceConnection();
  res.json(result);
});

// === 14. MEDIA ASSETS (ИЗОБРАЖЕНИЯ) ===

// Получить все изображения для конкретной сущности
app.get('/api/media/:entityId', async (req, res) => {
  try {
    const { entityId } = req.params;
    const { entity_type } = req.query; // 'character', 'location', 'item'
    
    const { data, error } = await supabase
      .from('media_assets')
      .select('*')
      .eq('entity_id', entityId)
      .eq('entity_type', entity_type)
      .order('is_primary', { ascending: false }); // Главные картинки первыми
      
    if (error) throw error;
    res.json({ media: data || [] });
  } catch (err) { 
    console.error('Ошибка загрузки медиа:', err.message);
    res.status(500).json({ error: err.message }); 
  }
});

// Сохранить или обновить изображение сущности
app.post('/api/media', async (req, res) => {
  try {
    const { project_id, entity_id, entity_type, url, prompt_description, is_primary } = req.body;
    
    // Для MVP: если is_primary = true, сначала снимаем этот флаг с других картинок этой сущности
    if (is_primary) {
      await supabase.from('media_assets')
        .update({ is_primary: false })
        .eq('entity_id', entity_id)
        .eq('entity_type', entity_type);
    }

    const { data, error } = await supabase
      .from('media_assets')
      .insert([{ 
        project_id, 
        entity_id, 
        entity_type, 
        url: url || null, 
        prompt_description: prompt_description || '', 
        is_primary: is_primary || false 
      }])
      .select()
      .single();
      
    if (error) throw error;
    res.json({ success: true, media: data });
  } catch (err) { 
    console.error('Ошибка сохранения медиа:', err.message);
    res.status(500).json({ error: err.message }); 
  }
});

   // === ЭНДПОИНТ ГЕНЕРАЦИИ ИЗОБРАЖЕНИЯ ЧЕРЕЗ PERCHANCE ===
   app.post('/api/generate-image', async (req, res) => {
     try {
       const { prompt } = req.body;
       if (!prompt) return res.status(400).json({ error: 'Промпт не указан' });
       
       const result = await generateImage(prompt);
       res.json(result);
     } catch (err) {
       console.error('Ошибка в /api/generate-image:', err.message);
       res.status(500).json({ error: err.message });
     }
   });

app.get('/api/entities/:entityId/states', async (req, res) => {
  try {
    const { entityId } = req.params;
    const { entity_type } = req.query;

    let query = supabase.from('entity_states').select('*').eq('status', 'active');

    if (entity_type === 'character') query = query.eq('character_id', entityId);
    else if (entity_type === 'location') query = query.eq('location_id', entityId);
    else if (entity_type === 'item') query = query.eq('item_id', entityId);
    else query = query.or(`character_id.eq.${entityId},location_id.eq.${entityId},item_id.eq.${entityId}`);

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    const enriched = (data || []).map(s => ({
      ...s,
      entity_type: s.character_id ? 'character' : s.location_id ? 'location' : s.item_id ? 'item' : null,
      entity_id: s.character_id || s.location_id || s.item_id || null
    }));
    res.json({ states: enriched });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 13. Catch-all for React (ДОЛЖЕН БЫТЬ В САМОМ КОНЦЕ)
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

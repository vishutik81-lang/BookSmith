import { useState, useEffect } from 'react'
import PromptInspector from './components/PromptInspector'

export default function App() {
  const [view, setView] = useState('library')
  const [hoveredBookId, setHoveredBookId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState('idle')
  const [books, setBooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeBookId, setActiveBookId] = useState<string | null>(null)
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null)
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null)

  const [editingChapterId, setEditingChapterId] = useState<string | null>(null)
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null)
  const [editingBookId, setEditingBookId] = useState<string | null>(null)
  const [bookMetaForm, setBookMetaForm] = useState({ title: '', genre: '', subgenre: '' })

  const [characters, setCharacters] = useState<any[]>([])
  const [showCharacterModal, setShowCharacterModal] = useState(false)
  const [editingCharacter, setEditingCharacter] = useState<any>(null)
  const [characterForm, setCharacterForm] = useState({
    name: '', description: '', role: 'secondary',
    appearance: '', personality: '', sexual_orientation: '',
    gender: 'not_specified', race: 'human'
  })

  // === НОВОЕ: Персонажи текущей сцены ===
  const [sceneCharacters, setSceneCharacters] = useState<any[]>([])
  const [showSceneCharPicker, setShowSceneCharPicker] = useState(false)

  const [worldNotes, setWorldNotes] = useState({
    setting: '', time_period: '', rules: '',
    important_events: '', tone: '', custom_notes: ''
  })
  const [worldNotesSaveStatus, setWorldNotesSaveStatus] = useState('idle')

  const [showContextBefore, setShowContextBefore] = useState(false)
  const [showSceneChars, setShowSceneChars] = useState(true)

  const [showSettings, setShowSettings] = useState(false)
  const [creativeLatitude, setCreativeLatitude] = useState('guided')
  const [policies, setPolicies] = useState({ nsfw: 2, realism: 3, cruelty: 2 })

  const [selectedModel, setSelectedModel] = useState<string>(localStorage.getItem('selectedAIModel') || 'liquid/lfm-2.5-2.6b:free')
  const [availableModels, setAvailableModels] = useState<any[]>([])
  const [aiInstruction, setAiInstruction] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
    const [generationHistory, setGenerationHistory] = useState<any[]>([])
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null)

  // Prompt Inspector
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [inspectorRecord, setInspectorRecord] = useState<any>(null)

  useEffect(() => {
    const loadBooks = async () => {
      try {
        const res = await fetch('/api/projects')
        const data = await res.json()
        if (data.projects) {
          const loadedBooks = data.projects.map((p: any) => ({
            id: p.id, title: p.title, status: 'В работе',
            genre: p.genre || 'Не указан', subgenre: p.subgenre || '',
            chapters: (p.chapters || []).map((ch: any) => ({
              id: ch.id, title: ch.title,
              scenes: (ch.scenes || []).map((s: any) => ({
                id: s.id, title: s.title, text: s.body || '', context_before: s.context_before || ''
              }))
            }))
          }))
          setBooks(loadedBooks)
        }
      } catch (error) { console.error('Ошибка загрузки книг:', error) }
      finally { setLoading(false) }
    }
    loadBooks()
    loadModels()
  }, [])

  // === НОВОЕ: Загружаем персонажей сцены при её смене ===
  useEffect(() => {
    if (activeSceneId) {
      loadSceneCharacters(activeSceneId)
    } else {
      setSceneCharacters([])
    }
  }, [activeSceneId])

  const activeBook = books.find(b => b.id === activeBookId)
  const activeChapter = activeBook?.chapters.find(c => c.id === activeChapterId)
  const activeScene = activeChapter?.scenes.find(s => s.id === activeSceneId)
  const activeHistory = generationHistory.find(h => h.id === activeHistoryId)

  const generateUUID = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })

  const handleTextChange = (newText: string) => {
    setBooks(books.map(book => {
      if (book.id !== activeBookId) return book
      return { ...book, chapters: book.chapters.map(chapter => {
        if (chapter.id !== activeChapterId) return chapter
        return { ...chapter, scenes: chapter.scenes.map(scene => scene.id === activeSceneId ? { ...scene, text: newText } : scene) }
      })}
    }))
    if (saveStatus === 'saved') setSaveStatus('idle')
  }

  const handleContextBeforeChange = (newContext: string) => {
    setBooks(books.map(book => {
      if (book.id !== activeBookId) return book
      return { ...book, chapters: book.chapters.map(chapter => {
        if (chapter.id !== activeChapterId) return chapter
        return { ...chapter, scenes: chapter.scenes.map(scene => scene.id === activeSceneId ? { ...scene, context_before: newContext } : scene) }
      })}
    }))
  }

 const addChapter = async () => {
  try {
    // Создаём главу на сервере сразу
    const res = await fetch(`/api/projects/${activeBookId}/chapters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Новая глава', sort_order: 0 })
    });
    const data = await res.json();
    
    if (data.success) {
      const newChapter = { 
        id: data.chapter.id, 
        title: data.chapter.title, 
        scenes: [] 
      };
      
      setBooks(books.map(b => b.id === activeBookId ? { ...b, chapters: [...b.chapters, newChapter] } : b));
    } else {
      alert('Ошибка создания главы: ' + data.error);
    }
  } catch (error: any) {
    alert('Ошибка соединения: ' + error.message);
  }
};

  const addScene = async (chapterId: string) => {
  try {
    // Создаём сцену на сервере сразу
    const res = await fetch(`/api/chapters/${chapterId}/scenes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Новая сцена', body: '', sort_order: 0 })
    });
    const data = await res.json();
    
    if (data.success) {
      const newScene = { 
        id: data.scene.id, 
        title: data.scene.title, 
        text: data.scene.body || '', 
        context_before: '' 
      };
      
      setBooks(books.map(b => {
        if (b.id !== activeBookId) return b;
        return { 
          ...b, 
          chapters: b.chapters.map(c => c.id === chapterId ? { ...c, scenes: [...c.scenes, newScene] } : c) 
        };
      }));
      
      setActiveChapterId(chapterId);
      setActiveSceneId(newScene.id);
    } else {
      alert('Ошибка создания сцены: ' + data.error);
    }
  } catch (error: any) {
    alert('Ошибка соединения: ' + error.message);
  }
};

  const handleCreateBook = async () => {
    const title = window.prompt('Как назовем новую книгу?')
    if (!title || title.trim() === '') return
    const genre = window.prompt('Жанр (например: Фэнтези, Детектив):') || 'Не указан'
    const subgenre = window.prompt('Поджанр (необязательно):') || ''
    try {
      const res = await fetch('/api/projects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: subgenre, genre, subgenre })
      })
      const data = await res.json()
      if (data.project) {
        const newBook = {
          id: data.project.id, title: data.project.title, status: 'В работе',
          genre: genre, subgenre: subgenre,
          chapters: data.project.chapters.map((ch: any) => ({
            id: ch.id, title: ch.title,
            scenes: ch.scenes.map((s: any) => ({ id: s.id, title: s.title, text: s.body || '', context_before: '' }))
          }))
        }
        setBooks([...books, newBook]); setActiveBookId(newBook.id); setActiveChapterId(newBook.chapters[0].id); setActiveSceneId(newBook.chapters[0].scenes[0].id); setView('editor'); loadCharacters(newBook.id); loadWorldNotes(newBook.id)
      } else { alert('Ошибка создания: ' + data.error) }
    } catch (error: any) { alert('Ошибка соединения: ' + error.message) }
  }

  const handleSave = async () => {
    if (!activeScene) return
    setSaveStatus('saving')
    try {
      const res = await fetch(`/api/scenes/${activeScene.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: activeScene.text, context_before: activeScene.context_before })
      })
      const data = await res.json()
      if (data.success) { setSaveStatus('saved'); setTimeout(() => setSaveStatus('idle'), 2000) }
      else { alert('Ошибка сохранения: ' + data.error); setSaveStatus('idle') }
    } catch (error: any) { alert('Ошибка сети: ' + error.message); setSaveStatus('idle') }
  }

  const handleUpdateChapterTitle = async (chapterId: string, newTitle: string) => {
    if (!newTitle.trim()) return
    try {
      const res = await fetch(`/api/chapters/${chapterId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newTitle }) })
      const data = await res.json()
      if (data.success) { setBooks(books.map(book => book.id !== activeBookId ? book : { ...book, chapters: book.chapters.map(ch => ch.id === chapterId ? { ...ch, title: newTitle } : ch) })); setEditingChapterId(null) }
      else { alert('Ошибка: ' + data.error) }
    } catch (error: any) { alert('Ошибка: ' + error.message) }
  }

  const handleUpdateSceneTitle = async (sceneId: string, newTitle: string) => {
    if (!newTitle.trim()) return
    try {
      const res = await fetch(`/api/scenes/title/${sceneId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: newTitle }) })
      const data = await res.json()
      if (data.success) { setBooks(books.map(book => book.id !== activeBookId ? book : { ...book, chapters: book.chapters.map(ch => ({ ...ch, scenes: ch.scenes.map(s => s.id === sceneId ? { ...s, title: newTitle } : s) })) })); setEditingSceneId(null) }
      else { alert('Ошибка: ' + data.error) }
    } catch (error: any) { alert('Ошибка: ' + error.message) }
  }

  const handleUpdateBookMeta = async () => {
    if (!bookMetaForm.title.trim()) { alert('Название обязательно'); return }
    try {
      const res = await fetch(`/api/projects/${activeBookId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: bookMetaForm.title, genre: bookMetaForm.genre, subgenre: bookMetaForm.subgenre })
      })
      const data = await res.json()
      if (data.success) {
        setBooks(books.map(b => b.id === activeBookId ? { ...b, title: bookMetaForm.title, genre: bookMetaForm.genre, subgenre: bookMetaForm.subgenre } : b))
        setEditingBookId(null)
      } else { alert('Ошибка: ' + data.error) }
    } catch (error: any) { alert('Ошибка: ' + error.message) }
  }

  const handleDeleteBook = async (bookId: string, bookTitle: string) => {
    if (!window.confirm(`Удалить книгу "${bookTitle}"?`)) return
    try {
      const res = await fetch(`/api/projects/${bookId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) { setBooks(books.filter(b => b.id !== bookId)); if (activeBookId === bookId) { setView('library'); setActiveBookId(null); setActiveChapterId(null); setActiveSceneId(null) } }
      else { alert('Ошибка: ' + data.error) }
    } catch (error: any) { alert('Ошибка: ' + error.message) }
  }

  const loadCharacters = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/characters`)
      const data = await res.json()
      if (data.characters) setCharacters(data.characters)
    } catch (error) { console.error('Ошибка загрузки персонажей:', error) }
  }

  // === НОВОЕ: Загрузка персонажей конкретной сцены ===
  const loadSceneCharacters = async (sceneId: string) => {
    try {
      const res = await fetch(`/api/scenes/${sceneId}/characters`)
      const data = await res.json()
      if (data.characters) setSceneCharacters(data.characters)
      else setSceneCharacters([])
    } catch (error) {
      console.error('Ошибка загрузки персонажей сцены:', error)
      setSceneCharacters([])
    }
  }

  // === НОВОЕ: Добавление персонажа в сцену ===
  const addCharacterToScene = async (characterId: string, role: string = 'present') => {
    if (!activeSceneId) return
    try {
      const res = await fetch(`/api/scenes/${activeSceneId}/characters`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ character_id: characterId, role })
      })
      const data = await res.json()
      if (data.success) {
        await loadSceneCharacters(activeSceneId)
        setShowSceneCharPicker(false)
      } else { alert('Ошибка: ' + data.error) }
    } catch (error: any) { alert('Ошибка: ' + error.message) }
  }

  // === НОВОЕ: Удаление персонажа из сцены ===
  const removeCharacterFromScene = async (characterId: string) => {
    if (!activeSceneId) return
    try {
      const res = await fetch(`/api/scenes/${activeSceneId}/characters/${characterId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setSceneCharacters(sceneCharacters.filter(sc => sc.character_id !== characterId))
      } else { alert('Ошибка: ' + data.error) }
    } catch (error: any) { alert('Ошибка: ' + error.message) }
  }

  // === НОВОЕ: Изменение роли персонажа в сцене ===
  const updateSceneCharacterRole = async (characterId: string, newRole: string) => {
    if (!activeSceneId) return
    try {
      // Удаляем и добавляем с новой ролью (т.к. нет PATCH)
      await fetch(`/api/scenes/${activeSceneId}/characters/${characterId}`, { method: 'DELETE' })
      await fetch(`/api/scenes/${activeSceneId}/characters`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ character_id: characterId, role: newRole })
      })
      await loadSceneCharacters(activeSceneId)
    } catch (error: any) { alert('Ошибка: ' + error.message) }
  }

  const loadWorldNotes = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/world-notes`)
      const data = await res.json()
      if (data.notes) {
        setWorldNotes({
          setting: data.notes.setting || '', time_period: data.notes.time_period || '', rules: data.notes.rules || '',
          important_events: data.notes.important_events || '', tone: data.notes.tone || '', custom_notes: data.notes.custom_notes || ''
        })
      } else {
        setWorldNotes({ setting: '', time_period: '', rules: '', important_events: '', tone: '', custom_notes: '' })
      }
    } catch (error) { console.error('Ошибка загрузки заметок:', error) }
  }

  const handleSaveWorldNotes = async () => {
    if (!activeBookId) return
    setWorldNotesSaveStatus('saving')
    try {
      const res = await fetch(`/api/projects/${activeBookId}/world-notes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(worldNotes)
      })
      const data = await res.json()
      if (data.notes) { setWorldNotesSaveStatus('saved'); setTimeout(() => setWorldNotesSaveStatus('idle'), 2000) }
      else { alert('Ошибка: ' + data.error); setWorldNotesSaveStatus('idle') }
    } catch (error: any) { alert('Ошибка: ' + error.message); setWorldNotesSaveStatus('idle') }
  }

  const loadModels = async () => {
    try {
      const res = await fetch('/api/models')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const modelsList = Array.isArray(data) ? data : (data.models || [])
      if (modelsList.length > 0) {
        setAvailableModels(modelsList)
        if (!modelsList.find((m: any) => m.id === selectedModel)) { setSelectedModel(modelsList[0].id); localStorage.setItem('selectedAIModel', modelsList[0].id) }
      } else { throw new Error('Список моделей пуст') }
    } catch (error) {
      console.warn('Fallback модели:', error)
      const fallback = [
        { id: 'liquid/lfm-2.5-2.6b:free', name: 'Liquid LFM 2.5 (2.6B)' },
        { id: 'thinkingmachines/inkling-small:free', name: 'Inkling Small' },
        { id: 'nvidia/nemotron-3-ultra-550b-a55b:free', name: 'Nemotron 3 Ultra (550B)' }
      ]
      setAvailableModels(fallback)
      if (!fallback.find((m: any) => m.id === selectedModel)) { setSelectedModel(fallback[0].id); localStorage.setItem('selectedAIModel', fallback[0].id) }
    }
  }

  const handleSaveCharacter = async () => {
    if (!characterForm.name.trim()) { alert('Имя обязательно'); return }
    try {
      const url = editingCharacter ? `/api/characters/${editingCharacter.id}` : `/api/projects/${activeBookId}/characters`
      const res = await fetch(url, { method: editingCharacter ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(characterForm) })
      const data = await res.json()
      if (data.character) {
        if (editingCharacter) setCharacters(characters.map(c => c.id === data.character.id ? data.character : c))
        else setCharacters([...characters, data.character])
        setShowCharacterModal(false); setEditingCharacter(null); setCharacterForm({ name: '', description: '', role: 'secondary', appearance: '', personality: '', sexual_orientation: '', gender: 'not_specified', race: 'human' })
      } else { alert('Ошибка: ' + data.error) }
    } catch (error: any) { alert('Ошибка сохранения: ' + error.message) }
  }

  const handleDeleteCharacter = async (characterId: string, characterName: string) => {
    if (!window.confirm(`Удалить "${characterName}"?`)) return
    try {
      const res = await fetch(`/api/characters/${characterId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) setCharacters(characters.filter(c => c.id !== characterId))
      else alert('Ошибка: ' + data.error)
    } catch (error: any) { alert('Ошибка: ' + error.message) }
  }

  const openCharacterModal = (character?: any) => {
    if (character) {
      setEditingCharacter(character)
      setCharacterForm({
        name: character.name, description: character.description || '', role: character.role || 'secondary',
        appearance: character.appearance || '', personality: character.personality || '', sexual_orientation: character.sexual_orientation || '',
        gender: character.gender || 'not_specified', race: character.race || 'human'
      })
    } else {
      setEditingCharacter(null)
      setCharacterForm({ name: '', description: '', role: 'secondary', appearance: '', personality: '', sexual_orientation: '', gender: 'not_specified', race: 'human' })
    }
    setShowCharacterModal(true)
  }

    // === CREATIVE LATITUDE ===
  const getLatitudeInstruction = () => {
    switch (creativeLatitude) {
      case 'strict':
        return 'Строго следуй инструкции автора. Не добавляй новых деталей, локаций или персонажей, не импровизируй.'
      case 'constrained':
        return 'Минимальные допущения. Добавляй только то, что логически вытекает из контекста и предыстории.'
      case 'guided':
        return 'Сбалансированный подход. Можешь добавлять атмосферные детали (запахи, звуки), но не меняй суть сцены.'
      case 'open':
        return 'Максимальная творческая свобода. Можешь придумывать новые детали, второстепенных персонажей, неожиданные повороты, если это оживляет сцену.'
      default:
        return ''
    }
  }

  // === POLICY EXPANDER (Semantic portability) ===
  const getPolicyInstruction = () => {
  // === NSFW: 6 уровней (0-5) ===
  const nsfwTexts = [
    'Полностью исключи откровенность, намёки и романтические линии.', // 0
    'Допустимы лёгкие романтические намёки, но без физической близости.', // 1
    'Разрешены эмоциональная интимность, флирт, поцелуи. Без детализации.', // 2
    'Допустимы взрослые темы, страсть, намёки на близость. Без порнографии.', // 3
    'Разрешена эротика и чувственные сцены с художественной детализацией.', // 4
    'Откровенный контент и эротика разрешены в рамках сюжета без ограничений.', // 5
  ]

  // === Реализм: 5 уровней (1-5) ===
  const realismTexts = [
    '', // 0 — не используется (минимум 1)
    'Сказочный стиль. Фокус на действии и эмоциях, без бытовых деталей.', // 1
    'Условный реализм. Минимум быта, акцент на диалогах и ключевых событиях.', // 2
    'Средний реализм. Повседневные детали присутствуют, но не доминируют.', // 3
    'Высокий реализм. Раны, усталость, страх и последствия влияют на персонажей.', // 4
    'Максимальный реализм. Физиология, психология и быт с медицинской точностью.', // 5
  ]

  // === Жестокость: 6 уровней (0-5) ===
  const crueltyTexts = [
    'Бескровный стиль. Насилие и жестокость полностью за кадром.', // 0
    'Минимальная жестокость. Упоминания конфликтов без деталей.', // 1
    'Умеренная жестокость. Показывай последствия, но без крови и боли.', // 2
    'Детализированная жестокость. Кровь, боль, раны описываются, но без садизма.', // 3
    'Высокая жестокость. Насилие, кровь, травмы описываются подробно.', // 4
    'Максимальная жестокость. Детализированное насилие, если требует сюжет.', // 5
  ]

  const nsfwText = nsfwTexts[policies.nsfw] || nsfwTexts[0]
  const realismText = realismTexts[policies.realism] || realismTexts[1]
  const crueltyText = crueltyTexts[policies.cruelty] || crueltyTexts[0]

  return `- Откровенность (NSFW): ${nsfwText}\n- Реализм: ${realismText}\n- Жестокость: ${crueltyText}`
}

  // === CONTEXT BUILDER + PROMPT RENDERER ===
  // Единственное место, где собирается промпт.
  // Используется и для генерации, и для инспектора — расхождений быть не может.
  const buildPromptContext = () => {
    const charactersContext =
      sceneCharacters.length > 0
        ? 'Персонажи в этой сцене:\n' +
          sceneCharacters
            .map((sc: any) => {
              const c = sc.characters
              const roleLabel =
                sc.role === 'pov' ? 'POV' : sc.role === 'mentioned' ? 'упоминается' : 'присутствует'
              const parts = [`• ${c?.name || 'Без имени'} (${roleLabel})`]
              if (c?.gender && c.gender !== 'not_specified') parts.push(`Пол: ${c.gender}`)
              if (c?.race && c.race !== 'human') parts.push(`Раса: ${c.race}`)
              if (c?.sexual_orientation && c.sexual_orientation !== 'not_specified')
                parts.push(`Ориентация: ${c.sexual_orientation}`)
              if (c?.appearance) parts.push(`Внешность: ${c.appearance}`)
              if (c?.personality) parts.push(`Характер: ${c.personality}`)
              if (c?.description) parts.push(`Роль в сюжете: ${c.description}`)
              return parts.join('. ')
            })
            .join('\n')
        : 'В этой сцене пока нет привязанных персонажей. Оперируй только теми, кто упомянут в инструкции автора.'

    const worldSection = [
      worldNotes.setting && `Место действия: ${worldNotes.setting}`,
      worldNotes.time_period && `Время: ${worldNotes.time_period}`,
      worldNotes.rules && `Правила мира: ${worldNotes.rules}`,
      worldNotes.important_events && `Важные события: ${worldNotes.important_events}`,
      worldNotes.tone && `Тон и стиль: ${worldNotes.tone}`,
      worldNotes.custom_notes && `Дополнительно: ${worldNotes.custom_notes}`,
    ]
      .filter(Boolean)
      .join('\n')

    const prompt = `Ты — ИИ-соавтор художественной литературы. Твоя задача — создать НОВЫЙ ВАРИАНТ сцены на основе инструкции автора, а не продолжить существующий текст.

=== МИР ПРОИЗВЕДЕНИЯ ===
${worldSection || '(мир не описан)'}

=== ПЕРСОНАЖИ СЦЕНЫ ===
${charactersContext}

=== ПРЕДЫСТОРИЯ СЦЕНЫ ===
${activeScene?.context_before || '(не указана)'}

=== ТЕКУЩИЙ ТЕКСТ СЦЕНЫ (только как контекст, НЕ продолжай его) ===
"""
${activeScene?.text || '(сцена пока пустая)'}
"""

=== ИНСТРУКЦИЯ АВТОРА ===
${aiInstruction}

=== РЕЖИМ ГЕНЕРАЦИИ ===
${getLatitudeInstruction()}

=== ПОЛИТИКИ КОНТЕНТА ===
${getPolicyInstruction()}

=== ТРЕБОВАНИЯ ===
1. Создай самостоятельный вариант сцены, а не продолжение текста выше.
2. Строго соблюдай имена персонажей из списка (например, «Энн», а не «Анна»).
3. Следуй инструкции автора по действию — если сказано "сидит в таверне", значит сцена начинается с этого.
4. Не привлекай персонажей книги, которых нет в списке «Персонажи сцены».
5. Временных второстепенных персонажей (прохожие, официантки, пираты) придумывать разрешено в рамках режима генерации.
6. Учитывай предысторию сцены для логической связности.
7. Следуй тону, стилю и правилам мира. Не допускай анахронизмов, противоречащих эпохе.
8. Пиши на русском языке, без иностранных вставок, иероглифов и мета-комментариев.
9. Только художественный текст, без заголовков, пояснений и подписей.`

    const snapshot = {
      sceneId: activeScene?.id || '',
      sceneTitle: activeScene?.title || '',
      sceneTextLength: (activeScene?.text || '').length,
      contextBefore: activeScene?.context_before || '',
      characters: sceneCharacters.map((sc: any) => ({
        id: sc.character_id,
        name: sc.characters?.name || 'Без имени',
        role: sc.role,
      })),
      worldNotes: { ...worldNotes },
      latitude: creativeLatitude,
      policies: { ...policies },
      instruction: aiInstruction,
      modelId: selectedModel,
    }

    return { prompt, snapshot }
  }

  // === PROMPT INSPECTOR ===
  const openPromptInspector = (mode: 'sent' | 'preview' = 'sent') => {
    // Показываем РЕАЛЬНЫЙ промпт выбранного варианта
    if (mode === 'sent' && activeHistory?.prompt) {
      setInspectorRecord({
        kind: 'sent',
        createdAt: activeHistory.createdAt,
        prompt: activeHistory.prompt,
        modelId: activeHistory.modelId,
        ...activeHistory.snapshot,
      })
      setInspectorOpen(true)
      return
    }

    // Иначе — честный предпросмотр текущего состояния
    if (!activeScene) {
      alert('Сначала выберите сцену.')
      return
    }

    const { prompt, snapshot } = buildPromptContext()
    setInspectorRecord({
      kind: 'preview',
      createdAt: Date.now(),
      prompt,
      ...snapshot,
    })
    setInspectorOpen(true)
  }

  // === GENERATION ===
  const handleGenerateAI = async () => {
    if (!aiInstruction.trim() || !activeScene) return
    setIsGenerating(true)

    try {
      const { prompt, snapshot } = buildPromptContext()

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, modelId: selectedModel }),
      })

      const data = await res.json()

      if (data.text && !data.text.startsWith('Ошибка:')) {
        const newEntry = {
          id: Date.now().toString(),
          text: data.text,
          instruction: aiInstruction,
          prompt,
          modelId: selectedModel,
          createdAt: Date.now(),
          snapshot,
        }
        setGenerationHistory((prev) => [newEntry, ...prev].slice(0, 5))
        setActiveHistoryId(newEntry.id)
      } else {
        alert('Ошибка ИИ: ' + (data.text || data.error || 'Неизвестная ошибка'))
      }
    } catch (error: any) {
      alert('Ошибка соединения: ' + error.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const insertHistoryToScene = () => {
    if (activeScene && activeHistory) {
      const newText = activeScene.text + (activeScene.text ? '\n\n' : '') + activeHistory.text
      handleTextChange(newText)
    }
  }

  const inputStyle = { width: '100%', padding: '8px', border: '1px solid #dcd3c1', borderRadius: '4px', fontSize: '0.85rem', boxSizing: 'border-box' as const, background: '#fdfbf7', fontFamily: 'Georgia, serif' }
  const labelStyle = { display: 'block', marginBottom: '4px', fontWeight: 'bold', color: '#5c3a21', fontSize: '0.8rem' }

  // === НОВОЕ: Список персонажей книги, которых ещё нет в сцене ===
  const availableCharactersForScene = characters.filter(
    c => !sceneCharacters.some(sc => sc.character_id === c.id)
  )

  return (
    <div style={{ minHeight: '100vh', background: '#fdfbf7', fontFamily: 'Georgia, serif', color: '#2c241b' }}>
      <style>{`.book-card { transition: all 0.2s ease; cursor: pointer; } .book-card:hover { transform: translateY(-4px); box-shadow: 0 10px 20px rgba(92, 58, 33, 0.15); } .create-card { transition: all 0.2s ease; cursor: pointer; } .create-card:hover { background: #ebe3d5 !important; border-color: #7a4b3a !important; } .tree-item { cursor: pointer; transition: background 0.2s; } .tree-item:hover { background: #ebe3d5; }`}</style>

      {loading && <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.2rem', color: '#7a6b5d' }}>Загрузка библиотеки...</div>}

      {/* === БИБЛИОТЕКА === */}
      {!loading && view === 'library' && (
        <div style={{ padding: '40px 10%', maxWidth: '1200px', margin: '0 auto' }}>
          <header style={{ marginBottom: '40px', borderBottom: '1px solid #dcd3c1', paddingBottom: '20px' }}>
            <h1 style={{ fontSize: '2.5rem', color: '#5c3a21', margin: 0 }}>Моя Библиотека</h1>
          </header>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '25px' }}>
            <div className="create-card" onClick={handleCreateBook} style={{ aspectRatio: '3/4', border: '2px dashed #bfaea1', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f5f0e6' }}>
              <div style={{ fontSize: '3rem', color: '#7a4b3a' }}>+</div>
              <div style={{ fontSize: '1.1rem', color: '#5c3a21', fontWeight: 'bold' }}>Новая книга</div>
            </div>
            {books.map(book => (
              <div key={book.id} className="book-card" onMouseEnter={() => setHoveredBookId(book.id)} onMouseLeave={() => setHoveredBookId(null)} onClick={() => {
                setActiveBookId(book.id); setActiveChapterId(book.chapters[0]?.id || null); setActiveSceneId(book.chapters[0]?.scenes[0]?.id || null); setView('editor'); loadCharacters(book.id); loadWorldNotes(book.id)
              }} style={{ aspectRatio: '3/4', background: '#ffffff', borderRadius: '8px', border: '1px solid #dcd3c1', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative', overflow: 'hidden' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#2c241b' }}>{book.title}</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#7a6b5d' }}>{book.genre}{book.subgenre ? ` • ${book.subgenre}` : ''}</p>
                {hoveredBookId === book.id && <button onClick={(e) => { e.stopPropagation(); handleDeleteBook(book.id, book.title) }} style={{ position: 'absolute', top: '10px', right: '10px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', padding: '6px 10px', cursor: 'pointer', fontSize: '0.8rem', zIndex: 10 }}>🗑️ Удалить</button>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === ПЕРСОНАЖИ === */}
      {!loading && view === 'characters' && activeBook && (
        <div style={{ padding: '40px 10%', maxWidth: '1000px', margin: '0 auto' }}>
          <header style={{ marginBottom: '30px', borderBottom: '1px solid #dcd3c1', paddingBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '2rem', color: '#5c3a21', margin: 0 }}>Персонажи: {activeBook.title}</h1>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setView('editor')} style={{ padding: '8px 16px', background: 'none', border: '1px solid #7a4b3a', color: '#7a4b3a', borderRadius: '6px', cursor: 'pointer' }}>← К редактору</button>
              <button onClick={() => openCharacterModal()} style={{ padding: '8px 16px', background: '#7a4b3a', color: '#fdfbf7', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>+ Новый персонаж</button>
            </div>
          </header>
          {characters.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#7a6b5d' }}><div style={{ fontSize: '3rem', marginBottom: '20px' }}>👥</div><p>Пока нет персонажей</p></div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {characters.map(char => (
                <div key={char.id} style={{ background: '#ffffff', border: '1px solid #dcd3c1', borderRadius: '8px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#2c241b' }}>{char.name}</h3>
                    <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', background: char.role === 'protagonist' ? '#dbeafe' : char.role === 'antagonist' ? '#fee2e2' : '#f3f4f6', color: char.role === 'protagonist' ? '#1e40af' : char.role === 'antagonist' ? '#991b1b' : '#4b5563' }}>
                      {char.role === 'protagonist' ? 'Протагонист' : char.role === 'antagonist' ? 'Антагонист' : 'Второстепенный'}
                    </span>
                  </div>
                  {char.race && char.race !== 'human' && <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#4a3f35' }}><strong>Раса:</strong> {char.race}</p>}
                  {char.appearance && <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#4a3f35' }}><strong>Внешность:</strong> {char.appearance}</p>}
                  {char.personality && <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#4a3f35' }}><strong>Характер:</strong> {char.personality}</p>}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '15px' }}>
                    <button onClick={() => openCharacterModal(char)} style={{ flex: 1, padding: '6px', background: 'none', border: '1px solid #dcd3c1', color: '#7a4b3a', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>✏️ Изменить</button>
                    <button onClick={() => handleDeleteCharacter(char.id, char.name)} style={{ flex: 1, padding: '6px', background: 'none', border: '1px solid #fee2e2', color: '#991b1b', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>🗑️ Удалить</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {showCharacterModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div style={{ background: '#fdfbf7', borderRadius: '12px', padding: '30px', maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
                <h2 style={{ marginTop: 0, color: '#5c3a21' }}>{editingCharacter ? 'Редактировать персонажа' : 'Новый персонаж'}</h2>
                <div style={{ marginBottom: '15px' }}>
                  <label style={labelStyle}>Имя *</label>
                  <input type="text" value={characterForm.name} onChange={(e) => setCharacterForm({ ...characterForm, name: e.target.value })} style={inputStyle} placeholder="Например: Энн Бони" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                  <div>
                    <label style={labelStyle}>Роль</label>
                    <select value={characterForm.role} onChange={(e) => setCharacterForm({ ...characterForm, role: e.target.value })} style={inputStyle}>
                      <option value="protagonist">Протагонист</option>
                      <option value="antagonist">Антагонист</option>
                      <option value="secondary">Второстепенный</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Пол</label>
                    <select value={characterForm.gender} onChange={(e) => setCharacterForm({ ...characterForm, gender: e.target.value })} style={inputStyle}>
                      <option value="not_specified">Не указано</option>
                      <option value="male">Мужской</option>
                      <option value="female">Женский</option>
                      <option value="non_binary">Небинарный</option>
                      <option value="other">Другое</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Раса</label>
                    <select value={characterForm.race} onChange={(e) => setCharacterForm({ ...characterForm, race: e.target.value })} style={inputStyle}>
                      <option value="human">Человек</option>
                      <option value="elf">Эльф</option>
                      <option value="dwarf">Дварф</option>
                      <option value="orc">Орк</option>
                      <option value="android">Андроид</option>
                      <option value="alien">Инопланетянин</option>
                      <option value="other">Другое / Своя</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={labelStyle}>Ориентация</label>
                  <select value={characterForm.sexual_orientation} onChange={(e) => setCharacterForm({ ...characterForm, sexual_orientation: e.target.value })} style={inputStyle}>
                    <option value="not_specified">Не указано</option>
                    <option value="heterosexual">Гетеросексуал(ка)</option>
                    <option value="homosexual">Гомосексуал(ка)</option>
                    <option value="bisexual">Бисексуал(ка)</option>
                    <option value="pansexual">Пансексуал(ка)</option>
                    <option value="asexual">Асексуал(ка)</option>
                    <option value="other">Другое</option>
                  </select>
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={labelStyle}>Внешность</label>
                  <textarea value={characterForm.appearance} onChange={(e) => setCharacterForm({ ...characterForm, appearance: e.target.value })} style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} placeholder="Цвет волос, глаз, телосложение..." />
                </div>
                <div style={{ marginBottom: '15px' }}>
                  <label style={labelStyle}>Характер и повадки</label>
                  <textarea value={characterForm.personality} onChange={(e) => setCharacterForm({ ...characterForm, personality: e.target.value })} style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} placeholder="Темперамент, манера речи, страхи..." />
                </div>
                <div style={{ marginBottom: '25px' }}>
                  <label style={labelStyle}>Роль в сюжете</label>
                  <textarea value={characterForm.description} onChange={(e) => setCharacterForm({ ...characterForm, description: e.target.value })} style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} placeholder="Как связан с сюжетом?" />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => { setShowCharacterModal(false); setEditingCharacter(null) }} style={{ flex: 1, padding: '10px', background: 'none', border: '1px solid #dcd3c1', color: '#7a6b5d', borderRadius: '6px', cursor: 'pointer' }}>Отмена</button>
                  <button onClick={handleSaveCharacter} style={{ flex: 1, padding: '10px', background: '#7a4b3a', color: '#fdfbf7', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{editingCharacter ? 'Сохранить' : 'Создать'}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* === МИР КНИГИ === */}
      {!loading && view === 'world' && activeBook && (
        <div style={{ padding: '40px 10%', maxWidth: '900px', margin: '0 auto' }}>
          <header style={{ marginBottom: '30px', borderBottom: '1px solid #dcd3c1', paddingBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '2rem', color: '#5c3a21', margin: 0 }}>🌍 Мир книги: {activeBook.title}</h1>
              <p style={{ color: '#7a6b5d', marginTop: '8px' }}>Эти данные передаются ИИ и помогают сохранять канон</p>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button onClick={() => setView('editor')} style={{ padding: '8px 16px', background: 'none', border: '1px solid #7a4b3a', color: '#7a4b3a', borderRadius: '6px', cursor: 'pointer' }}>← К редактору</button>
              <button onClick={handleSaveWorldNotes} disabled={worldNotesSaveStatus !== 'idle'} style={{ padding: '8px 16px', background: worldNotesSaveStatus === 'saved' ? '#5c7a5c' : '#7a4b3a', color: '#fdfbf7', border: 'none', borderRadius: '6px', cursor: worldNotesSaveStatus === 'idle' ? 'pointer' : 'default', fontWeight: 'bold' }}>
                {worldNotesSaveStatus === 'saving' ? 'Сохранение...' : worldNotesSaveStatus === 'saved' ? '✓ Сохранено' : '💾 Сохранить мир'}
              </button>
            </div>
          </header>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: '#ffffff', border: '1px solid #dcd3c1', borderRadius: '8px', padding: '20px' }}>
              <label style={labelStyle}>🏰 Сеттинг (место действия)</label>
              <textarea value={worldNotes.setting} onChange={(e) => setWorldNotes({ ...worldNotes, setting: e.target.value })} style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }} placeholder="Например: порт Тортуги, эпоха парусов и магии..." />
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #dcd3c1', borderRadius: '8px', padding: '20px' }}>
              <label style={labelStyle}>⏳ Временной период</label>
              <input type="text" value={worldNotes.time_period} onChange={(e) => setWorldNotes({ ...worldNotes, time_period: e.target.value })} style={inputStyle} placeholder="Например: конец XVII века, осень" />
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #dcd3c1', borderRadius: '8px', padding: '20px' }}>
              <label style={labelStyle}>⚖️ Правила мира</label>
              <textarea value={worldNotes.rules} onChange={(e) => setWorldNotes({ ...worldNotes, rules: e.target.value })} style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }} placeholder="Законы магии, социальные нормы, технологический уровень, табу..." />
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #dcd3c1', borderRadius: '8px', padding: '20px' }}>
              <label style={labelStyle}>📜 Важные события (предыстория мира)</label>
              <textarea value={worldNotes.important_events} onChange={(e) => setWorldNotes({ ...worldNotes, important_events: e.target.value })} style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }} placeholder="Войны, катаклизмы, ключевые события до начала сюжета..." />
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #dcd3c1', borderRadius: '8px', padding: '20px' }}>
              <label style={labelStyle}>🎨 Тон и стиль произведения</label>
              <textarea value={worldNotes.tone} onChange={(e) => setWorldNotes({ ...worldNotes, tone: e.target.value })} style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }} placeholder="Например: мрачное пиратское приключение, медленный темп, длинные описания..." />
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #dcd3c1', borderRadius: '8px', padding: '20px' }}>
              <label style={labelStyle}>📝 Дополнительные заметки</label>
              <textarea value={worldNotes.custom_notes} onChange={(e) => setWorldNotes({ ...worldNotes, custom_notes: e.target.value })} style={{ ...inputStyle, minHeight: '100px', resize: 'vertical' }} placeholder="Любые другие детали, важные для канона..." />
            </div>
          </div>
        </div>
      )}

      {/* === РЕДАКТОР === */}
      {!loading && view === 'editor' && activeBook && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
          <header style={{ height: '50px', borderBottom: '1px solid #dcd3c1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', background: '#f5f0e6' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button onClick={() => setView('library')} style={{ background: 'none', border: 'none', color: '#7a4b3a', cursor: 'pointer', fontSize: '1rem' }}>← Библиотека</button>
              <button onClick={() => setView('characters')} style={{ background: 'none', border: '1px solid #dcd3c1', color: '#7a4b3a', cursor: 'pointer', fontSize: '0.85rem', padding: '4px 10px', borderRadius: '4px' }}>👥 Персонажи</button>
              <button onClick={() => setView('world')} style={{ background: 'none', border: '1px solid #dcd3c1', color: '#7a4b3a', cursor: 'pointer', fontSize: '0.85rem', padding: '4px 10px', borderRadius: '4px' }}>🌍 Мир</button>
            </div>

            {editingBookId === activeBook.id ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                <input type="text" value={bookMetaForm.title} onChange={(e) => setBookMetaForm({ ...bookMetaForm, title: e.target.value })} placeholder="Название" style={{ ...inputStyle, width: '150px', padding: '4px 8px' }} />
                <input type="text" value={bookMetaForm.genre} onChange={(e) => setBookMetaForm({ ...bookMetaForm, genre: e.target.value })} placeholder="Жанр" style={{ ...inputStyle, width: '100px', padding: '4px 8px' }} />
                <input type="text" value={bookMetaForm.subgenre} onChange={(e) => setBookMetaForm({ ...bookMetaForm, subgenre: e.target.value })} placeholder="Поджанр" style={{ ...inputStyle, width: '100px', padding: '4px 8px' }} />
                <button onClick={handleUpdateBookMeta} style={{ padding: '4px 12px', background: '#5c7a5c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>✓</button>
                <button onClick={() => setEditingBookId(null)} style={{ padding: '4px 12px', background: '#999', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>✗</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontWeight: 'bold', color: '#5c3a21' }}>{activeBook.title} <span style={{ fontWeight: 'normal', color: '#7a6b5d', fontSize: '0.85rem' }}>({activeBook.genre}{activeBook.subgenre ? ` • ${activeBook.subgenre}` : ''})</span></div>
                <button onClick={() => { setEditingBookId(activeBook.id); setBookMetaForm({ title: activeBook.title, genre: activeBook.genre, subgenre: activeBook.subgenre }) }} style={{ background: 'none', border: '1px solid #dcd3c1', color: '#7a4b3a', cursor: 'pointer', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px' }}>⚙️ Настройки</button>
              </div>
            )}

            <button onClick={handleSave} disabled={saveStatus !== 'idle'} style={{ padding: '6px 16px', border: 'none', borderRadius: '4px', color: '#fdfbf7', fontSize: '0.9rem', background: saveStatus === 'saved' ? '#5c7a5c' : '#7a4b3a', cursor: saveStatus === 'idle' ? 'pointer' : 'default' }}>
              {saveStatus === 'saving' ? 'Сохранение...' : saveStatus === 'saved' ? '✓ Сохранено' : '💾 Сохранить'}
            </button>
          </header>

          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            <aside style={{ width: '260px', borderRight: '1px solid #dcd3c1', background: '#f5f0e6', overflowY: 'auto', padding: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#7a6b5d', margin: 0 }}>Структура</h3>
                <button onClick={addChapter} style={{ background: 'none', border: 'none', color: '#7a4b3a', cursor: 'pointer', fontSize: '1.2rem' }}>+</button>
              </div>
              {activeBook.chapters.map(chapter => (
                <div key={chapter.id} style={{ marginBottom: '15px' }}>
                  {editingChapterId === chapter.id ? (
                    <div style={{ marginBottom: '5px' }}>
                      <input type="text" value={bookMetaForm.title} onChange={(e) => setBookMetaForm({ ...bookMetaForm, title: e.target.value })} autoFocus style={{ width: '100%', padding: '6px 8px', border: '1px solid #7a4b3a', borderRadius: '4px', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} />
                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                        <button onClick={() => { handleUpdateChapterTitle(chapter.id, bookMetaForm.title); setEditingChapterId(null) }} style={{ padding: '4px 10px', background: '#5c7a5c', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.75rem' }}>✓</button>
                        <button onClick={() => setEditingChapterId(null)} style={{ padding: '4px 10px', background: '#999', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.75rem' }}>✗</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#5c3a21', marginBottom: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ flex: 1 }}>{chapter.title}</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={() => { setEditingChapterId(chapter.id); setBookMetaForm({ ...bookMetaForm, title: chapter.title }) }} style={{ background: 'none', border: '1px solid #dcd3c1', color: '#7a4b3a', cursor: 'pointer', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '3px' }}>✏️</button>
                        <button onClick={() => addScene(chapter.id)} style={{ background: 'none', border: 'none', color: '#7a4b3a', cursor: 'pointer', fontSize: '1rem' }}>+</button>
                      </div>
                    </div>
                  )}
                  {chapter.scenes.map(scene => (
                    <div key={scene.id} style={{ marginLeft: '10px', marginBottom: '4px', display: 'flex', alignItems: 'center' }}>
                      <div className="tree-item" onClick={() => { setActiveChapterId(chapter.id); setActiveSceneId(scene.id) }} style={{ flex: 1, padding: '6px 10px', borderRadius: '4px', fontSize: '0.85rem', borderLeft: activeSceneId === scene.id ? '3px solid #7a4b3a' : '3px solid transparent', color: activeSceneId === scene.id ? '#5c3a21' : '#4a3f35' }}>{scene.title}</div>
                      <button onClick={() => { setEditingSceneId(scene.id); setBookMetaForm({ ...bookMetaForm, title: scene.title }) }} style={{ background: 'none', border: '1px solid #dcd3c1', color: '#7a4b3a', cursor: 'pointer', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '3px' }}>✏️</button>
                    </div>
                  ))}
                </div>
              ))}
            </aside>

            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fdfbf7' }}>
              {activeScene ? (
                <>
                  {/* === НОВОЕ: Персонажи сцены === */}
                  <div style={{ borderBottom: '1px solid #dcd3c1', background: '#f9f5ec' }}>
                    <button onClick={() => setShowSceneChars(!showSceneChars)} style={{ width: '100%', padding: '8px 20px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#7a4b3a', fontSize: '0.85rem', fontFamily: 'Georgia, serif' }}>
                      <span>👥 Персонажи в этой сцене ({sceneCharacters.length})</span>
                      <span>{showSceneChars ? '▲' : '▼'}</span>
                    </button>
                    {showSceneChars && (
                      <div style={{ padding: '0 20px 15px 20px' }}>
                        {sceneCharacters.length === 0 ? (
                          <div style={{ fontSize: '0.85rem', color: '#7a6b5d', fontStyle: 'italic', marginBottom: '10px' }}>
                            В этой сцене пока нет персонажей. ИИ не будет знать, о ком писать. Добавьте хотя бы одного.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                            {sceneCharacters.map((sc: any) => {
                              const c = sc.characters
                              return (
                                <div key={sc.character_id} style={{ padding: '6px 10px', background: '#ffffff', border: '1px solid #dcd3c1', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontWeight: 'bold', color: '#2c241b' }}>{c.name}</span>
                                  <select
                                    value={sc.role}
                                    onChange={(e) => updateSceneCharacterRole(sc.character_id, e.target.value)}
                                    style={{ padding: '2px 4px', fontSize: '0.75rem', border: '1px solid #dcd3c1', borderRadius: '3px', background: '#fdfbf7' }}
                                  >
                                    <option value="pov">POV</option>
                                    <option value="present">присутствует</option>
                                    <option value="mentioned">упоминается</option>
                                  </select>
                                  <button onClick={() => removeCharacterFromScene(sc.character_id)} style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', fontSize: '1rem', padding: '0 4px' }} title="Убрать из сцены">×</button>
                                </div>
                              )
                            })}
                          </div>
                        )}
                        {showSceneCharPicker ? (
                          <div style={{ background: '#ffffff', border: '1px solid #dcd3c1', borderRadius: '6px', padding: '10px' }}>
                            <div style={{ fontSize: '0.8rem', color: '#7a6b5d', marginBottom: '8px' }}>Выберите персонажа из книги:</div>
                            {availableCharactersForScene.length === 0 ? (
                              <div style={{ fontSize: '0.85rem', color: '#7a6b5d', fontStyle: 'italic' }}>Все персонажи книги уже добавлены в сцену.</div>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                                {availableCharactersForScene.map(c => (
                                  <button key={c.id} onClick={() => addCharacterToScene(c.id, 'present')} style={{ padding: '6px 10px', background: '#fdfbf7', border: '1px solid #dcd3c1', borderRadius: '4px', cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem' }}>
                                    + {c.name} <span style={{ fontSize: '0.75rem', color: '#7a6b5d' }}>({c.role === 'protagonist' ? 'протагонист' : c.role === 'antagonist' ? 'антагонист' : 'второстепенный'})</span>
                                  </button>
                                ))}
                              </div>
                            )}
                            <button onClick={() => setShowSceneCharPicker(false)} style={{ marginTop: '8px', padding: '4px 10px', background: '#999', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Закрыть</button>
                          </div>
                        ) : (
                          <button onClick={() => setShowSceneCharPicker(true)} style={{ padding: '6px 12px', background: '#7a4b3a', color: '#fdfbf7', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>
                            + Добавить персонажа в сцену
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ borderBottom: '1px solid #dcd3c1', background: '#f9f5ec' }}>
                    <button onClick={() => setShowContextBefore(!showContextBefore)} style={{ width: '100%', padding: '8px 20px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#7a4b3a', fontSize: '0.85rem', fontFamily: 'Georgia, serif' }}>
                      <span>📖 {activeScene.context_before ? 'Предыстория сцены (заполнена)' : 'Предыстория сцены (пусто)'}</span>
                      <span>{showContextBefore ? '▲' : '▼'}</span>
                    </button>
                    {showContextBefore && (
                      <div style={{ padding: '0 20px 15px 20px' }}>
                        <textarea value={activeScene.context_before} onChange={(e) => handleContextBeforeChange(e.target.value)} placeholder="Что произошло до этой сцены? Кратко опишите контекст..." style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
                      </div>
                    )}
                  </div>
                  <textarea value={activeScene.text} onChange={(e) => handleTextChange(e.target.value)} placeholder="Начните писать..." style={{ flex: 1, border: 'none', outline: 'none', padding: '30px 10%', fontSize: '1.2rem', lineHeight: '1.8', resize: 'none', background: 'transparent', color: '#2c241b', fontFamily: 'Georgia, serif' }} />
                </>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7a6b5d' }}>Выберите сцену слева</div>
              )}
            </main>

            <aside style={{ width: '340px', borderLeft: '1px solid #dcd3c1', background: '#f5f0e6', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ flex: 1, padding: '15px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#7a6b5d', margin: '0 0 10px 0' }}>✨ ИИ-Соавтор</h3>

                <div style={{ marginBottom: '10px', border: '1px solid #dcd3c1', borderRadius: '6px', background: '#fdfbf7' }}>
                  <button onClick={() => setShowSettings(!showSettings)} style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#5c3a21', fontSize: '0.85rem', fontWeight: 'bold', fontFamily: 'Georgia, serif' }}>
                    <span>⚙️ Параметры генерации</span>
                    <span>{showSettings ? '▲' : '▼'}</span>
                  </button>
                  {showSettings && (
                    <div style={{ padding: '10px 12px 12px 12px', borderTop: '1px solid #dcd3c1' }}>
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#7a6b5d', marginBottom: '4px' }}>Творческая свобода:</label>
                        <select value={creativeLatitude} onChange={(e) => setCreativeLatitude(e.target.value)} style={{ ...inputStyle, padding: '6px' }}>
                          <option value="strict">Строгий (только по инструкции)</option>
                          <option value="constrained">Ограниченный (минимум допущений)</option>
                          <option value="guided">Сбалансированный (атмосфера)</option>
                          <option value="open">Свободный (импровизация)</option>
                        </select>
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#7a6b5d', marginBottom: '4px' }}>Откровенность (NSFW): {policies.nsfw}</label>
                        <input type="range" min="0" max="5" value={policies.nsfw} onChange={(e) => setPolicies({ ...policies, nsfw: Number(e.target.value) })} style={{ width: '100%' }} />
                      </div>
                      <div style={{ marginBottom: '8px' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#7a6b5d', marginBottom: '4px' }}>Реализм: {policies.realism}</label>
                        <input type="range" min="0" max="5" value={policies.realism} onChange={(e) => setPolicies({ ...policies, realism: Number(e.target.value) })} style={{ width: '100%' }} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#7a6b5d', marginBottom: '4px' }}>Жестокость: {policies.cruelty}</label>
                        <input type="range" min="0" max="5" value={policies.cruelty} onChange={(e) => setPolicies({ ...policies, cruelty: Number(e.target.value) })} style={{ width: '100%' }} />
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#7a6b5d', marginBottom: '4px' }}>Модель:</label>
                  <select value={selectedModel} onChange={(e) => { setSelectedModel(e.target.value); localStorage.setItem('selectedAIModel', e.target.value) }} style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #dcd3c1', fontSize: '0.85rem', background: '#fdfbf7', boxSizing: 'border-box' }}>
                    {availableModels.map((model: any) => <option key={model.id} value={model.id}>{model.name}</option>)}
                  </select>
                </div>

                <textarea value={aiInstruction} onChange={(e) => setAiInstruction(e.target.value)} placeholder="Например: Опиши, как Энн замечает незнакомку в толпе..." style={{ width: '100%', height: '80px', padding: '10px', borderRadius: '6px', border: '1px solid #dcd3c1', marginBottom: '10px', boxSizing: 'border-box', background: '#fdfbf7', fontFamily: 'sans-serif', fontSize: '0.9rem', resize: 'none' }} />

                <button onClick={handleGenerateAI} disabled={isGenerating || !aiInstruction.trim()} style={{ width: '100%', padding: '10px', background: isGenerating ? '#999' : '#7a4b3a', color: '#fdfbf7', border: 'none', borderRadius: '6px', cursor: isGenerating ? 'wait' : 'pointer', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '15px' }}>
                  {isGenerating ? '✨ Генерация...' : '✨ Сгенерировать'}
                </button>
                                {/* === PROMPT INSPECTOR === */}
                <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
                  <button
                    onClick={() => openPromptInspector('sent')}
                    title="Показать промпт, который реально создал выбранный вариант"
                    style={{
                      flex: 1,
                      padding: '7px 6px',
                      background: '#fdfbf7',
                      border: '1px solid #7a4b3a',
                      color: '#7a4b3a',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      fontFamily: 'sans-serif',
                    }}
                  >
                    🔍 Промпт варианта
                  </button>
                  <button
                    onClick={() => openPromptInspector('preview')}
                    title="Показать промпт, который будет отправлен сейчас"
                    style={{
                      flex: 1,
                      padding: '7px 6px',
                      background: '#fdfbf7',
                      border: '1px solid #dcd3c1',
                      color: '#7a6b5d',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                      fontFamily: 'sans-serif',
                    }}
                  >
                    👁 Текущий промпт
                  </button>
                </div>

                {generationHistory.length > 0 && (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <div style={{ fontSize: '0.75rem', color: '#7a6b5d', marginBottom: '8px', fontWeight: 'bold' }}>📜 История черновиков:</div>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                      {generationHistory.map((h, i) => (
                        <button key={h.id} onClick={() => setActiveHistoryId(h.id)} style={{ padding: '4px 10px', background: activeHistoryId === h.id ? '#7a4b3a' : '#fdfbf7', color: activeHistoryId === h.id ? '#fdfbf7' : '#7a4b3a', border: '1px solid #dcd3c1', borderRadius: '12px', cursor: 'pointer', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                          Вариант {generationHistory.length - i}
                        </button>
                      ))}
                    </div>
                    {activeHistory && (
                      <div style={{ flex: 1, overflowY: 'auto', padding: '12px', background: '#ffffff', borderRadius: '6px', border: '1px solid #dcd3c1', fontSize: '0.9rem', lineHeight: '1.6', color: '#2c241b', marginBottom: '10px' }}>
                        <div style={{ fontSize: '0.7rem', color: '#7a6b5d', marginBottom: '6px', fontStyle: 'italic' }}>Запрос: «{activeHistory.instruction}»</div>
                        <div style={{ whiteSpace: 'pre-wrap', borderTop: '1px dashed #dcd3c1', paddingTop: '8px' }}>{activeHistory.text}</div>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={insertHistoryToScene} style={{ flex: 1, padding: '8px', background: '#5c7a5c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>✓ Вставить</button>
                      <button onClick={() => { setGenerationHistory([]); setActiveHistoryId(null) }} style={{ padding: '8px 12px', background: '#999', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>🗑️</button>
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </div>
               </div>
      )}

      <PromptInspector
        open={inspectorOpen}
        record={inspectorRecord}
        onClose={() => setInspectorOpen(false)}
      />
    </div>
  )
}

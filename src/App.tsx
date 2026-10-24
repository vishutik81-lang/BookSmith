import { useState, useEffect } from 'react'
import PromptInspector from './components/PromptInspector'
import CharacterGraph from './components/CharacterGraph'

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

  const [sceneCharacters, setSceneCharacters] = useState<any[]>([])
  const [showSceneCharPicker, setShowSceneCharPicker] = useState(false)
  const [showGraph, setShowGraph] = useState(false)

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

  const [observations, setObservations] = useState<any[]>([])
    const [relations, setRelations] = useState<any[]>([])
  const [showObservations, setShowObservations] = useState(false)
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  const [showExportModal, setShowExportModal] = useState(false)
  const [exportFormat, setExportFormat] = useState<'txt' | 'md'>('md')
  const [exportScope, setExportScope] = useState<'scene' | 'chapter' | 'book'>('book')

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

   useEffect(() => {
    if (activeSceneId) loadSceneCharacters(activeSceneId)
    else setSceneCharacters([])
    
    if (activeBookId) loadRelations(activeBookId)
    else setRelations([])
  }, [activeSceneId, activeBookId])

  const loadRelations = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/relations`)
      const data = await res.json()
      if (data.relations) setRelations(data.relations)
    } catch (error) { 
      console.error('Ошибка загрузки связей:', error) 
    }
  }

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
      const res = await fetch(`/api/projects/${activeBookId}/chapters`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Новая глава', sort_order: 0 })
      })
      const data = await res.json()
      if (data.success) {
        const newChapter = { id: data.chapter.id, title: data.chapter.title, scenes: [] }
        setBooks(books.map(b => b.id === activeBookId ? { ...b, chapters: [...b.chapters, newChapter] } : b))
      } else { alert('Ошибка: ' + data.error) }
    } catch (error: any) { alert('Ошибка соединения: ' + error.message) }
  }

  const addScene = async (chapterId: string) => {
    try {
      const res = await fetch(`/api/chapters/${chapterId}/scenes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Новая сцена', body: '', sort_order: 0 })
      })
      const data = await res.json()
      if (data.success) {
        const newScene = { id: data.scene.id, title: data.scene.title, text: data.scene.body || '', context_before: '' }
        setBooks(books.map(b => {
          if (b.id !== activeBookId) return b
          return { ...b, chapters: b.chapters.map(c => c.id === chapterId ? { ...c, scenes: [...c.scenes, newScene] } : c) }
        }))
        setActiveChapterId(chapterId); setActiveSceneId(newScene.id)
      } else { alert('Ошибка: ' + data.error) }
    } catch (error: any) { alert('Ошибка соединения: ' + error.message) }
  }

  const handleCreateBook = async () => {
    const title = window.prompt('Как назовем новую книгу?')
    if (!title || title.trim() === '') return
    const genre = window.prompt('Жанр:') || 'Не указан'
    const subgenre = window.prompt('Поджанр:') || ''
    try {
      const res = await fetch('/api/projects', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: subgenre, genre, subgenre })
      })
      const data = await res.json()
      if (data.project) {
        const newBook = {
          id: data.project.id, title: data.project.title, status: 'В работе', genre, subgenre,
          chapters: data.project.chapters.map((ch: any) => ({
            id: ch.id, title: ch.title,
            scenes: ch.scenes.map((s: any) => ({ id: s.id, title: s.title, text: s.body || '', context_before: '' }))
          }))
        }
        setBooks([...books, newBook]); setActiveBookId(newBook.id); setActiveChapterId(newBook.chapters[0].id); setActiveSceneId(newBook.chapters[0].scenes[0].id); setView('editor'); loadCharacters(newBook.id); loadWorldNotes(newBook.id)
      } else { alert('Ошибка: ' + data.error) }
    } catch (error: any) { alert('Ошибка: ' + error.message) }
  }

    const handleSave = async () => {
    if (!activeScene) {
      console.warn("⚠️ Нет активной сцены для сохранения!")
      return
    }
    
    console.log("💾 [DEBUG] Попытка сохранения сцены ID:", activeScene.id)
    console.log("💾 [DEBUG] Отправляемый текст (начало):", activeScene.text?.substring(0, 60) + "...")
    console.log("💾 [DEBUG] Предыстория:", activeScene.context_before)

    setSaveStatus('saving')
    try {
      const res = await fetch(`/api/scenes/${activeScene.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          body: activeScene.text, 
          context_before: activeScene.context_before 
        })
      })
      
      const data = await res.json()
      console.log("💾 [DEBUG] Ответ от сервера:", data)

      if (data.success) { 
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000) 
      } else { 
        alert('Ошибка сохранения: ' + data.error)
        setSaveStatus('idle') 
      }
    } catch (error: any) { 
      console.error("💾 [DEBUG] Ошибка сети при сохранении:", error)
      alert('Ошибка сети: ' + error.message)
      setSaveStatus('idle') 
    }
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

  const loadSceneCharacters = async (sceneId: string) => {
    try {
      const res = await fetch(`/api/scenes/${sceneId}/characters`)
      const data = await res.json()
      if (data.characters) setSceneCharacters(data.characters)
      else setSceneCharacters([])
    } catch (error) { setSceneCharacters([]) }
  }

  const addCharacterToScene = async (characterId: string, role: string = 'present') => {
    if (!activeSceneId) return
    try {
      const res = await fetch(`/api/scenes/${activeSceneId}/characters`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ character_id: characterId, role })
      })
      const data = await res.json()
      if (data.success) { await loadSceneCharacters(activeSceneId); setShowSceneCharPicker(false) }
      else { alert('Ошибка: ' + data.error) }
    } catch (error: any) { alert('Ошибка: ' + error.message) }
  }

  const removeCharacterFromScene = async (characterId: string) => {
    if (!activeSceneId) return
    try {
      const res = await fetch(`/api/scenes/${activeSceneId}/characters/${characterId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) setSceneCharacters(sceneCharacters.filter(sc => sc.character_id !== characterId))
      else { alert('Ошибка: ' + data.error) }
    } catch (error: any) { alert('Ошибка: ' + error.message) }
  }

  const updateSceneCharacterRole = async (characterId: string, newRole: string) => {
    if (!activeSceneId) return
    try {
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
      if (data.notes) setWorldNotes(data.notes)
      else setWorldNotes({ setting: '', time_period: '', rules: '', important_events: '', tone: '', custom_notes: '' })
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
        if (!modelsList.find((m: any) => m.id === selectedModel)) {
          setSelectedModel(modelsList[0].id)
          localStorage.setItem('selectedAIModel', modelsList[0].id)
        }
      } else { throw new Error('Список моделей пуст') }
    } catch (error) {
      console.warn('Fallback модели:', error)
      const fallback = [{ id: 'liquid/lfm-2.5-2.6b:free', name: 'Liquid LFM 2.5', provider: 'OpenRouter' }]
      setAvailableModels(fallback)
      setSelectedModel(fallback[0].id)
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
    } catch (error: any) { alert('Ошибка: ' + error.message) }
  }

  const handleDeleteCharacter = async (characterId: string, characterName: string) => {
    if (!window.confirm(`Удалить "${characterName}"?`)) return
    try {
      const res = await fetch(`/api/characters/${characterId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) setCharacters(characters.filter(c => c.id !== characterId))
      else { alert('Ошибка: ' + data.error) }
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

  const getLatitudeInstruction = () => {
    switch (creativeLatitude) {
      case 'strict': return 'Строго следуй инструкции. Не добавляй новых деталей.'
      case 'constrained': return 'Минимальные допущения. Только логическое продолжение.'
      case 'guided': return 'Сбалансированный подход. Допустимы атмосферные детали.'
      case 'open': return 'Максимальная творческая свобода.'
      default: return ''
    }
  }

  const getPolicyInstruction = () => {
    const nsfwTexts = ['Полностью исключи откровенность.', 'Лёгкие намёки.', 'Эмоциональная интимность.', 'Взрослые темы, без порнографии.', 'Эротика с художественной детализацией.', 'Откровенный контент разрешен.']
    const realismTexts = ['Сказочный стиль.', 'Условный реализм.', 'Средний реализм.', 'Высокий реализм.', 'Максимальный реализм.', 'Гиперреализм.']
    const crueltyTexts = ['Бескровный стиль.', 'Минимальная жестокость.', 'Умеренная жестокость.', 'Детализированная жестокость.', 'Высокая жестокость.', 'Максимальная жестокость.']
    return `- Откровенность: ${nsfwTexts[policies.nsfw] || nsfwTexts[0]}\n- Реализм: ${realismTexts[policies.realism] || realismTexts[0]}\n- Жестокость: ${crueltyTexts[policies.cruelty] || crueltyTexts[0]}`
  }

    // === RELATIONSHIP EXPANDER ===
  const expandRelationship = (type: string, strength: number) => {
    const level = strength <= 3 ? "Начальная/Слабая" : strength <= 6 ? "Устойчивая/Средняя" : strength <= 8 ? "Глубокая/Сильная" : "Фатальная/Экстремальная"
    
    const typeNames: Record<string, string> = {
      ally: "Союзник", enemy: "Враг", romantic: "Романтический интерес",
      mentor: "Наставник / Ученик", rival: "Соперник", family: "Семья",
      debtor: "Должник / Кредитор", secret_lover: "Тайная любовь",
      betrayed: "Предательство", childhood_friend: "Друг детства", default: "Знакомый"
    }
    const typeName = typeNames[type] || typeNames.default

    let behaviorHint = ""
    if (type === 'enemy' || type === 'betrayed') {
      behaviorHint = strength >= 7 
        ? "Тон предельно холодный, язвительный или агрессивный. Физическая дистанция максимальна. Любые попытки сближения встречают жесткий отпор." 
        : "Скрытое недоверие, колкие замечания, постоянная проверка на прочность."
    } else if (type === 'romantic' || type === 'secret_lover') {
      behaviorHint = strength >= 7 
        ? "Скрытая нежность, задерживающиеся взгляды, интуитивное понимание. Физический контакт осторожен, но крайне значим." 
        : "Осторожное любопытство, легкий флирт, желание узнать человека лучше, но с оглядкой."
    } else if (type === 'ally' || type === 'childhood_friend') {
      behaviorHint = strength >= 7 
        ? "Безоговорочное доверие, готовность пойти на риск ради другого, интуитивное понимание с полуслова." 
        : "Взаимовыгодное сотрудничество, вежливость, базовое уважение."
    } else if (type === 'rival') {
      behaviorHint = strength >= 7 
        ? "Ожесточенная борьба, желание доказать превосходство любой ценой." 
        : "Профессиональная конкуренция, подтекст в диалогах, взаимное уважение сквозь соперничество."
    } else {
      behaviorHint = `Учитывайте уровень связи (${strength}/10) при описании их взаимодействия: ${level}.`
    }

    return `• [${typeName}] [Сила: ${strength}/10 — ${level}]\n  → Как отражать в тексте: ${behaviorHint}`
  }
  const buildPromptContext = () => {
    // 1. Формируем список персонажей сцены (ваш старый код)
    const charactersContext = sceneCharacters.length > 0
      ? 'Персонажи в этой сцене:\n' + sceneCharacters.map((sc: any) => {
          const c = sc.characters
          const roleLabel = sc.role === 'pov' ? 'POV' : sc.role === 'mentioned' ? 'упоминается' : 'присутствует'
          const parts = [`• ${c?.name || 'Без имени'} (${roleLabel})`]
          if (c?.gender && c.gender !== 'not_specified') parts.push(`Пол: ${c.gender}`)
          if (c?.race && c.race !== 'human') parts.push(`Раса: ${c.race}`)
          if (c?.appearance) parts.push(`Внешность: ${c.appearance}`)
          if (c?.personality) parts.push(`Характер: ${c.personality}`)
          return parts.join('. ')
        }).join('\n')
      : 'В этой сцене пока нет привязанных персонажей.'

    // 2. Формируем блок мира (ваш старый код)
    const worldSection = [
      worldNotes.setting && `Место действия: ${worldNotes.setting}`,
      worldNotes.time_period && `Время: ${worldNotes.time_period}`,
      worldNotes.rules && `Правила мира: ${worldNotes.rules}`,
      worldNotes.important_events && `Важные события: ${worldNotes.important_events}`,
      worldNotes.tone && `Тон и стиль: ${worldNotes.tone}`,
      worldNotes.custom_notes && `Дополнительно: ${worldNotes.custom_notes}`,
    ].filter(Boolean).join('\n')

    // === НОВОЕ: Собираем связи ТОЛЬКО для персонажей текущей сцены ===
    const sceneCharIds = sceneCharacters.map(sc => sc.character_id)
    const activeRelations = relations.filter(r => 
      sceneCharIds.includes(r.source_id) && sceneCharIds.includes(r.target_id)
    )

    let relationshipsContext = "В этой сцене нет заранее определенных связей между персонажами. Опирайся только на инструкцию автора."
    if (activeRelations.length > 0) {
      relationshipsContext = activeRelations.map(r => {
        const sourceName = sceneCharacters.find(sc => sc.character_id === r.source_id)?.characters?.name || 'Неизвестно'
        const targetName = sceneCharacters.find(sc => sc.character_id === r.target_id)?.characters?.name || 'Неизвестно'
        return `${sourceName} ↔ ${targetName}:\n${expandRelationship(r.type, r.strength)}`
      }).join('\n\n')
    }

    // 3. Собираем итоговый промпт
    const prompt = `Ты — ИИ-соавтор художественной литературы. Твоя задача — создать НОВЫЙ ВАРИАНТ сцены на основе инструкции автора, а не продолжить существующий текст.

=== МИР ПРОИЗВЕДЕНИЯ ===
${worldSection || '(мир не описан)'}

=== ПЕРСОНАЖИ СЦЕНЫ ===
${charactersContext}

=== ДИНАМИКА ОТНОШЕНИЙ В ЭТОЙ СЦЕНЕ ===
${relationshipsContext}

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
2. Строго соблюдай имена персонажей из списка.
3. Строго следуй описанной "Динамике отношений" при написании диалогов и описании взаимодействий.
4. Не привлекай персонажей книги, которых нет в списке «Персонажи сцены».
5. Временных второстепенных персонажей придумывать разрешено в рамках режима генерации.
6. Учитывай предысторию сцены для логической связности.
7. Следуй тону, стилю и правилам мира. Не допускай анахронизмов.
8. Пиши на русском языке, без иностранных вставок, иероглифов и мета-комментариев.
9. Только художественный текст, без заголовков, пояснений и подписей.`

    // 4. Возвращаем результат и снимок состояния
    return { 
      prompt, 
      snapshot: {
        sceneId: activeScene?.id || '',
        sceneTitle: activeScene?.title || '',
        sceneTextLength: (activeScene?.text || '').length,
        contextBefore: activeScene?.context_before || '',
        characters: sceneCharacters.map((sc: any) => ({ id: sc.character_id, name: sc.characters?.name || 'Без имени', role: sc.role })),
        worldNotes: { ...worldNotes },
        latitude: creativeLatitude,
        policies: { ...policies },
        instruction: aiInstruction,
        modelId: selectedModel,
      }
    }
  }

  const openPromptInspector = (mode: 'sent' | 'preview' = 'sent') => {
    if (mode === 'sent' && activeHistory?.prompt) {
      setInspectorRecord({ kind: 'sent', createdAt: activeHistory.createdAt, prompt: activeHistory.prompt, modelId: activeHistory.modelId, provider: activeHistory.provider, usage: activeHistory.usage, ...activeHistory.snapshot })
      setInspectorOpen(true)
      return
    }
    if (!activeScene) { alert('Сначала выберите сцену.'); return }
    const { prompt, snapshot } = buildPromptContext()
    setInspectorRecord({ kind: 'preview', createdAt: Date.now(), prompt, ...snapshot })
    setInspectorOpen(true)
  }

  const handleGenerateAI = async () => {
    if (!aiInstruction.trim() || !activeScene) return
    setIsGenerating(true)
    try {
      const { prompt, snapshot } = buildPromptContext()
      const res = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, modelId: selectedModel }) })
      const data = await res.json()
      if (data.text && !data.text.startsWith('Ошибка:')) {
        const newEntry = { 
          id: Date.now().toString(), text: data.text, instruction: aiInstruction, prompt, 
          modelId: selectedModel, provider: data.provider || 'Unknown', usage: data.usage || null,
          createdAt: Date.now(), snapshot 
        }
        setGenerationHistory(prev => [newEntry, ...prev].slice(0, 5))
        setActiveHistoryId(newEntry.id)
      } else { alert('Ошибка ИИ: ' + (data.text || data.error || 'Неизвестная ошибка')) }
    } catch (error: any) { alert('Ошибка соединения: ' + error.message) }
    finally { setIsGenerating(false) }
  }

  const insertHistoryToScene = () => {
    if (activeScene && activeHistory) {
      handleTextChange(activeScene.text + (activeScene.text ? '\n\n' : '') + activeHistory.text)
    }
  }

   const handleCheckScene = async () => {
    // 1. Жесткая проверка наличия текста
    const currentText = activeScene?.text || '';
    if (!currentText.trim()) { 
      alert('Сцена пуста. Напишите или вставьте текст перед проверкой.');
      return;
    }
    
    setIsAnalyzing(true);
    setObservations([]);
    
    try {
      // 2. Формируем промпт, явно передавая текст для анализа
      const checkPrompt = `Проанализируй предоставленный текст сцены. Найди: 1) Противоречия с данными персонажей или мира. 2) Новые имена, локации или предметы (кандидаты). 3) Нарушения заданных политик контента. 
Верни результат ТОЛЬКО в формате JSON массива объектов: [{"type": "warning"|"info"|"candidate", "title": "Краткий заголовок", "description": "Описание проблемы или находки", "action": "Текст кнопки действия"}]. Не добавляй markdown или другой текст.`;
      
      const res = await fetch('/api/generate', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          prompt: checkPrompt + "\n\n=== ТЕКСТ ДЛЯ АНАЛИЗА ===\n" + currentText, 
          modelId: selectedModel 
        }) 
      });
      const data = await res.json();
      
      if (data.text && !data.text.startsWith('Ошибка:')) {
        // Пытаемся найти JSON в ответе
        const jsonMatch = data.text.match(/\[[\s\S]*\]/);
        if (jsonMatch) { 
          const parsed = JSON.parse(jsonMatch[0]);
          setObservations(parsed);
          setShowObservations(true); // Автоматически открываем журнал при успехе
        } else {
          throw new Error('Нет JSON в ответе модели');
        }
      } else { 
        throw new Error(data.text || 'Ошибка анализа'); 
      }
    } catch (error) {
      console.error('Ошибка проверки сцены:', error);
      // 3. Fallback (демо-режим), если модель не смогла вернуть строгий JSON
      setObservations([
        { type: 'info', title: 'Текст получен', description: `ИИ успешно получил ${currentText.length} символов для анализа. (Показан демо-режим, так как модель не вернула строгий JSON).`, action: 'Понятно' },
        { type: 'candidate', title: 'Проверка орфографии', description: 'Рекомендуется вычитать диалоги на предмет опечаток.', action: 'Игнорировать' }
      ]);
      setShowObservations(true);
    } finally { 
      setIsAnalyzing(false); 
    }
  }

  const handleObservationAction = (index: number) => {
    const newObs = [...observations]; newObs.splice(index, 1); setObservations(newObs)
  }

  const countWords = (text: string) => text ? text.split(/\s+/).filter(w => w.length > 0).length : 0
  const getBookWordCount = () => { let t = 0; activeBook?.chapters.forEach(ch => ch.scenes.forEach(s => t += countWords(s.text))); return t }
  const getChapterWordCount = () => { let t = 0; activeChapter?.scenes.forEach(s => t += countWords(s.text)); return t }

  const handleExport = () => {
    if (!activeBook) return
    let content = '', filename = activeBook.title.replace(/[^a-z0-9а-яё]/gi, '_')
    if (exportScope === 'scene' && activeScene) { content = activeScene.text; filename += `_${activeScene.title.replace(/[^a-z0-9а-яё]/gi, '_')}` }
    else if (exportScope === 'chapter' && activeChapter) { content = activeChapter.scenes.map(s => `# ${s.title}\n\n${s.text}`).join('\n\n---\n\n'); filename += `_${activeChapter.title.replace(/[^a-z0-9а-яё]/gi, '_')}` }
    else { content = activeBook.chapters.map(ch => `# Глава: ${ch.title}\n\n` + ch.scenes.map(s => `## ${s.title}\n\n${s.text}`).join('\n\n')).join('\n\n***\n\n') }
    
    if (exportFormat === 'md') {
      content = `# ${activeBook.title}\n**Жанр:** ${activeBook.genre}\n\n---\n\n` + content
      filename += '.md'
    } else { filename += '.txt' }
    
    const blob = new Blob([content], { type: exportFormat === 'md' ? 'text/markdown' : 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setShowExportModal(false)
  }

  const inputStyle = { width: '100%', padding: '8px', border: '1px solid #dcd3c1', borderRadius: '4px', fontSize: '0.85rem', boxSizing: 'border-box' as const, background: '#fdfbf7', fontFamily: 'Georgia, serif' }
  const labelStyle = { display: 'block', marginBottom: '4px', fontWeight: 'bold', color: '#5c3a21', fontSize: '0.8rem' }
  const availableCharactersForScene = characters.filter(c => !sceneCharacters.some(sc => sc.character_id === c.id))

  return (
    <div style={{ minHeight: '100vh', background: '#fdfbf7', fontFamily: 'Georgia, serif', color: '#2c241b' }}>
      <style>{`.book-card { transition: all 0.2s ease; cursor: pointer; } .book-card:hover { transform: translateY(-4px); box-shadow: 0 10px 20px rgba(92, 58, 33, 0.15); } .create-card { transition: all 0.2s ease; cursor: pointer; } .create-card:hover { background: #ebe3d5 !important; border-color: #7a4b3a !important; } .tree-item { cursor: pointer; transition: background 0.2s; } .tree-item:hover { background: #ebe3d5; }`}</style>

      {loading && <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.2rem', color: '#7a6b5d' }}>Загрузка библиотеки...</div>}

      {!loading && view === 'library' && (
        <div style={{ padding: '40px 10%', maxWidth: '1200px', margin: '0 auto' }}>
          <header style={{ marginBottom: '40px', borderBottom: '1px solid #dcd3c1', paddingBottom: '20px' }}><h1 style={{ fontSize: '2.5rem', color: '#5c3a21', margin: 0 }}>Моя Библиотека</h1></header>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '25px' }}>
            <div className="create-card" onClick={handleCreateBook} style={{ aspectRatio: '3/4', border: '2px dashed #bfaea1', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f5f0e6' }}>
              <div style={{ fontSize: '3rem', color: '#7a4b3a' }}>+</div><div style={{ fontSize: '1.1rem', color: '#5c3a21', fontWeight: 'bold' }}>Новая книга</div>
            </div>
            {books.map(book => (
              <div key={book.id} className="book-card" onMouseEnter={() => setHoveredBookId(book.id)} onMouseLeave={() => setHoveredBookId(null)} onClick={() => { setActiveBookId(book.id); setActiveChapterId(book.chapters[0]?.id || null); setActiveSceneId(book.chapters[0]?.scenes[0]?.id || null); setView('editor'); loadCharacters(book.id); loadWorldNotes(book.id) }} style={{ aspectRatio: '3/4', background: '#ffffff', borderRadius: '8px', border: '1px solid #dcd3c1', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative', overflow: 'hidden' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#2c241b' }}>{book.title}</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#7a6b5d' }}>{book.genre}{book.subgenre ? ` • ${book.subgenre}` : ''}</p>
                {hoveredBookId === book.id && <button onClick={(e) => { e.stopPropagation(); handleDeleteBook(book.id, book.title) }} style={{ position: 'absolute', top: '10px', right: '10px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', padding: '6px 10px', cursor: 'pointer', fontSize: '0.8rem', zIndex: 10 }}>🗑️</button>}
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && view === 'characters' && activeBook && (
        <div style={{ padding: '40px 10%', maxWidth: '1000px', margin: '0 auto' }}>
          <header style={{ marginBottom: '30px', borderBottom: '1px solid #dcd3c1', paddingBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: '2rem', color: '#5c3a21', margin: 0 }}>Персонажи: {activeBook.title}</h1>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setView('editor')} style={{ padding: '8px 16px', background: 'none', border: '1px solid #7a4b3a', color: '#7a4b3a', borderRadius: '6px', cursor: 'pointer' }}>← К редактору</button>
              <button onClick={() => openCharacterModal()} style={{ padding: '8px 16px', background: '#7a4b3a', color: '#fdfbf7', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>+ Новый</button>
            </div>
          </header>
          {characters.length === 0 ? <div style={{ textAlign: 'center', padding: '60px 20px', color: '#7a6b5d' }}><div style={{ fontSize: '3rem', marginBottom: '20px' }}>👥</div><p>Пока нет персонажей</p></div> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {characters.map(char => (
                <div key={char.id} style={{ background: '#ffffff', border: '1px solid #dcd3c1', borderRadius: '8px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#2c241b' }}>{char.name}</h3>
                    <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem', background: char.role === 'protagonist' ? '#dbeafe' : char.role === 'antagonist' ? '#fee2e2' : '#f3f4f6', color: char.role === 'protagonist' ? '#1e40af' : char.role === 'antagonist' ? '#991b1b' : '#4b5563' }}>{char.role === 'protagonist' ? 'Протагонист' : char.role === 'antagonist' ? 'Антагонист' : 'Второстепенный'}</span>
                  </div>
                  {char.race && char.race !== 'human' && <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#4a3f35' }}><strong>Раса:</strong> {char.race}</p>}
                  {char.appearance && <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#4a3f35' }}><strong>Внешность:</strong> {char.appearance}</p>}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '15px' }}>
                    <button onClick={() => openCharacterModal(char)} style={{ flex: 1, padding: '6px', background: 'none', border: '1px solid #dcd3c1', color: '#7a4b3a', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>✏️</button>
                    <button onClick={() => handleDeleteCharacter(char.id, char.name)} style={{ flex: 1, padding: '6px', background: 'none', border: '1px solid #fee2e2', color: '#991b1b', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {showCharacterModal && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div style={{ background: '#fdfbf7', borderRadius: '12px', padding: '30px', maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
                <h2 style={{ marginTop: 0, color: '#5c3a21' }}>{editingCharacter ? 'Редактировать' : 'Новый персонаж'}</h2>
                <div style={{ marginBottom: '15px' }}><label style={labelStyle}>Имя *</label><input type="text" value={characterForm.name} onChange={(e) => setCharacterForm({ ...characterForm, name: e.target.value })} style={inputStyle} /></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '15px' }}>
                  <div><label style={labelStyle}>Роль</label><select value={characterForm.role} onChange={(e) => setCharacterForm({ ...characterForm, role: e.target.value })} style={inputStyle}><option value="protagonist">Протагонист</option><option value="antagonist">Антагонист</option><option value="secondary">Второстепенный</option></select></div>
                  <div><label style={labelStyle}>Пол</label><select value={characterForm.gender} onChange={(e) => setCharacterForm({ ...characterForm, gender: e.target.value })} style={inputStyle}><option value="not_specified">Не указано</option><option value="male">Мужской</option><option value="female">Женский</option><option value="other">Другое</option></select></div>
                  <div><label style={labelStyle}>Раса</label><select value={characterForm.race} onChange={(e) => setCharacterForm({ ...characterForm, race: e.target.value })} style={inputStyle}><option value="human">Человек</option><option value="elf">Эльф</option><option value="other">Другое</option></select></div>
                </div>
                <div style={{ marginBottom: '15px' }}><label style={labelStyle}>Ориентация</label><select value={characterForm.sexual_orientation} onChange={(e) => setCharacterForm({ ...characterForm, sexual_orientation: e.target.value })} style={inputStyle}><option value="not_specified">Не указано</option><option value="heterosexual">Гетеро</option><option value="homosexual">Гомо</option><option value="lesbian">Лесбиянка</option><option value="bisexual">Би</option><option value="other">Другое</option></select></div>
                <div style={{ marginBottom: '15px' }}><label style={labelStyle}>Внешность</label><textarea value={characterForm.appearance} onChange={(e) => setCharacterForm({ ...characterForm, appearance: e.target.value })} style={{ ...inputStyle, minHeight: '60px' }} /></div>
                <div style={{ marginBottom: '25px' }}><label style={labelStyle}>Характер</label><textarea value={characterForm.personality} onChange={(e) => setCharacterForm({ ...characterForm, personality: e.target.value })} style={{ ...inputStyle, minHeight: '60px' }} /></div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => { setShowCharacterModal(false); setEditingCharacter(null) }} style={{ flex: 1, padding: '10px', background: 'none', border: '1px solid #dcd3c1', color: '#7a6b5d', borderRadius: '6px', cursor: 'pointer' }}>Отмена</button>
                  <button onClick={handleSaveCharacter} style={{ flex: 1, padding: '10px', background: '#7a4b3a', color: '#fdfbf7', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{editingCharacter ? 'Сохранить' : 'Создать'}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && view === 'world' && activeBook && (
        <div style={{ padding: '40px 10%', maxWidth: '900px', margin: '0 auto' }}>
          <header style={{ marginBottom: '30px', borderBottom: '1px solid #dcd3c1', paddingBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h1 style={{ fontSize: '2rem', color: '#5c3a21', margin: 0 }}>Мир: {activeBook.title}</h1>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setView('editor')} style={{ padding: '8px 16px', background: 'none', border: '1px solid #7a4b3a', color: '#7a4b3a', borderRadius: '6px', cursor: 'pointer' }}>← К редактору</button>
              <button onClick={handleSaveWorldNotes} disabled={worldNotesSaveStatus !== 'idle'} style={{ padding: '8px 16px', background: worldNotesSaveStatus === 'saved' ? '#5c7a5c' : '#7a4b3a', color: '#fdfbf7', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>{worldNotesSaveStatus === 'saving' ? '...' : '💾 Сохранить'}</button>
            </div>
          </header>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: '#ffffff', border: '1px solid #dcd3c1', borderRadius: '8px', padding: '20px' }}><label style={labelStyle}>🏰 Сеттинг</label><textarea value={worldNotes.setting} onChange={(e) => setWorldNotes({ ...worldNotes, setting: e.target.value })} style={{ ...inputStyle, minHeight: '70px' }} /></div>
            <div style={{ background: '#ffffff', border: '1px solid #dcd3c1', borderRadius: '8px', padding: '20px' }}><label style={labelStyle}>⏳ Время</label><input type="text" value={worldNotes.time_period} onChange={(e) => setWorldNotes({ ...worldNotes, time_period: e.target.value })} style={inputStyle} /></div>
            <div style={{ background: '#ffffff', border: '1px solid #dcd3c1', borderRadius: '8px', padding: '20px' }}><label style={labelStyle}>⚖️ Правила</label><textarea value={worldNotes.rules} onChange={(e) => setWorldNotes({ ...worldNotes, rules: e.target.value })} style={{ ...inputStyle, minHeight: '70px' }} /></div>
            <div style={{ background: '#ffffff', border: '1px solid #dcd3c1', borderRadius: '8px', padding: '20px' }}><label style={labelStyle}>🎨 Тон</label><textarea value={worldNotes.tone} onChange={(e) => setWorldNotes({ ...worldNotes, tone: e.target.value })} style={{ ...inputStyle, minHeight: '70px' }} /></div>
          </div>
        </div>
      )}

      {!loading && view === 'editor' && activeBook && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
          <header style={{ height: '50px', borderBottom: '1px solid #dcd3c1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', background: '#f5f0e6' }}>
                       <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button onClick={() => setView('library')} style={{ background: 'none', border: 'none', color: '#7a4b3a', cursor: 'pointer', fontSize: '1rem', padding: '4px 8px' }}>← Назад</button>
              
              <button onClick={() => setView('characters')} style={{ background: 'none', border: '1px solid #dcd3c1', color: '#7a4b3a', cursor: 'pointer', fontSize: '0.8rem', padding: '6px 12px', borderRadius: '4px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                Персонажи
              </button>
              
              <button onClick={() => setView('world')} style={{ background: 'none', border: '1px solid #dcd3c1', color: '#7a4b3a', cursor: 'pointer', fontSize: '0.8rem', padding: '6px 12px', borderRadius: '4px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                Мир книги
              </button>
              
              <button onClick={() => setShowGraph(true)} style={{ background: 'none', border: '1px solid #dcd3c1', color: '#7a4b3a', cursor: 'pointer', fontSize: '0.8rem', padding: '6px 12px', borderRadius: '4px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                 Граф связей
              </button>
            </div>
            {editingBookId === activeBook.id ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="text" value={bookMetaForm.title} onChange={(e) => setBookMetaForm({ ...bookMetaForm, title: e.target.value })} style={{ ...inputStyle, width: '150px', padding: '4px 8px' }} />
                <button onClick={handleUpdateBookMeta} style={{ padding: '4px 12px', background: '#5c7a5c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✓</button>
                <button onClick={() => setEditingBookId(null)} style={{ padding: '4px 12px', background: '#999', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>✗</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontWeight: 'bold', color: '#5c3a21' }}>{activeBook.title}</div>
                <button onClick={() => { setEditingBookId(activeBook.id); setBookMetaForm({ title: activeBook.title, genre: activeBook.genre, subgenre: activeBook.subgenre }) }} style={{ background: 'none', border: '1px solid #dcd3c1', color: '#7a4b3a', cursor: 'pointer', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px' }}>⚙️</button>
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={handleSave} disabled={saveStatus !== 'idle'} style={{ padding: '6px 16px', border: 'none', borderRadius: '4px', color: '#fdfbf7', fontSize: '0.9rem', background: saveStatus === 'saved' ? '#5c7a5c' : '#7a4b3a', cursor: 'pointer' }}>{saveStatus === 'saving' ? '...' : saveStatus === 'saved' ? '✓' : '💾'}</button>
              <button onClick={() => setShowExportModal(true)} style={{ padding: '6px 16px', border: 'none', borderRadius: '4px', color: '#fdfbf7', fontSize: '0.9rem', background: '#5c3a21', cursor: 'pointer' }}>📥 Экспорт</button>
            </div>
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
                    <div>
                      <input type="text" value={bookMetaForm.title} onChange={(e) => setBookMetaForm({ ...bookMetaForm, title: e.target.value })} autoFocus style={{ width: '100%', padding: '6px 8px', border: '1px solid #7a4b3a', borderRadius: '4px', fontSize: '0.9rem', boxSizing: 'border-box' }} />
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
                  <div style={{ borderBottom: '1px solid #dcd3c1', background: '#f9f5ec' }}>
                    <button onClick={() => setShowSceneChars(!showSceneChars)} style={{ width: '100%', padding: '8px 20px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#7a4b3a', fontSize: '0.85rem' }}>
                      <span>Персонажи сцены ({sceneCharacters.length})</span><span>{showSceneChars ? '▲' : '▼'}</span>
                    </button>
                    {showSceneChars && (
                      <div style={{ padding: '0 20px 15px 20px' }}>
                        {sceneCharacters.length === 0 ? <div style={{ fontSize: '0.85rem', color: '#7a6b5d', fontStyle: 'italic', marginBottom: '10px' }}>Нет персонажей.</div> : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                            {sceneCharacters.map((sc: any) => (
                              <div key={sc.character_id} style={{ padding: '6px 10px', background: '#ffffff', border: '1px solid #dcd3c1', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 'bold' }}>{sc.characters.name}</span>
                                <select value={sc.role} onChange={(e) => updateSceneCharacterRole(sc.character_id, e.target.value)} style={{ padding: '2px 4px', fontSize: '0.75rem', border: '1px solid #dcd3c1', borderRadius: '3px' }}>
                                  <option value="pov">POV</option><option value="present">присутствует</option><option value="mentioned">упоминается</option>
                                </select>
                                <button onClick={() => removeCharacterFromScene(sc.character_id)} style={{ background: 'none', border: 'none', color: '#991b1b', cursor: 'pointer', fontSize: '1rem', padding: '0 4px' }}>×</button>
                              </div>
                            ))}
                          </div>
                        )}
                        {showSceneCharPicker ? (
                          <div style={{ background: '#ffffff', border: '1px solid #dcd3c1', borderRadius: '6px', padding: '10px' }}>
                            <div style={{ fontSize: '0.8rem', color: '#7a6b5d', marginBottom: '8px' }}>Выберите:</div>
                            {availableCharactersForScene.length === 0 ? <div style={{ fontSize: '0.85rem', color: '#7a6b5d', fontStyle: 'italic' }}>Все добавлены.</div> : (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '200px', overflowY: 'auto' }}>
                                {availableCharactersForScene.map(c => (
                                  <button key={c.id} onClick={() => addCharacterToScene(c.id, 'present')} style={{ padding: '6px 10px', background: '#fdfbf7', border: '1px solid #dcd3c1', borderRadius: '4px', cursor: 'pointer', textAlign: 'left', fontSize: '0.85rem' }}>+ {c.name}</button>
                                ))}
                              </div>
                            )}
                            <button onClick={() => setShowSceneCharPicker(false)} style={{ marginTop: '8px', padding: '4px 10px', background: '#999', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>Закрыть</button>
                          </div>
                        ) : (
                          <button onClick={() => setShowSceneCharPicker(true)} style={{ padding: '6px 12px', background: '#7a4b3a', color: '#fdfbf7', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>+ Добавить</button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 1. Блок предыстории сцены */}
                  <div style={{ borderBottom: '1px solid #dcd3c1', background: '#f9f5ec' }}>
                    <button onClick={() => setShowContextBefore(!showContextBefore)} style={{ width: '100%', padding: '8px 20px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#7a4b3a', fontSize: '0.85rem' }}>
                      <span>📖 {activeScene.context_before ? 'Предыстория' : 'Предыстория (пусто)'}</span><span>{showContextBefore ? '▲' : '▼'}</span>
                    </button>
                    {showContextBefore && (
                      <div style={{ padding: '0 20px 15px 20px' }}>
                        <textarea value={activeScene.context_before} onChange={(e) => handleContextBeforeChange(e.target.value)} placeholder="Что произошло до?" style={{ ...inputStyle, minHeight: '80px' }} />
                      </div>
                    )}
                  </div>

                  {/* 2. Основное поле для письма */}
                  <textarea 
                    value={activeScene.text} 
                    onChange={(e) => handleTextChange(e.target.value)} 
                    placeholder="Начните писать..." 
                    style={{ flex: 1, border: 'none', outline: 'none', padding: '30px 10%', fontSize: '1.2rem', lineHeight: '1.8', resize: 'none', background: 'transparent', color: '#2c241b', fontFamily: 'Georgia, serif' }} 
                  />

                  {/* 3. НИЖНЯЯ ПАНЕЛЬ (Статистика и Журнал) */}
                  <div style={{ borderTop: '1px solid #dcd3c1', background: '#f5f0e6' }}>
                    <div style={{ padding: '8px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#7a6b5d' }}>
                      <div style={{ display: 'flex', gap: '15px' }}>
                        <span>Слова: <b>{countWords(activeScene.text)}</b></span>
                        <span>В главе: <b>{getChapterWordCount()}</b></span>
                        <span>В книге: <b>{getBookWordCount()}</b></span>
                      </div>
                      <button onClick={() => setShowObservations(!showObservations)} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: observations.length > 0 ? '#fff3cd' : 'transparent', border: '1px solid #dcd3c1', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', color: observations.length > 0 ? '#856404' : '#7a6b5d' }}>
                        {observations.length > 0 ? '⚠️' : '✓'} Журнал {observations.length > 0 ? `(${observations.length})` : ''}
                      </button>
                    </div>
                    
                    {/* Выпадающий список замечаний журнала */}
                    {showObservations && observations.length > 0 && (
                      <div style={{ padding: '15px 20px', borderTop: '1px solid #dcd3c1', background: '#ffffff', maxHeight: '250px', overflowY: 'auto' }}>
                        {observations.map((obs, idx) => (
                          <div key={idx} style={{ padding: '10px', background: obs.type === 'warning' ? '#fef2f2' : obs.type === 'candidate' ? '#f0fdf4' : '#fffbeb', border: `1px solid ${obs.type === 'warning' ? '#fecaca' : obs.type === 'candidate' ? '#bbf7d0' : '#fde68a'}`, borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            <div>
                              <div style={{ fontWeight: 'bold', fontSize: '0.85rem' }}>{obs.title}</div>
                              <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>{obs.description}</div>
                            </div>
                            <button onClick={() => handleObservationAction(idx)} style={{ padding: '6px 12px', background: '#7a4b3a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>
                              {obs.action}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7a6b5d' }}>Выберите сцену слева</div>
              )}
            </main>

            <aside style={{ width: '340px', borderLeft: '1px solid #dcd3c1', background: '#f5f0e6', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ flex: 1, padding: '15px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#7a6b5d', margin: '0 0 10px 0' }}>✨ ИИ-Соавтор</h3>

                <div style={{ marginBottom: '10px', border: '1px solid #dcd3c1', borderRadius: '6px', background: '#fdfbf7' }}>
                  <button onClick={() => setShowSettings(!showSettings)} style={{ width: '100%', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#5c3a21', fontSize: '0.85rem', fontWeight: 'bold' }}>
                    <span>⚙️ Параметры</span><span>{showSettings ? '▲' : '▼'}</span>
                  </button>
                  {showSettings && (
                    <div style={{ padding: '10px 12px 12px 12px', borderTop: '1px solid #dcd3c1' }}>
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: '#7a6b5d', marginBottom: '4px' }}>Свобода:</label>
                        <select value={creativeLatitude} onChange={(e) => setCreativeLatitude(e.target.value)} style={{ ...inputStyle, padding: '6px' }}>
                          <option value="strict">Строгий</option><option value="constrained">Ограниченный</option><option value="guided">Сбалансированный</option><option value="open">Свободный</option>
                        </select>
                      </div>
                      <div style={{ marginBottom: '8px' }}><label style={{ display: 'block', fontSize: '0.75rem', color: '#7a6b5d', marginBottom: '4px' }}>NSFW: {policies.nsfw}</label><input type="range" min="0" max="5" value={policies.nsfw} onChange={(e) => setPolicies({ ...policies, nsfw: Number(e.target.value) })} style={{ width: '100%' }} /></div>
                      <div style={{ marginBottom: '8px' }}><label style={{ display: 'block', fontSize: '0.75rem', color: '#7a6b5d', marginBottom: '4px' }}>Реализм: {policies.realism}</label><input type="range" min="0" max="5" value={policies.realism} onChange={(e) => setPolicies({ ...policies, realism: Number(e.target.value) })} style={{ width: '100%' }} /></div>
                      <div><label style={{ display: 'block', fontSize: '0.75rem', color: '#7a6b5d', marginBottom: '4px' }}>Жестокость: {policies.cruelty}</label><input type="range" min="0" max="5" value={policies.cruelty} onChange={(e) => setPolicies({ ...policies, cruelty: Number(e.target.value) })} style={{ width: '100%' }} /></div>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#7a6b5d', marginBottom: '4px' }}>Модель:</label>
                  <select value={selectedModel} onChange={(e) => { setSelectedModel(e.target.value); localStorage.setItem('selectedAIModel', e.target.value) }} style={{ width: '100%', padding: '6px 8px', borderRadius: '4px', border: '1px solid #dcd3c1', fontSize: '0.85rem', background: '#fdfbf7', boxSizing: 'border-box' }}>
                    {availableModels.map((model: any) => (
                      <option key={model.id} value={model.id}>{model.name} — {model.provider}</option>
                    ))}
                  </select>
                </div>

                <textarea value={aiInstruction} onChange={(e) => setAiInstruction(e.target.value)} placeholder="Инструкция..." style={{ width: '100%', height: '80px', padding: '10px', borderRadius: '6px', border: '1px solid #dcd3c1', marginBottom: '10px', boxSizing: 'border-box', background: '#fdfbf7', fontSize: '0.9rem', resize: 'none' }} />

                <button onClick={handleGenerateAI} disabled={isGenerating || !aiInstruction.trim()} style={{ width: '100%', padding: '10px', background: isGenerating ? '#999' : '#7a4b3a', color: '#fdfbf7', border: 'none', borderRadius: '6px', cursor: isGenerating ? 'wait' : 'pointer', fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '10px' }}>
                  {isGenerating ? '✨ Генерация...' : '✨ Сгенерировать'}
                </button>

                <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
                  <button onClick={() => openPromptInspector('sent')} style={{ flex: 1, padding: '7px 6px', background: '#fdfbf7', border: '1px solid #7a4b3a', color: '#7a4b3a', borderRadius: '4px', cursor: 'pointer', fontSize: '0.78rem' }}>🔍 Промпт</button>
                  <button onClick={handleCheckScene} disabled={isAnalyzing} style={{ flex: 1, padding: '7px 6px', background: '#fdfbf7', border: '1px solid #7a4b3a', color: '#7a4b3a', borderRadius: '4px', cursor: 'pointer', fontSize: '0.78rem' }}>{isAnalyzing ? '⏳' : '🔍 Проверка'}</button>
                </div>

                {generationHistory.length > 0 && (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    <div style={{ fontSize: '0.75rem', color: '#7a6b5d', marginBottom: '8px', fontWeight: 'bold' }}>📜 История:</div>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
                      {generationHistory.map((h, i) => (
                        <button key={h.id} onClick={() => setActiveHistoryId(h.id)} style={{ padding: '4px 10px', background: activeHistoryId === h.id ? '#7a4b3a' : '#fdfbf7', color: activeHistoryId === h.id ? '#fdfbf7' : '#7a4b3a', border: '1px solid #dcd3c1', borderRadius: '12px', cursor: 'pointer', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                          Вар. {generationHistory.length - i}
                        </button>
                      ))}
                    </div>
                    {activeHistory && (
                      <div style={{ flex: 1, overflowY: 'auto', padding: '12px', background: '#ffffff', borderRadius: '6px', border: '1px solid #dcd3c1', fontSize: '0.9rem', lineHeight: '1.6', color: '#2c241b', marginBottom: '10px' }}>
                        <div style={{ fontSize: '0.7rem', color: '#7a6b5d', marginBottom: '6px', fontStyle: 'italic' }}>«{activeHistory.instruction}»</div>
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

      {showExportModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,36,27,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '20px' }} onClick={() => setShowExportModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(500px, 90vw)', background: '#fdfbf7', border: '1px solid #dcd3c1', borderRadius: '10px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#5c3a21' }}>📥 Экспорт</h3>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Формат:</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setExportFormat('md')} style={{ flex: 1, padding: '10px', background: exportFormat === 'md' ? '#7a4b3a' : '#fdfbf7', color: exportFormat === 'md' ? '#fdfbf7' : '#7a4b3a', border: '1px solid #dcd3c1', borderRadius: '6px', cursor: 'pointer' }}>Markdown</button>
                <button onClick={() => setExportFormat('txt')} style={{ flex: 1, padding: '10px', background: exportFormat === 'txt' ? '#7a4b3a' : '#fdfbf7', color: exportFormat === 'txt' ? '#fdfbf7' : '#7a4b3a', border: '1px solid #dcd3c1', borderRadius: '6px', cursor: 'pointer' }}>Текст</button>
              </div>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Диапазон:</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}><input type="radio" name="scope" checked={exportScope === 'scene'} onChange={() => setExportScope('scene')} /> Сцена</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}><input type="radio" name="scope" checked={exportScope === 'chapter'} onChange={() => setExportScope('chapter')} /> Глава</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}><input type="radio" name="scope" checked={exportScope === 'book'} onChange={() => setExportScope('book')} /> Вся книга</label>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowExportModal(false)} style={{ padding: '8px 16px', background: 'none', border: '1px solid #dcd3c1', color: '#7a6b5d', borderRadius: '6px', cursor: 'pointer' }}>Отмена</button>
              <button onClick={handleExport} style={{ padding: '8px 16px', background: '#7a4b3a', color: '#fdfbf7', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Скачать</button>
            </div>
          </div>
        </div>
      )}

      {showGraph && activeBookId && (
        <CharacterGraph projectId={activeBookId} onClose={() => setShowGraph(false)} />
      )}

      <PromptInspector open={inspectorOpen} record={inspectorRecord} onClose={() => setInspectorOpen(false)} />
    </div>
  )
}

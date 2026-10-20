import { useState, useEffect } from 'react'

export default function App() {
  const [view, setView] = useState('library')
  const [hoveredBookId, setHoveredBookId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState('idle')
  const [books, setBooks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeBookId, setActiveBookId] = useState<string | null>(null)
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null)
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null)
  
  // Состояния для редактирования названий
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null)
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null)
  const [editingBookId, setEditingBookId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  
  // Состояния для персонажей
  const [characters, setCharacters] = useState<any[]>([])
  const [showCharacterModal, setShowCharacterModal] = useState(false)
  const [editingCharacter, setEditingCharacter] = useState<any>(null)
  const [characterForm, setCharacterForm] = useState({
    name: '',
    description: '',
    role: 'secondary'
  })

  // Состояния для ИИ
  const [selectedModel, setSelectedModel] = useState<string>(localStorage.getItem('selectedAIModel') || 'nvidia/llama-3.1-nemotron-70b-instruct')
  const [availableModels, setAvailableModels] = useState<any[]>([])
  const [aiInstruction, setAiInstruction] = useState('')
  const [aiResult, setAiResult] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  // Загрузка книг из базы данных при старте
  useEffect(() => {
    const loadBooks = async () => {
      try {
        const res = await fetch('/api/projects')
        const data = await res.json()
        if (data.projects) {
          const loadedBooks = data.projects.map((p: any) => ({
            id: p.id,
            title: p.title,
            status: 'В работе',
            genre: p.description || 'Не указан',
            chapters: (p.chapters || []).map((ch: any) => ({
              id: ch.id,
              title: ch.title,
              scenes: (ch.scenes || []).map((s: any) => ({
                id: s.id,
                title: s.title,
                text: s.body || ''
              }))
            }))
          }))
          setBooks(loadedBooks)
        }
      } catch (error) {
        console.error('Ошибка загрузки книг:', error)
      } finally {
        setLoading(false)
      }
    }
    loadBooks()
  }, [])

  // Загрузка моделей при старте
  useEffect(() => {
    loadModels()
  }, [])

  const activeBook = books.find(b => b.id === activeBookId)
  const activeChapter = activeBook?.chapters.find(c => c.id === activeChapterId)
  const activeScene = activeChapter?.scenes.find(s => s.id === activeSceneId)

  // Генерация уникального UUID для локальных операций
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleTextChange = (newText: string) => {
    setBooks(books.map(book => {
      if (book.id !== activeBookId) return book;
      return {
        ...book,
        chapters: book.chapters.map(chapter => {
          if (chapter.id !== activeChapterId) return chapter;
          return {
            ...chapter,
            scenes: chapter.scenes.map(scene =>
              scene.id === activeSceneId ? { ...scene, text: newText } : scene
            )
          };
        })
      };
    }));
    if (saveStatus === 'saved') setSaveStatus('idle');
  };

  const addChapter = () => {
    const newChapter = { id: generateUUID(), title: 'Новая глава', scenes: [] };
    setBooks(books.map(b => b.id === activeBookId ? { ...b, chapters: [...b.chapters, newChapter] } : b));
  };

  const addScene = (chapterId: string) => {
    const newScene = { id: generateUUID(), title: 'Новая сцена', text: '' };
    setBooks(books.map(b => {
      if (b.id !== activeBookId) return b;
      return {
        ...b,
        chapters: b.chapters.map(c => c.id === chapterId ? { ...c, scenes: [...c.scenes, newScene] } : c)
      };
    }));
    setActiveChapterId(chapterId);
    setActiveSceneId(newScene.id);
  };

  // Создание книги с отправкой на сервер
  const handleCreateBook = async () => {
    const title = window.prompt('Как назовем новую книгу?');
    if (!title || title.trim() === '') return;
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: 'Новый проект' }),
      });
      const data = await res.json();
      if (data.project) {
        const newBook = {
          id: data.project.id,
          title: data.project.title,
          status: 'В работе',
          genre: 'Не указан',
          chapters: data.project.chapters.map((ch: any) => ({
            id: ch.id,
            title: ch.title,
            scenes: ch.scenes.map((s: any) => ({
              id: s.id,
              title: s.title,
              text: s.body || ''
            }))
          }))
        };
        setBooks([...books, newBook]);
        setActiveBookId(newBook.id);
        setActiveChapterId(newBook.chapters[0].id);
        setActiveSceneId(newBook.chapters[0].scenes[0].id);
        setView('editor');
        loadCharacters(newBook.id);
      } else {
        alert('Ошибка создания: ' + data.error);
      }
    } catch (error) {
      alert('Ошибка соединения: ' + error.message);
    }
  };

  // Сохранение сцены в базу данных
  const handleSave = async () => {
    if (!activeScene) return;
    setSaveStatus('saving');
    try {
      const res = await fetch(`/api/scenes/${activeScene.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: activeScene.text }),
      });
      const data = await res.json();
      if (data.success) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        alert('Ошибка сохранения: ' + data.error);
        setSaveStatus('idle');
      }
    } catch (error) {
      alert('Ошибка сети: ' + error.message);
      setSaveStatus('idle');
    }
  };

  // Обновление названия главы
  const handleUpdateChapterTitle = async (chapterId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    try {
      const res = await fetch(`/api/chapters/${chapterId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      const data = await res.json();
      if (data.success) {
        setBooks(books.map(book => {
          if (book.id !== activeBookId) return book;
          return {
            ...book,
            chapters: book.chapters.map(ch => ch.id === chapterId ? { ...ch, title: newTitle } : ch)
          };
        }));
        setEditingChapterId(null);
      } else {
        alert('Ошибка обновления: ' + data.error);
      }
    } catch (error) {
      alert('Ошибка соединения: ' + error.message);
    }
  };

  // Обновление названия сцены
  const handleUpdateSceneTitle = async (sceneId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    try {
      const res = await fetch(`/api/scenes/title/${sceneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      const data = await res.json();
      if (data.success) {
        setBooks(books.map(book => {
          if (book.id !== activeBookId) return book;
          return {
            ...book,
            chapters: book.chapters.map(ch => ({
              ...ch,
              scenes: ch.scenes.map(s => s.id === sceneId ? { ...s, title: newTitle } : s)
            }))
          };
        }));
        setEditingSceneId(null);
      } else {
        alert('Ошибка обновления: ' + data.error);
      }
    } catch (error) {
      alert('Ошибка соединения: ' + error.message);
    }
  };

  // Обновление названия книги
  const handleUpdateBookTitle = async (bookId: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    try {
      const res = await fetch(`/api/projects/${bookId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      const data = await res.json();
      if (data.success) {
        setBooks(books.map(b => b.id === bookId ? { ...b, title: newTitle } : b));
        setEditingBookId(null);
      } else {
        alert('Ошибка обновления: ' + data.error);
      }
    } catch (error) {
      alert('Ошибка соединения: ' + error.message);
    }
  };

  // Удаление книги (проекта)
  const handleDeleteBook = async (bookId: string, bookTitle: string) => {
    const confirmed = window.confirm(`Вы уверены, что хотите удалить книгу "${bookTitle}"?\nЭто действие нельзя отменить, будут удалены все главы и сцены.`);
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/projects/${bookId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setBooks(books.filter(b => b.id !== bookId));
        if (activeBookId === bookId) {
          setView('library');
          setActiveBookId(null);
          setActiveChapterId(null);
          setActiveSceneId(null);
        }
      } else {
        alert('Ошибка удаления: ' + data.error);
      }
    } catch (error) {
      alert('Ошибка соединения: ' + error.message);
    }
  };

  // === ФУНКЦИИ ДЛЯ ПЕРСОНАЖЕЙ ===
  const loadCharacters = async (projectId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/characters`)
      const data = await res.json()
      if (data.characters) {
        setCharacters(data.characters)
      }
    } catch (error) {
      console.error('Ошибка загрузки персонажей:', error)
    }
  }

    // Загрузка списка доступных моделей
  const loadModels = async () => {
    try {
      const res = await fetch('/api/models')
      if (!res.ok) {
        throw new Error(`HTTP ошибка: ${res.status}`)
      }
      const data = await res.json()
      if (data.models && data.models.length > 0) {
        setAvailableModels(data.models)
        // Если выбранная модель не найдена, используем первую доступную
        if (!data.models.find((m: any) => m.id === selectedModel) && data.models.length > 0) {
          setSelectedModel(data.models[0].id)
          localStorage.setItem('selectedAIModel', data.models[0].id)
        }
      } else {
        throw new Error('Список моделей пуст')
      }
    } catch (error) {
      console.warn('Не удалось загрузить модели с сервера, используем fallback-список:', error)
      // Fallback список моделей для прототипа
      const fallbackModels = [
        { id: 'nvidia/llama-3.1-nemotron-70b-instruct', name: 'NVIDIA Llama 3.1 Nemotron 70B Instruct' },
        { id: 'openai/gpt-4o', name: 'OpenAI GPT-4o' },
        { id: 'anthropic/claude-3-5-sonnet', name: 'Anthropic Claude 3.5 Sonnet' },
        { id: 'meta-llama/llama-3-70b-instruct', name: 'Meta Llama 3 70B Instruct' }
      ]
      setAvailableModels(fallbackModels)
      if (!fallbackModels.find((m: any) => m.id === selectedModel)) {
        setSelectedModel(fallbackModels[0].id)
        localStorage.setItem('selectedAIModel', fallbackModels[0].id)
      }
    }
  }

  const handleSaveCharacter = async () => {
    if (!characterForm.name.trim()) {
      alert('Имя персонажа обязательно')
      return
    }
    try {
      const url = editingCharacter
        ? `/api/characters/${editingCharacter.id}`
        : `/api/projects/${activeBookId}/characters`
      const method = editingCharacter ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(characterForm)
      })
      const data = await res.json()
      if (data.character) {
        if (editingCharacter) {
          setCharacters(characters.map(c => c.id === data.character.id ? data.character : c))
        } else {
          setCharacters([...characters, data.character])
        }
        setShowCharacterModal(false)
        setEditingCharacter(null)
        setCharacterForm({ name: '', description: '', role: 'secondary' })
      } else {
        alert('Ошибка: ' + data.error)
      }
    } catch (error) {
      alert('Ошибка соединения: ' + error.message)
    }
  }

  // Генерация текста с помощью ИИ
  const handleGenerateAI = async () => {
    if (!aiInstruction.trim() || !activeScene) return;

    setIsGenerating(true);
    setAiResult(null);

    try {
      // Формируем контекст из персонажей
      const charactersContext = characters.length > 0
        ? 'Персонажи в этой книге:\n' + characters.map(c => 
            `- ${c.name} (${c.role === 'protagonist' ? 'протагонист' : c.role === 'antagonist' ? 'антагонист' : 'второстепенный'})${c.description ? ': ' + c.description : ''}`
          ).join('\n')
        : 'Персонажей пока нет.';

      // Формируем промпт
      const prompt = `Ты — ИИ-соавтор для писателя. Помогай создавать художественные тексты, сохраняя стиль и контекст произведения.

${charactersContext}

Текущий текст сцены:
"""
${activeScene.text || '(сцена пока пустая)'}
"""

Инструкция автора: ${aiInstruction}

Напиши художественный фрагмент, который соответствует инструкции. Сохраняй стиль, учитывай персонажей и контекст. Не добавляй объяснений, только текст.`;

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt, 
          modelId: selectedModel 
        })
      });

      const data = await res.json();

      if (data.text) {
        setAiResult(data.text);
      } else if (data.error) {
        alert('Ошибка ИИ: ' + data.error);
      } else {
        alert('Неожиданный ответ от ИИ');
      }
    } catch (error) {
      alert('Ошибка соединения: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteCharacter = async (characterId: string, characterName: string) => {
    const confirmed = window.confirm(`Удалить персонажа "${characterName}"?`)
    if (!confirmed) return
    try {
      const res = await fetch(`/api/characters/${characterId}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setCharacters(characters.filter(c => c.id !== characterId))
      } else {
        alert('Ошибка: ' + data.error)
      }
    } catch (error) {
      alert('Ошибка соединения: ' + error.message)
    }
  }

  const openCharacterModal = (character?: any) => {
    if (character) {
      setEditingCharacter(character)
      setCharacterForm({
        name: character.name,
        description: character.description || '',
        role: character.role || 'secondary'
      })
    } else {
      setEditingCharacter(null)
      setCharacterForm({ name: '', description: '', role: 'secondary' })
    }
    setShowCharacterModal(true)
  }

  // === РЕНДЕРИНГ ===
  return (
    <div style={{ minHeight: '100vh', background: '#fdfbf7', fontFamily: 'Georgia, serif', color: '#2c241b' }}>
      <style>{`
        .book-card { transition: all 0.2s ease; cursor: pointer; }
        .book-card:hover { transform: translateY(-4px); box-shadow: 0 10px 20px rgba(92, 58, 33, 0.15); }
        .create-card { transition: all 0.2s ease; cursor: pointer; }
        .create-card:hover { background: #ebe3d5 !important; border-color: #7a4b3a !important; }
        .hover-info { display: none; }
        .book-card:hover .hover-info { display: block; }
        .tree-item { cursor: pointer; transition: background 0.2s; }
        .tree-item:hover { background: #ebe3d5; }
      `}</style>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '1.2rem', color: '#7a6b5d' }}>
          Загрузка библиотеки...
        </div>
      )}

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
              <div
                key={book.id}
                className="book-card"
                onMouseEnter={() => setHoveredBookId(book.id)}
                onMouseLeave={() => setHoveredBookId(null)}
                onClick={() => {
                  setActiveBookId(book.id);
                  setActiveChapterId(book.chapters[0]?.id || null);
                  setActiveSceneId(book.chapters[0]?.scenes[0]?.id || null);
                  setView('editor');
                  loadCharacters(book.id);
                }}
                style={{ aspectRatio: '3/4', background: '#ffffff', borderRadius: '8px', border: '1px solid #dcd3c1', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative', overflow: 'hidden' }}
              >
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#2c241b' }}>{book.title}</h3>
                {hoveredBookId === book.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteBook(book.id, book.title);
                    }}
                    style={{
                      position: 'absolute', top: '10px', right: '10px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', padding: '6px 10px', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'sans-serif', zIndex: 10
                    }}
                  >
                    🗑️ Удалить
                  </button>
                )}
                {hoveredBookId === book.id && (
                  <div className="hover-info" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(253, 251, 247, 0.95)', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', fontSize: '0.9rem', color: '#5c4a3d', zIndex: 5 }}>
                    <p style={{ margin: '0 0 8px 0' }}><strong>Жанр:</strong> {book.genre}</p>
                    <p style={{ margin: 0 }}><strong>Статус:</strong> {book.status}</p>
                    <div style={{ marginTop: '20px', fontSize: '0.8rem', color: '#7a4b3a', textAlign: 'center', borderTop: '1px solid #dcd3c1', paddingTop: '10px' }}>
                      Нажмите, чтобы открыть
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && view === 'characters' && activeBook && (
        <div style={{ padding: '40px 10%', maxWidth: '1000px', margin: '0 auto' }}>
          <header style={{ marginBottom: '30px', borderBottom: '1px solid #dcd3c1', paddingBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '2rem', color: '#5c3a21', margin: 0 }}>Персонажи: {activeBook.title}</h1>
              <p style={{ color: '#7a6b5d', marginTop: '8px' }}>Управляйте персонажами вашей книги</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setView('editor')} style={{ padding: '8px 16px', background: 'none', border: '1px solid #7a4b3a', color: '#7a4b3a', borderRadius: '6px', cursor: 'pointer' }}>
                ← К редактору
              </button>
              <button onClick={() => openCharacterModal()} style={{ padding: '8px 16px', background: '#7a4b3a', color: '#fdfbf7', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                + Новый персонаж
              </button>
            </div>
          </header>
          {characters.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#7a6b5d' }}>
              <div style={{ fontSize: '3rem', marginBottom: '20px' }}>👥</div>
              <p style={{ fontSize: '1.1rem' }}>Пока нет персонажей</p>
              <p style={{ fontSize: '0.9rem' }}>Нажмите "+ Новый персонаж", чтобы добавить первого</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {characters.map(char => (
                <div key={char.id} style={{ background: '#ffffff', border: '1px solid #dcd3c1', borderRadius: '8px', padding: '20px', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '10px' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#2c241b' }}>{char.name}</h3>
                    <span style={{
                      padding: '2px 8px', borderRadius: '12px', fontSize: '0.75rem',
                      background: char.role === 'protagonist' ? '#dbeafe' : char.role === 'antagonist' ? '#fee2e2' : '#f3f4f6',
                      color: char.role === 'protagonist' ? '#1e40af' : char.role === 'antagonist' ? '#991b1b' : '#4b5563'
                    }}>
                      {char.role === 'protagonist' ? 'Протагонист' : char.role === 'antagonist' ? 'Антагонист' : 'Второстепенный'}
                    </span>
                  </div>
                  {char.description && (
                    <p style={{ margin: '10px 0', fontSize: '0.9rem', color: '#4a3f35', lineHeight: '1.5' }}>{char.description}</p>
                  )}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '15px' }}>
                    <button onClick={() => openCharacterModal(char)} style={{ flex: 1, padding: '6px', background: 'none', border: '1px solid #dcd3c1', color: '#7a4b3a', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>
                      ✏️ Изменить
                    </button>
                    <button onClick={() => handleDeleteCharacter(char.id, char.name)} style={{ flex: 1, padding: '6px', background: 'none', border: '1px solid #fee2e2', color: '#991b1b', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>
                      🗑️ Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {showCharacterModal && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
              <div style={{ background: '#fdfbf7', borderRadius: '12px', padding: '30px', maxWidth: '500px', width: '90%', maxHeight: '90vh', overflowY: 'auto' }}>
                <h2 style={{ marginTop: 0, color: '#5c3a21' }}>{editingCharacter ? 'Редактировать персонажа' : 'Новый персонаж'}</h2>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#5c3a21' }}>Имя *</label>
                  <input
                    type="text"
                    value={characterForm.name}
                    onChange={(e) => setCharacterForm({ ...characterForm, name: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #dcd3c1', borderRadius: '6px', fontSize: '1rem', boxSizing: 'border-box' }}
                    placeholder="Например: Энн Бони"
                  />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#5c3a21' }}>Роль</label>
                  <select
                    value={characterForm.role}
                    onChange={(e) => setCharacterForm({ ...characterForm, role: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #dcd3c1', borderRadius: '6px', fontSize: '1rem', boxSizing: 'border-box' }}
                  >
                    <option value="protagonist">Протагонист</option>
                    <option value="antagonist">Антагонист</option>
                    <option value="secondary">Второстепенный</option>
                  </select>
                </div>
                <div style={{ marginBottom: '25px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: 'bold', color: '#5c3a21' }}>Описание</label>
                  <textarea
                    value={characterForm.description}
                    onChange={(e) => setCharacterForm({ ...characterForm, description: e.target.value })}
                    style={{ width: '100%', padding: '10px', border: '1px solid #dcd3c1', borderRadius: '6px', fontSize: '1rem', minHeight: '100px', boxSizing: 'border-box', resize: 'vertical' }}
                    placeholder="Краткое описание персонажа, его роль в истории..."
                  />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => { setShowCharacterModal(false); setEditingCharacter(null); }} style={{ flex: 1, padding: '10px', background: 'none', border: '1px solid #dcd3c1', color: '#7a6b5d', borderRadius: '6px', cursor: 'pointer' }}>
                    Отмена
                  </button>
                  <button onClick={handleSaveCharacter} style={{ flex: 1, padding: '10px', background: '#7a4b3a', color: '#fdfbf7', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                    {editingCharacter ? 'Сохранить' : 'Создать'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {!loading && view === 'editor' && activeBook && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
          <header style={{ height: '50px', borderBottom: '1px solid #dcd3c1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', background: '#f5f0e6' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <button onClick={() => setView('library')} style={{ background: 'none', border: 'none', color: '#7a4b3a', cursor: 'pointer', fontSize: '1rem' }}>← Библиотека</button>
              <button onClick={() => setView('characters')} style={{ background: 'none', border: '1px solid #dcd3c1', color: '#7a4b3a', cursor: 'pointer', fontSize: '0.9rem', padding: '4px 12px', borderRadius: '4px' }}>
                👥 Персонажи ({characters.length})
              </button>
            </div>
            {editingBookId === activeBook.id ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleUpdateBookTitle(activeBook.id, editingTitle);
                    if (e.key === 'Escape') setEditingBookId(null);
                  }}
                  autoFocus
                  style={{ padding: '4px 8px', border: '1px solid #7a4b3a', borderRadius: '4px', fontSize: '1rem', fontFamily: 'Georgia, serif', outline: 'none', fontWeight: 'bold' }}
                />
                <button onClick={() => handleUpdateBookTitle(activeBook.id, editingTitle)} style={{ padding: '4px 12px', background: '#5c7a5c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>✓ Сохранить</button>
                <button onClick={() => setEditingBookId(null)} style={{ padding: '4px 12px', background: '#999', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>✗ Отмена</button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontWeight: 'bold', color: '#5c3a21' }}>{activeBook.title}</div>
                <button
                  onClick={() => { setEditingBookId(activeBook.id); setEditingTitle(activeBook.title); }}
                  style={{ background: 'none', border: '1px solid #dcd3c1', color: '#7a4b3a', cursor: 'pointer', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', transition: 'all 0.2s' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#ebe3d5'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                  title="Переименовать книгу"
                >
                  ✏️ Изменить
                </button>
              </div>
            )}
            <button onClick={handleSave} disabled={saveStatus !== 'idle'} style={{ padding: '6px 16px', border: 'none', borderRadius: '4px', color: '#fdfbf7', fontFamily: 'sans-serif', fontSize: '0.9rem', background: saveStatus === 'saved' ? '#5c7a5c' : '#7a4b3a', cursor: saveStatus === 'idle' ? 'pointer' : 'default', transition: 'all 0.3s ease' }}>
              {saveStatus === 'saving' ? 'Сохранение...' : saveStatus === 'saved' ? '✓ Сохранено' : 'Сохранить'}
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
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdateChapterTitle(chapter.id, editingTitle);
                          if (e.key === 'Escape') setEditingChapterId(null);
                        }}
                        autoFocus
                        style={{ width: '100%', padding: '6px 8px', border: '1px solid #7a4b3a', borderRadius: '4px', fontSize: '0.9rem', fontFamily: 'Georgia, serif', outline: 'none', fontWeight: 'bold', boxSizing: 'border-box' }}
                      />
                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                        <button onClick={() => handleUpdateChapterTitle(chapter.id, editingTitle)} style={{ padding: '4px 10px', background: '#5c7a5c', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.75rem' }}>✓ Сохранить</button>
                        <button onClick={() => setEditingChapterId(null)} style={{ padding: '4px 10px', background: '#999', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.75rem' }}>✗ Отмена</button>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#5c3a21', marginBottom: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ flex: 1 }}>{chapter.title}</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => { setEditingChapterId(chapter.id); setEditingTitle(chapter.title); }}
                          style={{ background: 'none', border: '1px solid #dcd3c1', color: '#7a4b3a', cursor: 'pointer', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '3px', transition: 'all 0.2s' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#ebe3d5'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                          title="Переименовать главу"
                        >
                          ✏️ Изм.
                        </button>
                        <button onClick={() => addScene(chapter.id)} style={{ background: 'none', border: 'none', color: '#7a4b3a', cursor: 'pointer', fontSize: '1rem' }}>+</button>
                      </div>
                    </div>
                  )}
                  {chapter.scenes.map(scene => (
                    <div key={scene.id} style={{ marginLeft: '10px', marginBottom: '4px' }}>
                      {editingSceneId === scene.id ? (
                        <div>
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleUpdateSceneTitle(scene.id, editingTitle);
                              if (e.key === 'Escape') setEditingSceneId(null);
                            }}
                            autoFocus
                            style={{ width: '100%', padding: '6px 10px', border: '1px solid #7a4b3a', borderRadius: '4px', fontSize: '0.85rem', fontFamily: 'Georgia, serif', outline: 'none', boxSizing: 'border-box' }}
                          />
                          <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                            <button onClick={() => handleUpdateSceneTitle(scene.id, editingTitle)} style={{ padding: '3px 8px', background: '#5c7a5c', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.7rem' }}>✓ Сохранить</button>
                            <button onClick={() => setEditingSceneId(null)} style={{ padding: '3px 8px', background: '#999', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.7rem' }}>✗ Отмена</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <div
                            className="tree-item"
                            onClick={() => { setActiveChapterId(chapter.id); setActiveSceneId(scene.id); }}
                            style={{ flex: 1, padding: '6px 10px', borderRadius: '4px', fontSize: '0.85rem', borderLeft: activeSceneId === scene.id ? '3px solid #7a4b3a' : '3px solid transparent', color: activeSceneId === scene.id ? '#5c3a21' : '#4a3f35' }}
                          >
                            {scene.title}
                          </div>
                          <button
                            onClick={() => { setEditingSceneId(scene.id); setEditingTitle(scene.title); }}
                            style={{ background: 'none', border: '1px solid #dcd3c1', color: '#7a4b3a', cursor: 'pointer', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '3px', transition: 'all 0.2s' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#ebe3d5'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                            title="Переименовать сцену"
                          >
                            ✏️ Изм.
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </aside>

            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fdfbf7' }}>
              {activeScene ? (
                <textarea
                  value={activeScene.text}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder="Начните писать..."
                  style={{ flex: 1, border: 'none', outline: 'none', padding: '40px 10%', fontSize: '1.2rem', lineHeight: '1.8', resize: 'none', background: 'transparent', color: '#2c241b', fontFamily: 'Georgia, serif' }}
                />
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7a6b5d' }}>Выберите или создайте сцену слева</div>
              )}
            </main>

            <aside style={{ width: '320px', borderLeft: '1px solid #dcd3c1', background: '#f5f0e6', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Секция персонажей */}
              <div style={{ padding: '15px', borderBottom: '1px solid #dcd3c1', maxHeight: '200px', overflowY: 'auto' }}>
                <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#7a6b5d', margin: '0 0 10px 0', letterSpacing: '1px' }}>
                  👥 Персонажи ({characters.length})
                </h3>
                {characters.length === 0 ? (
                  <div style={{ fontSize: '0.85rem', color: '#7a6b5d', fontStyle: 'italic' }}>
                    Нет персонажей. Добавьте в разделе "Персонажи".
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {characters.map(char => (
                      <div key={char.id} style={{ padding: '8px', background: '#ffffff', borderRadius: '6px', border: '1px solid #dcd3c1' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '4px' }}>
                          <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#2c241b' }}>{char.name}</div>
                          <span style={{ 
                            padding: '2px 6px', 
                            borderRadius: '10px', 
                            fontSize: '0.7rem', 
                            background: char.role === 'protagonist' ? '#dbeafe' : char.role === 'antagonist' ? '#fee2e2' : '#f3f4f6',
                            color: char.role === 'protagonist' ? '#1e40af' : char.role === 'antagonist' ? '#991b1b' : '#4b5563'
                          }}>
                            {char.role === 'protagonist' ? 'Протагонист' : char.role === 'antagonist' ? 'Антагонист' : 'Второстепенный'}
                          </span>
                        </div>
                        {char.description && (
                          <div style={{ fontSize: '0.8rem', color: '#4a3f35', lineHeight: '1.4' }}>
                            {char.description.length > 100 ? char.description.substring(0, 100) + '...' : char.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Секция ИИ */}
              <div style={{ flex: 1, padding: '15px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#7a6b5d', margin: '0 0 10px 0', letterSpacing: '1px' }}>ИИ-Соавтор</h3>
                
                {/* Выбор модели */}
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: '#7a6b5d', marginBottom: '4px' }}>Модель:</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => {
                      setSelectedModel(e.target.value);
                      localStorage.setItem('selectedAIModel', e.target.value);
                    }}
                    style={{ 
                      width: '100%', 
                      padding: '6px 8px', 
                      borderRadius: '4px', 
                      border: '1px solid #dcd3c1', 
                      fontSize: '0.85rem',
                      background: '#fdfbf7',
                      boxSizing: 'border-box'
                    }}
                  >
                    {availableModels.length === 0 ? (
                      <option value="">Загрузка моделей...</option>
                    ) : (
                      availableModels.map((model: any) => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Поле запроса */}
                <textarea 
                  value={aiInstruction}
                  onChange={(e) => setAiInstruction(e.target.value)}
                  placeholder="Например: Опиши, как Энн замечает Тёмного рыцаря в толпе..." 
                  style={{ 
                    width: '100%', 
                    height: '80px', 
                    padding: '10px', 
                    borderRadius: '6px', 
                    border: '1px solid #dcd3c1', 
                    marginBottom: '10px', 
                    boxSizing: 'border-box', 
                    background: '#fdfbf7', 
                    fontFamily: 'sans-serif', 
                    fontSize: '0.9rem', 
                    resize: 'none' 
                  }}
                />
                
                {/* Кнопка генерации */}
                <button 
                  onClick={handleGenerateAI}
                  disabled={isGenerating || !aiInstruction.trim()}
                  style={{ 
                    width: '100%', 
                    padding: '10px', 
                    background: isGenerating ? '#999' : '#7a4b3a', 
                    color: '#fdfbf7', 
                    border: 'none', 
                    borderRadius: '6px', 
                    cursor: isGenerating ? 'wait' : 'pointer', 
                    fontFamily: 'sans-serif', 
                    fontWeight: 'bold', 
                    fontSize: '0.9rem',
                    marginBottom: '10px'
                  }}
                >
                  {isGenerating ? '✨ Генерация...' : '✨ Сгенерировать'}
                </button>

                {/* Результат генерации */}
                {aiResult && (
                  <div style={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    padding: '12px', 
                    background: '#ffffff', 
                    borderRadius: '6px', 
                    border: '1px solid #dcd3c1',
                    fontSize: '0.9rem',
                    lineHeight: '1.6',
                    color: '#2c241b'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: '#7a6b5d', marginBottom: '8px', textTransform: 'uppercase' }}>Результат:</div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{aiResult}</div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', borderTop: '1px solid #dcd3c1', paddingTop: '10px' }}>
                      <button 
                        onClick={() => {
                          if (activeScene && aiResult) {
                            const newText = activeScene.text + (activeScene.text ? '\n\n' : '') + aiResult;
                            handleTextChange(newText);
                          }
                        }}
                        style={{ 
                          flex: 1, 
                          padding: '6px', 
                          background: '#5c7a5c', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '4px', 
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        ✓ Вставить в сцену
                      </button>
                      <button 
                        onClick={() => setAiResult(null)}
                        style={{ 
                          flex: 1, 
                          padding: '6px', 
                          background: '#999', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '4px', 
                          cursor: 'pointer',
                          fontSize: '0.8rem'
                        }}
                      >
                        ✗ Очистить
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}

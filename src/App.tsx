import { useState } from 'react'

export default function App() {
  const [view, setView] = useState('library')
  const [hoveredBookId, setHoveredBookId] = useState(null)
  
  // Наша новая иерархическая структура данных
  const [books, setBooks] = useState([
    {
      id: 1,
      title: 'Тени над портом',
      status: 'В работе',
      genre: 'Тёмное фэнтези',
      chapters: [
        {
          id: 101,
          title: 'Глава 1: Шторм',
          scenes: [
            { id: 1001, title: 'Сцена 1: На берегу', text: 'Ветер бил в лицо, принося запах соли и гнили...' },
            { id: 1002, title: 'Сцена 2: Таверна', text: '' }
          ]
        }
      ]
    }
  ])

  const [activeBookId, setActiveBookId] = useState(null)
  const [activeChapterId, setActiveChapterId] = useState(null)
  const [activeSceneId, setActiveSceneId] = useState(null)
  const [saveStatus, setSaveStatus] = useState('idle')

  // Находим активные объекты
  const activeBook = books.find(b => b.id === activeBookId)
  const activeChapter = activeBook?.chapters.find(c => c.id === activeChapterId)
  const activeScene = activeChapter?.scenes.find(s => s.id === activeSceneId)

  // Обновление текста сцены (глубокое обновление состояния)
  const handleTextChange = (newText) => {
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
  }

  // Добавление новой главы
  const addChapter = () => {
    const newChapter = { id: Date.now(), title: `Новая глава`, scenes: [] };
    setBooks(books.map(b => b.id === activeBookId ? { ...b, chapters: [...b.chapters, newChapter] } : b));
  }

  // Добавление новой сцены в текущую главу
  const addScene = (chapterId) => {
    const newScene = { id: Date.now(), title: `Новая сцена`, text: '' };
    setBooks(books.map(b => {
      if (b.id !== activeBookId) return b;
      return {
        ...b,
        chapters: b.chapters.map(c => c.id === chapterId ? { ...c, scenes: [...c.scenes, newScene] } : c)
      };
    }));
    setActiveChapterId(chapterId);
    setActiveSceneId(newScene.id);
  }

    // Функция создания новой книги с начальной структурой
  const handleCreateBook = () => {
    const title = window.prompt('Как назовем новую книгу?');
    if (title && title.trim() !== '') {
      const newBook = {
        id: Date.now(),
        title: title,
        status: 'В работе',
        genre: 'Не указан',
        chapters: [
          {
            id: Date.now() + 1,
            title: 'Глава 1',
            scenes: [
              { id: Date.now() + 2, title: 'Сцена 1', text: '' }
            ]
          }
        ]
      };
      setBooks([...books, newBook]);
    }
  };
  const handleSave = () => {
    setSaveStatus('saving');
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 800);
  }

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

      {/* === ЭКРАН БИБЛИОТЕКИ === */}
      {view === 'library' && (
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
              <div key={book.id} className="book-card" onMouseEnter={() => setHoveredBookId(book.id)} onMouseLeave={() => setHoveredBookId(null)} onClick={() => { setActiveBookId(book.id); setActiveChapterId(book.chapters[0]?.id); setActiveSceneId(book.chapters[0]?.scenes[0]?.id); setView('editor'); }} style={{ aspectRatio: '3/4', background: '#ffffff', borderRadius: '8px', border: '1px solid #dcd3c1', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative', overflow: 'hidden' }}>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#2c241b' }}>{book.title}</h3>
                {hoveredBookId === book.id && (
                  <div className="hover-info" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(253, 251, 247, 0.95)', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'center', fontSize: '0.9rem', color: '#5c4a3d' }}>
                    <p style={{ margin: '0 0 8px 0' }}><strong>Жанр:</strong> {book.genre}</p>
                    <p style={{ margin: 0 }}><strong>Статус:</strong> {book.status}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === ЭКРАН РЕДАКТОРА === */}
      {view === 'editor' && activeBook && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
          {/* Шапка */}
          <header style={{ height: '50px', borderBottom: '1px solid #dcd3c1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', background: '#f5f0e6' }}>
            <button onClick={() => setView('library')} style={{ background: 'none', border: 'none', color: '#7a4b3a', cursor: 'pointer', fontSize: '1rem' }}>← Библиотека</button>
            <div style={{ fontWeight: 'bold', color: '#5c3a21' }}>{activeBook.title}</div>
            <button onClick={handleSave} disabled={saveStatus !== 'idle'} style={{ padding: '6px 16px', border: 'none', borderRadius: '4px', color: '#fdfbf7', fontFamily: 'sans-serif', fontSize: '0.9rem', background: saveStatus === 'saved' ? '#5c7a5c' : '#7a4b3a', cursor: saveStatus === 'idle' ? 'pointer' : 'default' }}>
              {saveStatus === 'saving' ? 'Сохранение...' : saveStatus === 'saved' ? '✓ Сохранено' : 'Сохранить'}
            </button>
          </header>

          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* Левая панель: Дерево глав и сцен */}
            <aside style={{ width: '260px', borderRight: '1px solid #dcd3c1', background: '#f5f0e6', overflowY: 'auto', padding: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#7a6b5d', margin: 0 }}>Структура</h3>
                <button onClick={addChapter} style={{ background: 'none', border: 'none', color: '#7a4b3a', cursor: 'pointer', fontSize: '1.2rem' }}>+</button>
              </div>
              
              {activeBook.chapters.map(chapter => (
                <div key={chapter.id} style={{ marginBottom: '15px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#5c3a21', marginBottom: '5px', display: 'flex', justifyContent: 'space-between' }}>
                    {chapter.title}
                    <button onClick={() => addScene(chapter.id)} style={{ background: 'none', border: 'none', color: '#7a4b3a', cursor: 'pointer', fontSize: '1rem' }}>+</button>
                  </div>
                  {chapter.scenes.map(scene => (
                    <div key={scene.id} className="tree-item" onClick={() => { setActiveChapterId(chapter.id); setActiveSceneId(scene.id); }} style={{ padding: '6px 10px', marginLeft: '10px', borderRadius: '4px', fontSize: '0.85rem', borderLeft: activeSceneId === scene.id ? '3px solid #7a4b3a' : '3px solid transparent', color: activeSceneId === scene.id ? '#5c3a21' : '#4a3f35' }}>
                      {scene.title}
                    </div>
                  ))}
                </div>
              ))}
            </aside>

            {/* Центр: Редактор */}
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

            {/* Правая панель: ИИ */}
            <aside style={{ width: '300px', borderLeft: '1px solid #dcd3c1', background: '#f5f0e6', padding: '20px' }}>
              <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#7a6b5d', margin: '0 0 15px 0' }}>ИИ-Соавтор</h3>
              <textarea placeholder="Запрос к ИИ..." style={{ width: '100%', height: '100px', padding: '10px', borderRadius: '6px', border: '1px solid #dcd3c1', background: '#fdfbf7', boxSizing: 'border-box', fontFamily: 'sans-serif' }} />
              <button style={{ width: '100%', padding: '10px', background: '#7a4b3a', color: '#fdfbf7', border: 'none', borderRadius: '6px', cursor: 'pointer', marginTop: '10px' }}>Сгенерировать</button>
            </aside>
          </div>
        </div>
      )}
    </div>
  )
}

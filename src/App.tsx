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

  // Удаление книги (проекта)
  const handleDeleteBook = async (bookId: string, bookTitle: string) => {
    const confirmed = window.confirm(`Вы уверены, что хотите удалить книгу "${bookTitle}"?\nЭто действие нельзя отменить, будут удалены все главы и сцены.`);
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/projects/${bookId}`, {
        method: 'DELETE',
      });
      
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
                }} 
                style={{ aspectRatio: '3/4', background: '#ffffff', borderRadius: '8px', border: '1px solid #dcd3c1', padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative', overflow: 'hidden' }}
              >
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#2c241b' }}>{book.title}</h3>
                
                {/* Кнопка удаления (появляется при наведении) */}
                {hoveredBookId === book.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Предотвращаем открытие книги при клике на удаление
                      handleDeleteBook(book.id, book.title);
                    }}
                    style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      background: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      padding: '6px 10px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontFamily: 'sans-serif',
                      zIndex: 10
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

      {!loading && view === 'editor' && activeBook && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
          <header style={{ height: '50px', borderBottom: '1px solid #dcd3c1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', background: '#f5f0e6' }}>
            <button onClick={() => setView('library')} style={{ background: 'none', border: 'none', color: '#7a4b3a', cursor: 'pointer', fontSize: '1rem' }}>← Библиотека</button>
            <div style={{ fontWeight: 'bold', color: '#5c3a21' }}>{activeBook.title}</div>
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

            <aside style={{ width: '300px', borderLeft: '1px solid #dcd3c1', background: '#f5f0e6', padding: '20px' }}>
              <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#7a6b5d', margin: '0 0 15px 0' }}>ИИ-Соавтор</h3>
              <textarea placeholder="Запрос к ИИ..." style={{ width: '100%', height: '100px', padding: '10px', borderRadius: '6px', border: '1px solid #dcd3c1', background: '#fdfbf7', boxSizing: 'border-box', fontFamily: 'sans-serif', resize: 'none' }} />
              <button style={{ width: '100%', padding: '10px', background: '#7a4b3a', color: '#fdfbf7', border: 'none', borderRadius: '6px', cursor: 'pointer', marginTop: '10px' }}>Сгенерировать</button>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}

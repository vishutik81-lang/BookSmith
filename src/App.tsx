import { useState } from 'react'

export default function App() {
  const [view, setView] = useState('library') // 'library' или 'editor'
  const [hoveredBookId, setHoveredBookId] = useState(null)
  
  // Локальные данные
  const [books, setBooks] = useState([
    { id: 1, title: 'Тени над портом', status: 'В работе', genre: 'Тёмное фэнтези', words: 12450 },
    { id: 2, title: 'Хроники Арканума', status: 'Готова', genre: 'Научпоп', words: 45000 },
  ])

  const [activeBookId, setActiveBookId] = useState(null)

  // Функция создания новой книги
  const handleCreateBook = async () => {
    // 1. Спрашиваем название
    const title = window.prompt('Как назовем новую книгу?');
    
    // Если нажали "Отмена" или оставили пустым — выходим
    if (!title || title.trim() === '') return; 

    try {
      // 2. Отправляем запрос на наш сервер (перенаправление)
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description: 'Новый проект' }),
      });
      
      const data = await res.json();

      // 3. Если сервер вернул созданную книгу, добавляем её в список
      if (data.project) {
        setBooks([...books, {
          id: data.project.id, // Настоящий UUID из базы данных!
          title: data.project.title,
          status: 'В работе',
          genre: 'Не указан',
          words: 0
        }]);
        
        // Сразу открываем редактор для новой книги
        setActiveBookId(data.project.id);
        setView('editor');
      } else {
        alert('Ошибка: ' + data.error);
      }
    } catch (error) {
      alert('Ошибка соединения с сервером: ' + error.message);
    }
  }

  const openBook = (id) => {
    setActiveBookId(id)
    setView('editor')
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
      `}</style>

      {/* === ЭКРАН БИБЛИОТЕКИ === */}
      {view === 'library' && (
        <div style={{ padding: '40px 10%', maxWidth: '1200px', margin: '0 auto' }}>
          <header style={{ marginBottom: '40px', borderBottom: '1px solid #dcd3c1', paddingBottom: '20px' }}>
            <h1 style={{ fontSize: '2.5rem', color: '#5c3a21', margin: 0 }}>Моя Библиотека</h1>
            <p style={{ color: '#7a6b5d', marginTop: '10px' }}>Ваши проекты, черновики и готовые книги</p>
          </header>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '25px' }}>
            
            {/* Карточка создания новой книги */}
            <div 
              className="create-card"
              onClick={handleCreateBook}
              style={{ 
                aspectRatio: '3/4', 
                border: '2px dashed #bfaea1', 
                borderRadius: '8px', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                background: '#f5f0e6'
              }}
            >
              <div style={{ fontSize: '3rem', color: '#7a4b3a', marginBottom: '10px' }}>+</div>
              <div style={{ fontSize: '1.1rem', color: '#5c3a21', fontWeight: 'bold' }}>Новая книга</div>
            </div>

            {/* Карточки существующих книг */}
            {books.map(book => (
              <div 
                key={book.id}
                className="book-card"
                onMouseEnter={() => setHoveredBookId(book.id)}
                onMouseLeave={() => setHoveredBookId(null)}
                onClick={() => openBook(book.id)}
                style={{ 
                  aspectRatio: '3/4', 
                  background: '#ffffff', 
                  borderRadius: '8px', 
                  border: '1px solid #dcd3c1',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#2c241b', lineHeight: '1.3' }}>{book.title}</h3>
                
                {hoveredBookId === book.id && (
                  <div className="hover-info" style={{ 
                    position: 'absolute', 
                    top: 0, left: 0, right: 0, bottom: 0, 
                    background: 'rgba(253, 251, 247, 0.95)', 
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    fontSize: '0.9rem',
                    color: '#5c4a3d'
                  }}>
                    <p style={{ margin: '0 0 8px 0' }}><strong>Жанр:</strong> {book.genre}</p>
                    <p style={{ margin: '0 0 8px 0' }}><strong>Статус:</strong> {book.status}</p>
                    <p style={{ margin: 0 }}><strong>Слов:</strong> {book.words.toLocaleString()}</p>
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

      {/* === ЭКРАН РЕДАКТОРА === */}
      {view === 'editor' && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
          <header style={{ height: '50px', borderBottom: '1px solid #dcd3c1', display: 'flex', alignItems: 'center', padding: '0 20px', background: '#f5f0e6' }}>
            <button 
              onClick={() => setView('library')}
              style={{ background: 'none', border: 'none', color: '#7a4b3a', cursor: 'pointer', fontSize: '1rem', marginRight: '20px' }}
            >
              ← В библиотеку
            </button>
            <div style={{ fontWeight: 'bold', color: '#5c3a21' }}>Редактор: {books.find(b => b.id === activeBookId)?.title}</div>
          </header>
          <main style={{ flex: 1, padding: '40px', display: 'flex', justifyContent: 'center' }}>
            <textarea 
              placeholder="Начните писать..." 
              style={{ width: '100%', maxWidth: '800px', height: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: '1.2rem', lineHeight: '1.8', resize: 'none', fontFamily: 'Georgia, serif' }}
            />
          </main>
        </div>
      )}
    </div>
  )
}

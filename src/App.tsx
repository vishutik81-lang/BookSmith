import { useState } from 'react'

function App() {
  // Локальное хранилище сцен (у каждой свой текст!)
  const [scenes, setScenes] = useState([
    { id: 1, title: 'Сцена 1: Порт', text: 'Шторм усиливался, и запах соли бил в нос...' },
    { id: 2, title: 'Сцена 2: Таверна', text: '' },
  ])
  
  const [activeSceneId, setActiveSceneId] = useState(1)

  // Находим активную сцену
  const activeScene = scenes.find(s => s.id === activeSceneId)

  // Функция обновления текста (кладет текст в карман нужной сцены)
  const handleTextChange = (newText) => {
    setScenes(scenes.map(s => s.id === activeSceneId ? { ...s, text: newText } : s))
  }

  // Функция добавления новой сцены
  const addNewScene = () => {
    const newId = scenes.length > 0 ? Math.max(...scenes.map(s => s.id)) + 1 : 1
    const newScene = { id: newId, title: `Новая сцена ${newId}`, text: '' }
    setScenes([...scenes, newScene])
    setActiveSceneId(newId)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'Georgia, "Times New Roman", serif', color: '#2c241b', background: '#fdfbf7' }}>
      
      {/* Верхняя панель */}
      <header style={{ height: '50px', borderBottom: '1px solid #dcd3c1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', background: '#f5f0e6' }}>
        <div style={{ fontWeight: 'bold', fontSize: '1.2rem', color: '#5c3a21' }}>📚 BookSmith</div>
        <div style={{ fontSize: '0.9rem', color: '#7a6b5d' }}>
          {activeScene?.title} • {activeScene?.text.split(/\s+/).filter(w => w.length > 0).length} слов
        </div>
        <button style={{ padding: '6px 16px', background: '#7a4b3a', color: '#fdfbf7', border: 'none', borderRadius: '4px', cursor: 'pointer', fontFamily: 'sans-serif', fontSize: '0.9rem' }}>
          Сохранить в БД
        </button>
      </header>

      {/* Основная рабочая область */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* ЛЕВАЯ ПАНЕЛЬ: Структура */}
        <aside style={{ width: '260px', borderRight: '1px solid #dcd3c1', background: '#f5f0e6', overflowY: 'auto', padding: '15px' }}>
          <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#7a6b5d', marginBottom: '15px', letterSpacing: '1px' }}>Структура книги</h3>
          
          {scenes.map(scene => (
            <div 
              key={scene.id}
              onClick={() => setActiveSceneId(scene.id)}
              style={{ 
                padding: '10px 12px', 
                marginBottom: '8px',
                cursor: 'pointer', 
                borderRadius: '6px',
                background: activeSceneId === scene.id ? '#ebe3d5' : 'transparent',
                color: activeSceneId === scene.id ? '#5c3a21' : '#4a3f35',
                borderLeft: activeSceneId === scene.id ? '3px solid #7a4b3a' : '3px solid transparent',
                transition: 'all 0.2s'
              }}
            >
              {scene.title}
            </div>
          ))}
          
          <button 
            onClick={addNewScene}
            style={{ width: '100%', padding: '10px', marginTop: '15px', border: '1px dashed #bfaea1', background: 'transparent', color: '#7a4b3a', borderRadius: '6px', cursor: 'pointer', fontFamily: 'sans-serif' }}
          >
            + Добавить сцену
          </button>
        </aside>

        {/* ЦЕНТРАЛЬНАЯ ПАНЕЛЬ: Редактор */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fdfbf7' }}>
          <textarea
            value={activeScene?.text || ''}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="Начните писать вашу историю здесь..."
            style={{ 
              flex: 1, 
              border: 'none', 
              outline: 'none', 
              padding: '50px 10%', 
              fontSize: '1.2rem', 
              lineHeight: '1.8', 
              resize: 'none',
              background: 'transparent',
              color: '#2c241b',
              fontFamily: 'Georgia, serif'
            }}
          />
        </main>

        {/* ПРАВАЯ ПАНЕЛЬ: Контекст и ИИ */}
        <aside style={{ width: '320px', borderLeft: '1px solid #dcd3c1', background: '#f5f0e6', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid #dcd3c1' }}>
            <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#7a6b5d', margin: 0, letterSpacing: '1px' }}>ИИ-Соавтор</h3>
          </div>
          
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
            <p style={{ fontSize: '0.9rem', color: '#5c4a3d', lineHeight: '1.5', marginTop: 0 }}>
              Выделите текст или опишите, что должно произойти дальше. ИИ поможет продолжить сцену, не нарушая канон.
            </p>
            
            <textarea 
              placeholder="Например: Опиши, как Энн замечает Тёмного рыцаря в толпе..." 
              style={{ width: '100%', height: '100px', padding: '12px', borderRadius: '6px', border: '1px solid #dcd3c1', marginBottom: '15px', boxSizing: 'border-box', background: '#fdfbf7', fontFamily: 'sans-serif', fontSize: '0.9rem', resize: 'none' }}
            />
            
            <button style={{ width: '100%', padding: '12px', background: '#7a4b3a', color: '#fdfbf7', border: 'none', borderRadius: '6px', cursor: 'pointer', fontFamily: 'sans-serif', fontWeight: 'bold', fontSize: '1rem' }}>
              ✨ Сгенерировать
            </button>
          </div>
        </aside>

      </div>
    </div>
  )
}

export default App

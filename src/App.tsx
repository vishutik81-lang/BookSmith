import { useState } from 'react'

// Временные данные для демонстрации структуры
const mockStructure = [
  { id: 1, title: 'Глава 1: Начало пути', scenes: [{ id: 101, title: 'Сцена 1: Порт' }, { id: 102, title: 'Сцена 2: Таверна' }] },
  { id: 2, title: 'Глава 2: Тёмный рыцарь', scenes: [{ id: 201, title: 'Сцена 1: Встреча' }] },
]

function App() {
  const [activeScene, setActiveScene] = useState(101)
  const [text, setText] = useState('')
  const [rightPanelTab, setRightPanelTab] = useState<'context' | 'ai'>('context')

  const currentSceneTitle = mockStructure
    .flatMap(g => g.scenes)
    .find(s => s.id === activeScene)?.title || 'Новая сцена'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1e293b' }}>
      
      {/* Верхняя панель (Header) */}
      <header style={{ height: '50px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', background: '#ffffff' }}>
        <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>📚 BookSmith: Тестовый Проект</div>
        <div style={{ fontSize: '0.9rem', color: '#64748b' }}>
          {currentSceneTitle} • {text.split(/\s+/).filter(w => w.length > 0).length} слов
        </div>
        <button style={{ padding: '6px 12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem' }}>
          Сохранить
        </button>
      </header>

      {/* Основная рабочая область (3 панели) */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* ЛЕВАЯ ПАНЕЛЬ: Структура книги */}
        <aside style={{ width: '250px', borderRight: '1px solid #e2e8f0', background: '#f8fafc', overflowY: 'auto', padding: '10px' }}>
          <h3 style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#64748b', marginBottom: '10px' }}>Структура</h3>
          {mockStructure.map(chapter => (
            <div key={chapter.id} style={{ marginBottom: '15px' }}>
              <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '5px', color: '#334155' }}>{chapter.title}</div>
              <div style={{ paddingLeft: '10px' }}>
                {chapter.scenes.map(scene => (
                  <div 
                    key={scene.id}
                    onClick={() => setActiveScene(scene.id)}
                    style={{ 
                      padding: '6px 8px', 
                      fontSize: '0.85rem', 
                      cursor: 'pointer', 
                      borderRadius: '4px',
                      background: activeScene === scene.id ? '#dbeafe' : 'transparent',
                      color: activeScene === scene.id ? '#1e40af' : '#475569'
                    }}
                  >
                    {scene.title}
                  </div>
                ))}
              </div>
            </div>
          ))}
          <button style={{ width: '100%', padding: '8px', marginTop: '10px', border: '1px dashed #cbd5e1', background: 'transparent', color: '#64748b', borderRadius: '6px', cursor: 'pointer' }}>
            + Новая сцена
          </button>
        </aside>

        {/* ЦЕНТРАЛЬНАЯ ПАНЕЛЬ: Редактор текста */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#ffffff' }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Начните писать здесь... (Поддержка Markdown будет добавлена позже)"
            style={{ 
              flex: 1, 
              border: 'none', 
              outline: 'none', 
              padding: '40px', 
              fontSize: '1.1rem', 
              lineHeight: '1.7', 
              resize: 'none',
              fontFamily: 'Georgia, serif'
            }}
          />
        </main>

        {/* ПРАВАЯ ПАНЕЛЬ: Контекст и ИИ */}
        <aside style={{ width: '300px', borderLeft: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
          {/* Вкладки правой панели */}
          <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
            <button 
              onClick={() => setRightPanelTab('context')}
              style={{ flex: 1, padding: '12px', border: 'none', background: rightPanelTab === 'context' ? '#ffffff' : 'transparent', borderBottom: rightPanelTab === 'context' ? '2px solid #2563eb' : 'none', cursor: 'pointer', fontWeight: '500' }}
            >
              Контекст
            </button>
            <button 
              onClick={() => setRightPanelTab('ai')}
              style={{ flex: 1, padding: '12px', border: 'none', background: rightPanelTab === 'ai' ? '#ffffff' : 'transparent', borderBottom: rightPanelTab === 'ai' ? '2px solid #2563eb' : 'none', cursor: 'pointer', fontWeight: '500' }}
            >
              ИИ-помощник
            </button>
          </div>

          {/* Содержимое правой панели */}
          <div style={{ flex: 1, padding: '15px', overflowY: 'auto' }}>
            {rightPanelTab === 'context' ? (
              <div>
                <h4 style={{ marginTop: 0, fontSize: '0.9rem', color: '#334155' }}>Персонажи в сцене</h4>
                <div style={{ padding: '10px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '15px' }}>
                  <div style={{ fontWeight: '600' }}>Энн</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Статус: Активна, POV</div>
                </div>
                
                <h4 style={{ fontSize: '0.9rem', color: '#334155' }}>Локация</h4>
                <div style={{ padding: '10px', background: '#ffffff', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: '600' }}>Старый порт</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Атмосфера: Шторм, запах соли</div>
                </div>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '10px' }}>
                  Здесь будет наш генератор. Выделите текст или напишите запрос, и ИИ поможет продолжить сцену.
                </p>
                <textarea 
                  placeholder="Например: Опиши запах шторма..." 
                  style={{ width: '100%', height: '80px', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', marginBottom: '10px', boxSizing: 'border-box' }}
                />
                <button style={{ width: '100%', padding: '8px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                  Сгенерировать
                </button>
              </div>
            )}
          </div>
        </aside>

      </div>
    </div>
  )
}

export default App

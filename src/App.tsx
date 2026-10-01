import { useState, useEffect } from 'react'

function App() {
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState('')
  const [usedModel, setUsedModel] = useState('')
  const [loading, setLoading] = useState(false)
  const [models, setModels] = useState([])
  const [selectedModelId, setSelectedModelId] = useState('')

  // Загружаем список моделей при открытии страницы
  useEffect(() => {
    fetch('/api/models')
      .then(res => res.json())
      .then(data => {
        setModels(data)
        if (data.length > 0) setSelectedModelId(data[0].id)
      })
      .catch(err => console.error("Не удалось загрузить модели", err))
  }, [])

  const handleGenerate = async () => {
    if (!prompt || !selectedModelId) return
    setLoading(true)
    setResult('')
    setUsedModel('')
    
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, modelId: selectedModelId }),
      })
      const data = await res.json()
      setResult(data.text)
      setUsedModel(data.model || selectedModelId)
    } catch (e) {
      setResult('Ошибка соединения с сервером')
    }
    setLoading(false)
  }

  // Находим описание выбранной модели
  const currentModelDesc = models.find(m => m.id === selectedModelId)?.description || ''

  return (
    <div style={{ padding: '2rem', maxWidth: '700px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ color: '#2563eb', marginBottom: '20px' }}>📚 BookSmith - Генератор</h1>
      
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Выберите модель:</label>
        <select 
          value={selectedModelId} 
          onChange={(e) => setSelectedModelId(e.target.value)}
          style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem' }}
        >
          {models.map(model => (
            <option key={model.id} value={model.id}>{model.name}</option>
          ))}
        </select>
        {currentModelDesc && (
          <p style={{ fontSize: '0.85rem', color: '#555', marginTop: '8px', fontStyle: 'italic' }}>
             {currentModelDesc}
          </p>
        )}
      </div>

      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Ваш запрос:</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Например: Опиши старого капитана, смотрящего на шторм..."
          style={{ width: '100%', height: '100px', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', boxSizing: 'border-box', fontSize: '1rem' }}
        />
      </div>
      
      <button 
        onClick={handleGenerate} 
        disabled={loading || !prompt}
        style={{ 
          padding: '12px 24px', 
          background: loading ? '#93c5fd' : '#2563eb', 
          color: 'white', 
          border: 'none', 
          borderRadius: '8px', 
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '1rem',
          fontWeight: 'bold'
        }}
      >
        {loading ? 'Модель думает...' : 'Сгенерировать'}
      </button>

      {result && (
        <div style={{ marginTop: '30px', padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ marginTop: 0, color: '#1e293b' }}>✨ Результат:</h3>
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: '#334155' }}>{result}</p>
          {usedModel && (
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '15px', textAlign: 'right' }}>
              Использована модель: <code>{usedModel}</code>
            </p>
          )}
        </div>
      )}
    </div>
  )
}

export default App

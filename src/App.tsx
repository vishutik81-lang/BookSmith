import { useState } from 'react'

function App() {
  const [prompt, setPrompt] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    setResult('')
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const data = await res.json()
      setResult(data.text)
    } catch (e) {
      setResult('Ошибка соединения с сервером')
    }
    setLoading(false)
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ color: '#2563eb' }}> BookSmith - Тест ИИ</h1>
      <p>Введите идею для сцены или описания:</p>
      
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Например: Опиши старый маяк во время шторма..."
        style={{ width: '100%', height: '100px', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #ccc' }}
      />
      
      <button 
        onClick={handleGenerate} 
        disabled={loading || !prompt}
        style={{ padding: '10px 20px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
      >
        {loading ? 'Думаю...' : 'Сгенерировать'}
      </button>

      {result && (
        <div style={{ marginTop: '20px', padding: '15px', background: '#f4f4f5', borderRadius: '8px', whiteSpace: 'pre-wrap' }}>
          <h3 style={{ marginTop: 0 }}>Результат:</h3>
          <p>{result}</p>
        </div>
      )}
    </div>
  )
}

export default App

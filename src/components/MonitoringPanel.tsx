import { useState, useEffect } from 'react'

type LogEntry = {
  timestamp: string
  provider: string
  model: string
  promptLength: number
  tokensIn: number
  tokensOut: number
  totalTokens: number
  duration: number
  success: boolean
}

type Stats = {
  [provider: string]: {
    requests: number
    totalTokens: number
    totalDuration: number
  }
}

type MonitoringProps = {
  onClose: () => void
}

export default function MonitoringPanel({ onClose }: MonitoringProps) {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [stats, setStats] = useState<Stats>({})
  const [activeTab, setActiveTab] = useState<'logs' | 'stats'>('stats')

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5000) // Обновляем каждые 5 сек
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const [logsRes, statsRes] = await Promise.all([
        fetch('/api/monitoring/logs'),
        fetch('/api/monitoring/stats'),
      ])
      const logsData = await logsRes.json()
      const statsData = await statsRes.json()
      setLogs(logsData.logs || [])
      setStats(statsData.stats || {})
    } catch (error) {
      console.error('Ошибка загрузки мониторинга:', error)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,36,27,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '90vw', maxWidth: '900px', height: '80vh', background: '#fdfbf7', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        
        {/* HEADER */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #dcd3c1', background: '#f5f0e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#5c3a21' }}>📊 Мониторинг API</h2>
          <button onClick={onClose} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #dcd3c1', color: '#7a6b5d', borderRadius: '4px', cursor: 'pointer' }}>✕ Закрыть</button>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', borderBottom: '1px solid #dcd3c1', background: '#fdfbf7' }}>
          <button onClick={() => setActiveTab('stats')} style={{ flex: 1, padding: '12px', background: activeTab === 'stats' ? '#7a4b3a' : 'transparent', color: activeTab === 'stats' ? '#fdfbf7' : '#7a6b5d', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}>
            Статистика по провайдерам
          </button>
          <button onClick={() => setActiveTab('logs')} style={{ flex: 1, padding: '12px', background: activeTab === 'logs' ? '#7a4b3a' : 'transparent', color: activeTab === 'logs' ? '#fdfbf7' : '#7a6b5d', border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 'bold' }}>
            История запросов ({logs.length})
          </button>
        </div>

        {/* CONTENT */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {activeTab === 'stats' && (
            <div>
              <h3 style={{ marginTop: 0, color: '#5c3a21' }}>Использование по провайдерам</h3>
              {Object.keys(stats).length === 0 ? (
                <p style={{ color: '#7a6b5d', fontStyle: 'italic' }}>Пока нет данных. Сделайте несколько запросов.</p>
              ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {Object.entries(stats).map(([provider, data]) => (
                    <div key={provider} style={{ padding: '15px', background: '#ffffff', border: '1px solid #dcd3c1', borderRadius: '8px' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: '#7a4b3a' }}>{provider}</h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', fontSize: '0.9rem' }}>
                        <div><strong>Запросов:</strong> {data.requests}</div>
                        <div><strong>Токенов:</strong> {data.totalTokens.toLocaleString()}</div>
                        <div><strong>Время:</strong> {(data.totalDuration / 1000).toFixed(1)}с</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div>
              <h3 style={{ marginTop: 0, color: '#5c3a21' }}>Последние запросы</h3>
              {logs.length === 0 ? (
                <p style={{ color: '#7a6b5d', fontStyle: 'italic' }}>История пуста.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {logs.slice().reverse().map((log, i) => (
                    <div key={i} style={{ padding: '12px', background: '#ffffff', border: '1px solid #dcd3c1', borderRadius: '6px', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <strong style={{ color: '#7a4b3a' }}>{log.provider}</strong>
                        <span style={{ color: '#7a6b5d', fontSize: '0.75rem' }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div style={{ color: '#2c241b', marginBottom: '4px' }}>{log.model}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '0.75rem', color: '#7a6b5d' }}>
                        <span>Вход: {log.tokensIn}</span>
                        <span>Выход: {log.tokensOut}</span>
                        <span>Время: {log.duration}ms</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

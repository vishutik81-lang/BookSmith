import { useEffect, useMemo, useState } from 'react'

type InspectorProps = {
  open: boolean
  record: any
  onClose: () => void
}

// Разбиваем РЕАЛЬНЫЙ промпт на секции, не меняя его содержимого
function splitSections(prompt: string) {
  const result: { title: string; body: string }[] = []
  let title = 'Преамбула / роль'
  let buffer: string[] = []

  const flush = () => {
    const body = buffer.join('\n').trim()
    if (body || title !== 'Преамбула / роль') result.push({ title, body })
  }

  for (const line of prompt.split('\n')) {
    const match = /^===\s*(.+?)\s*===$/.exec(line)
    if (match) {
      flush()
      title = match[1]
      buffer = []
    } else {
      buffer.push(line)
    }
  }
  flush()
  return result
}

const WORLD_FIELDS = [
  { key: 'setting', label: '🏰 Сеттинг' },
  { key: 'time_period', label: '⏳ Временной период' },
  { key: 'rules', label: '⚖️ Правила мира' },
  { key: 'important_events', label: '📜 Важные события' },
  { key: 'tone', label: '🎨 Тон и стиль' },
  { key: 'custom_notes', label: '📝 Доп. заметки' },
]

const GAPS = [
  {
    title: 'Система якорей',
    text: 'Confirmed / negative anchors не подключены. Защита канона сейчас держится только на тексте промпта.',
  },
  {
    title: 'Слои реальности',
    text: 'Canon / dream / flashback / myth не различаются. Всё подаётся как единый контекст.',
  },
  {
    title: 'Субъективная правда',
    text: 'Знания, вера и память персонажа не отделены от фактов мира.',
  },
  {
    title: 'Evidence / provenance',
    text: 'У фактов нет источника и статуса подтверждения (candidate → confirmed).',
  },
  {
    title: 'Параметры сервера',
    text: 'temperature, max_tokens и заголовки задаются в server/openrouter.js и не контролируются из интерфейса.',
  },
]

export default function PromptInspector({ open, record, onClose }: InspectorProps) {
  const [tab, setTab] = useState<'prompt' | 'json' | 'sources'>('prompt')
  const [copied, setCopied] = useState(false)
  const [raw, setRaw] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    setTab('prompt')
    setCopied(false)
    setRaw(false)
  }, [record])

  const prompt: string = record?.prompt || ''

  const sections = useMemo(() => splitSections(prompt), [prompt])

  const requestBody = useMemo(
    () => ({
      model: record?.modelId || '',
      messages: [{ role: 'user', content: prompt }],
    }),
    [prompt, record?.modelId]
  )

  const jsonText = useMemo(() => JSON.stringify(requestBody, null, 2), [requestBody])

  if (!open || !record) return null

  const isSent = record.kind === 'sent'

  const copyText = async (text: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text)
      } else {
        const ta = document.createElement('textarea')
        ta.value = text
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        const ok = document.execCommand('copy')
        document.body.removeChild(ta)
        if (!ok) throw new Error('copy failed')
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      alert('Не удалось скопировать автоматически. Выделите текст вручную и нажмите Ctrl+C.')
    }
  }

  const download = (content: string, extension: string, mime: string) => {
    const safeName = (record.sceneTitle || 'scene')
      .replace(/[^a-z0-9а-яё_-]/gi, '_')
      .slice(0, 60)
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `prompt-${safeName}-${record.createdAt || Date.now()}.${extension}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const tabBtn = (active: boolean) => ({
    padding: '8px 14px',
    background: active ? '#7a4b3a' : 'transparent',
    color: active ? '#fdfbf7' : '#7a6b5d',
    border: 'none',
    borderBottom: active ? '2px solid #7a4b3a' : '2px solid transparent',
    cursor: 'pointer',
    fontSize: '0.85rem',
    fontFamily: 'sans-serif',
  })

  const smallBtn = {
    padding: '7px 12px',
    background: '#fdfbf7',
    border: '1px solid #dcd3c1',
    color: '#5c3a21',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontFamily: 'sans-serif',
  } as const

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(44,36,27,0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(1150px, 96vw)',
          height: '90vh',
          background: '#fdfbf7',
          border: '1px solid #dcd3c1',
          borderRadius: '10px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          fontFamily: 'sans-serif',
        }}
      >
        {/* HEADER */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #dcd3c1',
            background: '#f5f0e6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#5c3a21', fontFamily: 'Georgia, serif' }}>
              🔍 Prompt Inspector
            </h2>
            <span
              style={{
                padding: '3px 9px',
                borderRadius: '12px',
                fontSize: '0.7rem',
                fontWeight: 'bold',
                background: isSent ? '#dcfce7' : '#fef3c7',
                color: isSent ? '#166534' : '#92400e',
              }}
            >
              {isSent ? 'ОТПРАВЛЕНО В МОДЕЛЬ' : 'ПРЕДПРОСМОТР'}
            </span>
            <span style={{ fontSize: '0.8rem', color: '#7a6b5d' }}>{record.modelId}</span>
          </div>
          <button
            onClick={onClose}
            style={{ ...smallBtn, background: 'transparent', fontSize: '1.1rem', padding: '2px 10px' }}
            title="Закрыть (Esc)"
          >
            ×
          </button>
        </div>

        {/* META */}
        <div
          style={{
            padding: '10px 20px',
            borderBottom: '1px solid #dcd3c1',
            fontSize: '0.78rem',
            color: '#7a6b5d',
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            flexShrink: 0,
          }}
        >
          <span>📖 {record.sceneTitle || '—'}</span>
          <span>🎛 Свобода: <b>{record.latitude || '—'}</b></span>
          <span>
            NSFW <b>{record.policies?.nsfw}</b> · Реализм <b>{record.policies?.realism}</b> · Жестокость{' '}
            <b>{record.policies?.cruelty}</b>
          </span>
          {record.createdAt && (
            <span>🕒 {new Date(record.createdAt).toLocaleString('ru-RU')}</span>
          )}
        </div>

        {/* WARNING */}
        <div
          style={{
            padding: '9px 20px',
            background: isSent ? '#f0fdf4' : '#fffbeb',
            borderBottom: '1px solid #dcd3c1',
            fontSize: '0.78rem',
            color: isSent ? '#166534' : '#92400e',
            flexShrink: 0,
          }}
        >
          {isSent
            ? 'Это дословный промпт, который был отправлен в модель для текущего варианта. Здесь нет «причёсывания».'
            : 'Это предпросмотр текущего состояния. Он может отличаться от промпта, который создал выбранный вариант. Выберите вариант и нажмите «Промпт варианта».'}
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', borderBottom: '1px solid #dcd3c1', flexShrink: 0 }}>
          <button style={tabBtn(tab === 'prompt')} onClick={() => setTab('prompt')}>
            Эффективный промпт
          </button>
          <button style={tabBtn(tab === 'json')} onClick={() => setTab('json')}>
            Тело запроса (JSON)
          </button>
          <button style={tabBtn(tab === 'sources')} onClick={() => setTab('sources')}>
            Источники и пробелы
          </button>
        </div>

        {/* BODY */}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 310px',
            overflow: 'hidden',
          }}
        >
          {/* LEFT */}
          <div style={{ overflowY: 'auto', padding: '18px 20px', minWidth: 0 }}>
            {tab === 'prompt' && (
              <>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', color: '#7a6b5d' }}>
                    {sections.length} секций · {prompt.length} символов
                  </span>
                  <button style={smallBtn} onClick={() => setRaw(!raw)}>
                    {raw ? 'По секциям' : 'Показать raw'}
                  </button>
                </div>

                {raw ? (
                  <pre
                    style={{
                      margin: 0,
                      padding: '14px',
                      background: '#f5f0e6',
                      border: '1px solid #dcd3c1',
                      borderRadius: '6px',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                      fontSize: '0.8rem',
                      lineHeight: 1.6,
                      color: '#2c241b',
                    }}
                  >
                    {prompt}
                  </pre>
                ) : (
                  sections.map((section, i) => (
                    <div
                      key={i}
                      style={{
                        marginBottom: '14px',
                        border: '1px solid #dcd3c1',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        background: '#ffffff',
                      }}
                    >
                      <div
                        style={{
                          padding: '8px 12px',
                          background: '#f5f0e6',
                          fontSize: '0.78rem',
                          fontWeight: 'bold',
                          color: '#5c3a21',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <span>{section.title}</span>
                        <button
                          onClick={() => copyText(section.body)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#7a4b3a',
                            cursor: 'pointer',
                            fontSize: '0.72rem',
                            whiteSpace: 'nowrap',
                          }}
                          title="Скопировать секцию"
                        >
                          ⧉ копировать
                        </button>
                      </div>
                      <pre
                        style={{
                          margin: 0,
                          padding: '12px',
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                          fontSize: '0.8rem',
                          lineHeight: 1.65,
                          color: '#2c241b',
                        }}
                      >
                        {section.body || '(пусто)'}
                      </pre>
                    </div>
                  ))
                )}
              </>
            )}

            {tab === 'json' && (
              <>
                <p style={{ fontSize: '0.8rem', color: '#7a6b5d', marginTop: 0, lineHeight: 1.6 }}>
                  Тело запроса, которое бэкенд отправляет в OpenRouter. API-ключ и заголовки
                  добавляются на сервере и сюда не попадают.
                </p>
                <pre
                  style={{
                    margin: 0,
                    padding: '14px',
                    background: '#2c241b',
                    color: '#f5f0e6',
                    borderRadius: '6px',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                    fontSize: '0.78rem',
                    lineHeight: 1.6,
                  }}
                >
                  {jsonText}
                </pre>
              </>
            )}

            {tab === 'sources' && (
              <>
                <h3 style={{ fontSize: '0.9rem', color: '#5c3a21', marginTop: 0 }}>
                  Что реально вошло в контекст
                </h3>

                <div style={{ fontSize: '0.82rem', color: '#4a3f35', lineHeight: 1.7 }}>
                  <p><b>Сцена:</b> {record.sceneTitle || '—'}</p>
                  <p style={{ fontSize: '0.72rem', color: '#7a6b5d', wordBreak: 'break-all' }}>
                    id: {record.sceneId || '—'}
                  </p>
                  <p><b>Длина текста сцены:</b> {record.sceneTextLength ?? 0} симв.</p>
                  <p>
                    <b>Предыстория:</b>{' '}
                    {record.contextBefore ? record.contextBefore : '(не заполнена)'}
                  </p>
                </div>

                <h4 style={{ fontSize: '0.82rem', color: '#5c3a21', marginBottom: '8px' }}>
                  Персонажи сцены ({record.characters?.length || 0})
                </h4>
                {(record.characters || []).length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: '#991b1b', marginBottom: '16px' }}>
                    ⚠ В сцене нет привязанных персонажей. ИИ опирается только на инструкцию.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '18px' }}>
                    {(record.characters || []).map((c: any, i: number) => (
                      <div
                        key={i}
                        style={{
                          padding: '7px 10px',
                          background: '#ffffff',
                          border: '1px solid #dcd3c1',
                          borderRadius: '5px',
                          fontSize: '0.8rem',
                          display: 'flex',
                          justifyContent: 'space-between',
                          gap: '8px',
                        }}
                      >
                        <b>{c.name}</b>
                        <span style={{ color: '#7a6b5d' }}>
                          {c.role === 'pov' ? 'POV' : c.role === 'mentioned' ? 'упоминается' : 'присутствует'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <h4 style={{ fontSize: '0.82rem', color: '#5c3a21', marginBottom: '8px' }}>
                  Мир книги
                </h4>
                <div style={{ marginBottom: '20px' }}>
                  {WORLD_FIELDS.map((f) => {
                    const value = record.worldNotes?.[f.key] || ''
                    return (
                      <div
                        key={f.key}
                        style={{
                          padding: '6px 0',
                          borderBottom: '1px dashed #e7dfd2',
                          fontSize: '0.78rem',
                        }}
                      >
                        <span style={{ color: value ? '#5c7a5c' : '#b0a596' }}>
                          {value ? '✓' : '—'}
                        </span>{' '}
                        <b>{f.label}:</b>{' '}
                        <span style={{ color: '#7a6b5d' }}>
                          {value
                            ? value.length > 110
                              ? value.slice(0, 110) + '…'
                              : value
                            : 'не заполнено'}
                        </span>
                      </div>
                    )
                  })}
                </div>

                <h4 style={{ fontSize: '0.82rem', color: '#991b1b', marginBottom: '10px' }}>
                  Честные пробелы архитектуры
                </h4>
                <p style={{ fontSize: '0.75rem', color: '#7a6b5d', lineHeight: 1.6, marginTop: 0 }}>
                  Эти механизмы из ТЗ ещё не реализованы. Их отсутствие влияет на то, что видит модель.
                </p>
                {GAPS.map((gap, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '9px 11px',
                      marginBottom: '8px',
                      background: '#fff7ed',
                      border: '1px solid #f0d9bf',
                      borderRadius: '5px',
                      fontSize: '0.78rem',
                    }}
                  >
                    <b style={{ color: '#9a3412' }}>{gap.title}</b>
                    <div style={{ color: '#7a6b5d', marginTop: '3px', lineHeight: 1.5 }}>{gap.text}</div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* RIGHT */}
          <div
            style={{
              borderLeft: '1px solid #dcd3c1',
              background: '#f5f0e6',
              padding: '18px 16px',
              overflowY: 'auto',
            }}
          >
            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: '#7a6b5d', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Инструкция автора
            </h4>
            <div
              style={{
                padding: '10px',
                background: '#ffffff',
                border: '1px solid #dcd3c1',
                borderRadius: '5px',
                fontSize: '0.82rem',
                lineHeight: 1.6,
                color: '#2c241b',
                whiteSpace: 'pre-wrap',
                marginBottom: '20px',
              }}
            >
              {record.instruction || '(не указана)'}
            </div>

            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: '#7a6b5d', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Политики (сырые значения)
            </h4>
            {[
              { label: 'Откровенность', value: record.policies?.nsfw, max: 5 },
              { label: 'Реализм', value: record.policies?.realism, max: 5 },
              { label: 'Жестокость', value: record.policies?.cruelty, max: 5 },
            ].map((p, i) => (
              <div key={i} style={{ marginBottom: '10px', fontSize: '0.8rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#5c3a21' }}>
                  <span>{p.label}</span>
                  <b>{p.value}</b>
                </div>
                <div style={{ height: '5px', background: '#e3dacc', borderRadius: '3px', marginTop: '4px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${((p.value || 0) / p.max) * 100}%`,
                      height: '100%',
                      background: '#7a4b3a',
                    }}
                  />
                </div>
              </div>
            ))}

            <div
              style={{
                marginTop: '20px',
                padding: '10px',
                background: '#fdfbf7',
                border: '1px dashed #dcd3c1',
                borderRadius: '5px',
                fontSize: '0.73rem',
                color: '#7a6b5d',
                lineHeight: 1.6,
              }}
            >
              <b>Semantic portability.</b> Значения политик разворачиваются в человеческий язык
              внутри промпта. Этот текст можно перенести в другую модель без внутренних кодов.
              <br /><br />
              <b>API-ключ</b> в промпт не входит и на клиент не передаётся.
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #dcd3c1',
            background: '#f5f0e6',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            flexWrap: 'wrap',
            flexShrink: 0,
          }}
        >
          <button
            onClick={() => copyText(prompt)}
            style={{
              ...smallBtn,
              background: '#7a4b3a',
              color: '#fdfbf7',
              border: 'none',
              fontWeight: 'bold',
            }}
          >
            {copied ? '✓ Скопировано' : '⧉ Скопировать промпт'}
          </button>
          <button style={smallBtn} onClick={() => download(prompt, 'txt', 'text/plain;charset=utf-8')}>
            ⬇ Скачать .txt
          </button>
          <button style={smallBtn} onClick={() => download(jsonText, 'json', 'application/json')}>
            ⬇ Скачать JSON
          </button>
          <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#7a6b5d' }}>
            Esc — закрыть
          </span>
        </div>
      </div>
    </div>
  )
}

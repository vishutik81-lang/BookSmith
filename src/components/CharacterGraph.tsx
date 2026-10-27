import { useState, useEffect, useRef } from 'react'

type Node = { id: string; name: string; x: number; y: number }
type Link = { id: string; source: string; target: string; type: string; strength: number; description: string }

type GraphProps = {
  projectId: string
  onClose: () => void
}

const RELATION_COLORS: Record<string, string> = {
  ally: '#5c7a5c',         // Зеленый
  enemy: '#dc2626',        // Красный
  romantic: '#db2777',     // Розовый
  secret_lover: '#a21caf', // Фиолетовый
  rival: '#d97706',        // Оранжевый
  mentor: '#2563eb',       // Синий
  family: '#7a4b3a',       // Коричневый
  childhood_friend: '#0891b2', // Бирюзовый
  betrayed: '#7f1d1d',     // Темно-красный
  debtor: '#65a30d',       // Салатовый
  default: '#7a6b5d'       // Серый
}

const TYPE_NAMES: Record<string, string> = {
  ally: "Союзник", enemy: "Враг", romantic: "Романтический интерес",
  mentor: "Наставник / Ученик", rival: "Соперник", family: "Семья",
  debtor: "Должник / Кредитор", secret_lover: "Тайная любовь",
  betrayed: "Предательство", childhood_friend: "Друг детства", default: "Знакомый"
}

// Текст для всплывающей подсказки
const STRENGTH_TOOLTIP = "Шкала силы связи:\n• 1-3: Начальная / Слабая\n• 4-6: Устойчивая / Средняя\n• 7-8: Глубокая / Сильная\n• 9-10: Фатальная / Экстремальная"

const getLevelName = (strength: number) => {
  if (strength <= 3) return "Начальная / Слабая"
  if (strength <= 6) return "Устойчивая / Средняя"
  if (strength <= 8) return "Глубокая / Сильная"
  return "Фатальная / Экстремальная"
}

const getBehaviorHint = (type: string, strength: number) => {
  if (type === 'enemy' || type === 'betrayed') {
    return strength >= 7 
      ? "Тон предельно холодный, язвительный или агрессивный. Физическая дистанция максимальна." 
      : "Скрытое недоверие, колкие замечания, постоянная проверка на прочность."
  } else if (type === 'romantic' || type === 'secret_lover') {
    return strength >= 7 
      ? "Скрытая нежность, задерживающиеся взгляды, интуитивное понимание. Физический контакт осторожен, но значим." 
      : "Осторожное любопытство, легкий флирт, желание узнать человека лучше, но с оглядкой."
  } else if (type === 'ally' || type === 'childhood_friend') {
    return strength >= 7 
      ? "Безоговорочное доверие, готовность пойти на риск ради другого, интуитивное понимание с полуслова." 
      : "Взаимовыгодное сотрудничество, вежливость, базовое уважение."
  } else if (type === 'rival') {
    return strength >= 7 
      ? "Ожесточенная борьба, желание доказать превосходство любой ценой." 
      : "Профессиональная конкуренция, подтекст в диалогах, взаимное уважение сквозь соперничество."
  } else {
    return `Учитывайте уровень связи (${strength}/10) при описании их взаимодействия.`
  }
}

export default function CharacterGraph({ projectId, onClose }: GraphProps) {
  const [nodes, setNodes] = useState<Node[]>([])
  const [links, setLinks] = useState<Link[]>([])
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [selectedLink, setSelectedLink] = useState<Link | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    loadGraph()
  }, [projectId])

  const loadGraph = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/relations`)
      const data = await res.json()
      
      if (data.characters) {
        const radius = 200
        const centerX = 400
        const centerY = 300
        const initialNodes = data.characters.map((c: any, i: number) => {
          const angle = (i / data.characters.length) * 2 * Math.PI
          return {
            id: c.id,
            name: c.name,
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle)
          }
        })
        setNodes(initialNodes)
      }
      
      if (data.relations) {
        setLinks(data.relations.map((r: any) => ({
          id: r.id,
          source: r.source_id,
          target: r.target_id,
          type: r.type,
          strength: r.strength,
          description: r.description
        })))
      }
    } catch (error) {
      console.error('Ошибка загрузки графа:', error)
    }
  }

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation()
    setDraggingId(nodeId)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingId || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setNodes(nodes.map(n => n.id === draggingId ? { ...n, x, y } : n))
  }

  const handleMouseUp = () => {
    setDraggingId(null)
  }

  const handleAddRelation = async (sourceId: string, targetId: string, type: string, strength: number, description: string) => {
    try {
      const res = await fetch('/api/relations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_id: sourceId, target_id: targetId, type, strength, description })
      })
      const data = await res.json()
      if (data.success) {
        await loadGraph()
        setShowAddModal(false)
      } else {
        alert('Ошибка: ' + data.error)
      }
    } catch (error: any) {
      alert('Ошибка: ' + error.message)
    }
  }

  const handleDeleteRelation = async (id: string) => {
    if (!window.confirm('Удалить эту связь?')) return
    try {
      const res = await fetch(`/api/relations/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        setLinks(links.filter(l => l.id !== id))
        setSelectedLink(null)
      } else {
        alert('Ошибка: ' + data.error)
      }
    } catch (error: any) {
      alert('Ошибка: ' + error.message)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(44,36,27,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '90vw', height: '90vh', background: '#fdfbf7', borderRadius: '12px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        
        {/* HEADER */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #dcd3c1', background: '#f5f0e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#5c3a21' }}>🕸️ Граф связей персонажей</h2>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button onClick={() => setShowAddModal(true)} style={{ padding: '6px 12px', background: '#7a4b3a', color: '#fdfbf7', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}>+ Добавить связь</button>
            <button onClick={onClose} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #dcd3c1', color: '#7a6b5d', borderRadius: '4px', cursor: 'pointer' }}>✕ Закрыть</button>
          </div>
        </div>

        {/* GRAPH AREA */}
        <div style={{ flex: 1, position: 'relative', background: '#ffffff', overflow: 'hidden' }} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
          <svg ref={svgRef} width="100%" height="100%" style={{ cursor: draggingId ? 'grabbing' : 'default' }}>
            {/* Links */}
            {links.map(link => {
              const source = nodes.find(n => n.id === link.source)
              const target = nodes.find(n => n.id === link.target)
              if (!source || !target) return null
              
              const color = RELATION_COLORS[link.type] || RELATION_COLORS.default
              const isSelected = selectedLink?.id === link.id
              
              return (
                <g key={link.id} onClick={(e) => { e.stopPropagation(); setSelectedLink(link) }} style={{ cursor: 'pointer' }}>
                  <line 
                    x1={source.x} y1={source.y} 
                    x2={target.x} y2={target.y} 
                    stroke={color} 
                    strokeWidth={isSelected ? 5 : (link.strength / 2) + 1} 
                    opacity={isSelected ? 1 : 0.6}
                  />
                  {isSelected && (
                    <text 
                      x={(source.x + target.x) / 2} 
                      y={(source.y + target.y) / 2 - 10} 
                      textAnchor="middle" 
                      fill="#5c3a21" 
                      fontSize="12" 
                      fontWeight="bold" 
                      style={{ textShadow: '0 1px 2px white', cursor: 'help' }}
                    >
                      {/* В SVG подсказка делается через вложенный тег <title>, а не через атрибут */}
                      <title>{STRENGTH_TOOLTIP}</title>
                      {TYPE_NAMES[link.type] || link.type} ({link.strength}/10)
                    </text>
                  )}
                </g>
              )
            })}
            
            {/* Nodes */}
            {nodes.map(node => (
              <g key={node.id} onMouseDown={(e) => handleMouseDown(e, node.id)} style={{ cursor: 'grab' }}>
                <circle cx={node.x} cy={node.y} r={22} fill="#7a4b3a" stroke="#5c3a21" strokeWidth={2} />
                <text x={node.x} y={node.y + 38} textAnchor="middle" fill="#2c241b" fontSize="14" fontWeight="bold" style={{ textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>
                  {node.name}
                </text>
              </g>
            ))}
          </svg>

          {/* INFO PANEL FOR SELECTED LINK */}
          {selectedLink && (
            <div style={{ position: 'absolute', top: '20px', right: '20px', width: '300px', background: '#fdfbf7', border: '1px solid #dcd3c1', borderRadius: '8px', padding: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <h4 style={{ margin: '0 0 12px 0', color: '#5c3a21', fontSize: '1rem' }}>
                Связь: {TYPE_NAMES[selectedLink.type] || selectedLink.type}
              </h4>
              
              <div style={{ fontSize: '0.85rem', color: '#4a3f35', marginBottom: '12px', lineHeight: '1.5', background: '#f5f0e6', padding: '12px', borderRadius: '6px' }}>
                <div style={{ marginBottom: '6px', cursor: 'help' }} title={STRENGTH_TOOLTIP}>
                  <b>Уровень:</b> {getLevelName(selectedLink.strength)} (<span style={{ borderBottom: '1px dashed #7a4b3a' }}>{selectedLink.strength}/10</span> ℹ️)
                </div>
                {selectedLink.description && (
                  <div style={{ marginTop: '8px', fontStyle: 'italic', color: '#7a4b3a', borderTop: '1px dashed #dcd3c1', paddingTop: '8px' }}>
                    "{selectedLink.description}"
                  </div>
                )}
              </div>

              <div style={{ fontSize: '0.8rem', color: '#7a6b5d', marginBottom: '12px', lineHeight: '1.4', background: '#fffbeb', padding: '10px', borderRadius: '6px', border: '1px solid #fde68a' }}>
                <b style={{ color: '#92400e' }}>💡 Как это увидит ИИ:</b><br/>
                <i>{getBehaviorHint(selectedLink.type, selectedLink.strength)}</i>
              </div>

              <button onClick={() => handleDeleteRelation(selectedLink.id)} style={{ width: '100%', padding: '8px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold' }}>
                🗑️ Удалить связь
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ADD RELATION MODAL */}
      {showAddModal && (
        <AddRelationModal 
          nodes={nodes} 
          onClose={() => setShowAddModal(false)} 
          onSubmit={handleAddRelation} 
        />
      )}
    </div>
  )
}

// Вспомогательный компонент для добавления связи
function AddRelationModal({ nodes, onClose, onSubmit }: { nodes: Node[], onClose: () => void, onSubmit: (s: string, t: string, type: string, str: number, desc: string) => void }) {
  const [source, setSource] = useState('')
  const [target, setTarget] = useState('')
  const [type, setType] = useState('ally')
  const [strength, setStrength] = useState(5)
  const [desc, setDesc] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (source === target) {
      alert('Персонаж не может быть связан сам с собой')
      return
    }
    onSubmit(source, target, type, strength, desc)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fdfbf7', padding: '24px', borderRadius: '10px', width: 'min(450px, 90vw)', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }}>
        <h3 style={{ marginTop: 0, color: '#5c3a21', marginBottom: '16px' }}>Новая связь</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* ПРОВЕРКА НА ЗАГРУЗКУ ПЕРСОНАЖЕЙ */}
          {nodes.length === 0 ? (
            <div style={{ padding: '15px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', color: '#92400e', textAlign: 'center' }}>
              ⏳ Загрузка персонажей или в книге пока нет созданных персонажей.
            </div>
          ) : (
            <>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#5c3a21' }}>От кого:</label>
                <select value={source} onChange={(e) => setSource(e.target.value)} required style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #dcd3c1' }}>
                  <option value="">Выберите персонажа...</option>
                  {nodes.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#5c3a21' }}>К кому:</label>
                <select value={target} onChange={(e) => setTarget(e.target.value)} required style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #dcd3c1' }}>
                  <option value="">Выберите персонажа...</option>
                  {nodes.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
                </select>
              </div>
            </>
          )}

          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#5c3a21' }}>Тип связи:</label>
            <select value={type} onChange={(e) => setType(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '4px', borderRadius: '4px', border: '1px solid #dcd3c1' }}>
              <option value="ally">Союзник</option>
              <option value="enemy">Враг</option>
              <option value="romantic">Романтический интерес</option>
              <option value="secret_lover">Тайная любовь</option>
              <option value="rival">Соперник</option>
              <option value="mentor">Наставник / Ученик</option>
              <option value="family">Семья</option>
              <option value="childhood_friend">Друг детства</option>
              <option value="betrayed">Предательство</option>
              <option value="debtor">Должник / Кредитор</option>
            </select>
          </div>
          
          {/* ДОБАВЛЕНА ВСПЛЫВАЮЩАЯ ПОДСКАЗКА (title) */}
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#5c3a21', cursor: 'help' }} title={STRENGTH_TOOLTIP}>
              Сила связи: <span style={{ color: '#7a4b3a', borderBottom: '1px dashed #7a4b3a' }}>{strength}/10 ({getLevelName(strength)}) ℹ️</span>
            </label>
            <input type="range" min="1" max="10" value={strength} onChange={(e) => setStrength(Number(e.target.value))} style={{ width: '100%', marginTop: '4px', cursor: 'pointer' }} />
          </div>
          
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#5c3a21' }}>Описание (необязательно):</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Например: 'Спасла жизнь в таверне'" style={{ width: '100%', minHeight: '60px', marginTop: '4px', borderRadius: '4px', border: '1px solid #dcd3c1', padding: '8px', boxSizing: 'border-box', fontFamily: 'inherit' }} />
          </div>
          
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} disabled={nodes.length === 0} style={{ flex: 1, padding: '10px', background: 'transparent', border: '1px solid #dcd3c1', borderRadius: '6px', cursor: nodes.length === 0 ? 'not-allowed' : 'pointer', color: '#7a6b5d', fontWeight: 'bold', opacity: nodes.length === 0 ? 0.5 : 1 }}>Отмена</button>
            <button type="submit" disabled={nodes.length === 0} style={{ flex: 1, padding: '10px', background: nodes.length === 0 ? '#999' : '#7a4b3a', color: 'white', border: 'none', borderRadius: '6px', cursor: nodes.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 'bold' }}>Создать связь</button>
          </div>
        </form>
      </div>
    </div>
  )
}

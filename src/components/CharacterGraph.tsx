import { useState, useEffect, useRef } from 'react'

type Node = { id: string; name: string; x: number; y: number }
type Link = { id: string; source: string; target: string; type: string; strength: number; description: string }

type GraphProps = {
  projectId: string
  onClose: () => void
}

const RELATION_COLORS: Record<string, string> = {
  ally: '#5c7a5c',      // Зеленый
  enemy: '#dc2626',     // Красный
  family: '#7a4b3a',    // Коричневый
  romantic: '#db2777',  // Розовый
  rival: '#d97706',     // Оранжевый
  mentor: '#2563eb',    // Синий
  default: '#7a6b5d'    // Серый
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
        // Распределяем узлы по кругу для старта
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
      }
    } catch (error) {
      alert('Ошибка: ' + error)
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
      }
    } catch (error) {
      alert('Ошибка: ' + error)
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
                <g key={link.id} onClick={() => setSelectedLink(link)} style={{ cursor: 'pointer' }}>
                  <line 
                    x1={source.x} y1={source.y} 
                    x2={target.x} y2={target.y} 
                    stroke={color} 
                    strokeWidth={isSelected ? 4 : link.strength / 2} 
                    opacity={isSelected ? 1 : 0.6}
                  />
                  {isSelected && (
                    <text x={(source.x + target.x) / 2} y={(source.y + target.y) / 2 - 10} textAnchor="middle" fill="#5c3a21" fontSize="12" fontWeight="bold">
                      {link.type} ({link.strength}/10)
                    </text>
                  )}
                </g>
              )
            })}
            
            {/* Nodes */}
            {nodes.map(node => (
              <g key={node.id} onMouseDown={(e) => handleMouseDown(e, node.id)} style={{ cursor: 'grab' }}>
                <circle cx={node.x} cy={node.y} r={20} fill="#7a4b3a" stroke="#5c3a21" strokeWidth={2} />
                <text x={node.x} y={node.y + 35} textAnchor="middle" fill="#2c241b" fontSize="14" fontWeight="bold">
                  {node.name}
                </text>
              </g>
            ))}
          </svg>

          {/* INFO PANEL FOR SELECTED LINK */}
          {selectedLink && (
            <div style={{ position: 'absolute', top: '20px', right: '20px', width: '250px', background: '#fdfbf7', border: '1px solid #dcd3c1', borderRadius: '8px', padding: '15px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#5c3a21' }}>Связь: {selectedLink.type}</h4>
              <p style={{ fontSize: '0.85rem', color: '#4a3f35', margin: '5px 0' }}>Сила: {selectedLink.strength}/10</p>
              <p style={{ fontSize: '0.85rem', color: '#4a3f35', margin: '5px 0' }}>{selectedLink.description || 'Нет описания'}</p>
              <button onClick={() => handleDeleteRelation(selectedLink.id)} style={{ marginTop: '10px', width: '100%', padding: '6px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>🗑️ Удалить связь</button>
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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fdfbf7', padding: '24px', borderRadius: '10px', width: '400px' }}>
        <h3 style={{ marginTop: 0, color: '#5c3a21' }}>Новая связь</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#5c3a21' }}>От кого:</label>
            <select value={source} onChange={(e) => setSource(e.target.value)} required style={{ width: '100%', padding: '8px', marginTop: '4px' }}>
              <option value="">Выберите...</option>
              {nodes.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#5c3a21' }}>К кому:</label>
            <select value={target} onChange={(e) => setTarget(e.target.value)} required style={{ width: '100%', padding: '8px', marginTop: '4px' }}>
              <option value="">Выберите...</option>
              {nodes.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#5c3a21' }}>Тип связи:</label>
            <select value={type} onChange={(e) => setType(e.target.value)} style={{ width: '100%', padding: '8px', marginTop: '4px' }}>
              <option value="ally">Союзник</option>
              <option value="enemy">Враг</option>
              <option value="family">Семья</option>
              <option value="romantic">Романтика</option>
              <option value="rival">Соперник</option>
              <option value="mentor">Наставник</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#5c3a21' }}>Сила (1-10): {strength}</label>
            <input type="range" min="1" max="10" value={strength} onChange={(e) => setStrength(Number(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#5c3a21' }}>Описание:</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} style={{ width: '100%', minHeight: '60px', marginTop: '4px' }} />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: '8px', background: 'transparent', border: '1px solid #dcd3c1', borderRadius: '4px', cursor: 'pointer' }}>Отмена</button>
            <button type="submit" style={{ flex: 1, padding: '8px', background: '#7a4b3a', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Создать</button>
          </div>
        </form>
      </div>
    </div>
  )
}

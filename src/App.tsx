import { useMemo, useState } from 'react'

type ModuleId = 'manuscript' | 'draft' | 'dialogue' | 'notes' | 'chapters' | 'scenes' | 'characters' | 'plotlines' | 'world' | 'images' | 'history' | 'export' | 'relations' | 'prompts'
type ModuleItem = { id: ModuleId; label: string; icon: string; planned?: boolean }

const modules: ModuleItem[] = [
  { id: 'manuscript', label: 'Рукопись', icon: '▤' },
  { id: 'draft', label: 'Черновик', icon: '✎' },
  { id: 'dialogue', label: 'Диалог', icon: '◌' },
  { id: 'notes', label: 'Заметки', icon: '▧' },
  { id: 'chapters', label: 'Главы', icon: '☷' },
  { id: 'scenes', label: 'Сцены', icon: '▦' },
  { id: 'characters', label: 'Персонажи', icon: '♙' },
  { id: 'plotlines', label: 'Сюжетные линии', icon: '⌁', planned: true },
  { id: 'world', label: 'Мир и локации', icon: '⌂', planned: true },
  { id: 'images', label: 'Изображения', icon: '▧' },
  { id: 'relations', label: 'Граф связей', icon: '⌘', planned: true },
  { id: 'history', label: 'История изменений', icon: '↶' },
  { id: 'prompts', label: 'Инспектор промптов', icon: '⌕' },
  { id: 'export', label: 'Экспорт', icon: '⇧' },
]

const moduleDescriptions: Record<ModuleId, string> = {
  manuscript: 'Канонический текст книги. Изменения от ИИ поступают сюда только после подтверждения автора.',
  draft: 'Рабочее пространство для идей, вариантов, задач и подготовки фрагментов.',
  dialogue: 'Ролевой диалог с персонажами. Каждый следующий ход запускается автором.',
  notes: 'Самостоятельные заметки и идеи, которые можно связать с объектами книги.',
  chapters: 'Структура книги и порядок глав.',
  scenes: 'Сцены и фрагменты текста, связанные с главами.',
  characters: 'Персонажи, их профили, знания и состояние в разные моменты истории.',
  plotlines: 'Сюжетные линии, этапы развития и связи со сценами.',
  world: 'Локации, устройство мира, предметы и другие сущности.',
  images: 'Визуальные материалы: референсы, карты, иллюстрации и обложки.',
  history: 'История изменений Рукописи и сохранённые контрольные точки.',
  export: 'Подготовка и экспорт рукописи в файл.',
  relations: 'Визуальная карта отношений между персонажами.',
  prompts: 'Просмотр контекста и промпта, отправленного модели.',
}

function App() {
  const [inBook, setInBook] = useState(false)
  const [active, setActive] = useState<ModuleId>('manuscript')
  const [leftModule, setLeftModule] = useState<ModuleId>('manuscript')
  const [rightModule, setRightModule] = useState<ModuleId>('draft')
  const [split, setSplit] = useState(false)
  const [ratio, setRatio] = useState(50)
  const [bookTitle, setBookTitle] = useState('Новая история')
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [showInspector, setShowInspector] = useState(true)
  const [showRight, setShowRight] = useState(true)

  const current = modules.find(m => m.id === active) ?? modules[0]
  const left = modules.find(m => m.id === leftModule) ?? modules[0]
  const right = modules.find(m => m.id === rightModule) ?? modules[1]
  const handleDivider = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!split) return
    const rect = e.currentTarget.parentElement?.getBoundingClientRect()
    if (rect) setRatio(Math.max(25, Math.min(75, ((e.clientX - rect.left) / rect.width) * 100)))
  }

  const workspace = useMemo(() => (
    <div className="workspace">
      <aside className="sidebar">
        <div className="sidebar-book">
          <div className="book-cover-mini">B</div>
          <div className="sidebar-book-text"><strong>{bookTitle}</strong><span>Рабочая область</span></div>
          <button className="icon-button" title="В библиотеку" onClick={() => setInBook(false)}>⌂</button>
        </div>
        <div className="nav-caption">КНИГА</div>
        <nav className="module-nav">
          {modules.map(item => (
            <button key={item.id} className={active === item.id ? 'nav-item active' : 'nav-item'} onClick={() => { setActive(item.id); if (!split) setLeftModule(item.id) }}>
              <span className="nav-icon">{item.icon}</span><span>{item.label}</span>{item.planned && <span className="planned-dot" title="Запланировано"/>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sync-status"><span className="status-dot"/> Автосохранение включено</div>
          <button className="nav-item" onClick={() => setShowInspector(v => !v)}><span className="nav-icon">⚙</span> Настройки интерфейса</button>
        </div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumbs"><span>Библиотека</span><b>/</b><strong>{bookTitle}</strong>{split && <><b>/</b><span>Две панели</span></>}</div>
          <div className="top-actions">
            <button className={split ? 'toolbar-button selected' : 'toolbar-button'} onClick={() => setSplit(v => !v)} title="Переключить две панели"><span>◫</span>{split ? 'Одна панель' : 'Разделить экран'}</button>
            <button className="toolbar-button" onClick={() => setShowRight(v => !v)}>{showRight ? 'Скрыть контекст' : 'Показать контекст'}</button>
            <button className="avatar">А</button>
          </div>
        </header>
        <div className="work-titlebar">
          <div><h1>{split ? 'Рабочее пространство' : current.label}</h1><p>{split ? 'Выберите представление отдельно для каждой панели' : moduleDescriptions[active]}</p></div>
          <div className="title-actions"><span className="saved-label"><span className="status-dot"/> Сохранено</span><button className="primary-button" onClick={() => setSplit(true)}>＋ Открыть вторую панель</button></div>
        </div>
        <div className="work-content">
          <div className="panes" style={split ? { gridTemplateColumns: showRight ? `${ratio}% 6px minmax(0, 1fr)` : 'minmax(0, 1fr)' } : { gridTemplateColumns: 'minmax(0, 1fr)' }}>
            <Panel module={split ? left : current} onSelect={id => split ? setLeftModule(id) : setActive(id)} bookTitle={bookTitle}/>
            {split && <div className="splitter" onMouseDown={e => { e.preventDefault(); const move = (ev: MouseEvent) => { const parent = document.querySelector('.panes')?.getBoundingClientRect(); if (parent) setRatio(Math.max(25, Math.min(75, ((ev.clientX - parent.left) / parent.width) * 100))) }; const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }; window.addEventListener('mousemove', move); window.addEventListener('mouseup', up) }}><span/></div>}
            {split && showRight && <Panel module={right} onSelect={setRightModule} bookTitle={bookTitle} secondary/>}
          </div>
          {showRight && !split && <aside className="context-panel">
            <div className="context-head"><span>КОНТЕКСТ</span><button className="icon-button" onClick={() => setShowRight(false)}>×</button></div>
            <div className="context-card">
              <div className="context-icon">✧</div><strong>Помощник автора</strong><p>Здесь появятся контекстные инструменты и действия для выбранного модуля.</p>
              <button className="outline-button" onClick={() => {setActive('draft'); setLeftModule('draft')}}>Открыть Черновик</button>
            </div>
            <div className="context-section"><span>БЫСТРЫЕ ДЕЙСТВИЯ</span><button onClick={() => setActive('notes')}>＋ Новая заметка</button><button onClick={() => setActive('history')}>↶ История изменений</button><button onClick={() => setActive('prompts')}>⌕ Инспектор промптов</button></div>
          </aside>}
        </div>
      </main>
    </div>
  ), [inBook, active, leftModule, rightModule, split, ratio, bookTitle, showRight, showInspector])

  if (!inBook) return <div className="library-page">
    <header className="library-top"><div className="brand"><div className="brand-mark">B</div><span>BookSmith</span></div><div className="library-top-right"><span className="beta-pill">ПРОТОТИП</span><button className="avatar">А</button></div></header>
    <section className="library-hero"><div className="eyebrow">ВАША ТВОРЧЕСКАЯ МАСТЕРСКАЯ</div><h1>Истории начинаются<br/><em>здесь.</em></h1><p>Единое пространство для текста, идей, персонажей<br/>и миров, которые вы создаёте.</p><button className="primary-button large" onClick={() => {setNewTitle('');setShowCreate(true)}}>＋ Создать книгу</button></section>
    <section className="library-content"><div className="section-heading"><div><h2>Моя библиотека</h2><p>Ваши проекты и рукописи</p></div><button className="outline-button" onClick={() => setShowCreate(true)}>＋ Новый проект</button></div>
      <div className="project-grid"><button className="project-card" onClick={() => setInBook(true)}><div className="project-cover cover-one"><span>Н</span><small>НОВАЯ ИСТОРИЯ</small></div><div className="project-meta"><div><strong>{bookTitle}</strong><span>Фантастика · Черновик</span></div><span className="project-menu">···</span></div><div className="project-progress"><span style={{width:'18%'}}/></div><div className="project-foot"><span>Обновлено сегодня</span><span>18% готово</span></div></button>
      <button className="new-project-card" onClick={() => setShowCreate(true)}><span className="plus-circle">＋</span><strong>Начать новую историю</strong><span>Создайте проект с чистого листа</span></button></div>
    </section>
    {showCreate && <div className="modal-backdrop" onClick={() => setShowCreate(false)}><div className="modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setShowCreate(false)}>×</button><div className="eyebrow">НОВЫЙ ПРОЕКТ</div><h2>Как назовём вашу историю?</h2><p>Название можно изменить в любой момент.</p><input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Название книги" onKeyDown={e => {if(e.key === 'Enter' && newTitle.trim()){setBookTitle(newTitle.trim());setShowCreate(false);setInBook(true)}}}/><button className="primary-button full" disabled={!newTitle.trim()} onClick={() => {setBookTitle(newTitle.trim());setShowCreate(false);setInBook(true)}}>Создать книгу</button></div></div>}
  </div>

  return <>{workspace}</>
}

function Panel({ module, onSelect, bookTitle, secondary = false }: { module: ModuleItem; onSelect: (id: ModuleId) => void; bookTitle: string; secondary?: boolean }) {
  const [text, setText] = useState('')
  return <section className={secondary ? 'panel secondary-panel' : 'panel'}>
    <div className="panel-tabbar"><div className="panel-tab"><span className="nav-icon">{module.icon}</span><select value={module.id} onChange={e => onSelect(e.target.value as ModuleId)} aria-label="Выбрать модуль">{modules.map(m => <option key={m.id} value={m.id}>{m.label}{m.planned ? ' · запланировано' : ''}</option>)}</select><span className="tab-chevron">⌄</span></div><button className="icon-button" title="Закрыть вкладку">×</button></div>
    <div className="panel-body">
      <div className="panel-heading"><div><div className="eyebrow">{module.planned ? 'ЗАПЛАНИРОВАННЫЙ МОДУЛЬ' : 'РАБОЧАЯ ОБЛАСТЬ'}</div><h2>{module.label}</h2></div>{module.id === 'manuscript' && <span className="readiness-pill">Текущий текст</span>}</div>
      <p className="panel-description">{moduleDescriptions[module.id]}</p>
      {module.planned ? <div className="planned-state"><div className="planned-symbol">✧</div><h3>Модуль в планах</h3><p>Представление уже включено в структуру приложения. Функциональность будет добавлена на следующих этапах.</p><span className="planned-tag">Запланировано</span></div> :
        module.id === 'manuscript' ? <div className="editor-shell"><div className="editor-toolbar"><button title="Жирный">B</button><button title="Курсив">I</button><button title="Заголовок">H</button><span className="toolbar-divider"/><button title="Отменить">↶</button><button title="Повторить">↷</button><span className="toolbar-spacer"/><span className="editor-status">Автосохранение</span></div><div className="manuscript-editor" contentEditable suppressContentEditableWarning><h2>Глава первая</h2><p className="editor-placeholder">Начните писать свою историю…</p><p>Рукопись — канонический текст книги. Вы можете редактировать его вручную. Изменения, подготовленные ИИ, попадут сюда только после вашего подтверждения.</p></div><div className="editor-footer"><span>Глава 1 · 0 слов</span><span>Русский · Без названия сцены</span></div></div> :
        module.id === 'draft' ? <div className="draft-workspace"><div className="draft-empty"><div className="draft-orb">✧</div><h3>Что будем создавать?</h3><p>Обсудите идею, разработайте сцену или попросите ИИ подготовить вариант текста. Результаты останутся в Черновике, пока вы не решите перенести их в Рукопись.</p><div className="suggestions"><button onClick={() => setText('Предложи несколько идей для следующей сцены')}>✦ Идеи для сцены</button><button onClick={() => setText('Помоги разработать персонажа')}>♙ Разработать персонажа</button><button onClick={() => setText('Проверь логические противоречия')}>⌕ Проверить логику</button></div></div><div className="draft-input"><textarea value={text} onChange={e => setText(e.target.value)} placeholder="Опишите задачу или задайте вопрос…"/><div className="draft-input-bottom"><span>Контекст: {bookTitle}</span><button className="primary-button" disabled={!text.trim()} onClick={() => setText('')}>Отправить ↗</button></div></div></div> :
        module.id === 'dialogue' ? <div className="planned-state dialogue-state"><div className="planned-symbol">◌</div><h3>Диалог персонажей</h3><p>Настройте участников, сцену и цель разговора. Каждый ход модели будет запускаться отдельно по вашему нажатию.</p><button className="outline-button" onClick={() => onSelect('characters')}>Выбрать персонажей</button></div> :
        <div className="module-placeholder"><div className="module-placeholder-icon">{module.icon}</div><h3>{module.label}</h3><p>Здесь будет рабочее представление модуля. Каркас навигации и переключение панелей уже доступны.</p><button className="outline-button" onClick={() => onSelect('manuscript')}>Вернуться к Рукописи</button></div>}
    </div>
  </section>
}

export default App

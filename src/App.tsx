import { useState } from 'react'

type ModuleId = 'library' | 'manuscript' | 'draft' | 'dialogue' | 'notes' | 'research' | 'chapters' | 'scenes' | 'characters' | 'plotlines' | 'world' | 'images' | 'history' | 'export' | 'relations' | 'prompts'
type ModuleItem = { id: ModuleId; label: string; icon: string; planned?: boolean; global?: boolean }

const globalModules: ModuleItem[] = [
  { id: 'draft', label: 'Черновик', icon: '✎', global: true },
  { id: 'dialogue', label: 'Диалог', icon: '◌', global: true },
  { id: 'notes', label: 'Заметки', icon: '▧', global: true },
  { id: 'research', label: 'Исследования', icon: '⌕', global: true },
  { id: 'characters', label: 'Персонажи', icon: '♙', global: true },
  { id: 'world', label: 'Мир и локации', icon: '⌂', global: true },
  { id: 'images', label: 'Изображения', icon: '▧', global: true },
  { id: 'relations', label: 'Граф связей', icon: '⌘', planned: true, global: true },
  { id: 'prompts', label: 'Инспектор промптов', icon: '⌗', global: true },
]
const bookModules: ModuleItem[] = [
  { id: 'manuscript', label: 'Рукопись', icon: '▤' },
  { id: 'chapters', label: 'Главы', icon: '☷' },
  { id: 'scenes', label: 'Сцены', icon: '▦' },
  { id: 'plotlines', label: 'Сюжетные линии', icon: '⌁', planned: true },
  { id: 'history', label: 'История изменений', icon: '↶' },
  { id: 'export', label: 'Экспорт', icon: '⇧' },
]
const allModules = [...globalModules, ...bookModules]
const descriptions: Record<ModuleId, string> = {
  library: 'Все ваши произведения и проекты в одном месте.',
  manuscript: 'Канонический текст книги. Изменения от ИИ поступают сюда только после подтверждения автора.',
  draft: 'Рабочее пространство для идей, вариантов, задач и подготовки фрагментов.',
  dialogue: 'Ролевой диалог с персонажами. Каждый следующий ход запускается автором.',
  notes: 'Самостоятельные заметки и идеи, которые можно связывать с объектами и проектами.',
  research: 'Источники, материалы и результаты исследований — общие или связанные с конкретной книгой.',
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
  const [active, setActive] = useState<ModuleId>('library')
  const [leftModule, setLeftModule] = useState<ModuleId>('draft')
  const [rightModule, setRightModule] = useState<ModuleId>('notes')
  const [leftScope, setLeftScope] = useState<'global' | 'work'>('global')
  const [rightScope, setRightScope] = useState<'global' | 'work'>('global')
  const [split, setSplit] = useState(false)
  const [ratio, setRatio] = useState(50)
  const [bookTitle, setBookTitle] = useState('Новая история')
  const [hasBook, setHasBook] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [showRight, setShowRight] = useState(true)

  const current = allModules.find(m => m.id === active) ?? { id: 'library' as ModuleId, label: 'Библиотека', icon: '▤' }
  const openBook = () => { setHasBook(true); setActive('manuscript') }
  const selectModule = (id: ModuleId) => {
    if (id === 'library') {
      setActive('library')
      setLeftModule('library')
      setSplit(false)
      return
    }
    setActive(id)
    if (split) setLeftModule(id)
  }
  const onDividerDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    const move = (ev: MouseEvent) => {
      const parent = document.querySelector('.panes')?.getBoundingClientRect()
      if (parent) setRatio(Math.max(25, Math.min(75, ((ev.clientX - parent.left) / parent.width) * 100)))
    }
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up) }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  return <div className="workspace">
    <aside className="sidebar">
      <div className="brand sidebar-brand"><div className="brand-mark">B</div><span>BookSmith</span></div>
      <button className={active === 'library' ? 'nav-item active library-nav-item' : 'nav-item library-nav-item'} onClick={() => selectModule('library')}>
        <span className="nav-icon">▤</span><span>Библиотека</span>
      </button>
      <div className="nav-caption">ОБЩЕЕ ПРОСТРАНСТВО</div>
      <nav className="module-nav">
        {globalModules.map(item => <NavItem key={item.id} item={item} active={active === item.id} onClick={() => selectModule(item.id)} />)}
      </nav>
      <div className="nav-caption book-nav-caption">{hasBook ? 'ТЕКУЩАЯ КНИГА' : 'РАБОТА С КНИГОЙ'}</div>
      <nav className="module-nav book-module-nav">
        {bookModules.map(item => <NavItem key={item.id} item={item} active={active === item.id} onClick={() => selectModule(item.id)} />)}
      </nav>
      <div className="sidebar-bottom">
        <div className="sync-status"><span className="status-dot"/> Интерфейс готов к работе</div>
        <button className="nav-item"><span className="nav-icon">⚙</span><span>Настройки</span></button>
      </div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <div className="breadcrumbs"><span>BookSmith</span><b>/</b><strong>{active === 'library' ? 'Библиотека' : current.label}</strong>{active !== 'library' && <><b>/</b><span>{current.label}</span></>}</div>
        <div className="top-actions">
          <button className={split ? 'toolbar-button selected' : 'toolbar-button'} onClick={() => setSplit(v => !v)}><span>◫</span>{split ? 'Одна панель' : 'Две панели'}</button>
          <button className="toolbar-button" onClick={() => setShowRight(v => !v)}>{showRight ? 'Скрыть контекст' : 'Контекст'}</button>
          <button className="avatar">А</button>
        </div>
      </header>

      <div className="work-titlebar">
        <div><div className="eyebrow">{active === 'library' ? 'ВАША ТВОРЧЕСКАЯ МАСТЕРСКАЯ' : current.global ? 'ОБЩЕЕ ПРОСТРАНСТВО' : 'ТЕКУЩИЙ ПРОЕКТ'}</div><h1>{split ? 'Рабочее пространство' : current.label}</h1><p>{split ? 'Откройте два раздела одновременно и настройте рабочее пространство под свою задачу.' : descriptions[active]}</p></div>
        <div className="title-actions"><span className="saved-label"><span className="status-dot"/> Автосохранение</span>{active === 'library' && <button className="primary-button" onClick={() => { setNewTitle(''); setShowCreate(true) }}>＋ Новый проект</button>}</div>
      </div>

      <div className="work-content">
        <div className="panes" style={split ? { gridTemplateColumns: showRight ? `${ratio}% 6px minmax(0, 1fr)` : 'minmax(0, 1fr)' } : { gridTemplateColumns: 'minmax(0, 1fr)' }}>
          <Panel key={split ? leftModule : active} module={split ? allModules.find(m => m.id === leftModule)! : current} hasBook={hasBook} bookTitle={bookTitle} scope={leftScope} onScopeChange={setLeftScope} onSelect={setLeftModule} onOpenBook={openBook} onCreate={() => setShowCreate(true)} />
          {split && <div className="splitter" onMouseDown={onDividerDown}><span/></div>}
          {split && showRight && <Panel key={rightModule} module={allModules.find(m => m.id === rightModule)!} hasBook={hasBook} bookTitle={bookTitle} scope={rightScope} onScopeChange={setRightScope} onSelect={setRightModule} onOpenBook={openBook} onCreate={() => setShowCreate(true)} secondary />}
        </div>
        {showRight && !split && <aside className="context-panel">
          <div className="context-head"><span>КОНТЕКСТ И ИНСТРУМЕНТЫ</span><button className="icon-button" onClick={() => setShowRight(false)}>×</button></div>
          <div className="context-card"><div className="context-icon">✧</div><strong>{current.label}</strong><p>{'Контекст и инструменты выбранного раздела.'}</p>{!hasBook && <button className="outline-button" onClick={() => selectModule('library')}>Открыть библиотеку</button>}</div>
          
        </aside>}
      </div>
    </main>

    {showCreate && <div className="modal-backdrop" onClick={() => setShowCreate(false)}><div className="modal" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setShowCreate(false)}>×</button><div className="eyebrow">НОВЫЙ ПРОЕКТ</div><h2>Как назовём вашу историю?</h2><p>Проект появится в библиотеке. Название можно изменить в любой момент.</p><input autoFocus value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Название книги" onKeyDown={e => { if (e.key === 'Enter' && newTitle.trim()) { setBookTitle(newTitle.trim()); setShowCreate(false); openBook() } }} /><button className="primary-button full" disabled={!newTitle.trim()} onClick={() => { setBookTitle(newTitle.trim()); setShowCreate(false); openBook() }}>Создать книгу</button></div></div>}
  </div>
}

function NavItem({ item, active, onClick }: { item: ModuleItem; active: boolean; onClick: () => void }) {
  return <button className={active ? 'nav-item active' : 'nav-item'} onClick={onClick}><span className="nav-icon">{item.icon}</span><span>{item.label}</span>{item.planned && <span className="planned-dot" title="Запланировано"/>}</button>
}

function Panel({ module, hasBook, bookTitle, scope, onScopeChange, onSelect, onOpenBook, onCreate, secondary = false }: { module: ModuleItem; hasBook: boolean; bookTitle: string; scope: 'global' | 'work'; onScopeChange: (scope: 'global' | 'work') => void; onSelect: (id: ModuleId) => void; onOpenBook: () => void; onCreate: () => void; secondary?: boolean }) {
  const [text, setText] = useState('')
  const [librarySearch, setLibrarySearch] = useState('')
  const [libraryFilter, setLibraryFilter] = useState('all')
  const showDemoProject = (libraryFilter === 'all' || libraryFilter === 'in-progress') && ('пример проекта фантастика новая история'.includes(librarySearch.toLowerCase()))
  const needsBook = !module.global && module.id !== 'library'
  return <section className={secondary ? 'panel secondary-panel' : 'panel'}>
    <div className="panel-tabbar"><div className="panel-tab"><span className="nav-icon">{module.icon}</span><select value={module.id} onChange={e => onSelect(e.target.value as ModuleId)} aria-label="Выбрать раздел"><option value="library">Библиотека</option>{globalModules.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}{bookModules.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select><span className="tab-chevron">⌄</span></div>{module.id === 'library' ? <div className="library-toolbar"><input value={librarySearch} onChange={e => setLibrarySearch(e.target.value)} placeholder="⌕ Поиск проектов…" aria-label="Поиск проектов"/><select value={libraryFilter} onChange={e => setLibraryFilter(e.target.value)} aria-label="Фильтр проектов"><option value="all">Все проекты</option><option value="in-progress">В работе</option><option value="completed">Завершённые</option></select></div> : module.global && hasBook ? <select className="panel-scope-select" value={scope} onChange={e => onScopeChange(e.target.value as 'global' | 'work')} aria-label="Контекст раздела"><option value="global">Общее пространство</option><option value="work">В книге: {bookTitle}</option></select> : <span className="panel-context-label">{module.global ? 'ОБЩЕЕ ПРОСТРАНСТВО' : bookTitle}</span>}</div>
    <div className="panel-body">
      {module.id === 'library' ? <div className="library-workspace">
        <div className="library-intro"><div className="eyebrow">ВАША БИБЛИОТЕКА</div><h2>Истории начинаются здесь.</h2><p>Книги, проекты и материалы собраны в одном рабочем пространстве. Остальные разделы доступны в меню слева — даже если книга ещё не создана.</p><button className="primary-button" onClick={onCreate}>＋ Создать проект</button></div>
        <div className="library-list-heading"><div><h3>Мои проекты</h3><p>Откройте книгу, чтобы перейти к рукописи и её структуре.</p></div></div>
        {showDemoProject ? <button className="library-project-card" onClick={onOpenBook}><div className="project-cover cover-one"><span>Н</span><small>НОВАЯ ИСТОРИЯ</small></div><div className="library-project-info"><strong>{hasBook ? bookTitle : 'Пример проекта'}</strong><span>Фантастика · Роман</span><span>0 слов написано</span><span className="project-status">● В работе</span></div></button> : <div className="library-no-results">Проекты не найдены. Измените поисковый запрос или фильтр.</div>}
      </div> :
      needsBook && !hasBook ? <div className="needs-book-state"><div className="planned-symbol">▤</div><h3>Сначала выберите книгу</h3><p>Раздел «{module.label}» работает внутри конкретного произведения. При этом общие инструменты — Черновик, Заметки, Исследования, Персонажи и другие — уже доступны без открытой книги.</p><button className="primary-button" onClick={onSelect.bind(null, 'library')}>Перейти в библиотеку</button></div> :
      <><div className="panel-heading"><div><div className="eyebrow">{module.planned ? 'ЗАПЛАНИРОВАННЫЙ МОДУЛЬ' : scope === 'global' ? 'ОБЩЕЕ ПРОСТРАНСТВО' : 'РАБОЧАЯ ОБЛАСТЬ КНИГИ'}</div><h2>{module.label}</h2></div>{module.id === 'manuscript' && <span className="readiness-pill">Текущий текст</span>}</div>
      <p className="panel-description">{descriptions[module.id]}</p>
      {module.planned ? <div className="planned-state"><div className="planned-symbol">✧</div><h3>Модуль в планах</h3><p>Представление уже включено в структуру приложения. Функциональность будет добавлена на следующих этапах.</p><span className="planned-tag">Запланировано</span></div> :
      module.id === 'manuscript' ? <div className="editor-shell"><div className="editor-toolbar"><button title="Жирный">B</button><button title="Курсив">I</button><button title="Заголовок">H</button><span className="toolbar-divider"/><button title="Отменить">↶</button><button title="Повторить">↷</button><span className="toolbar-spacer"/><span className="editor-status">Автосохранение</span></div><div className="manuscript-editor" contentEditable suppressContentEditableWarning><h2>Глава первая</h2><p className="editor-placeholder">Начните писать свою историю…</p><p>Рукопись — канонический текст книги. Вы можете редактировать его вручную. Изменения, подготовленные ИИ, попадут сюда только после вашего подтверждения.</p></div><div className="editor-footer"><span>Глава 1 · 0 слов</span><span>Русский · Без названия сцены</span></div></div> :
      module.id === 'draft' ? <div className="draft-workspace"><div className="draft-empty"><div className="draft-orb">✧</div><h3>Что будем создавать?</h3><p>Обсудите идею, разработайте сцену или попросите ИИ подготовить вариант текста. Результаты останутся в Черновике, пока вы не решите перенести их в Рукопись.</p><div className="suggestions"><button onClick={() => setText('Предложи несколько идей для следующей сцены')}>✦ Идеи для сцены</button><button onClick={() => setText('Помоги разработать персонажа')}>♙ Разработать персонажа</button><button onClick={() => setText('Проверь логические противоречия')}>⌕ Проверить логику</button></div></div><div className="draft-input"><textarea value={text} onChange={e => setText(e.target.value)} placeholder="Опишите задачу или задайте вопрос…"/><div className="draft-input-bottom"><span>Контекст: {scope === 'work' && hasBook ? bookTitle : 'Общее пространство'}</span><button className="primary-button" disabled={!text.trim()} onClick={() => setText('')}>Отправить ↗</button></div></div></div> :
      module.id === 'dialogue' ? <div className="planned-state dialogue-state"><div className="planned-symbol">◌</div><h3>Диалог персонажей</h3><p>Настройте участников, сцену и цель разговора. Каждый ход модели будет запускаться отдельно по вашему нажатию.</p><button className="outline-button" onClick={() => onSelect('characters')}>Выбрать персонажей</button></div> :
      <div className="module-placeholder"><div className="module-placeholder-icon">{module.icon}</div><h3>{module.label}</h3><p>Рабочее представление раздела будет развиваться отдельно. Сейчас мы формируем общий каркас и постоянную навигацию приложения.</p><button className="outline-button" onClick={() => onSelect('draft')}>Открыть Черновик</button></div>}</>}
    </div>
  </section>
}

export default App

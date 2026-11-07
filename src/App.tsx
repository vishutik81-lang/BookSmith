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
  const [leftModule, setLeftModule] = useState<ModuleId>('library')
  const [rightModule, setRightModule] = useState<ModuleId>('notes')
  const [leftScope, setLeftScope] = useState<'global' | 'work'>('global')
  const [rightScope, setRightScope] = useState<'global' | 'work'>('global')
  const [split, setSplit] = useState(false)
  const [ratio, setRatio] = useState(50)
  const [bookTitle, setBookTitle] = useState('Новая история')
  const [hasBook, setHasBook] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [showSecondPanel, setShowSecondPanel] = useState(true)
  const [showContext, setShowContext] = useState(true)

  const activeModule = split ? leftModule : active
  const current = allModules.find(m => m.id === activeModule) ?? { id: 'library' as ModuleId, label: 'Библиотека', icon: '▤' }
  const openBook = () => { setHasBook(true); setActive('manuscript'); if (split) setLeftModule('manuscript') }
  const toggleSplit = () => {
    if (split) {
      setActive(leftModule)
      setSplit(false)
      return
    }
    setLeftModule(active)
    setRightModule(active === 'notes' ? 'draft' : 'notes')
    setSplit(true)
  }
  const selectLeftModule = (id: ModuleId) => {
    setLeftModule(id)
    setActive(id)
  }
  const selectRightModule = (id: ModuleId) => {
    setRightModule(id)
  }
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
      <button className={activeModule === 'library' ? 'nav-item active library-nav-item' : 'nav-item library-nav-item'} onClick={() => selectModule('library')}>
        <span className="nav-icon">▤</span><span>Библиотека</span>
      </button>
      <div className="nav-caption">ОБЩЕЕ ПРОСТРАНСТВО</div>
      <nav className="module-nav">
        {globalModules.map(item => <NavItem key={item.id} item={item} active={activeModule === item.id} onClick={() => selectModule(item.id)} />)}
      </nav>
      <div className="nav-caption book-nav-caption">{hasBook ? 'ТЕКУЩАЯ КНИГА' : 'РАБОТА С КНИГОЙ'}</div>
      <nav className="module-nav book-module-nav">
        {bookModules.map(item => <NavItem key={item.id} item={item} active={activeModule === item.id} onClick={() => selectModule(item.id)} />)}
      </nav>
      <div className="sidebar-bottom">
        <div className="sync-status"><span className="status-dot"/> Интерфейс готов к работе</div>
        <button className="nav-item"><span className="nav-icon">⚙</span><span>Настройки</span></button>
      </div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <div className="breadcrumbs"><span>BookSmith</span><b>/</b><strong>{activeModule === 'library' ? 'Библиотека' : current.label}</strong>{activeModule !== 'library' && <><b>/</b><span>{current.label}</span></>}</div>
        <div className="top-actions">
          <button className={split ? 'toolbar-button selected' : 'toolbar-button'} onClick={toggleSplit}><span>◫</span>{split ? 'Одна панель' : 'Две панели'}</button>
          <button className="toolbar-button" onClick={() => setShowContext(v => !v)}>{showContext ? 'Скрыть контекст' : 'Показать контекст'}</button>
          <button className="avatar">А</button>
        </div>
      </header>

      <div className="work-titlebar">
        <div><div className="eyebrow">{activeModule === 'library' ? 'ВАША ТВОРЧЕСКАЯ МАСТЕРСКАЯ' : current.global ? 'ОБЩЕЕ ПРОСТРАНСТВО' : 'ТЕКУЩИЙ ПРОЕКТ'}</div><h1>{split ? 'Рабочее пространство' : current.label}</h1><p>{split ? 'Откройте два раздела одновременно и настройте рабочее пространство под свою задачу.' : descriptions[active]}</p></div>
        <div className="title-actions"><span className="saved-label"><span className="status-dot"/> Автосохранение</span>{activeModule === 'library' && <button className="primary-button" onClick={() => { setNewTitle(''); setShowCreate(true) }}>＋ Новый проект</button>}</div>
      </div>

      <div className="work-content">
        <div className={split ? "panes split-layout" : "panes single-layout"} style={split ? { gridTemplateColumns: showSecondPanel ? `${ratio}% 6px minmax(0, 1fr)` : 'minmax(0, 1fr)' } : { gridTemplateColumns: 'minmax(0, 1fr)' }}>
          <Panel key={split ? leftModule : active} module={split ? (allModules.find(m => m.id === leftModule) ?? { id: 'library', label: 'Библиотека', icon: '▤' }) : current} showContext={showContext} nestedSplit={split} hasBook={hasBook} bookTitle={bookTitle} scope={leftScope} onScopeChange={setLeftScope} onSelect={(id) => { if (split) selectLeftModule(id); else selectModule(id) }} onOpenBook={openBook} onCreate={() => setShowCreate(true)} />
          {split && showSecondPanel && <div className="splitter" onMouseDown={onDividerDown}><span/></div>}
          {split && showSecondPanel && <Panel key={rightModule} module={allModules.find(m => m.id === rightModule) ?? { id: 'library', label: 'Библиотека', icon: '▤' }} showContext={showContext} nestedSplit={split} hasBook={hasBook} bookTitle={bookTitle} scope={rightScope} onScopeChange={setRightScope} onSelect={selectRightModule} onOpenBook={openBook} onCreate={() => setShowCreate(true)} secondary />}
        </div>
        {showContext && !split && active !== 'draft' && <aside className="context-panel">
          <div className="context-head"><span>КОНТЕКСТ И ИНСТРУМЕНТЫ</span><button className="icon-button" onClick={() => setShowContext(false)}>×</button></div>
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

function Panel({ module, showContext, hasBook, bookTitle, scope, onScopeChange, onSelect, onOpenBook, onCreate, secondary = false }: { module: ModuleItem; showContext: boolean; nestedSplit: boolean; hasBook: boolean; bookTitle: string; scope: 'global' | 'work'; onScopeChange: (scope: 'global' | 'work') => void; onSelect: (id: ModuleId) => void; onOpenBook: () => void; onCreate: () => void; secondary?: boolean }) {
  const [text, setText] = useState('')
  const [draftMode, setDraftMode] = useState<'text' | 'planning'>('text')
  const [draftView, setDraftView] = useState<'work' | 'discussion'>('work')
  const [librarySearch, setLibrarySearch] = useState('')
  const [libraryFilter, setLibraryFilter] = useState('all')
  const showDemoProject = (libraryFilter === 'all' || libraryFilter === 'in-progress') && ('пример проекта фантастика новая история'.includes(librarySearch.toLowerCase()))
  const needsBook = !module.global && module.id !== 'library'
  return <section className={secondary ? 'panel secondary-panel' : 'panel'}>
    <div className={"panel-tabbar" + (module.id === 'draft' ? " draft-panel-tabbar" : "")}><div className="panel-tab"><span className="nav-icon">{module.icon}</span><select value={module.id} onChange={e => onSelect(e.target.value as ModuleId)} aria-label="Выбрать раздел"><option value="library">Библиотека</option>{globalModules.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}{bookModules.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select><span className="tab-chevron">⌄</span></div>{module.id === 'draft' && <div className="draft-header-nav"><div className="draft-header-mode"><button className={draftMode === 'text' ? "active" : ""} onClick={() => { setDraftMode('text'); setDraftView('work') }}>✎ Работа с текстом</button><button className={draftMode === 'planning' ? "active" : ""} onClick={() => { setDraftMode('planning'); setDraftView('work') }}>☷ Планирование</button></div></div>}{module.id === 'library' ? <div className="library-toolbar"><input value={librarySearch} onChange={e => setLibrarySearch(e.target.value)} placeholder="⌕ Поиск проектов…" aria-label="Поиск проектов"/><select value={libraryFilter} onChange={e => setLibraryFilter(e.target.value)} aria-label="Фильтр проектов"><option value="all">Все проекты</option><option value="in-progress">В работе</option><option value="completed">Завершённые</option></select></div> : module.id === 'draft' ? null : module.global && hasBook ? <select className="panel-scope-select" value={scope} onChange={e => onScopeChange(e.target.value as 'global' | 'work')} aria-label="Контекст раздела"><option value="global">Общее пространство</option><option value="work">В книге: {bookTitle}</option></select> : <span className="panel-context-label">{module.global ? 'ОБЩЕЕ ПРОСТРАНСТВО' : bookTitle}</span>}</div>
    <div className={module.id === 'draft' ? "panel-body draft-panel-body" : "panel-body"}>
      {module.id === 'library' ? <div className="library-workspace">
        <div className="library-intro"><div className="eyebrow">ВАША БИБЛИОТЕКА</div><h2>Истории начинаются здесь.</h2><p>Книги, проекты и материалы собраны в одном рабочем пространстве. Остальные разделы доступны в меню слева — даже если книга ещё не создана.</p><button className="primary-button" onClick={onCreate}>＋ Создать проект</button></div>
        <div className="library-list-heading"><div><h3>Мои проекты</h3><p>Откройте книгу, чтобы перейти к рукописи и её структуре.</p></div></div>
        {showDemoProject ? <button className="library-project-card" onClick={onOpenBook}><div className="project-cover cover-one"><span>Н</span><small>НОВАЯ ИСТОРИЯ</small></div><div className="library-project-info"><strong>{hasBook ? bookTitle : 'Пример проекта'}</strong><span>Фантастика · Роман</span><span>0 слов написано</span><span className="project-status">● В работе</span></div></button> : <div className="library-no-results">Проекты не найдены. Измените поисковый запрос или фильтр.</div>}
      </div> :
      needsBook && !hasBook ? <div className="needs-book-state"><div className="planned-symbol">▤</div><h3>Сначала выберите книгу</h3><p>Раздел «{module.label}» работает внутри конкретного произведения. При этом общие инструменты — Черновик, Заметки, Исследования, Персонажи и другие — уже доступны без открытой книги.</p><button className="primary-button" onClick={onSelect.bind(null, 'library')}>Перейти в библиотеку</button></div> :
      <>{module.id !== 'draft' && <><div className="panel-heading"><div><div className="eyebrow">{module.planned ? 'ЗАПЛАНИРОВАННЫЙ МОДУЛЬ' : module.global ? (scope === 'global' ? 'ОБЩЕЕ ПРОСТРАНСТВО' : 'РАБОЧАЯ ОБЛАСТЬ КНИГИ') : 'ТЕКУЩИЙ ПРОЕКТ'}</div><h2>{module.label}</h2></div>{module.id === 'manuscript' && <span className="readiness-pill">Текущий текст</span>}</div><p className="panel-description">{descriptions[module.id]}</p></>}
      {module.planned ? <div className="planned-state"><div className="planned-symbol">✧</div><h3>Модуль в планах</h3><p>Представление уже включено в структуру приложения. Функциональность будет добавлена на следующих этапах.</p><span className="planned-tag">Запланировано</span></div> :
      module.id === 'manuscript' ? <div className="editor-shell"><div className="editor-toolbar"><button title="Жирный">B</button><button title="Курсив">I</button><button title="Заголовок">H</button><span className="toolbar-divider"/><button title="Отменить">↶</button><button title="Повторить">↷</button><span className="toolbar-spacer"/><span className="editor-status">Автосохранение</span></div><div className="manuscript-editor" contentEditable suppressContentEditableWarning><h2>Глава первая</h2><p className="editor-placeholder">Начните писать свою историю…</p><p>Рукопись — канонический текст книги. Вы можете редактировать его вручную. Изменения, подготовленные ИИ, попадут сюда только после вашего подтверждения.</p></div><div className="editor-footer"><span>Глава 1 · 0 слов</span><span>Русский · Без названия сцены</span></div></div> :
      module.id === 'draft' ? <DraftWorkspace scope={scope} hasBook={hasBook} bookTitle={bookTitle} onScopeChange={onScopeChange} showContext={showContext} activeMode={draftMode} setActiveMode={setDraftMode} mainView={draftView} setMainView={setDraftView} /> :
      module.id === 'dialogue' ? <div className="planned-state dialogue-state"><div className="planned-symbol">◌</div><h3>Диалог персонажей</h3><p>Настройте участников, сцену и цель разговора. Каждый ход модели будет запускаться отдельно по вашему нажатию.</p><button className="outline-button" onClick={() => onSelect('characters')}>Выбрать персонажей</button></div> :
      <div className="module-placeholder"><div className="module-placeholder-icon">{module.icon}</div><h3>{module.label}</h3><p>Рабочее представление раздела будет развиваться отдельно. Сейчас мы формируем общий каркас и постоянную навигацию приложения.</p><button className="outline-button" onClick={() => onSelect('draft')}>Открыть Черновик</button></div>}</>}
    </div>
  </section>
}


type DraftTool = { id: string; label: string; icon: string; group: string; prompt: string }
const draftTools: DraftTool[] = [
  { id: 'write', label: 'Написать текст', icon: '✦', group: 'Создание', prompt: 'Напиши фрагмент текста по следующему замыслу. Сохраняй заданный контекст и не добавляй события, противоречащие вводным.' },
  { id: 'continue', label: 'Продолжить', icon: '↗', group: 'Создание', prompt: 'Продолжи текст с того места, где он остановился. Сохрани голос повествования, темп и логику сцены.' },
  { id: 'scene', label: 'Создать сцену', icon: '▤', group: 'Создание', prompt: 'Создай сцену с указанной целью, конфликтом и изменением состояния персонажей.' },
  { id: 'ideas', label: 'Развить идею', icon: '✧', group: 'Развитие', prompt: 'Предложи несколько направлений развития идеи. Не выбирай за автора единственный вариант.' },
  { id: 'plot', label: 'Сюжетные события', icon: '⌁', group: 'Развитие', prompt: 'Предложи возможные события, причинно-следственные связи и последствия для сюжетной линии.' },
  { id: 'character', label: 'Разработать персонажа', icon: '♙', group: 'Развитие', prompt: 'Помоги разработать персонажа: мотивы, противоречия, поведение, речь и развитие.' },
  { id: 'rewrite', label: 'Переписать фрагмент', icon: '⟳', group: 'Редактирование', prompt: 'Перепиши выделенный фрагмент с учётом указаний, сохранив смысл и важные детали.' },
  { id: 'expand', label: 'Расширить', icon: '↔', group: 'Редактирование', prompt: 'Расширь фрагмент, добавив содержательные детали, действия, ощущения и подтекст без пустого объёма.' },
  { id: 'shorten', label: 'Сократить', icon: '−', group: 'Редактирование', prompt: 'Сократи фрагмент, сохранив смысл, интонацию и необходимые сюжетные детали.' },
  { id: 'style', label: 'Изменить стиль', icon: 'Aa', group: 'Редактирование', prompt: 'Переработай фрагмент в выбранной манере повествования, не меняя фактическое содержание.' },
  { id: 'analysis', label: 'Анализ текста', icon: '⌕', group: 'Анализ', prompt: 'Проанализируй текст: сильные стороны, слабые места, темп, ясность и возможные улучшения.' },
  { id: 'logic', label: 'Проверить логику', icon: '◇', group: 'Анализ', prompt: 'Найди логические несоответствия, необоснованные переходы и противоречия. Не исправляй текст автоматически.' },
  { id: 'timeline', label: 'Хронология', icon: '◷', group: 'Анализ', prompt: 'Проверь последовательность событий, временные интервалы и согласованность временных указаний.' },
  { id: 'consistency', label: 'Персонажи и знания', icon: '♧', group: 'Анализ', prompt: 'Проверь соответствие поведения, знаний и состояния персонажей заданному моменту истории.' },
]
const draftGroups = ['Создание', 'Развитие', 'Редактирование', 'Анализ']

function DraftWorkspace({ scope, hasBook, bookTitle, onScopeChange, showContext, activeMode, setActiveMode, mainView, setMainView }: { scope: 'global' | 'work'; hasBook: boolean; bookTitle: string; onScopeChange: (scope: 'global' | 'work') => void; showContext: boolean; activeMode: 'text' | 'planning'; setActiveMode: (mode: 'text' | 'planning') => void; mainView: 'work' | 'discussion'; setMainView: (view: 'work' | 'discussion') => void }) {
  const [rightTab, setRightTab] = useState<'tools' | 'planning' | 'history' | 'quiet'>('tools')
  const [openSections, setOpenSections] = useState({ request: true, context: false, settings: false, planning: true })
  const [openGroup, setOpenGroup] = useState('Создание')
  const [assistantVisible, setAssistantVisible] = useState(true)
  const [showCatalog, setShowCatalog] = useState(false)
  const [showStyleLibrary, setShowStyleLibrary] = useState(false)
  const [model, setModel] = useState('Автоматический выбор')
  const [style, setStyle] = useState('Собственный голос')
  const [preset, setPreset] = useState('Авторский баланс')
  const [levels, setLevels] = useState([4, 2, 5, 4, 2])
  const [request, setRequest] = useState('')
  const [extra, setExtra] = useState('')
  const [workingText, setWorkingText] = useState('Ветер с моря приносил запах соли и мокрого дерева. На узкой улице уже зажигали фонари, и их свет ложился на камни длинными неровными полосами.\n\nОн остановился у двери старого архива. За ней кто-то двигал мебель — медленно, словно не хотел, чтобы его услышали.\n\nНа мгновение ему показалось, что за мутным стеклом мелькнула знакомая фигура. Но когда он подошёл ближе, внутри снова стало тихо.')
  const [planText, setPlanText] = useState('Глава 1 · Завязка\nЗнакомство с героем, обстоятельствами и старым архивом.\n\nГлава 2 · Развитие\nПоявление препятствия, первые сведения о прошлом и вынужденный выбор.\n\nГлава 3 · Перелом\nВозвращение человека из прошлого меняет цель героя.')
  const [resultStatus, setResultStatus] = useState('Предложение')
  const [notice, setNotice] = useState('')
  const [followup, setFollowup] = useState('')
  const [selectedTask, setSelectedTask] = useState(0)
  const [selectedFinding, setSelectedFinding] = useState(1)
  const [history, setHistory] = useState([
    { title: 'Продолжить сцену у архива', time: 'Сегодня, 16:42', status: 'Есть результат', location: 'Глава 2 · Сцена 3', kind: 'Текст' },
    { title: 'Проверить мотивацию героя', time: 'Сегодня, 15:18', status: 'Отложено', location: 'Глава 2 · Сцена 3', kind: 'Анализ' },
    { title: 'Три варианта развития эпизода', time: 'Вчера, 20:06', status: 'Сохранено', location: 'Без привязки', kind: 'Идеи' },
  ])
  const [findings, setFindings] = useState([
    { id: 1, title: 'Несоответствие внешности персонажа', detail: 'В первой главе героиня описана блондинкой, а в третьей — рыжей. Пока нет объяснения изменения.', source: 'Глава 1 · Глава 3', priority: 'Высокая', status: 'Требует внимания' },
    { id: 2, title: 'Мотивация героя в сцене', detail: 'Решение героя пока не полностью согласуется с его предыдущими действиями и страхом разоблачения.', source: 'Глава 2 · Сцена 3', priority: 'Средняя', status: 'Новое' },
    { id: 3, title: 'Временная последовательность', detail: 'Между прибытием и разговором прошло меньше времени, чем требуется по описанию пути.', source: 'Глава 4', priority: 'Средняя', status: 'Проверяется' },
    { id: 4, title: 'Повтор образа', detail: 'Образ холодного металла встречается несколько раз на небольшом участке текста.', source: 'Глава 2 · Сцена 3', priority: 'Низкая', status: 'Отложено' },
  ])
  const context = scope === 'work' && hasBook ? bookTitle : 'Общее пространство'
  const sliderNames = [
    ['Креативность', 'Степень свободы при поиске решений'],
    ['Реализм', 'От условности до достоверности'],
    ['Откровенность', 'Уровень откровенности содержания'],
    ['Эмоциональность', 'Сила эмоционального выражения'],
    ['Детализация насилия', 'Подробность изображения насилия'],
  ]
  const styleCards = [
    { name: 'Собственный голос', desc: 'Образность, узнаваемая интонация и авторская манера' },
    { name: 'Классическая проза', desc: 'Выверенная композиция и ясная речь' },
    { name: 'Эпическое фэнтези', desc: 'Масштаб, мифологичность и выразительный мир' },
    { name: 'Лирическое повествование', desc: 'Ритм, метафоричность и внутренние переживания' },
  ]
  const resultText = '— Возможно, ты всё-таки пришёл, — раздался голос из темноты.\nОн узнал его сразу, хотя не слышал много лет.\n\n— Я думал, ты уехал.\n— Я тоже так думал, — ответил голос.'
  const selectedIssue = findings.find(item => item.id === selectedFinding) ?? findings[0]
  const toggleSection = (key: keyof typeof openSections) => setOpenSections(old => ({ ...old, [key]: !old[key] }))
  const setAllSections = (value: boolean) => setOpenSections({ request: value, context: value, settings: value, planning: value })
  const chooseTool = (id: string) => {
    const selected = draftTools.find(t => t.id === id)
    if (selected) setRequest(selected.prompt)
    setShowCatalog(false)
    setRightTab('tools')
    setOpenSections(old => ({ ...old, request: true }))
  }
  const submitRequest = () => {
    if (!request.trim()) return
    const title = request.length > 58 ? request.slice(0, 58) + '…' : request
    setHistory(old => [{ title, time: 'Только что', status: 'Демо-запрос', location: activeMode === 'text' ? 'Текущий фрагмент' : 'План произведения', kind: activeMode === 'text' ? 'Текст' : 'План' }, ...old])
    setSelectedTask(0)
    setResultStatus('Предложение')
    setMainView('discussion')
    setNotice('Демонстрационный макет: генерация и подключение модели пока не включены.')
  }
  const applyResult = (mode: string) => {
    if (mode === 'Вставить в конец рабочего текста') {
      setWorkingText(old => old + '\n\n' + resultText)
      setNotice('Фрагмент добавлен в конец рабочего текста. Рукопись не затронута.')
      return
    }
    if (mode === 'Заменить рабочий текст') {
      setWorkingText(resultText)
      setMainView('work')
      setNotice('Рабочий текст заменён демонстрационным фрагментом.')
      return
    }
    setResultStatus(mode === 'Отложить' ? 'Отложено' : mode === 'Отклонить' ? 'Отклонено' : 'Принято')
    setNotice(mode === 'Принять предложение' ? 'Предложение принято. Текст не изменён автоматически.' : 'Статус предложения изменён: ' + mode.toLowerCase() + '.')
  }
  const updateLevel = (index: number, value: number) => setLevels(old => old.map((n, i) => i === index ? value : n))
  const updateFinding = (id: number, status: string) => setFindings(old => old.map(item => item.id === id ? { ...item, status } : item))
  const openTask = (index: number) => {
    setSelectedTask(index)
    const task = history[index]
    setActiveMode(task?.kind === 'План' ? 'planning' : 'text')
    setMainView('discussion')
  }
  const openFinding = (id: number) => {
    setSelectedFinding(id)
    setMainView('work')
    setActiveMode('text')
    setNotice('Фрагмент и место замечания показаны в основной области. Переход к точной позиции подключим вместе с привязкой текста.')
  }
  return <div className={'draft-workbench draft-workbench-v3' + (assistantVisible ? '' : ' assistant-collapsed')}>
    <section className="draft-editor-pane draft-main-pane">
      <div className="draft-main-top"><div className="draft-view-tabs"><button className={mainView === 'work' ? 'active' : ''} onClick={() => setMainView('work')}>{activeMode === 'text' ? 'Рабочий текст' : 'Структура плана'}</button><button className={mainView === 'discussion' ? 'active' : ''} onClick={() => setMainView('discussion')}>Обсуждение и результаты</button></div></div>
      {showContext && !(activeMode === 'planning' && mainView === 'discussion') && <div className="draft-context-line"><span>⌂ {context}</span><span>Без привязки к главе или сцене</span><button onClick={() => setNotice('Привязка к произведению, главе или сцене — демонстрационный элемент.')}>＋ Привязать</button></div>}
      {mainView === 'work' && activeMode === 'text' && <>
        <div className="draft-formatbar">
          <button title="Жирный"><b>B</b></button><button title="Курсив"><i>I</i></button><button title="Заголовок">H</button><span/>
          <button title="Отменить">↶</button><button title="Повторить">↷</button><span className="draft-format-spacer"/>
          <button>Выделенный фрагмент⌄</button>
        </div>
        <textarea className="draft-editor-text" value={workingText} onChange={e => setWorkingText(e.target.value)} aria-label="Рабочий текст Черновика"/>
        <div className="draft-editor-footer"><span>{workingText.trim().split(/\s+/).filter(Boolean).length} слов · Русский</span><span>Рабочий текст Черновика</span></div>
        <div className="draft-selection-bar"><span>⌖ Контекст запроса</span><button onClick={() => { setRequest(old => old || 'Работай с текущим рабочим текстом.'); setRightTab('tools'); setOpenSections(old => ({ ...old, request: true })) }}>Использовать весь текст</button><button onClick={() => setNotice('Выделение фрагмента показано как элемент макета.')}>Выделить фрагмент</button></div>
      </>}
      {mainView === 'work' && activeMode === 'planning' && <div className="draft-plan-workspace">
        <div className="draft-plan-toolbar"><div><div className="draft-section-label">СТРУКТУРА ПРОИЗВЕДЕНИЯ</div><strong>План — ориентир, а не ограничение</strong></div><button onClick={() => setNotice('Добавление главы или сцены — демонстрационный элемент.')}>＋ Добавить элемент</button></div>
        <textarea className="draft-plan-editor" value={planText} onChange={e => setPlanText(e.target.value)} aria-label="Структура плана"/>
        <div className="draft-editor-footer"><span>{planText.trim().split(/\s+/).filter(Boolean).length} слов в плане</span><span>Структуру можно менять в процессе работы</span></div>
      </div>}
      {mainView === 'discussion' && <div className="draft-discussion-workspace">
        {activeMode === 'text' && <div className="draft-discussion-heading"><div><div className="draft-section-label">ОБСУЖДЕНИЕ С ИИ · РЕЗУЛЬТАТЫ</div><h3>Продолжение сцены у архива</h3><p>{history[selectedTask]?.location ?? 'Текущая задача'} · {history[selectedTask]?.time ?? 'Только что'}</p></div><span className="draft-status-pill">{resultStatus}</span></div>}
        {activeMode === 'text' ? <div className="draft-large-result">
          <div className="draft-result-version"><b>Вариант 1</b><span>Предложение · {model} · {style}</span></div>
          <div className="draft-result-text">{resultText}</div>
          <div className="draft-result-origin">Исходный запрос: {(history[selectedTask]?.title ?? request) || 'Продолжить сцену у архива'}</div>
          <div className="draft-result-actions"><button className="draft-accept" onClick={() => applyResult('Принять предложение')}>Принять</button><button onClick={() => applyResult('Вставить в конец рабочего текста')}>Вставить в текст</button><button onClick={() => applyResult('Заменить рабочий текст')}>Заменить текст</button><button onClick={() => setNotice('Создана демонстрационная альтернативная версия.')}>Ещё вариант</button><button onClick={() => applyResult('Отложить')}>Отложить</button><button onClick={() => applyResult('Отклонить')}>Отклонить</button></div>
          <div className="draft-result-destination"><b>Место применения</b><span>Предложено: конец текущего рабочего фрагмента</span><small>Применение всегда подтверждает автор. В Рукопись ничего не переносится автоматически.</small></div>
        </div> : <div className="draft-large-result">
          <textarea className="draft-plan-editor draft-plan-result" defaultValue={'Глава 1 · Завязка\nЗнакомство с героем и обстоятельствами. Старый архив становится отправной точкой.\n\nГлава 2 · Развитие\nПоявление препятствия, возвращение человека из прошлого, первый выбор героя.\n\nГлава 3 · Перелом\nРаскрытие причины возвращения и последствия решения героя.'}/>

        </div>}
        {activeMode === 'text' && <div className="draft-discussion-history"><b>Ход работы</b><span>Запрос автора</span><span>Предложение модели</span><span>Ручная правка и уточнения сохраняются в рамках этой задачи</span></div>}
      </div>}
      {notice && <div className="draft-notice"><span>{notice}</span><button onClick={() => setNotice('')}>×</button></div>}

    </section>
    {assistantVisible && <section className="draft-assistant-pane draft-side-pane">
      <div className="draft-scope-topline">{hasBook ? <select className="draft-scope-select" value={scope} onChange={e => onScopeChange(e.target.value as 'global' | 'work')} aria-label="Контекст Черновика"><option value="global">Общее пространство</option><option value="work">В книге: {bookTitle}</option></select> : <span>ОБЩЕЕ ПРОСТРАНСТВО</span>}</div>
      <div className="draft-assistant-top">
        <div className="draft-assistant-title"><div className="draft-ai-mark">✧</div><div><strong>Панель инструментов</strong><span>{context} · сопровождение работы</span></div></div>
        <button className="draft-collapse-button" onClick={() => setAssistantVisible(false)}>Свернуть</button>
      </div>
      <nav className="draft-mode-tabs draft-side-tabs" aria-label="Инструменты и сопровождение">
        <button className={rightTab === 'tools' ? 'active' : ''} onClick={() => setRightTab('tools')}><span>✧</span>Инструменты ИИ</button>
        <button className={rightTab === 'planning' ? 'active' : ''} onClick={() => setRightTab('planning')}><span>☷</span>Планирование</button>
        <button className={rightTab === 'history' ? 'active' : ''} onClick={() => setRightTab('history')}><span>↶</span>История задач<small>{history.length}</small></button>
        <button className={rightTab === 'quiet' ? 'active' : ''} onClick={() => setRightTab('quiet')}><span>⌕</span>Тихий редактор<small>{findings.filter(x => !['Решено', 'Отклонено'].includes(x.status)).length}</small></button>
      </nav>
      <div className="draft-assistant-scroll">
        {rightTab === 'tools' && <>
          <div className="draft-accordion-toolbar"><span>ПОДГОТОВКА ЗАДАЧИ</span><button onClick={() => setAllSections(!Object.values(openSections).every(Boolean))}>{Object.values(openSections).every(Boolean) ? 'Свернуть всё' : 'Развернуть всё'}</button></div>
          <div className="draft-accordion">
            <section className="draft-accordion-section">
              <button className="draft-accordion-head" aria-expanded={openSections.request} onClick={() => toggleSection('request')}><span><b>01</b><strong>Запрос</strong><small>Что нужно сделать</small></span><i>{openSections.request ? '−' : '+'}</i></button>
              {openSections.request && <div className="draft-accordion-content">
                <div className="draft-request-title"><div><div className="draft-section-label">СВОБОДНАЯ ФОРМУЛИРОВКА</div><strong>Опишите задачу своими словами</strong></div><span className="draft-demo-label">Макет</span></div>
                <textarea className="draft-request-input" value={request} onChange={e => setRequest(e.target.value)} placeholder={activeMode === 'text' ? 'Например: давай перепишем эту сцену свободнее и добавим эмоциональности…' : 'Например: предложи более напряжённую структуру второй части…'}/>
                <textarea className="draft-extra-input" value={extra} onChange={e => setExtra(e.target.value)} placeholder="Дополнительные пожелания или ограничения (необязательно)…"/>
                <div className="draft-catalog-inline"><button onClick={() => setShowCatalog(v => !v)}>＋ Выбрать инструмент <span>{showCatalog ? '−' : '⌄'}</span></button><small>Можно работать и без выбора инструмента</small></div>
                {showCatalog && <div className="draft-tool-catalog">{draftGroups.map(group => <div className="draft-tool-group" key={group}><button className={openGroup === group ? 'draft-tool-group-title expanded' : 'draft-tool-group-title'} onClick={() => setOpenGroup(old => old === group ? '' : group)}><span>{group}</span><span className="draft-group-chevron">{openGroup === group ? '−' : '+'}</span></button>{openGroup === group && <div className="draft-tool-grid">{draftTools.filter(t => t.group === group).map(t => <button key={t.id} className="draft-tool" onClick={() => chooseTool(t.id)}><span>{t.icon}</span>{t.label}</button>)}</div>}</div>)}</div>}
                <div className="draft-request-foot">Автор формулирует намерение — система подбирает операцию и релевантный контекст.</div>
              </div>}
            </section>
            <section className="draft-accordion-section">
              <button className="draft-accordion-head" aria-expanded={openSections.context} onClick={() => toggleSection('context')}><span><b>02</b><strong>Контекст</strong><small>{context} · 3 источника</small></span><i>{openSections.context ? '−' : '+'}</i></button>
              {openSections.context && <div className="draft-accordion-content">
                <div className="draft-context-summary"><span>Сейчас подключено</span><b>3 материала</b></div>
                <div className="draft-source-list">
                  <label><input type="checkbox" defaultChecked/><span><b>{activeMode === 'text' ? 'Рабочий фрагмент' : 'Текущая структура плана'}</b><small>Материал основной рабочей области</small></span><em>{activeMode === 'text' ? 'Текст' : 'План'}</em></label>
                  <label><input type="checkbox" defaultChecked/><span><b>Персонажи и события</b><small>Связанные сведения на момент истории</small></span><em>Контекст</em></label>
                  <label><input type="checkbox" defaultChecked/><span><b>Предыдущие решения</b><small>Краткая история и причинные связи</small></span><em>История</em></label>
                </div>
                <button className="draft-context-more" onClick={() => setNotice('Дополнительные источники: план, лор, предметы, заметки и исследования — демонстрационные элементы.')}>＋ Добавить источник контекста</button>
                <div className="draft-context-note">Контекст помогает понять задачу, но не определяет место сохранения результата.</div>
              </div>}
            </section>
            <section className="draft-accordion-section">
              <button className="draft-accordion-head" aria-expanded={openSections.settings} onClick={() => toggleSection('settings')}><span><b>03</b><strong>Настройки генерации</strong><small>Auto · Авторский баланс</small></span><i>{openSections.settings ? '−' : '+'}</i></button>
              {openSections.settings && <div className="draft-accordion-content">
                <label className="draft-field-label">Модель для этой задачи</label>
                <select className="draft-model-select" value={model} onChange={e => setModel(e.target.value)}><option>Автоматический выбор</option><option>GPT-6</option><option>GPT-5.6</option><option>GPT-5.5</option><option>Модель подключённого провайдера</option></select>
                <div className="draft-preset-row"><label>Профиль параметров</label><select value={preset} onChange={e => { setPreset(e.target.value); if (e.target.value === 'Авторский баланс') setLevels([4, 2, 5, 4, 2]); if (e.target.value === 'Спокойная проза') setLevels([2, 5, 1, 2, 1]); if (e.target.value === 'Мрачная фантастика') setLevels([5, 4, 4, 5, 5]) }}><option>Авторский баланс</option><option>Спокойная проза</option><option>Мрачная фантастика</option><option>Пользовательский</option></select></div>
                {sliderNames.map(([name, desc], i) => <div className="draft-slider-row" key={name}><div className="draft-slider-label"><b>{name}</b><span>{levels[i]} / 6 · Auto</span></div><input type="range" min="1" max="6" step="1" value={levels[i]} onChange={e => updateLevel(i, Number(e.target.value))}/><small>{desc}</small></div>)}
                <div className="draft-style-block"><div className="draft-style-head"><div><label className="draft-field-label">Стиль повествования</label><strong>{style}</strong></div><button onClick={() => setShowStyleLibrary(v => !v)}>Библиотека стилей⌄</button></div><p>Стиль и эмоциональность — разные настройки. Локальный выбор не меняет концепцию произведения.</p>{showStyleLibrary && <div className="draft-style-library">{styleCards.map(card => <button key={card.name} className={style === card.name ? 'selected' : ''} onClick={() => { setStyle(card.name); setShowStyleLibrary(false) }}><b>{card.name}</b><span>{card.desc}</span></button>)}</div>}</div>
                <div className="draft-volume-row"><label>Объём текста</label><select defaultValue="По необходимости"><option>Очень кратко</option><option>Примерно как исходный</option><option>Немного подробнее</option><option>Развёрнуто</option><option>По необходимости</option></select></div>
              </div>}
            </section>
          </div>
          <button className="draft-send-button" disabled={!request.trim()} onClick={submitRequest}>{activeMode === 'text' ? 'Отправить запрос' : 'Обсудить план'} <span>↗</span></button>
          <div className="draft-request-foot">Каждая задача хранит запрос, контекст, варианты и решения автора.</div>
        </>}
        {rightTab === 'planning' && <div className="draft-planning-panel">
          <div className="draft-section-label">РАБОТА С ПЛАНОМ</div>
          <h3>Действия с вариантом</h3>
          {activeMode === 'planning' ? <div className="draft-planning-actions"><button className="draft-accept" onClick={() => setNotice('Вариант плана принят в рабочую структуру. Рукопись не затронута.')}>Принять вариант плана</button><button onClick={() => setNotice('Сохранено как отдельный вариант плана.')}>Сохранить отдельно</button><button onClick={() => setNotice('Запрошен бы следующий вариант после подключения ИИ.')}>Ещё вариант</button><button onClick={() => setResultStatus('Отложено')}>Отложить</button></div> : <p className="draft-planning-hint">Переключитесь в режим «Планирование», чтобы управлять вариантами плана.</p>}
          <div className="draft-planning-divider"/>
          <div className="draft-section-label">ОБСУЖДЕНИЕ ПЛАНА</div>
          <textarea className="draft-planning-chat-input" placeholder="Уточните задачу, попросите альтернативу или внесите правку…" onChange={e => setFollowup(e.target.value)} value={followup}/>
          <div className="draft-planning-chat-foot"><button disabled={!followup.trim()} onClick={() => { setNotice('Уточнение добавлено в текущую задачу (демо).'); setFollowup('') }}>Обсудить ↗</button></div>
        </div>}
        {rightTab === 'history' && <div className="draft-history-view">
          <div className="draft-section-label">ИСТОРИЯ РАБОТЫ</div><h3>Карточки задач</h3><p>Выберите задачу, чтобы открыть её материалы в большой рабочей области. Привязка к главам и сценам сохраняется.</p>
          {history.map((item, i) => <button className={selectedTask === i ? 'draft-history-item selected' : 'draft-history-item'} key={item.title + '-' + i} onClick={() => openTask(i)}><span className="draft-history-icon">{item.kind === 'План' ? '☷' : '↗'}</span><span><b>{item.title}</b><small>{item.time} · {item.location}</small></span><em>{item.status}</em></button>)}
          <div className="draft-history-note">Продолжения и альтернативы хранятся внутри задачи. Основной текст и ручные правки не сбрасываются при просмотре истории.</div>
        </div>}
        {rightTab === 'quiet' && <div className="draft-quiet-view">
          <div className="draft-quiet-heading"><div><div className="draft-section-label">ФОНОВЫЙ АНАЛИЗ · ДЕМО</div><h3>Тихий редактор</h3><p>Замечания накапливаются здесь. Текст не исправляется автоматически.</p></div><span className="draft-quiet-count">{findings.filter(x => !['Решено', 'Отклонено'].includes(x.status)).length} активных</span></div>
          <div className="draft-quiet-summary"><span>Выберите замечание, чтобы увидеть его связь с рабочим текстом.</span><button onClick={() => setNotice('Повторный анализ будет доступен после подключения модулей и ИИ.')}>↻ Проверить актуальность</button></div>
          {findings.map(item => <article className={selectedFinding === item.id ? 'draft-finding-card selected' : 'draft-finding-card'} key={item.id}>
            <button className="draft-finding-select" onClick={() => openFinding(item.id)}><div className="draft-finding-top"><strong>{item.title}</strong><span className={'draft-finding-priority ' + (item.priority === 'Высокая' ? 'high' : item.priority === 'Средняя' ? 'medium' : 'low')}>{item.priority}</span></div><p>{item.detail}</p><div className="draft-finding-source">⌖ {item.source} · Открыть в рабочей области</div></button>
            <div className="draft-finding-status"><span>Статус: <b>{item.status}</b></span><select value={item.status} onChange={e => updateFinding(item.id, e.target.value)}><option>Новое</option><option>Требует внимания</option><option>Проверяется</option><option>Решено</option><option>Частично решено</option><option>Отклонено</option><option>Отложено</option><option>Осознанное решение</option></select></div>
            {item.id === 1 && <div className="draft-finding-explanation">Если автор позже объяснит изменение внешности, редактор должен перепроверить замечание, а не считать его автоматически решённым.</div>}
          </article>)}
          {selectedIssue && <div className="draft-selected-finding"><b>Выбрано: {selectedIssue.title}</b><span>{selectedIssue.source}</span><button onClick={() => { setRightTab('tools'); setRequest('Помоги исправить замечание: ' + selectedIssue.title + '. ' + selectedIssue.detail); setOpenSections(old => ({ ...old, request: true })) }}>Подготовить запрос к ИИ</button></div>}
        </div>}
      </div>
      {notice && rightTab !== 'tools' && <div className="draft-notice"><span>{notice}</span><button onClick={() => setNotice('')}>×</button></div>}
    </section>}
    {!assistantVisible && <button className="draft-show-assistant" onClick={() => setAssistantVisible(true)}>✧ Показать панель инструментов</button>}
  </div>
}


export default App

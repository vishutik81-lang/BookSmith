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

  const current = allModules.find(m => m.id === active) ?? { id: 'library' as ModuleId, label: 'Библиотека', icon: '▤' }
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
          <button className={split ? 'toolbar-button selected' : 'toolbar-button'} onClick={toggleSplit}><span>◫</span>{split ? 'Одна панель' : 'Две панели'}</button>
          <button className="toolbar-button" onClick={() => setShowContext(v => !v)}>{showContext ? 'Скрыть контекст' : 'Показать контекст'}</button>
          <button className="avatar">А</button>
        </div>
      </header>

      <div className="work-titlebar">
        <div><div className="eyebrow">{active === 'library' ? 'ВАША ТВОРЧЕСКАЯ МАСТЕРСКАЯ' : current.global ? 'ОБЩЕЕ ПРОСТРАНСТВО' : 'ТЕКУЩИЙ ПРОЕКТ'}</div><h1>{split ? 'Рабочее пространство' : current.label}</h1><p>{split ? 'Откройте два раздела одновременно и настройте рабочее пространство под свою задачу.' : descriptions[active]}</p></div>
        <div className="title-actions"><span className="saved-label"><span className="status-dot"/> Автосохранение</span>{active === 'library' && <button className="primary-button" onClick={() => { setNewTitle(''); setShowCreate(true) }}>＋ Новый проект</button>}</div>
      </div>

      <div className="work-content">
        <div className="panes" style={split ? { gridTemplateColumns: showSecondPanel ? `${ratio}% 6px minmax(0, 1fr)` : 'minmax(0, 1fr)' } : { gridTemplateColumns: 'minmax(0, 1fr)' }}>
          <Panel key={split ? leftModule : active} module={split ? (allModules.find(m => m.id === leftModule) ?? { id: 'library', label: 'Библиотека', icon: '▤' }) : current} showContext={showContext} nestedSplit={split} hasBook={hasBook} bookTitle={bookTitle} scope={leftScope} onScopeChange={setLeftScope} onSelect={(id) => { if (split) selectLeftModule(id); else selectModule(id) }} onOpenBook={openBook} onCreate={() => setShowCreate(true)} />
          {split && showSecondPanel && <div className="splitter" onMouseDown={onDividerDown}><span/></div>}
          {split && showSecondPanel && <Panel key={rightModule} module={allModules.find(m => m.id === rightModule) ?? { id: 'library', label: 'Библиотека', icon: '▤' }} showContext={showContext} nestedSplit={split} hasBook={hasBook} bookTitle={bookTitle} scope={rightScope} onScopeChange={setRightScope} onSelect={setRightModule} onOpenBook={openBook} onCreate={() => setShowCreate(true)} secondary />}
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

function Panel({ module, showContext, nestedSplit, hasBook, bookTitle, scope, onScopeChange, onSelect, onOpenBook, onCreate, secondary = false }: { module: ModuleItem; showContext: boolean; nestedSplit: boolean; hasBook: boolean; bookTitle: string; scope: 'global' | 'work'; onScopeChange: (scope: 'global' | 'work') => void; onSelect: (id: ModuleId) => void; onOpenBook: () => void; onCreate: () => void; secondary?: boolean }) {
  const [text, setText] = useState('')
  const [librarySearch, setLibrarySearch] = useState('')
  const [libraryFilter, setLibraryFilter] = useState('all')
  const showDemoProject = (libraryFilter === 'all' || libraryFilter === 'in-progress') && ('пример проекта фантастика новая история'.includes(librarySearch.toLowerCase()))
  const needsBook = !module.global && module.id !== 'library'
  return <section className={secondary ? 'panel secondary-panel' : 'panel'}>
    <div className="panel-tabbar"><div className="panel-tab"><span className="nav-icon">{module.icon}</span><select value={module.id} onChange={e => onSelect(e.target.value as ModuleId)} aria-label="Выбрать раздел"><option value="library">Библиотека</option>{globalModules.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}{bookModules.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}</select><span className="tab-chevron">⌄</span></div>{module.id === 'library' ? <div className="library-toolbar"><input value={librarySearch} onChange={e => setLibrarySearch(e.target.value)} placeholder="⌕ Поиск проектов…" aria-label="Поиск проектов"/><select value={libraryFilter} onChange={e => setLibraryFilter(e.target.value)} aria-label="Фильтр проектов"><option value="all">Все проекты</option><option value="in-progress">В работе</option><option value="completed">Завершённые</option></select></div> : module.global && hasBook ? <select className="panel-scope-select" value={scope} onChange={e => onScopeChange(e.target.value as 'global' | 'work')} aria-label="Контекст раздела"><option value="global">Общее пространство</option><option value="work">В книге: {bookTitle}</option></select> : <span className="panel-context-label">{module.global ? 'ОБЩЕЕ ПРОСТРАНСТВО' : bookTitle}</span>}</div>
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
      module.id === 'draft' ? <DraftWorkspace scope={scope} hasBook={hasBook} bookTitle={bookTitle} showContext={showContext} /> :
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

function DraftWorkspace({ scope, hasBook, bookTitle, showContext }: { scope: 'global' | 'work'; hasBook: boolean; bookTitle: string; showContext: boolean }) {
  const [activeTool, setActiveTool] = useState('write')
  const [activeTab, setActiveTab] = useState<'tools' | 'history' | 'results'>('tools')
  const [showSettings, setShowSettings] = useState(false)
  const [openGroup, setOpenGroup] = useState('')
  const [assistantVisible, setAssistantVisible] = useState(true)
  const [followup, setFollowup] = useState('')
  const [showStyleLibrary, setShowStyleLibrary] = useState(false)
  const [model, setModel] = useState('GPT-6')
  const [style, setStyle] = useState('Собственный голос')
  const [preset, setPreset] = useState('Авторский баланс')
  const [levels, setLevels] = useState([4, 2, 5, 2])
  const [request, setRequest] = useState('')
  const [extra, setExtra] = useState('')
  const [workingText, setWorkingText] = useState('Ветер с моря приносил запах соли и мокрого дерева. На узкой улице уже зажигали фонари, и их свет ложился на камни длинными неровными полосами.\\n\\nОн остановился у двери старого архива. За ней кто-то двигал мебель — медленно, словно не хотел, чтобы его услышали.\\n\\nНа мгновение ему показалось, что за мутным стеклом мелькнула знакомая фигура. Но когда он подошёл ближе, внутри снова стало тихо.')
  const [resultStatus, setResultStatus] = useState('Предложение')
  const [notice, setNotice] = useState('')
  const [history, setHistory] = useState([
    { title: 'Продолжить сцену у архива', time: 'Сегодня, 16:42', status: 'Есть результат' },
    { title: 'Проверить мотивацию героя', time: 'Сегодня, 15:18', status: 'Отложено' },
    { title: 'Три варианта развития эпизода', time: 'Вчера, 20:06', status: 'Сохранено' },
  ])
  const tool = draftTools.find(t => t.id === activeTool) ?? draftTools[0]
  const context = scope === 'work' && hasBook ? bookTitle : 'Общее пространство'
  const updateLevel = (index: number, value: number) => setLevels(old => old.map((n, i) => i === index ? value : n))
  const chooseTool = (id: string) => {
    setActiveTool(id)
    const selected = draftTools.find(t => t.id === id)
    if (selected) setRequest(selected.prompt)
    setActiveTab('tools')
    setNotice('')
  }
  const submitRequest = () => {
    if (!request.trim()) return
    setHistory(old => [{ title: tool.label, time: 'Только что', status: 'Демо-запрос' }, ...old])
    setResultStatus('Предложение')
    setActiveTab('results')
    setNotice('Это демонстрационный результат макета: подключение модели и реальная генерация пока не включены.')
  }
  const resultText = '— Возможно, ты всё-таки пришёл, — раздался голос из темноты.\\nОн узнал его сразу, хотя не слышал много лет.\\n\\n— Я думал, ты уехал.\\n— Я тоже так думал, — ответил голос.'
  const applyResult = (mode: string) => {
    if (mode === 'Вставить в конец рабочего текста') {
      setWorkingText(old => old + '\\n\\n' + resultText)
      setNotice('Фрагмент добавлен в конец рабочего текста. Предложение сохранено.')
      return
    }
    if (mode === 'Заменить рабочий текст') {
      setWorkingText(resultText)
      setNotice('Рабочий текст заменён демонстрационным фрагментом.')
      return
    }
    setResultStatus(mode === 'Отложить' ? 'Отложено' : mode === 'Отклонить' ? 'Отклонено' : 'Принято')
    setNotice(mode === 'Принять предложение' ? 'Предложение принято. Рабочий текст не изменён.' : 'Статус предложения изменён: ' + mode.toLowerCase() + '.')
  }
  const sliderNames = [
    ['Креативность', 'От строгого следования заданию до свободного поиска'],
    ['Откровенность (NSFW)', 'Уровень откровенности содержания'],
    ['Реализм', 'От условности до физической и бытовой достоверности'],
    ['Жестокость', 'Подробность изображения насилия и ран'],
  ]
  const styleCards = [
    { name: 'Собственный голос', desc: 'Ваш профиль: образность, сдержанная эмоциональность, психологическая глубина' },
    { name: 'Классическая проза', desc: 'Выверенная композиция, ясная речь, внимание к деталям' },
    { name: 'Эпическое фэнтези', desc: 'Масштаб, мифологичность, выразительный мир и историческая глубина' },
    { name: 'Лирическое повествование', desc: 'Ритм, метафоричность, внимание к внутренним переживаниям' },
  ]
  return <div className={`draft-workbench${assistantVisible ? "" : " assistant-collapsed"}`}>
    <section className="draft-editor-pane">
      <div className="draft-pane-heading">
        <div><div className="eyebrow">РАБОЧИЙ ТЕКСТ</div><strong>Текущий фрагмент</strong></div>
        <div className="draft-editor-actions"><span className="draft-save-state"><i/> Сохранено</span><button title="Дополнительные действия">•••</button></div>
      </div>
      {showContext && <div className="draft-context-line"><span>⌂ {context}</span><span>Без привязки к главе или сцене</span><button onClick={()=>setNotice('Привязка к произведению, главе или сцене — демонстрационный элемент.')}>＋ Привязать</button></div>}
      <div className="draft-formatbar">
        <button title="Жирный"><b>B</b></button><button title="Курсив"><i>I</i></button><button title="Заголовок">H</button><span/>
        <button title="Отменить">↶</button><button title="Повторить">↷</button><span className="draft-format-spacer"/>
        <button>Выделенный фрагмент⌄</button>
      </div>
      <textarea className="draft-editor-text" value={workingText} onChange={e => setWorkingText(e.target.value)} aria-label="Рабочий текст Черновика"/>
      <div className="draft-editor-footer"><span>{workingText.trim().split(/\\s+/).filter(Boolean).length} слов · Русский</span><span>Рабочий текст Черновика</span></div>
      <div className="draft-selection-bar"><span>⌖ Контекст запроса</span><button onClick={() => setRequest(old => old || 'Работай с выделенным фрагментом текста.')}>Использовать весь текст</button><button onClick={() => setNotice('Выделение фрагмента показано как элемент макета.')}>Выделить фрагмент</button></div>
    </section>
    {assistantVisible && <section className="draft-assistant-pane">
      <div className="draft-assistant-top">
        <div className="draft-assistant-title"><div className="draft-ai-mark">✧</div><div><strong>ИИ-партнёр</strong><span>Задача: работа над сценой у архива</span></div></div>
        <button className="draft-collapse-button" onClick={() => setAssistantVisible(false)}>Свернуть панель ИИ</button>
      </div>
      <div className="draft-tabs">
        <button className={activeTab === 'tools' ? 'active' : ''} onClick={() => setActiveTab('tools')}>Инструменты</button>
        <button className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>История <small>3</small></button>
        <button className={activeTab === 'results' ? 'active' : ''} onClick={() => setActiveTab('results')}>Предложения <small>1</small></button>
      </div>
      <div className="draft-assistant-scroll">
        {activeTab === 'tools' && <>
          <div className="draft-tool-catalog">
            <div className="draft-catalog-heading"><div className="draft-section-label">КАТАЛОГ ИНСТРУМЕНТОВ</div><span>Выберите раздел</span></div>
            {draftGroups.map(group => <div className="draft-tool-group" key={group}>
              <button className={openGroup === group ? 'draft-tool-group-title expanded' : 'draft-tool-group-title'} aria-expanded={openGroup === group} onClick={() => setOpenGroup(current => current === group ? '' : group)}>
                <span>{group}</span><span className="draft-group-chevron">{openGroup === group ? '−' : '+'}</span>
              </button>
              {openGroup === group && <div className="draft-tool-grid">{draftTools.filter(t => t.group === group).map(t => <button key={t.id} className={activeTool === t.id ? 'draft-tool active' : 'draft-tool'} onClick={() => chooseTool(t.id)}><span>{t.icon}</span>{t.label}</button>)}</div>}
            </div>)}
          </div>
          <div className="draft-request-card">
            <div className="draft-request-title"><div><div className="draft-section-label">ТЕКУЩИЙ ИНСТРУМЕНТ</div><strong>{tool.icon} {tool.label}</strong></div><span className="draft-demo-label">Макет</span></div>
            <label className="draft-field-label">Запрос</label>
            <textarea className="draft-request-input" value={request} onChange={e => setRequest(e.target.value)} placeholder="Опишите, что нужно сделать…"/>
            <label className="draft-field-label">Дополнительные инструкции</label>
            <textarea className="draft-extra-input" value={extra} onChange={e => setExtra(e.target.value)} placeholder="Что важно учесть? Чего избегать?"/>
            <div className="draft-request-meta"><span>Контекст: <b>{context}</b></span><button onClick={() => setNotice('Выбор источников контекста будет доступен в рабочей версии.')}>Изменить контекст⌄</button></div>
            <div className="draft-settings-heading"><strong>Параметры запроса</strong><button onClick={() => setShowSettings(v => !v)}>{showSettings ? 'Свернуть' : 'Настроить'}⌄</button></div>
            {showSettings && <div className="draft-settings-body">
              <label className="draft-field-label">Модель</label>
              <select className="draft-model-select" value={model} onChange={e => setModel(e.target.value)}>
                <option>GPT-6</option><option>GPT-5.6</option><option>GPT-5.5</option><option>Модель из подключённого провайдера</option>
              </select>
              <div className="draft-slider-head"><span>Тонкая настройка генерации</span><button onClick={() => {setLevels([4,2,5,2]);setPreset('Пользовательский')}}>Сбросить</button></div>
              {sliderNames.map(([name,desc],i) => <div className="draft-slider-row" key={name}>
                <div className="draft-slider-label"><b>{name}</b><span>{levels[i]} / 6</span></div>
                <input type="range" min="1" max="6" step="1" value={levels[i]} onChange={e => updateLevel(i, Number(e.target.value))}/>
                <small>{desc}</small>
              </div>)}
              <div className="draft-preset-row"><label>Набор настроек</label><select value={preset} onChange={e => {setPreset(e.target.value);if(e.target.value==='Мрачная фантастика')setLevels([5,3,5,5]);if(e.target.value==='Спокойная проза')setLevels([2,1,5,1]);if(e.target.value==='Авторский баланс')setLevels([4,2,5,2])}}><option>Авторский баланс</option><option>Спокойная проза</option><option>Мрачная фантастика</option><option>Пользовательский</option></select></div>
              <div className="draft-style-block"><div className="draft-style-head"><div><label className="draft-field-label">Стиль повествования</label><strong>{style}</strong></div><button onClick={() => setShowStyleLibrary(v => !v)}>Библиотека стилей⌄</button></div>
                <p>Профиль используется при генерации и редактировании, в том числе для инструмента «Изменить стиль». На стиль всей книги он не влияет.</p>
                {showStyleLibrary && <div className="draft-style-library">{styleCards.map(card => <button key={card.name} className={style===card.name?'selected':''} onClick={() => {setStyle(card.name);setShowStyleLibrary(false)}}><b>{card.name}</b><span>{card.desc}</span></button>)}</div>}
              </div>
            </div>}
            <button className="draft-send-button" disabled={!request.trim()} onClick={submitRequest}>Отправить запрос <span>↗</span></button>
            <div className="draft-request-foot">Настройки относятся только к этому запросу · Рукопись не изменяется</div>
          </div>
        </>}
        {activeTab === 'history' && <div className="draft-history-view"><div className="draft-section-label">ИСТОРИЯ РАБОТЫ</div><h3>Последние действия</h3><p>Запросы, обсуждения и решения сохраняются в рамках рабочей задачи.</p>{history.map((item,i)=><button className="draft-history-item" key={item.title + '-' + i} onClick={()=>{setRequest(item.title);setActiveTab('tools')}}><span className="draft-history-icon">{i===0?'↗':'◷'}</span><span><b>{item.title}</b><small>{item.time}</small></span><em>{item.status}</em></button>)}<div className="draft-history-note">Одна задача может содержать несколько сессий. Здесь будет доступно продолжение предыдущей сессии и просмотр принятых решений.</div></div>}
        {activeTab === 'results' && <div className="draft-result-view"><div className="draft-section-label">РЕЗУЛЬТАТ ИИ · ДЕМО</div><div className="draft-result-card"><div className="draft-result-head"><strong>Возможное продолжение сцены</strong><span className="draft-status-pill">{resultStatus}</span></div><p>— Возможно, ты всё-таки пришёл, — раздался голос из темноты.</p><p>Он узнал его сразу, хотя не слышал много лет. Рука сама потянулась к дверной ручке, но остановилась в нескольких сантиметрах от холодного металла.</p><p>— Я думал, ты уехал.</p><p>— Я тоже так думал, — ответил голос.</p><div className="draft-result-origin">Источник: «Продолжить сцену» · {model} · {style}</div><div className="draft-result-actions"><button className="draft-accept" onClick={()=>applyResult('Принять предложение')}>Принять предложение</button><button onClick={()=>applyResult('Вставить в конец рабочего текста')}>Вставить в конец текста</button><button onClick={()=>applyResult('Заменить рабочий текст')}>Заменить рабочий текст</button><button onClick={()=>setNotice('Создана демонстрационная альтернативная версия.')}>Ещё вариант</button><button onClick={()=>applyResult('Отложить')}>Отложить</button><button onClick={()=>applyResult('Отклонить')}>Отклонить</button></div></div><div className="draft-result-separation"><b>Важно:</b> принятие предложения меняет только его статус. Вставка или замена текста — отдельные действия. В рабочей версии замена будет доступна для выделенного фрагмента или позиции курсора. В Рукопись ничего не переносится автоматически.</div></div>}
      </div>
      {notice && <div className="draft-notice"><span>{notice}</span><button onClick={()=>setNotice('')}>×</button></div>}
      {activeTab === 'results' && <div className="draft-chat-composer"><textarea placeholder="Уточните полученный результат или задайте вопрос по нему…" onChange={e=>setFollowup(e.target.value)} value={followup}/><div><span>Обсуждение текущего результата</span><button disabled={!followup.trim()} onClick={()=>{setNotice('Уточнение добавлено в обсуждение текущего результата (демо).');setFollowup('')}}>Обсудить ↗</button></div></div>}
    </section>}
    {!assistantVisible && <button className="draft-show-assistant" onClick={() => setAssistantVisible(true)}>✧ Показать панель ИИ</button>}
  </div>
}


export default App

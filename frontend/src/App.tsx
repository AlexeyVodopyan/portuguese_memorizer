import { Link, Route, Routes, NavLink, useLocation, Navigate, useNavigate } from 'react-router-dom'
import { TrainingView } from './components/TrainingView'
import { VerbTrainingView } from './components/VerbTrainingView'
import { Home, ProgressPage } from './pages'
import api from './api'
import { AuthPage } from './pages/AuthPage'
import { useEffect, useState, useRef, useCallback } from 'react'

function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showModes, setShowModes] = useState(false)
  const dropdownRef = useRef<HTMLDivElement | null>(null)
  const dropdownItemsRef = useRef<HTMLAnchorElement[]>([])
  const dropdownToggleRef = useRef<HTMLButtonElement | null>(null)
  const sidebarRef = useRef<HTMLElement | null>(null)
  const firstSidebarLinkRef = useRef<HTMLAnchorElement | null>(null)

  useEffect(() => {
    if (api.getToken()) {
      api.me().then(r => setUser(r.username)).catch(() => setUser(null))
    } else {
      setUser(null)
    }
  }, [])
  useEffect(() => { setMobileOpen(false) }, [location.pathname])
  useEffect(() => { setShowModes(false) }, [location.pathname])
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!showModes) return
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowModes(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showModes])

  // Helper to set focus to first item in dropdown
  const focusDropdownItem = (index: number) => {
    const items = dropdownItemsRef.current
    if (items[index]) items[index].focus()
  }

  // Close handlers
  const closeSidebar = useCallback(() => setMobileOpen(false), [])
  const closeDropdown = useCallback(() => setShowModes(false), [])

  // Keyboard global (Esc)
  useEffect(()=>{
    function onKey(e: KeyboardEvent){
      if(e.key === 'Escape'){
        if(showModes){ closeDropdown(); dropdownToggleRef.current?.focus() }
        else if(mobileOpen){ closeSidebar(); }
      }
    }
    window.addEventListener('keydown', onKey)
    return ()=> window.removeEventListener('keydown', onKey)
  }, [showModes, mobileOpen, closeDropdown, closeSidebar])

  // Body scroll lock when sidebar open
  useEffect(()=>{
    if(mobileOpen){
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return ()=>{ document.body.style.overflow = prev }
    }
  }, [mobileOpen])

  // Dropdown keyboard navigation
  const onDropdownKey = (e: React.KeyboardEvent) => {
    const items = dropdownItemsRef.current
    if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){
      e.preventDefault()
      if(!showModes){ setShowModes(true); requestAnimationFrame(()=> focusDropdownItem(0)); return }
      let idx = items.indexOf(document.activeElement as HTMLAnchorElement)
      if(e.key==='ArrowDown'){ idx = (idx+1) % items.length }
      else if(e.key==='ArrowUp'){ idx = (idx-1+items.length) % items.length }
      else if(e.key==='Home'){ idx = 0 }
      else if(e.key==='End'){ idx = items.length -1 }
      focusDropdownItem(idx)
    } else if(e.key==='Escape'){
      closeDropdown(); dropdownToggleRef.current?.focus()
    } else if(e.key==='Enter' && !showModes){
      setShowModes(true); requestAnimationFrame(()=> focusDropdownItem(0))
    }
  }

  // Collect dropdown items after render
  useEffect(()=>{
    if(dropdownRef.current){
      dropdownItemsRef.current = Array.from(dropdownRef.current.querySelectorAll('.dropdown-menu a')) as HTMLAnchorElement[]
    }
  }, [showModes])

  // Focus first link when sidebar opens
  useEffect(()=>{
    if(mobileOpen){
      requestAnimationFrame(()=> firstSidebarLinkRef.current?.focus())
    }
  }, [mobileOpen])

  // Swipe gestures for sidebar (mobile)
  useEffect(()=>{
    let startX:number|null=null, startY:number|null=null, touching=false
    function onTouchStart(e: TouchEvent){
      if(e.touches.length!==1) return
      const t = e.touches[0]
      startX = t.clientX; startY = t.clientY; touching=true
    }
    function onTouchMove(e: TouchEvent){
      if(!touching || startX==null || startY==null) return
      const t = e.touches[0]
      const dx = t.clientX - startX
      const dy = Math.abs(t.clientY - startY)
      // open if swipe from very left edge to right
      if(!mobileOpen && startX < 24 && dx > 70 && dy < 50){ setMobileOpen(true); touching=false }
      // close if sidebar open and swipe left inside sidebar
      if(mobileOpen && dx < -70 && dy < 50){ setMobileOpen(false); touching=false }
    }
    function onTouchEnd(){ touching=false }
    window.addEventListener('touchstart', onTouchStart, {passive:true})
    window.addEventListener('touchmove', onTouchMove, {passive:true})
    window.addEventListener('touchend', onTouchEnd)
    return ()=>{
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [mobileOpen])

  const logout = () => { api.logout(); setUser(null); navigate('/auth', { replace: true }) }
  return (
    <>
      <header className={"app-header" + (mobileOpen ? ' mobile-open' : '')}>
        <div className="container header-inner">
          <button className="menu-toggle" aria-label="Меню" aria-expanded={mobileOpen} aria-controls="mobile-sidebar" onClick={() => setMobileOpen(o=>!o)}>
            <span />
            <span />
            <span />
          </button>
          <Link to="/" className="brand">🇵🇹 OlaCards</Link>
          <nav id="main-nav" className="desktop-nav">
            <NavLink to="/" className={({isActive}) => isActive ? 'active' : ''}>Главная</NavLink>
            <div ref={dropdownRef} className={"dropdown" + (showModes ? ' open' : '')}>
              <button ref={dropdownToggleRef} type="button" className="dropdown-toggle" aria-haspopup="true" aria-expanded={showModes} onClick={()=>setShowModes(o=>!o)} onKeyDown={onDropdownKey}>
                <span>Режимы</span>
                <span className="arrow" aria-hidden>▾</span>
              </button>
              <div className="dropdown-menu" role="menu">
                <NavLink to="/train/pt2ru_choice" role="menuitem" className={({isActive}) => isActive ? 'active' : ''}>PT→RU (выбор)</NavLink>
                <NavLink to="/train/ru2pt_choice" role="menuitem" className={({isActive}) => isActive ? 'active' : ''}>RU→PT (выбор)</NavLink>
                <NavLink to="/train/pt2ru_input" role="menuitem" className={({isActive}) => isActive ? 'active' : ''}>PT→RU (ввод)</NavLink>
                <NavLink to="/train/ru2pt_input" role="menuitem" className={({isActive}) => isActive ? 'active' : ''}>RU→PT (ввод)</NavLink>
                <NavLink to="/train/verbs" role="menuitem" className={({isActive}) => isActive ? 'active' : ''}>Глаголы</NavLink>
              </div>
            </div>
            <NavLink to="/progress" className={({isActive}) => isActive ? 'active' : ''}>Прогресс</NavLink>
          </nav>
          <div className="user-box desktop-only">
            {user ? (
              <>
                <span className="username">{user}</span>
                <button onClick={logout} className="linklike">Выйти</button>
              </>
            ) : (
              <Link to="/auth">Войти</Link>
            )}
          </div>
        </div>
        <div className="subtle-path">{location.pathname}</div>
      </header>
      {mobileOpen && <div className="sidebar-overlay" onClick={()=>setMobileOpen(false)} />}
      <aside ref={sidebarRef} id="mobile-sidebar" className={"mobile-sidebar" + (mobileOpen ? ' open' : '')} aria-hidden={!mobileOpen}>
        <div className="mobile-sidebar-inner">
          <div className="ms-header">
            <span className="ms-brand">🇵🇹 OlaCards</span>
            <button className="ms-close" aria-label="Закрыть" onClick={()=>setMobileOpen(false)}>×</button>
          </div>
          <div className="ms-section">
            <span className="ms-section-title">Навигация</span>
            <NavLink ref={firstSidebarLinkRef} to="/" onClick={()=>setMobileOpen(false)}>Главная</NavLink>
            <NavLink to="/progress" onClick={()=>setMobileOpen(false)}>Прогресс</NavLink>
          </div>
          <div className="ms-section">
            <span className="ms-section-title">Режимы</span>
            <NavLink to="/train/pt2ru_choice" onClick={()=>setMobileOpen(false)}>PT→RU (выбор)</NavLink>
            <NavLink to="/train/ru2pt_choice" onClick={()=>setMobileOpen(false)}>RU→PT (выбор)</NavLink>
            <NavLink to="/train/pt2ru_input" onClick={()=>setMobileOpen(false)}>PT→RU (ввод)</NavLink>
            <NavLink to="/train/ru2pt_input" onClick={()=>setMobileOpen(false)}>RU→PT (ввод)</NavLink>
            <NavLink to="/train/verbs" onClick={()=>setMobileOpen(false)}>Глаголы</NavLink>
          </div>
          <div className="ms-section user-area">
            <span className="ms-section-title">Аккаунт</span>
            {user ? (
              <>
                <span className="username">{user}</span>
                <button className="linklike" onClick={()=>{logout(); setMobileOpen(false)}}>Выйти</button>
              </>
            ) : (
              <NavLink to="/auth" onClick={()=>setMobileOpen(false)}>Войти</NavLink>
            )}
          </div>
          <div className="ms-footer">© {new Date().getFullYear()} OlaCards</div>
        </div>
      </aside>
    </>
  )
}

const Protected = ({ children }: { children: JSX.Element }) => {
  if (!api.getToken()) return <Navigate to="/auth" replace />
  return children
}

export default function App() {
  return (
    <div className="app-root">
      <Header />
      <main className="container">
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/" element={<Protected><Home /></Protected>} />
          <Route path="/train/pt2ru_choice" element={<Protected><TrainingView mode="pt2ru_choice" /></Protected>} />
          <Route path="/train/ru2pt_choice" element={<Protected><TrainingView mode="ru2pt_choice" /></Protected>} />
          <Route path="/train/pt2ru_input" element={<Protected><TrainingView mode="pt2ru_input" /></Protected>} />
          <Route path="/train/ru2pt_input" element={<Protected><TrainingView mode="ru2pt_input" /></Protected>} />
          <Route path="/train/verbs" element={<Protected><VerbTrainingView /></Protected>} />
          <Route path="/progress" element={<Protected><ProgressPage /></Protected>} />
        </Routes>
      </main>
      <footer className="container footer">Сделано на FastAPI + React</footer>
    </div>
  )
}

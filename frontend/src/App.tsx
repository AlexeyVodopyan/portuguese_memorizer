import { Link, Route, Routes, NavLink, useLocation, Navigate, useNavigate } from 'react-router-dom'
import { TrainingView } from './components/TrainingView'
import { Home, ProgressPage } from './pages'
import api from './api'
import { AuthPage } from './pages/AuthPage'
import { useEffect, useState } from 'react'

function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const [user, setUser] = useState<string | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  useEffect(() => {
    if (api.getToken()) {
      api.me().then(r => setUser(r.username)).catch(() => setUser(null))
    } else {
      setUser(null)
    }
  }, [])
  useEffect(() => { setMobileOpen(false) }, [location.pathname])
  const logout = () => { api.logout(); setUser(null); navigate('/auth', { replace: true }) }
  return (
    <header className={"app-header" + (mobileOpen ? ' mobile-open' : '')}>
      <div className="container header-inner">
        <button className="menu-toggle" aria-label="Меню" aria-expanded={mobileOpen} aria-controls="main-nav" onClick={() => setMobileOpen(o=>!o)}>
          <span />
          <span />
          <span />
        </button>
        <Link to="/" className="brand">🇵🇹 OlaCards</Link>
        <nav id="main-nav">
          <NavLink to="/" className={({isActive}) => isActive ? 'active' : ''}>Главная</NavLink>
          <NavLink to="/train/pt2ru_choice" className={({isActive}) => isActive ? 'active' : ''}>PT→RU (выбор)</NavLink>
          <NavLink to="/train/ru2pt_choice" className={({isActive}) => isActive ? 'active' : ''}>RU→PT (выбор)</NavLink>
          <NavLink to="/train/pt2ru_input" className={({isActive}) => isActive ? 'active' : ''}>PT→RU (ввод)</NavLink>
          <NavLink to="/progress" className={({isActive}) => isActive ? 'active' : ''}>Прогресс</NavLink>
        </nav>
        <div className="user-box">
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
          <Route path="/progress" element={<Protected><ProgressPage /></Protected>} />
        </Routes>
      </main>
      <footer className="container footer">Сделано на FastAPI + React</footer>
    </div>
  )
}

import { Link, Route, Routes, NavLink, useLocation } from 'react-router-dom'
import { TrainingView } from './components/TrainingView'
import { Home, ProgressPage } from './pages'

function Header() {
  const location = useLocation()
  return (
    <header className="app-header">
      <div className="container header-inner">
        <Link to="/" className="brand">🇵🇹 Portuguese Memorizer</Link>
        <nav>
          <NavLink to="/" className={({isActive}) => isActive ? 'active' : ''}>Home</NavLink>
          <NavLink to="/train/pt2ru_choice" className={({isActive}) => isActive ? 'active' : ''}>PT→RU (choice)</NavLink>
          <NavLink to="/train/ru2pt_choice" className={({isActive}) => isActive ? 'active' : ''}>RU→PT (choice)</NavLink>
          <NavLink to="/train/pt2ru_input" className={({isActive}) => isActive ? 'active' : ''}>PT→RU (input)</NavLink>
          <NavLink to="/progress" className={({isActive}) => isActive ? 'active' : ''}>Progress</NavLink>
        </nav>
      </div>
      <div className="subtle-path">{location.pathname}</div>
    </header>
  )
}

export default function App() {
  return (
    <div className="app-root">
      <Header />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/train/pt2ru_choice" element={<TrainingView mode="pt2ru_choice" />} />
          <Route path="/train/ru2pt_choice" element={<TrainingView mode="ru2pt_choice" />} />
          <Route path="/train/pt2ru_input" element={<TrainingView mode="pt2ru_input" />} />
          <Route path="/progress" element={<ProgressPage />} />
        </Routes>
      </main>
      <footer className="container footer">Built with FastAPI + React</footer>
    </div>
  )
}

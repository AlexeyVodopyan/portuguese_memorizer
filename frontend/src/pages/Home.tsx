import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api, { ProgressSummary} from '../api'

export function Home() {
  const [counts, setCounts] = useState<{ total: number; studied: number; learned: number } | null>(null)
  useEffect(() => {
    api.getProgress().then((p: ProgressSummary) => setCounts({ total: p.total, studied: p.studied, learned: p.learned })).catch(() => {})
  }, [])
  const TAGLINES = [
    'Несколько режимов — учите удобно.',
    'Карточки, ввод, спряжение глаголов — всё в одном месте.',
    'Практикуйтесь в переводе и спряжении — прогресс сохраняется.',
    'Учите слова и формы глаголов. Следите за прогрессом.',
    'Гибкие режимы тренировки: выбор, ввод и спряжения.'
  ]
  const [tagline, setTagline] = useState('')
  useEffect(()=>{ setTagline(TAGLINES[Math.floor(Math.random()*TAGLINES.length)]) },[])
  return (
    <section className="home">
      <div className="hero">
        <h1>Изучайте португальский с помощью карточек</h1>
        <p>{tagline}</p>
        {counts && (
          <p className="muted">Всего: {counts.total} • Изучено: {counts.studied} • Выучено: {counts.learned}</p>
        )}
      </div>
      <div className="modes-grid">
        <Link to="/train/pt2ru_choice" className="mode">
          <h3>PT → RU (выбор)</h3>
          <p>Множественный выбор</p>
        </Link>
        <Link to="/train/ru2pt_choice" className="mode">
          <h3>RU → PT (выбор)</h3>
          <p>Множественный выбор</p>
        </Link>
        <Link to="/train/pt2ru_input" className="mode">
          <h3>PT → RU (ввод)</h3>
          <p>Введите перевод</p>
        </Link>
        <Link to="/train/ru2pt_input" className="mode">
          <h3>RU → PT (ввод)</h3>
          <p>Введите перевод</p>
        </Link>
        <Link to="/train/verbs" className="mode">
          <h3>Глаголы</h3>
          <p>Спряжение глаголов</p>
        </Link>
        <Link to="/progress" className="mode outline">
          <h3>Прогресс</h3>
          <p>Статистика и сброс</p>
        </Link>
      </div>
    </section>
  )
}

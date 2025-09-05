import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import api, { ProgressSummary} from '../api'

export function Home() {
  const [counts, setCounts] = useState<{ total: number; studied: number; learned: number } | null>(null)
  useEffect(() => {
    api.getProgress().then((p: ProgressSummary) => setCounts({ total: p.total, studied: p.studied, learned: p.learned })).catch(() => {})
  }, [])
  return (
    <section className="home">
      <div className="hero">
        <h1>Изучайте португальский с помощью карточек</h1>
        <p>Три режима, мгновенная проверка и отслеживание прогресса.</p>
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
        <Link to="/progress" className="mode outline">
          <h3>Прогресс</h3>
          <p>Статистика и сброс</p>
        </Link>
      </div>
    </section>
  )
}

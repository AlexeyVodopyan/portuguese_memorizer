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
        <h1>Learn Portuguese with flashcards</h1>
        <p>Three modes, instant feedback, and progress tracking.</p>
        {counts && (
          <p className="muted">Total: {counts.total} • Studied: {counts.studied} • Learned: {counts.learned}</p>
        )}
      </div>
      <div className="modes-grid">
        <Link to="/train/pt2ru_choice" className="mode">
          <h3>Portuguese → Russian</h3>
          <p>Multiple choice</p>
        </Link>
        <Link to="/train/ru2pt_choice" className="mode">
          <h3>Russian → Portuguese</h3>
          <p>Multiple choice</p>
        </Link>
        <Link to="/train/pt2ru_input" className="mode">
          <h3>Portuguese → Russian</h3>
          <p>Type the answer</p>
        </Link>
        <Link to="/progress" className="mode outline">
          <h3>Progress</h3>
          <p>View stats and reset</p>
        </Link>
      </div>
    </section>
  )
}

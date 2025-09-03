import { useEffect, useMemo, useState } from 'react'
import api from '../api'

export function ProgressPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<Awaited<ReturnType<typeof api.getProgress>> | null>(null)
  const [words, setWords] = useState<Array<{ id: number; pt: string; ru: string }>>([])

  async function load() {
    try {
      setLoading(true)
      setError(null)
      const [p, w] = await Promise.all([api.getProgress(), api.getWords()])
      setProgress(p)
      setWords(w)
    } catch (e: any) {
      setError(e.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const percent = useMemo(() => {
    if (!progress) return 0
    return Math.round((progress.learned / Math.max(1, progress.total)) * 100)
  }, [progress])

  async function reset() {
    if (!confirm('Reset all progress?')) return
    try {
      await api.resetProgress()
      await load()
    } catch (e) {
      // ignore
    }
  }

  return (
    <section className="progress-page">
      <h2>Progress</h2>
      {loading && <div>Loading…</div>}
      {error && <div className="alert error">{error}</div>}
      {progress && (
        <>
          <div className="stats">
            <div className="stat">
              <div className="value">{progress.total}</div>
              <div className="label">Total cards</div>
            </div>
            <div className="stat">
              <div className="value">{progress.studied}</div>
              <div className="label">Studied</div>
            </div>
            <div className="stat">
              <div className="value">{progress.learned}</div>
              <div className="label">Learned</div>
            </div>
          </div>

          <div className="progressbar" aria-label="Learned percent">
            <div className="bar" style={{ width: `${percent}%` }} />
            <div className="percent">{percent}%</div>
          </div>

          <div className="actions">
            <button className="danger" onClick={reset}>Reset progress</button>
          </div>

          <h3>Per card</h3>
          <div className="cards-grid">
            {words.map((w) => {
              const st = (progress.by_card as any)[w.id] || { seen: 0, correct: 0, incorrect: 0, streak: 0 }
              const learned = st.correct >= 3 && st.streak >= 2
              return (
                <div key={w.id} className={`mini-card ${learned ? 'learned' : ''}`}>
                  <div className="row">
                    <span className="pt">{w.pt}</span>
                    <span className="ru">{w.ru}</span>
                  </div>
                  <div className="row small">
                    <span>seen: {st.seen}</span>
                    <span>✓ {st.correct}</span>
                    <span>✗ {st.incorrect}</span>
                    <span>streak: {st.streak}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </section>
  )
}

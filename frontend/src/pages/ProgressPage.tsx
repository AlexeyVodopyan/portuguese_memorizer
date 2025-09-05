import { useEffect, useMemo, useState } from 'react'
import api from '../api'

export function ProgressPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<Awaited<ReturnType<typeof api.getProgress>> | null>(null)
  const [words, setWords] = useState<Array<{ id: number; pt: string; ru: string; category?: string }>>([])
  const [allCategories, setAllCategories] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])

  async function load() {
    try {
      setLoading(true)
      setError(null)
      const [p, w] = await Promise.all([api.getProgress(), api.getWords()])
      setProgress(p)
      setWords(w as any)
      const cats = Array.from(new Set((w as any).map((x: any)=>x.category).filter(Boolean))) as string[]
      setAllCategories(cats)
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

  const filteredWords = useMemo(() => {
    if (!selectedCategories.length) return words
    return words.filter(w => selectedCategories.includes(w.category || ''))
  }, [words, selectedCategories])

  const filteredStats = useMemo(() => {
    if (!progress) return { total: 0, studied: 0, learned: 0, percent: 0 }
    const byCard = progress.by_card as any
    const total = filteredWords.length
    let studied = 0, learned = 0
    filteredWords.forEach(w => {
      const st = byCard[w.id] || { seen:0, correct:0, streak:0 }
      if (st.seen > 0) studied++
      if (st.correct >=3 && st.streak >=2) learned++
    })
    const percent = Math.round((learned / Math.max(1,total))*100)
    return { total, studied, learned, percent }
  }, [filteredWords, progress])

  const toggleCategory = (c: string) => {
    setSelectedCategories(prev => prev.includes(c) ? prev.filter(x=>x!==c) : [...prev, c])
  }

  return (
    <section className="progress-page">
      <h2>Прогресс</h2>
      {allCategories.length > 0 && (
        <div className="categories-filter" style={{display:'flex', flexWrap:'wrap', gap:6, marginBottom:16}}>
          {allCategories.map(c => {
            const active = selectedCategories.includes(c)
            return <button type="button" key={c} onClick={()=>toggleCategory(c)} className={active? 'chip active' : 'chip'} style={{padding:'2px 8px', borderRadius:12, border:'1px solid var(--border)', background: active? 'var(--accent)' : 'transparent', color: active? '#fff':'inherit', fontSize:12}}>{c}</button>
          })}
          {selectedCategories.length>0 && <button type="button" onClick={()=>setSelectedCategories([])} className="chip" style={{padding:'2px 8px', borderRadius:12, border:'1px solid var(--border)', fontSize:12}}>Сброс</button>}
        </div>
      )}
      {loading && <div>Загрузка…</div>}
      {error && <div className="alert error">{error}</div>}
      {progress && (
        <>
          <div className="stats">
            <div className="stat">
              <div className="value">{filteredStats.total}</div>
              <div className="label">Всего</div>
            </div>
            <div className="stat">
              <div className="value">{filteredStats.studied}</div>
              <div className="label">Изучено</div>
            </div>
            <div className="stat">
              <div className="value">{filteredStats.learned}</div>
              <div className="label">Выучено</div>
            </div>
          </div>

          <div className="progressbar" aria-label="Процент выученных (фильтрованных)">
            <div className="bar" style={{ width: `${filteredStats.percent}%` }} />
            <div className="percent">{filteredStats.percent}%</div>
          </div>

          <div className="actions">
            <button className="danger" onClick={reset}>Сбросить прогресс</button>
          </div>

          <h3>Карточки</h3>
          <div className="cards-grid">
            {filteredWords.map((w) => {
              const st = (progress.by_card as any)[w.id] || { seen: 0, correct: 0, incorrect: 0, streak: 0 }
              const learned = st.correct >= 3 && st.streak >= 2
              return (
                <div key={w.id} className={`mini-card ${learned ? 'learned' : ''}`}>
                  <div className="row">
                    <span className="pt">{w.pt}</span>
                    <span className="ru">{w.ru}</span>
                  </div>
                  <div className="row small">
                    <span>кат: {w.category || '-'}</span>
                    <span>вид: {st.seen}</span>
                    <span>✓ {st.correct}</span>
                    <span>✗ {st.incorrect}</span>
                    <span>серия: {st.streak}</span>
                  </div>
                </div>
              )
            })}
            {filteredWords.length === 0 && <div style={{opacity:.6}}>Нет карточек для выбранных категорий</div>}
          </div>
        </>
      )}
    </section>
  )
}

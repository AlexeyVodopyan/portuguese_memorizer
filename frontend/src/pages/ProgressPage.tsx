import { useEffect, useMemo, useState } from 'react'
import api, { VerbProgressSummary, VerbListItem } from '../api'

export function ProgressPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<Awaited<ReturnType<typeof api.getProgress>> | null>(null)
  const [words, setWords] = useState<Array<{ id: number; pt: string; ru: string; category?: string }>>([])
  const [allCategories, setAllCategories] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [verbProgress, setVerbProgress] = useState<VerbProgressSummary | null>(null)
  const [verbList, setVerbList] = useState<VerbListItem[]>([])
  const [showWords, setShowWords] = useState(false)
  const [showVerbList, setShowVerbList] = useState(false)

  async function load() {
    try {
      setLoading(true)
      setError(null)
      const [p, w, vp, vl] = await Promise.all([
        api.getProgress(),
        api.getWords(),
        api.getVerbProgress().catch(()=>null),
        api.getVerbList().catch(()=>[])
      ])
      setProgress(p)
      setWords(w as any)
      setVerbProgress(vp)
      setVerbList(vl as VerbListItem[])
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

  const verbPercent = useMemo(() => {
    if (!verbProgress) return 0
    return Math.round((verbProgress.mastered / Math.max(1, verbProgress.total)) * 100)
  }, [verbProgress])

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

          {/* WORD CARDS COLLAPSIBLE */}
          <div className="collapse-block">
            <button type="button" className="collapse-header" onClick={()=>setShowWords(o=>!o)} aria-expanded={showWords}>
              <span className="chevron">{showWords ? '▾' : '▸'}</span>
              <span>Карточки слов</span>
              <span className="mini-meta inline">{filteredStats.learned}/{filteredStats.total}</span>
            </button>
            {showWords && (
              <div className="collapse-body">
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
              </div>
            )}
          </div>

          {/* VERB OVERALL PROGRESS ALWAYS VISIBLE */}
          <div className="verbs-progress" style={{marginTop:32}}>
            <h3 style={{margin:'32px 0 10px'}}>Прогресс по глаголам</h3>
            {!verbProgress && <div style={{opacity:.7}}>Нет данных</div>}
            {verbProgress && (
              <>
                <div className="stats">
                  <div className="stat"><div className="value">{verbProgress.total}</div><div className="label">Всего</div></div>
                  <div className="stat"><div className="value">{verbProgress.seen}</div><div className="label">Изучено</div></div>
                  <div className="stat"><div className="value">{verbProgress.mastered}</div><div className="label">Выучено</div></div>
                </div>
                <div className="progressbar" aria-label="Процент выученных глаголов" style={{marginTop:8}}>
                  <div className="bar" style={{width: verbPercent + '%'}} />
                  <div className="percent">{verbPercent}%</div>
                </div>
              </>
            )}
          </div>

          {/* VERB LIST COLLAPSIBLE */}
          <div className="collapse-block" style={{marginTop:18}}>
            <button type="button" className="collapse-header" onClick={()=>setShowVerbList(o=>!o)} aria-expanded={showVerbList}>
              <span className="chevron">{showVerbList ? '▾' : '▸'}</span>
              <span className="title">Список глаголов</span>
              {verbProgress && <span className="mini-meta inline">{verbProgress.mastered}/{verbProgress.total}</span>}
            </button>
            {showVerbList && (
              <div className="collapse-body">
                <div className="verbs-grid" style={{marginTop:4}}>
                  {verbList.map(v => {
                    const s = verbProgress?.by_verb[v.id] || { seen:0, mastered:0 }
                    const mastered = s.mastered > 0
                    return (
                      <div key={v.id} className={"verb-mini" + (mastered? ' mastered':'')}>
                        <span className="inf">{v.infinitive}</span>
                        <span style={{fontSize:11, opacity:.8}}>вид: {s.seen} • освоено: {s.mastered}</span>
                      </div>
                    )
                  })}
                  {verbList.length === 0 && <div style={{opacity:.6}}>Нет глаголов</div>}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  )
}

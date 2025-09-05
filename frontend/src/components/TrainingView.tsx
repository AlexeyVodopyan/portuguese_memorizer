import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { Mode, Question } from '../api'

interface Props { mode: Mode }

const SESSION_SIZE = 10

type Stage = 'idle' | 'loading' | 'answering' | 'feedback' | 'finished'

export function TrainingView({ mode }: Props) {
  const [stage, setStage] = useState<Stage>('idle')
  const [question, setQuestion] = useState<Question | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string>('')
  const [result, setResult] = useState<{ correct: boolean; correct_answer: string } | null>(null)
  const [answered, setAnswered] = useState(0)
  const [correctInSession, setCorrectInSession] = useState(0)
  const [allCategories, setAllCategories] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const navigate = useNavigate()

  const title = useMemo(() => {
    switch (mode) {
      case 'pt2ru_choice': return 'Португальский → Русский (выбор)'
      case 'ru2pt_choice': return 'Русский → Португальский (выбор)'
      case 'pt2ru_input': return 'Португальский → Русский (ввод)'
      case 'ru2pt_input': return 'Русский → Португальский (ввод)'
    }
  }, [mode])

  useEffect(() => {
    // load categories once
    api.getWords().then(ws => {
      const cats = Array.from(new Set(ws.map(w => w.category).filter(Boolean))) as string[]
      setAllCategories(cats)
    }).catch(()=>{})
  }, [])

  const toggleCategory = (c: string) => {
    setSelectedCategories(prev => prev.includes(c) ? prev.filter(x=>x!==c) : [...prev, c])
  }

  async function loadQuestion() {
    try {
      setStage('loading')
      setError(null)
      setResult(null)
      setSelected('')
      const q = await api.getQuestion(mode, 4, selectedCategories.length ? selectedCategories : undefined)
      setQuestion(q)
      setStage('answering')
    } catch (e: any) {
      setError(e.message || 'Не удалось загрузить вопрос')
      setStage('idle')
    }
  }

  useEffect(() => {
    // reset session on mode change or category change
    setAnswered(0); setCorrectInSession(0); setQuestion(null); setResult(null); setStage('idle');
    loadQuestion()
  }, [mode, selectedCategories.join(',')])

  async function submit(answer: string) {
    if (!question) return
    try {
      setStage('loading')
      const r = await api.submitAnswer({ card_id: question.card_id, mode, answer })
      setResult(r)
      const newAnswered = answered + 1
      setAnswered(newAnswered)
      if (r.correct) setCorrectInSession(c => c + 1)
      if (newAnswered >= SESSION_SIZE) {
        setStage('finished')
      } else {
        setStage('feedback')
      }
    } catch (e: any) {
      setError(e.message || 'Не удалось отправить ответ')
      setStage('answering')
    }
  }

  const isChoice = mode === 'pt2ru_choice' || mode === 'ru2pt_choice'

  const restartSession = () => {
    setAnswered(0); setCorrectInSession(0); setResult(null); setQuestion(null); setStage('idle');
    loadQuestion()
  }

  return (
    <div className="train">
      <div className="card">
        <div className="card-header">
          <h2>{title}</h2>
          {stage !== 'finished' && <button className="ghost" onClick={loadQuestion} disabled={stage==='loading'}>↻ Новый</button>}
          {stage === 'finished' && <button className="ghost" onClick={restartSession}>↻ Сначала</button>}
        </div>
        {allCategories.length > 0 && (
          <div className="categories-filter" style={{display:'flex', flexWrap:'wrap', gap:6, marginBottom:12}}>
            {allCategories.map(c => {
              const active = selectedCategories.includes(c)
              return <button type="button" key={c} onClick={()=>toggleCategory(c)} className={active? 'chip active' : 'chip'} style={{padding:'2px 8px', borderRadius:12, border:'1px solid var(--border)', background: active? 'var(--accent)' : 'transparent', color: active? '#fff':'inherit', fontSize:12}}>{c}</button>
            })}
            {selectedCategories.length > 0 && <button type="button" onClick={()=>setSelectedCategories([])} className="chip" style={{padding:'2px 8px', borderRadius:12, border:'1px solid var(--border)', fontSize:12}}>Сброс</button>}
          </div>
        )}
        {stage !== 'finished' && <div style={{fontSize:12, opacity:.7}}>Карточка {Math.min(answered+1, SESSION_SIZE)} / {SESSION_SIZE}</div>}
        {error && <div className="alert error">{error}</div>}
        {stage === 'finished' && (
          <div className="session-summary">
            <h3>Сессия завершена</h3>
            <p>Правильно: <strong>{correctInSession}</strong> из {SESSION_SIZE}</p>
            <div className="actions" style={{gap:8}}>
              <button className="primary" onClick={() => navigate('/progress')}>Перейти к прогрессу</button>
              <button className="ghost" onClick={restartSession}>Новая сессия</button>
            </div>
          </div>
        )}
        {stage !== 'finished' && !question && stage==='loading' && <div>Loading…</div>}
        {stage !== 'finished' && question && (
          <div className="qa">
            <div className="prompt" aria-live="polite">{question.prompt}</div>
            {isChoice ? (
              <div className="options">
                {question.options?.map((opt: string) => {
                  const isSelected = selected === opt
                  const isCorrect = result && result.correct_answer === opt
                  const className = [
                    'option',
                    isSelected ? 'selected' : '',
                    result ? (isCorrect ? 'correct' : (isSelected ? 'wrong' : '')) : '',
                  ].join(' ')
                  return (
                    <button
                      key={opt}
                      disabled={stage !== 'answering'}
                      className={className}
                      onClick={() => { setSelected(opt); submit(opt) }}
                    >{opt}</button>
                  )
                })}
              </div>
            ) : (
              <form className="input-mode" onSubmit={(e) => { e.preventDefault(); submit(selected) }}>
                <input
                  type="text"
                  placeholder="Введите перевод"
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  disabled={stage !== 'answering'}
                  autoFocus
                />
                {stage === 'answering' && (
                  <button type="submit" className="primary" disabled={!selected.trim()}>Проверить</button>
                )}
              </form>
            )}
          </div>
        )}
        {stage !== 'finished' && stage === 'feedback' && result && (
          <div className={`alert ${result.correct ? 'success' : 'error'}`} role="status">
            {result.correct ? 'Верно! 🎉' : (
              <span>Неверно. Правильный ответ: <strong>{result.correct_answer}</strong></span>
            )}
          </div>
        )}
        {stage !== 'finished' && question && (
          <div className="actions">
            <button onClick={loadQuestion} className="primary" disabled={stage==='loading' || stage==='answering'}>
              {answered + 1 >= SESSION_SIZE ? 'Завершить' : 'Далее'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

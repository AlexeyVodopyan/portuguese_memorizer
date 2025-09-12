import { useEffect, useState } from 'react'
import api, { VerbAnswerResponse, VerbQuestion } from '../api'

interface RowState {
  key: string
  label: string
  placeholder: string
}

const PRONOUN_ROWS: RowState[] = [
  { key: 'eu', label: 'Eu', placeholder: 'я' },
  { key: 'tu', label: 'Tu', placeholder: 'ты' },
  { key: 'ele', label: 'Você / Ele / Ela', placeholder: 'он/она/вы' },
  { key: 'nos', label: 'Nós', placeholder: 'мы' },
  { key: 'eles', label: 'Vocês / Eles / Elas', placeholder: 'они/вы(pl)' },
]

export function VerbTrainingView() {
  const [question, setQuestion] = useState<VerbQuestion | null>(null)
  const [answers, setAnswers] = useState<Record<string,string>>({})
  const [result, setResult] = useState<VerbAnswerResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true); setError(null); setResult(null); setAnswers({})
    try { const q = await api.getVerbQuestion(); setQuestion(q) } catch(e:any){ setError(e.message || 'Не удалось загрузить') } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const change = (k: string, v: string) => setAnswers(a => ({ ...a, [k]: v }))

  async function submit() {
    if (!question) return
    setLoading(true); setError(null)
    try {
      const r = await api.submitVerbAnswer({ verb_id: question.verb_id, answers })
      setResult(r)
    } catch(e:any){ setError(e.message || 'Ошибка проверки') } finally { setLoading(false) }
  }

  function clearInputs(){ setAnswers({}); setResult(null) }

  const allFilled = PRONOUN_ROWS.every(r => (answers[r.key]||'').trim().length > 0)

  return (
    <div className="verb-train card-wrapper">
      <div className="card">
        <div className="card-header" style={{justifyContent:'space-between'}}>
          <h2>Спряжение глаголов</h2>
          <div style={{display:'flex', gap:8}}>
            <button onClick={load} className="ghost" disabled={loading}>↻ Случайный</button>
          </div>
        </div>
        {error && <div className="alert error" style={{marginBottom:12}}>{error}</div>}
        {question && (
          <div className="verb-table-wrapper">
            <table className="verb-table">
              <thead>
                <tr>
                  <th style={{width:180}}>Местоимение</th>
                  <th colSpan={2}>Инфинитив: <span className="verb-inf">{question.infinitive}</span></th>
                </tr>
              </thead>
              <tbody>
                {PRONOUN_ROWS.map(row => {
                  const val = answers[row.key] || ''
                  const isChecked = !!result
                  const isCorrect = result ? result.results[row.key] : undefined
                  return (
                    <tr key={row.key} className={isChecked ? (isCorrect ? 'ok' : 'bad') : ''}>
                      <td className="pronoun">{row.label}</td>
                      <td>
                        <input
                          type="text"
                          disabled={!!result || loading}
                          value={val}
                          placeholder={row.placeholder}
                          onChange={e => change(row.key, e.target.value)}
                        />
                      </td>
                      <td className="status-cell">
                        {result && (
                          isCorrect ? <span className="pill ok">✓</span> : <span className="pill bad">✗ {result.correct_forms[row.key]}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        <div style={{marginTop:16, display:'flex', gap:12}}>
          {!result && <button className="primary" disabled={!allFilled || loading} onClick={submit}>Проверить</button>}
          {!result && <button className="ghost" type="button" onClick={clearInputs} disabled={loading}>Очистить</button>}
          {result && <button className="primary" onClick={load}>Следующий глагол</button>}
        </div>
        {result && (
          <div className={"alert " + (result.all_correct ? 'success' : 'error')} style={{marginTop:16}}>
            {result.all_correct ? 'Все формы верны! Отлично!' : 'Есть ошибки. Подсказки показаны в таблице.'}
          </div>
        )}
      </div>
    </div>
  )
}

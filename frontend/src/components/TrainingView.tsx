import { useEffect, useMemo, useState } from 'react'
import api, { Mode, Question } from '../api'

interface Props { mode: Mode }

type Stage = 'idle' | 'loading' | 'answering' | 'feedback'

export function TrainingView({ mode }: Props) {
  const [stage, setStage] = useState<Stage>('idle')
  const [question, setQuestion] = useState<Question | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<string>('')
  const [result, setResult] = useState<{ correct: boolean; correct_answer: string } | null>(null)

  const title = useMemo(() => {
    switch (mode) {
      case 'pt2ru_choice': return 'Portuguese → Russian (multiple choice)'
      case 'ru2pt_choice': return 'Russian → Portuguese (multiple choice)'
      case 'pt2ru_input': return 'Portuguese → Russian (typed)'
    }
  }, [mode])

  async function loadQuestion() {
    try {
      setStage('loading')
      setError(null)
      setResult(null)
      setSelected('')
      const q = await api.getQuestion(mode, 4)
      setQuestion(q)
      setStage('answering')
    } catch (e: any) {
      setError(e.message || 'Failed to load question')
      setStage('idle')
    }
  }

  useEffect(() => { loadQuestion() }, [mode])

  async function submit(answer: string) {
    if (!question) return
    try {
      setStage('loading')
      const r = await api.submitAnswer({ card_id: question.card_id, mode, answer })
      setResult(r)
      setStage('feedback')
    } catch (e: any) {
      setError(e.message || 'Failed to submit answer')
      setStage('answering')
    }
  }

  const isChoice = mode === 'pt2ru_choice' || mode === 'ru2pt_choice'

  return (
    <div className="train">
      <div className="card">
        <div className="card-header">
          <h2>{title}</h2>
          <button className="ghost" onClick={loadQuestion} disabled={stage==='loading'}>↻ New</button>
        </div>
        {error && <div className="alert error">{error}</div>}
        {!question && stage==='loading' && <div>Loading…</div>}
        {question && (
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
                  placeholder="Type translation"
                  value={selected}
                  onChange={(e) => setSelected(e.target.value)}
                  disabled={stage !== 'answering'}
                  autoFocus
                />
                {stage === 'answering' && (
                  <button type="submit" className="primary" disabled={!selected.trim()}>Check</button>
                )}
              </form>
            )}

            {stage === 'feedback' && result && (
              <div className={`alert ${result.correct ? 'success' : 'error'}`} role="status">
                {result.correct ? 'Correct! 🎉' : (
                  <span>Wrong. Correct answer: <strong>{result.correct_answer}</strong></span>
                )}
              </div>
            )}

            <div className="actions">
              <button onClick={loadQuestion} className="primary" disabled={stage==='loading'}>
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

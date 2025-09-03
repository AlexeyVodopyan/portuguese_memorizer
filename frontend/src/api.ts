export type Mode = 'pt2ru_choice' | 'ru2pt_choice' | 'pt2ru_input'

export interface Question {
  card_id: number
  mode: Mode
  prompt: string
  options?: string[]
}

export interface AnswerResponse {
  correct: boolean
  correct_answer: string
}

export interface ProgressSummary {
  total: number
  studied: number
  learned: number
  by_card: Record<number, { seen: number; correct: number; incorrect: number; streak: number }>
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE || 'http://127.0.0.1:8000'

async function http<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export const api = {
  getQuestion: (mode: Mode, options = 4) => http<Question>(`/api/question?mode=${mode}&options=${options}`),
  submitAnswer: (payload: { card_id: number; mode: Mode; answer: string }) =>
    http<AnswerResponse>(`/api/answer`, { method: 'POST', body: JSON.stringify(payload) }),
  getProgress: () => http<ProgressSummary>(`/api/progress`),
  resetProgress: () => http<{ status: string }>(`/api/reset`, { method: 'POST' }),
  getWords: () => http<Array<{ id: number; pt: string; ru: string }>>(`/api/words`),
}

export default api


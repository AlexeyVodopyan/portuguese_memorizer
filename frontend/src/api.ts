export type Mode = 'pt2ru_choice' | 'ru2pt_choice' | 'pt2ru_input' | 'ru2pt_input'

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

let authToken: string | null = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null

function setToken(t: string | null) {
  authToken = t
  if (typeof localStorage !== 'undefined') {
    if (t) localStorage.setItem('auth_token', t)
    else localStorage.removeItem('auth_token')
  }
}

async function http<T>(path: string, opts?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`
  const res = await fetch(`${API_BASE}${path}`, { headers, ...opts })
  if (res.status === 401) {
    setToken(null)
    // soft redirect to auth page
    if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/auth')) {
      window.location.href = '/auth'
    }
    throw new Error('Unauthorized')
  }
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

const api = {
  // Auth
  register: async (username: string, password: string) => {
    const data = await http<{ token: string; expires_at: number }>(`/api/auth/register`, { method: 'POST', body: JSON.stringify({ username, password }) })
    setToken(data.token)
    return data
  },
  login: async (username: string, password: string) => {
    const data = await http<{ token: string; expires_at: number }>(`/api/auth/login`, { method: 'POST', body: JSON.stringify({ username, password }) })
    setToken(data.token)
    return data
  },
  me: () => http<{ username: string }>(`/api/auth/me`),
  logout: () => { setToken(null) },
  // Training
  getQuestion: (mode: Mode, options = 4) => http<Question>(`/api/question?mode=${mode}&options=${options}`),
  submitAnswer: (payload: { card_id: number; mode: Mode; answer: string }) =>
    http<AnswerResponse>(`/api/answer`, { method: 'POST', body: JSON.stringify(payload) }),
  getProgress: () => http<ProgressSummary>(`/api/progress`),
  resetProgress: () => http<{ status: string }>(`/api/reset`, { method: 'POST' }),
  getWords: () => http<Array<{ id: number; pt: string; ru: string }>>(`/api/words`),
  getToken: () => authToken,
}

export { setToken }
export default api

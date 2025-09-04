import { useState } from 'react'
import api from '../api'

export function AuthPage() {
  const [mode, setMode] = useState<'login'|'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!username || !password) { setError('Заполните все поля'); return }
    setLoading(true)
    try {
      if (mode === 'login') await api.login(username, password)
      else await api.register(username, password)
      // reload to refresh header state
      window.location.href = '/'
    } catch (err: any) {
      setError(err.message || 'Ошибка')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-panel">
        <h1>{mode === 'login' ? 'Вход' : 'Регистрация'}</h1>
        <form onSubmit={submit} className="auth-form">
          <label>
            <span>Имя пользователя</span>
            <input autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} />
          </label>
          <label>
            <span>Пароль</span>
            <input type="password" autoComplete={mode==='login'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)} />
          </label>
          {error && <div className="alert error" style={{marginTop:8}}>{error}</div>}
          <button disabled={loading} className="primary" style={{marginTop:12, width:'100%'}}>{loading ? '...' : (mode==='login'?'Войти':'Создать аккаунт')}</button>
        </form>
        <div className="switch-mode">
          {mode==='login' ? (
            <button type="button" className="ghost" onClick={()=>{setMode('register'); setError(null)}}>Нужна учетная запись? Регистрация</button>
          ) : (
            <button type="button" className="ghost" onClick={()=>{setMode('login'); setError(null)}}>Уже есть аккаунт? Войти</button>
          )}
        </div>
      </div>
    </div>
  )
}
export default AuthPage

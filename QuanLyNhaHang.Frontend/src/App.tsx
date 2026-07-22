import { FormEvent, useState } from 'react'
import { login, type LoginResult } from './api/auth'

export default function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<LoginResult | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const loginResult = await login({ email, password })
      if (loginResult.token) {
        sessionStorage.setItem('accessToken', loginResult.token)
      }
      if (loginResult.refreshToken) {
        localStorage.setItem('refreshToken', loginResult.refreshToken)
      }
      setResult(loginResult)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Đã xảy ra lỗi không xác định.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="app-shell">
      <section className="brand-panel">
        <span className="eyebrow">RESTAURANT OPERATIONS</span>
        <h1>Quản lý nhà hàng rõ ràng, nhanh chóng và đồng bộ.</h1>
        <p>Giao diện quản trị React kết nối trực tiếp với ASP.NET Core API hiện tại.</p>
        <div className="status-card">
          <span className="status-dot" />
          Backend sẵn sàng cho frontend tại cổng 5173
        </div>
      </section>

      <section className="login-panel">
        <form className="login-card" onSubmit={handleSubmit}>
          <div>
            <span className="eyebrow">ADMIN PORTAL</span>
            <h2>Đăng nhập hệ thống</h2>
            <p>Sử dụng tài khoản đã có trong backend.</p>
          </div>

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@example.com"
              autoComplete="email"
              required
            />
          </label>

          <label>
            Mật khẩu
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Nhập mật khẩu"
              autoComplete="current-password"
              required
            />
          </label>

          {error && <div className="alert error">{error}</div>}
          {result && (
            <div className="alert success">
              {result.requiresTwoFactor
                ? 'Tài khoản yêu cầu xác thực hai yếu tố.'
                : `${result.message ?? 'Đăng nhập thành công.'}${result.role ? ` Vai trò: ${result.role}.` : ''}`}
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>

          <small>API: {import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7134'}</small>
        </form>
      </section>
    </main>
  )
}

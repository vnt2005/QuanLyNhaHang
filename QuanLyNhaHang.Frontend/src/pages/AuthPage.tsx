import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  forgotPassword,
  login,
  register,
  resendVerificationEmail,
  resetPassword,
  verifyEmail,
  verifyTwoFactor,
  type LoginResult,
} from '../api/auth'

type AuthMode =
  | 'login'
  | 'register'
  | 'registration-complete'
  | 'two-factor'
  | 'verify-email'
  | 'forgot-password'
  | 'reset-password'

type AuthPageProps = {
  initialMessage?: string
  onAuthenticated: (
    result: LoginResult,
  ) => Promise<string | void> | string | void
}

const modeContent: Record<AuthMode, {
  eyebrow: string
  title: string
  description: string
}> = {
  login: {
    eyebrow: 'ADMIN PORTAL',
    title: 'Đăng nhập hệ thống',
    description: 'Sử dụng tài khoản nhân viên đã được cấp để tiếp tục.',
  },
  register: {
    eyebrow: 'CUSTOMER ACCOUNT',
    title: 'Đăng ký tài khoản',
    description: 'Tạo tài khoản Customer để sử dụng dịch vụ dành cho khách hàng.',
  },
  'registration-complete': {
    eyebrow: 'ĐĂNG KÝ HOÀN TẤT',
    title: 'Email đã được xác minh',
    description: 'Tài khoản khách hàng của bạn đã sẵn sàng sử dụng.',
  },
  'two-factor': {
    eyebrow: 'XÁC THỰC 2 BƯỚC',
    title: 'Nhập mã đăng nhập',
    description: 'Mã gồm 6 chữ số đã được gửi tới email của bạn.',
  },
  'verify-email': {
    eyebrow: 'XÁC MINH EMAIL',
    title: 'Xác minh tài khoản',
    description: 'Nhập mã xác minh trong email để kích hoạt đăng nhập.',
  },
  'forgot-password': {
    eyebrow: 'KHÔI PHỤC TÀI KHOẢN',
    title: 'Quên mật khẩu',
    description: 'Nhập email để nhận mã đặt lại mật khẩu.',
  },
  'reset-password': {
    eyebrow: 'MẬT KHẨU MỚI',
    title: 'Đặt lại mật khẩu',
    description: 'Nhập mã trong email và tạo mật khẩu mới cho tài khoản.',
  },
}

function getErrorMessage(exception: unknown) {
  return exception instanceof Error
    ? exception.message
    : 'Đã xảy ra lỗi không xác định.'
}

function isUnverifiedEmailMessage(message: string) {
  const normalized = message.toLocaleLowerCase('vi')
  return normalized.includes('email chưa được xác minh')
    || normalized.includes('email chưa xác minh')
}

export default function AuthPage({
  initialMessage = '',
  onAuthenticated,
}: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [ho, setHo] = useState('')
  const [ten, setTen] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState(initialMessage)
  const [verificationFromRegistration, setVerificationFromRegistration] =
    useState(false)
  const content = useMemo(() => modeContent[mode], [mode])

  useEffect(() => {
    if (initialMessage) setMessage(initialMessage)
  }, [initialMessage])

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode)
    setError('')
    setMessage('')
    setCode('')
    setPassword('')
    setConfirmPassword('')
    if (nextMode !== 'verify-email') {
      setVerificationFromRegistration(false)
    }
  }

  async function completeAuthentication(result: LoginResult) {
    const rejection = await onAuthenticated(result)
    if (rejection) {
      setError(rejection)
      return
    }
    setPassword('')
    setCode('')
  }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const result = await login({ email, password })
      if (result.requiresTwoFactor) {
        setMode('two-factor')
        setMessage(
          result.message
            ?? 'Vui lòng kiểm tra email để lấy mã xác thực.',
        )
        return
      }
      await completeAuthentication(result)
    } catch (exception) {
      const errorMessage = getErrorMessage(exception)
      if (isUnverifiedEmailMessage(errorMessage)) {
        setMode('verify-email')
        setVerificationFromRegistration(false)
        setMessage(
          'Email chưa được xác minh. Nhập mã đã nhận hoặc yêu cầu gửi mã mới.',
        )
      } else {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!ten.trim()) {
      setError('Vui lòng nhập tên khách hàng.')
      return
    }
    if (!phoneNumber.trim()) {
      setError('Vui lòng nhập số điện thoại.')
      return
    }
    if (password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự.')
      return
    }
    if (password !== confirmPassword) {
      setError('Xác nhận mật khẩu không khớp.')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')
    try {
      const result = await register({
        ho,
        ten,
        email,
        phoneNumber,
        password,
      })
      setEmail(result.email ?? email.trim().toLowerCase())
      setPassword('')
      setConfirmPassword('')
      setCode('')
      setVerificationFromRegistration(true)
      setMode('verify-email')
      setMessage(
        result.message
          ?? 'Đăng ký thành công. Vui lòng kiểm tra email để xác minh tài khoản.',
      )
    } catch (exception) {
      setError(getErrorMessage(exception))
    } finally {
      setLoading(false)
    }
  }

  async function submitTwoFactor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (code.trim().length !== 6) {
      setError('Mã xác thực phải gồm 6 chữ số.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await verifyTwoFactor(email, code)
      await completeAuthentication(result)
    } catch (exception) {
      setError(getErrorMessage(exception))
    } finally {
      setLoading(false)
    }
  }

  async function resendTwoFactorCode() {
    if (!email.trim() || !password) {
      setError('Vui lòng quay lại đăng nhập để yêu cầu mã mới.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await login({ email, password })
      setMessage(
        result.message
          ?? 'Mã xác thực mới đã được gửi tới email của bạn.',
      )
      setCode('')
    } catch (exception) {
      setError(getErrorMessage(exception))
    } finally {
      setLoading(false)
    }
  }

  async function submitVerifyEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.trim() || !code.trim()) {
      setError('Vui lòng nhập email và mã xác minh.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const resultMessage = await verifyEmail(email, code)
      setCode('')
      if (verificationFromRegistration) {
        setMode('registration-complete')
        setMessage(resultMessage)
      } else {
        setMode('login')
        setMessage(`${resultMessage} Bạn có thể đăng nhập ngay.`)
      }
    } catch (exception) {
      setError(getErrorMessage(exception))
    } finally {
      setLoading(false)
    }
  }

  async function resendEmailVerification() {
    if (!email.trim()) {
      setError('Vui lòng nhập email cần xác minh.')
      return
    }
    setLoading(true)
    setError('')
    try {
      setMessage(await resendVerificationEmail(email))
      setCode('')
    } catch (exception) {
      setError(getErrorMessage(exception))
    } finally {
      setLoading(false)
    }
  }

  async function submitForgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!email.trim()) {
      setError('Vui lòng nhập email của tài khoản.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const resultMessage = await forgotPassword(email)
      setMode('reset-password')
      setMessage(resultMessage)
    } catch (exception) {
      setError(getErrorMessage(exception))
    } finally {
      setLoading(false)
    }
  }

  async function submitResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (code.trim().length !== 6) {
      setError('Mã đặt lại mật khẩu phải gồm 6 chữ số.')
      return
    }
    if (password.length < 8) {
      setError('Mật khẩu mới phải có ít nhất 8 ký tự.')
      return
    }
    if (password !== confirmPassword) {
      setError('Xác nhận mật khẩu mới không khớp.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const resultMessage = await resetPassword({
        email,
        code,
        newPassword: password,
      })
      setMode('login')
      setCode('')
      setPassword('')
      setConfirmPassword('')
      setMessage(`${resultMessage} Vui lòng đăng nhập lại.`)
    } catch (exception) {
      setError(getErrorMessage(exception))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-brand-panel">
        <div className="auth-brand-copy">
          <span className="auth-eyebrow">RESTAURANT OPERATIONS</span>
          <h1>Quản lý nhà hàng rõ ràng, nhanh chóng và an toàn.</h1>
          <p>
            Giao diện quản trị React kết nối trực tiếp với ASP.NET Core API,
            đồng bộ dữ liệu vận hành theo thời gian thực.
          </p>
        </div>
        <div className="auth-security-points">
          <article>
            <span>✓</span>
            <div>
              <strong>Phiên đăng nhập bảo mật</strong>
              <small>Refresh token được xoay vòng và có thể thu hồi.</small>
            </div>
          </article>
          <article>
            <span>✓</span>
            <div>
              <strong>Xác thực hai yếu tố</strong>
              <small>Mã đăng nhập một lần được gửi qua email.</small>
            </div>
          </article>
          <article>
            <span>✓</span>
            <div>
              <strong>Phân quyền theo vai trò</strong>
              <small>Mỗi tài khoản chỉ thấy và dùng đúng chức năng được cấp.</small>
            </div>
          </article>
        </div>
        <div className="auth-backend-status">
          <span/>
          <div>
            <strong>Backend sẵn sàng</strong>
            <small>Kết nối bảo mật tới API tại cổng 7134</small>
          </div>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-card">
          {mode !== 'login' && mode !== 'registration-complete' && (
            <button
              type="button"
              className="auth-back-button"
              onClick={() => changeMode('login')}
              disabled={loading}
            >
              ← Quay lại đăng nhập
            </button>
          )}

          <header>
            <span className="auth-eyebrow">{content.eyebrow}</span>
            <h2>{content.title}</h2>
            <p>{content.description}</p>
          </header>

          {message && <div className="auth-alert success">{message}</div>}
          {error && <div className="auth-alert error">{error}</div>}

          {mode === 'login' && (
            <form onSubmit={submitLogin}>
              <label>
                Email
                <input
                  type="email"
                  autoComplete="username"
                  placeholder="admin@nhahang.vn"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  required
                  autoFocus
                />
              </label>
              <label>
                Mật khẩu
                <input
                  type="password"
                  autoComplete="current-password"
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  required
                />
              </label>
              <button className="auth-link" type="button" onClick={() => changeMode('forgot-password')}>
                Quên mật khẩu?
              </button>
              <button className="auth-submit" disabled={loading}>
                {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
              </button>
              <div className="auth-register-prompt">
                <span>Bạn là khách hàng mới?</span>
                <button
                  type="button"
                  onClick={() => changeMode('register')}
                >
                  Tạo tài khoản khách hàng
                </button>
              </div>
            </form>
          )}

          {mode === 'register' && (
            <form onSubmit={submitRegistration}>
              <div className="auth-register-note">
                <span>i</span>
                <div>
                  <strong>Đăng ký dành riêng cho khách hàng</strong>
                  <small>
                    Tài khoản nhân viên do Admin tạo và không đăng ký tại đây.
                  </small>
                </div>
              </div>
              <div className="auth-form-grid">
                <label>
                  Họ <small>(không bắt buộc)</small>
                  <input
                    type="text"
                    autoComplete="family-name"
                    value={ho}
                    onChange={event => setHo(event.target.value)}
                    autoFocus
                  />
                </label>
                <label>
                  Tên
                  <input
                    type="text"
                    autoComplete="given-name"
                    value={ten}
                    onChange={event => setTen(event.target.value)}
                    required
                  />
                </label>
              </div>
              <label>
                Email
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="khachhang@example.com"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  required
                />
              </label>
              <label>
                Số điện thoại
                <input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="Nhập số điện thoại"
                  value={phoneNumber}
                  onChange={event => setPhoneNumber(event.target.value)}
                  required
                />
              </label>
              <div className="auth-form-grid">
                <label>
                  Mật khẩu
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    required
                  />
                </label>
                <label>
                  Xác nhận mật khẩu
                  <input
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    value={confirmPassword}
                    onChange={event => setConfirmPassword(event.target.value)}
                    required
                  />
                </label>
              </div>
              <button className="auth-submit" disabled={loading}>
                {loading ? 'Đang tạo tài khoản…' : 'Đăng ký và nhận mã'}
              </button>
              <small className="auth-hint">
                Hệ thống không tạo phiên đăng nhập cho tới khi email được xác minh.
              </small>
            </form>
          )}

          {mode === 'registration-complete' && (
            <div className="auth-registration-complete">
              <span>✓</span>
              <strong>Tài khoản Customer đã được kích hoạt</strong>
              <p>
                {email} đã xác minh thành công. Tài khoản này dùng cho dịch vụ
                khách hàng và không có quyền truy cập Admin Portal.
              </p>
              <button
                type="button"
                className="auth-secondary"
                onClick={() => changeMode('login')}
              >
                Quay lại đăng nhập nhân viên
              </button>
            </div>
          )}

          {mode === 'two-factor' && (
            <form onSubmit={submitTwoFactor}>
              <div className="auth-email-chip">
                <span>@</span>
                <div>
                  <small>Mã được gửi tới</small>
                  <strong>{email}</strong>
                </div>
              </div>
              <label>
                Mã xác thực 6 chữ số
                <input
                  className="auth-code-input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  pattern="[0-9]{6}"
                  placeholder="000000"
                  value={code}
                  onChange={event => setCode(
                    event.target.value.replace(/\D/g, '').slice(0, 6),
                  )}
                  required
                  autoFocus
                />
              </label>
              <button className="auth-submit" disabled={loading}>
                {loading ? 'Đang xác thực…' : 'Xác thực và đăng nhập'}
              </button>
              <button
                className="auth-secondary"
                type="button"
                onClick={() => void resendTwoFactorCode()}
                disabled={loading}
              >
                Gửi mã mới
              </button>
              <small className="auth-hint">
                Mã có hiệu lực trong 5 phút. Không chia sẻ mã này với người khác.
              </small>
            </form>
          )}

          {mode === 'verify-email' && (
            <form onSubmit={submitVerifyEmail}>
              <label>
                Email cần xác minh
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  required
                  autoFocus={!email}
                />
              </label>
              <label>
                Mã xác minh
                <input
                  className="auth-code-input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={event => setCode(
                    event.target.value.replace(/\D/g, '').slice(0, 6),
                  )}
                  required
                  autoFocus={Boolean(email)}
                />
              </label>
              <button className="auth-submit" disabled={loading}>
                {loading ? 'Đang xác minh…' : 'Xác minh email'}
              </button>
              <button
                className="auth-secondary"
                type="button"
                onClick={() => void resendEmailVerification()}
                disabled={loading}
              >
                Gửi lại mã xác minh
              </button>
              <small className="auth-hint">
                Mã có hiệu lực trong 10 phút. Sau 5 lần nhập sai, yêu cầu xác
                minh sẽ bị khóa 15 phút.
              </small>
            </form>
          )}

          {mode === 'forgot-password' && (
            <form onSubmit={submitForgotPassword}>
              <label>
                Email tài khoản
                <input
                  type="email"
                  autoComplete="email"
                  placeholder="admin@nhahang.vn"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  required
                  autoFocus
                />
              </label>
              <button className="auth-submit" disabled={loading}>
                {loading ? 'Đang gửi mã…' : 'Gửi mã đặt lại mật khẩu'}
              </button>
              <small className="auth-hint">
                Vì lý do bảo mật, hệ thống không tiết lộ email có tồn tại hay không.
              </small>
            </form>
          )}

          {mode === 'reset-password' && (
            <form onSubmit={submitResetPassword}>
              <div className="auth-email-chip">
                <span>@</span>
                <div>
                  <small>Đặt lại mật khẩu cho</small>
                  <strong>{email}</strong>
                </div>
              </div>
              <label>
                Mã đặt lại mật khẩu
                <input
                  className="auth-code-input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={event => setCode(
                    event.target.value.replace(/\D/g, '').slice(0, 6),
                  )}
                  required
                  autoFocus
                />
              </label>
              <label>
                Mật khẩu mới
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  required
                />
              </label>
              <label>
                Xác nhận mật khẩu mới
                <input
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={confirmPassword}
                  onChange={event => setConfirmPassword(event.target.value)}
                  required
                />
              </label>
              <button className="auth-submit" disabled={loading}>
                {loading ? 'Đang cập nhật…' : 'Đặt lại mật khẩu'}
              </button>
            </form>
          )}

          <footer>
            <span>◈</span>
            Kết nối được mã hóa · Không lưu mật khẩu trên trình duyệt
          </footer>
        </div>
      </section>
    </main>
  )
}

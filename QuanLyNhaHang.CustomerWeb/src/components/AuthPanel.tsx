import { ArrowLeft, Eye, EyeOff, KeyRound, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import {
  forgotCustomerPassword,
  loginCustomer,
  registerCustomer,
  resendCustomerVerification,
  resetCustomerPassword,
  verifyCustomerEmail,
  verifyCustomerTwoFactor,
  type CustomerSession,
} from '../api/customerAuth'

type Mode = 'login' | 'register' | 'verify' | 'twoFactor' | 'forgot' | 'reset'

export default function AuthPanel({
  initialMessage = '',
  onAuthenticated,
}: {
  initialMessage?: string
  onAuthenticated: (session: CustomerSession) => void
}) {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [ho, setHo] = useState('')
  const [ten, setTen] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [code, setCode] = useState('')
  const [message, setMessage] = useState(initialMessage)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function move(next: Mode, nextMessage = '') {
    setMode(next)
    setCode('')
    setError('')
    setMessage(nextMessage)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    setMessage('')

    try {
      if (mode === 'login') {
        const result = await loginCustomer(email, password)
        if (result.kind === 'authenticated') {
          onAuthenticated(result.session)
          return
        }
        move(result.kind === 'two-factor' ? 'twoFactor' : 'verify', result.message)
      } else if (mode === 'register') {
        const result = await registerCustomer({ ho, ten, email, phoneNumber, password })
        setEmail(result.email)
        move('verify', result.message)
      } else if (mode === 'verify') {
        const result = await verifyCustomerEmail(email, code)
        move('login', `${result} Bạn có thể đăng nhập ngay.`)
      } else if (mode === 'twoFactor') {
        const result = await verifyCustomerTwoFactor(email, code)
        if (result.kind !== 'authenticated') {
          setMessage(result.message)
          return
        }
        onAuthenticated(result.session)
      } else if (mode === 'forgot') {
        const result = await forgotCustomerPassword(email)
        move('reset', result)
      } else {
        const result = await resetCustomerPassword(email, code, password)
        move('login', `${result} Vui lòng đăng nhập lại.`)
      }
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không thể hoàn tất yêu cầu.')
    } finally {
      setBusy(false)
    }
  }

  const titles: Record<Mode, { title: string; description: string }> = {
    login: {
      title: 'Chào mừng bạn trở lại',
      description: 'Đăng nhập để xem lịch sử đơn và quản lý tài khoản.',
    },
    register: {
      title: 'Tạo tài khoản khách hàng',
      description: 'Lưu đơn hàng và theo dõi trải nghiệm của bạn thuận tiện hơn.',
    },
    verify: {
      title: 'Xác minh email',
      description: `Nhập mã đã gửi đến ${email || 'email của bạn'}.`,
    },
    twoFactor: {
      title: 'Xác thực đăng nhập',
      description: `Nhập mã bảo mật đã gửi đến ${email || 'email của bạn'}.`,
    },
    forgot: {
      title: 'Quên mật khẩu',
      description: 'Nhập email để nhận mã đặt lại mật khẩu.',
    },
    reset: {
      title: 'Đặt lại mật khẩu',
      description: 'Nhập mã trong email và mật khẩu mới của bạn.',
    },
  }

  const content = titles[mode]
  const submitLabel = {
    login: 'Đăng nhập',
    register: 'Tạo tài khoản',
    verify: 'Xác minh email',
    twoFactor: 'Xác thực',
    forgot: 'Gửi mã đặt lại',
    reset: 'Đổi mật khẩu',
  }[mode]

  return (
    <section className="auth-panel">
      <div className="auth-icon" aria-hidden="true">
        {mode === 'login' || mode === 'register' ? <UserRound /> : mode === 'forgot' || mode === 'reset' ? <KeyRound /> : <ShieldCheck />}
      </div>
      <h1>{content.title}</h1>
      <p className="auth-intro">{content.description}</p>
      {message ? <div className="form-notice success">{message}</div> : null}
      {error ? <div className="form-notice error" role="alert">{error}</div> : null}

      <form onSubmit={submit}>
        {mode === 'register' ? (
          <div className="form-row">
            <label>Họ<input value={ho} onChange={event => setHo(event.target.value)} autoComplete="family-name" /></label>
            <label>Tên *<input value={ten} onChange={event => setTen(event.target.value)} required autoComplete="given-name" /></label>
          </div>
        ) : null}

        {mode === 'login' || mode === 'register' || mode === 'forgot' ? (
          <label>
            Email *
            <span className="input-with-icon"><Mail aria-hidden="true" /><input type="email" value={email} onChange={event => setEmail(event.target.value)} required autoComplete="email" /></span>
          </label>
        ) : null}

        {mode === 'register' ? (
          <label>Số điện thoại *<input type="tel" value={phoneNumber} onChange={event => setPhoneNumber(event.target.value)} required autoComplete="tel" /></label>
        ) : null}

        {mode === 'verify' || mode === 'twoFactor' || mode === 'reset' ? (
          <label>Mã xác thực *<input className="code-input" inputMode="numeric" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} required minLength={6} maxLength={6} autoComplete="one-time-code" /></label>
        ) : null}

        {mode === 'login' || mode === 'register' || mode === 'reset' ? (
          <label>
            {mode === 'reset' ? 'Mật khẩu mới *' : 'Mật khẩu *'}
            <span className="password-input">
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
              <button type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{showPassword ? <EyeOff /> : <Eye />}</button>
            </span>
          </label>
        ) : null}

        {mode === 'login' ? <button className="text-action align-right" type="button" onClick={() => move('forgot')}>Quên mật khẩu?</button> : null}
        <button className="primary-button full" disabled={busy}>{busy ? 'Đang xử lý…' : submitLabel}</button>
      </form>

      {mode === 'verify' ? (
        <button className="text-action" type="button" disabled={busy} onClick={() => {
          setBusy(true)
          void resendCustomerVerification(email)
            .then(setMessage)
            .catch(exception => setError(exception instanceof Error ? exception.message : 'Không gửi lại được mã.'))
            .finally(() => setBusy(false))
        }}>Gửi lại mã xác minh</button>
      ) : null}

      {mode === 'login' ? (
        <p className="auth-switch">Chưa có tài khoản? <button type="button" onClick={() => move('register')}>Đăng ký ngay</button></p>
      ) : (
        <button className="auth-back" type="button" onClick={() => move('login')}><ArrowLeft /> Quay lại đăng nhập</button>
      )}
    </section>
  )
}

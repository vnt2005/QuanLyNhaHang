import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from 'lucide-react'
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
  onClose,
}: {
  initialMessage?: string
  onAuthenticated: (session: CustomerSession) => void
  onClose?: () => void
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
    setPassword('')
    setShowPassword(false)
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
      title: 'Đăng nhập tài khoản',
      description: 'Theo dõi đơn hàng và quản lý tài khoản khách hàng thuận tiện hơn.',
    },
    register: {
      title: 'Đăng ký thành viên',
      description: 'Tạo tài khoản để lưu đơn và theo dõi những lần ghé nhà hàng.',
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
      description: 'Nhập mã trong email và tạo mật khẩu mới cho tài khoản.',
    },
  }

  const content = titles[mode]
  const submitLabel = {
    login: 'Đăng nhập ngay',
    register: 'Tạo tài khoản',
    verify: 'Xác minh email',
    twoFactor: 'Xác thực đăng nhập',
    forgot: 'Gửi mã đặt lại',
    reset: 'Đổi mật khẩu',
  }[mode]
  const showAuthTabs = mode === 'login' || mode === 'register'

  return (
    <section className={`auth-panel auth-dialog mode-${mode}`}>
      <header className="auth-dialog-header">
        {onClose ? <button className="auth-dialog-close" type="button" onClick={onClose} aria-label="Đóng đăng nhập"><X /></button> : null}
        <span className="auth-dialog-mark" aria-hidden="true">
          {mode === 'login' || mode === 'register' ? <Sparkles /> : mode === 'forgot' || mode === 'reset' ? <KeyRound /> : <ShieldCheck />}
        </span>
        <h1>{content.title}</h1>
        <p>{content.description}</p>

        {showAuthTabs ? (
          <div className="auth-mode-tabs" role="tablist" aria-label="Chọn đăng nhập hoặc đăng ký">
            <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'active' : ''} disabled={busy} onClick={() => move('login')}>Đăng nhập</button>
            <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'active' : ''} disabled={busy} onClick={() => move('register')}>Đăng ký</button>
          </div>
        ) : null}
      </header>

      <div className="auth-dialog-body">
        {message ? <div className="form-notice success">{message}</div> : null}
        {error ? <div className="form-notice error" role="alert">{error}</div> : null}

        <form onSubmit={submit}>
          {mode === 'register' ? (
            <div className="auth-name-row">
              <label>
                Họ
                <span className="auth-input-shell"><UserRound aria-hidden="true" /><input value={ho} onChange={event => setHo(event.target.value)} autoComplete="family-name" placeholder="Họ" /></span>
              </label>
              <label>
                Tên *
                <span className="auth-input-shell"><UserRound aria-hidden="true" /><input value={ten} onChange={event => setTen(event.target.value)} required autoComplete="given-name" placeholder="Tên" /></span>
              </label>
            </div>
          ) : null}

          {mode === 'login' || mode === 'register' || mode === 'forgot' ? (
            <label>
              Email *
              <span className="auth-input-shell"><Mail aria-hidden="true" /><input type="email" value={email} onChange={event => setEmail(event.target.value)} required autoComplete="email" placeholder="email@example.com" /></span>
            </label>
          ) : null}

          {mode === 'register' ? (
            <label>
              Số điện thoại *
              <span className="auth-input-shell"><Phone aria-hidden="true" /><input type="tel" value={phoneNumber} onChange={event => setPhoneNumber(event.target.value)} required autoComplete="tel" placeholder="0912 345 678" /></span>
            </label>
          ) : null}

          {mode === 'verify' || mode === 'twoFactor' || mode === 'reset' ? (
            <label>
              Mã xác thực *
              <span className="auth-input-shell auth-code-shell"><ShieldCheck aria-hidden="true" /><input className="code-input" inputMode="numeric" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} required minLength={6} maxLength={6} autoComplete="one-time-code" placeholder="000000" /></span>
            </label>
          ) : null}

          {mode === 'login' || mode === 'register' || mode === 'reset' ? (
            <label>
              <span className="auth-label-row">
                <span>{mode === 'reset' ? 'Mật khẩu mới *' : 'Mật khẩu *'}</span>
                {mode === 'login' ? <button className="auth-forgot-link" type="button" onClick={() => move('forgot')}>Quên mật khẩu?</button> : null}
              </span>
              <span className="auth-input-shell auth-password-shell">
                <KeyRound aria-hidden="true" />
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={mode === 'login' ? 'Nhập mật khẩu' : 'Tối thiểu 8 ký tự'} />
                <button className="auth-password-toggle" type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{showPassword ? <EyeOff /> : <Eye />}</button>
              </span>
            </label>
          ) : null}

          <button className="primary-button full auth-submit-button" disabled={busy}>{busy ? 'Đang xử lý…' : submitLabel}</button>
        </form>

        {mode === 'verify' ? (
          <button className="auth-resend-button" type="button" disabled={busy} onClick={() => {
            setBusy(true)
            setError('')
            void resendCustomerVerification(email)
              .then(setMessage)
              .catch(exception => setError(exception instanceof Error ? exception.message : 'Không gửi lại được mã.'))
              .finally(() => setBusy(false))
          }}>Gửi lại mã xác minh</button>
        ) : null}

        {!showAuthTabs ? (
          <button className="auth-back" type="button" onClick={() => move('login')}><ArrowLeft /> Quay lại đăng nhập</button>
        ) : null}
      </div>
    </section>
  )
}

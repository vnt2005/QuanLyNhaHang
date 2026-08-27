import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import {
  changeCustomerPassword,
  forgotCustomerPassword,
  loginCustomer,
  registerCustomer,
  resendCustomerVerification,
  resetCustomerPassword,
  verifyCustomerEmail,
  verifyCustomerTwoFactor,
  type CustomerSession,
} from '../../services/customerAuth'

type AuthMode =
  | 'login'
  | 'register'
  | 'verify-email'
  | 'two-factor'
  | 'forgot-password'
  | 'reset-password'

type CustomerAccountViewProps = {
  session: CustomerSession | null
  sessionLoading: boolean
  initialMessage?: string
  onAuthenticated: (session: CustomerSession) => void
  onSessionEnded: (message?: string) => void
  onShowMenu: () => void
  onShowOrder: () => void
  onLogout: () => Promise<void>
}

type IconProps = {
  children: ReactNode
  viewBox?: string
}

function Icon({ children, viewBox = '0 0 24 24' }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

const BackIcon = () => <Icon><path d="m15 18-6-6 6-6" /></Icon>
const EyeIcon = ({ hidden }: { hidden: boolean }) => hidden
  ? <Icon><path d="M3 3l18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.2A10.5 10.5 0 0 1 12 4c5.5 0 9 8 9 8a16 16 0 0 1-2.3 3.5M6.4 6.5C4.2 8.1 3 12 3 12s3.5 8 9 8a9.8 9.8 0 0 0 4-.8" /></Icon>
  : <Icon><path d="M3 12s3.5-8 9-8 9 8 9 8-3.5 8-9 8-9-8-9-8Z" /><circle cx="12" cy="12" r="2.5" /></Icon>
const UserIcon = () => <Icon><circle cx="12" cy="8" r="3.5" /><path d="M5 21a7 7 0 0 1 14 0" /></Icon>
const ReceiptIcon = () => <Icon><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" /><path d="M9 8h6M9 12h6" /></Icon>
const GiftIcon = () => <Icon><path d="M4 10h16v10H4zM3 6h18v4H3zM12 6v14M12 6H8.5a2 2 0 1 1 0-4C11 2 12 6 12 6Zm0 0h3.5a2 2 0 1 0 0-4C13 2 12 6 12 6Z" /></Icon>
const ShieldIcon = () => <Icon><path d="M12 3 5 6v5c0 4.7 3 8 7 10 4-2 7-5.3 7-10V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></Icon>
const ChevronIcon = () => <Icon><path d="m9 18 6-6-6-6" /></Icon>
const LogoutIcon = () => <Icon><path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" /></Icon>
const CheckIcon = () => <Icon><path d="m5 12 4 4L19 6" /></Icon>

function CustomerBrand() {
  return (
    <div className="customer-auth-brand" aria-label="Nhà Hàng">
      <span>NH</span>
      <strong>Nhà Hàng</strong>
    </div>
  )
}

function getErrorMessage(exception: unknown) {
  return exception instanceof Error
    ? exception.message
    : 'Đã xảy ra lỗi. Vui lòng thử lại.'
}

function isUnverifiedEmailMessage(message: string) {
  const normalized = message.toLocaleLowerCase('vi')
  return normalized.includes('email chưa được xác minh')
    || normalized.includes('email chưa xác minh')
}

function CodeInput({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (value: string) => void
  label: string
}) {
  const inputs = useRef<Array<HTMLInputElement | null>>([])
  const digits = Array.from({ length: 6 }, (_, index) => value[index] ?? '')

  function setDigit(index: number, rawValue: string) {
    const nextDigit = rawValue.replace(/\D/g, '').slice(-1)
    const nextValue = [...digits]
    if (!nextDigit) {
      nextValue.splice(index, 1)
      onChange(nextValue.join(''))
    } else {
      nextValue[index] = nextDigit
      onChange(nextValue.join('').slice(0, 6))
    }
    if (nextDigit && index < 5) inputs.current[index + 1]?.focus()
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus()
    }
    if (event.key === 'ArrowLeft' && index > 0) inputs.current[index - 1]?.focus()
    if (event.key === 'ArrowRight' && index < 5) inputs.current[index + 1]?.focus()
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    event.preventDefault()
    onChange(pasted)
    inputs.current[Math.min(pasted.length, 6) - 1]?.focus()
  }

  return (
    <div className="customer-code-field">
      <span>{label}</span>
      <div className="customer-code-inputs" onPaste={handlePaste}>
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={element => { inputs.current[index] = element }}
            aria-label={`${label}, số thứ ${index + 1}`}
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={event => setDigit(index, event.target.value)}
            onKeyDown={event => handleKeyDown(index, event)}
            required
          />
        ))}
      </div>
    </div>
  )
}

function PasswordField({
  label,
  value,
  autoComplete,
  placeholder,
  onChange,
}: {
  label: string
  value: string
  autoComplete: string
  placeholder?: string
  onChange: (value: string) => void
}) {
  const [visible, setVisible] = useState(false)
  return (
    <label className="customer-auth-field">
      <span>{label}</span>
      <div className="customer-password-field">
        <input
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          minLength={8}
          maxLength={128}
          placeholder={placeholder}
          value={value}
          onChange={event => onChange(event.target.value)}
          required
        />
        <button
          type="button"
          onClick={() => setVisible(current => !current)}
          aria-label={visible ? `Ẩn ${label.toLocaleLowerCase('vi')}` : `Hiện ${label.toLocaleLowerCase('vi')}`}
        >
          <EyeIcon hidden={visible} />
        </button>
      </div>
    </label>
  )
}

function CustomerAuthView({
  initialMessage = '',
  onAuthenticated,
  onShowMenu,
}: Pick<CustomerAccountViewProps, 'initialMessage' | 'onAuthenticated' | 'onShowMenu'>) {
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

  useEffect(() => {
    setMessage(initialMessage)
  }, [initialMessage])

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode)
    setError('')
    setMessage('')
    setCode('')
    setPassword('')
    setConfirmPassword('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const outcome = await loginCustomer(email, password)
      if (outcome.kind === 'authenticated') {
        onAuthenticated(outcome.session)
        return
      }
      setEmail(outcome.email)
      setMode(outcome.kind === 'two-factor' ? 'two-factor' : 'verify-email')
      setMessage(outcome.message)
      setPassword('')
    } catch (exception) {
      const nextError = getErrorMessage(exception)
      if (isUnverifiedEmailMessage(nextError)) {
        setMode('verify-email')
        setMessage('Email chưa được xác minh. Nhập mã đã nhận để tiếp tục.')
        setPassword('')
      } else {
        setError(nextError)
      }
    } finally {
      setLoading(false)
    }
  }

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!ten.trim() || !phoneNumber.trim()) {
      setError('Vui lòng nhập tên và số điện thoại.')
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
    try {
      const result = await registerCustomer({ ho, ten, email, phoneNumber, password })
      setEmail(result.email)
      setMode('verify-email')
      setMessage(result.message)
      setPassword('')
      setConfirmPassword('')
    } catch (exception) {
      setError(getErrorMessage(exception))
    } finally {
      setLoading(false)
    }
  }

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (code.length !== 6) {
      setError('Vui lòng nhập đủ mã gồm 6 chữ số.')
      return
    }
    setLoading(true)
    setError('')
    try {
      if (mode === 'two-factor') {
        const outcome = await verifyCustomerTwoFactor(email, code)
        if (outcome.kind !== 'authenticated') {
          throw new Error('Không nhận được phiên khách hàng hợp lệ.')
        }
        onAuthenticated(outcome.session)
        return
      }
      const resultMessage = await verifyCustomerEmail(email, code)
      setMode('login')
      setCode('')
      setMessage(`${resultMessage} Bạn có thể đăng nhập ngay.`)
    } catch (exception) {
      setError(getErrorMessage(exception))
    } finally {
      setLoading(false)
    }
  }

  async function resendCode() {
    if (!email.trim()) {
      setError('Vui lòng nhập email cần xác minh.')
      return
    }
    setLoading(true)
    setError('')
    try {
      setMessage(await resendCustomerVerification(email))
      setCode('')
    } catch (exception) {
      setError(getErrorMessage(exception))
    } finally {
      setLoading(false)
    }
  }

  async function submitForgotPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      setMessage(await forgotCustomerPassword(email))
      setMode('reset-password')
    } catch (exception) {
      setError(getErrorMessage(exception))
    } finally {
      setLoading(false)
    }
  }

  async function submitResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (code.length !== 6) {
      setError('Vui lòng nhập đủ mã gồm 6 chữ số.')
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
      const resultMessage = await resetCustomerPassword(email, code, password)
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

  const showBack = mode !== 'login'
  const title = {
    login: 'Chào mừng trở lại',
    register: 'Tạo tài khoản',
    'verify-email': 'Xác minh email',
    'two-factor': 'Xác thực đăng nhập',
    'forgot-password': 'Quên mật khẩu',
    'reset-password': 'Tạo mật khẩu mới',
  }[mode]
  const description = {
    login: 'Đăng nhập để quản lý tài khoản và ưu đãi của bạn.',
    register: 'Thành viên được lưu thông tin và theo dõi đơn thuận tiện hơn.',
    'verify-email': `Nhập mã 6 chữ số đã gửi đến ${email || 'email của bạn'}.`,
    'two-factor': `Nhập mã bảo mật đã gửi đến ${email || 'email của bạn'}.`,
    'forgot-password': 'Nhập email để nhận mã đặt lại mật khẩu.',
    'reset-password': 'Nhập mã trong email và tạo mật khẩu mới.',
  }[mode]

  return (
    <section className="customer-auth-view" aria-labelledby="customer-auth-title">
      <header className="customer-auth-topbar">
        {showBack ? (
          <button type="button" className="customer-auth-back" onClick={() => changeMode('login')} aria-label="Quay lại đăng nhập">
            <BackIcon />
          </button>
        ) : <span className="customer-auth-topbar-space" />}
        <CustomerBrand />
        <span className="customer-auth-topbar-space" />
      </header>

      <div className="customer-auth-copy">
        <h1 id="customer-auth-title">{title}</h1>
        <p>{description}</p>
      </div>

      {message ? <div className="customer-auth-alert success" role="status"><CheckIcon /><span>{message}</span></div> : null}
      {error ? <div className="customer-auth-alert error" role="alert"><strong>!</strong><span>{error}</span></div> : null}

      {mode === 'login' ? (
        <form className="customer-auth-form" onSubmit={submitLogin}>
          <label className="customer-auth-field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="username"
              maxLength={254}
              placeholder="ban@email.com"
              value={email}
              onChange={event => setEmail(event.target.value)}
              required
              autoFocus
            />
          </label>
          <PasswordField
            label="Mật khẩu"
            autoComplete="current-password"
            placeholder="Nhập mật khẩu"
            value={password}
            onChange={setPassword}
          />
          <button type="button" className="customer-auth-link forgot" onClick={() => changeMode('forgot-password')}>
            Quên mật khẩu?
          </button>
          <button className="customer-auth-primary" disabled={loading}>
            {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
          </button>
          <div className="customer-auth-divider"><span>hoặc</span></div>
          <button type="button" className="customer-auth-secondary" onClick={() => changeMode('register')}>
            Tạo tài khoản mới
          </button>
          <button type="button" className="customer-auth-guest" onClick={onShowMenu}>
            Tiếp tục gọi món không cần đăng nhập
          </button>
        </form>
      ) : null}

      {mode === 'register' ? (
        <form className="customer-auth-form" onSubmit={submitRegistration}>
          <div className="customer-auth-name-grid">
            <label className="customer-auth-field"><span>Họ</span><input autoComplete="family-name" maxLength={100} value={ho} onChange={event => setHo(event.target.value)} placeholder="Nguyễn" /></label>
            <label className="customer-auth-field"><span>Tên</span><input autoComplete="given-name" maxLength={100} value={ten} onChange={event => setTen(event.target.value)} placeholder="An" required autoFocus /></label>
          </div>
          <label className="customer-auth-field"><span>Email</span><input type="email" autoComplete="email" maxLength={254} value={email} onChange={event => setEmail(event.target.value)} placeholder="ban@email.com" required /></label>
          <label className="customer-auth-field"><span>Số điện thoại</span><input type="tel" autoComplete="tel" maxLength={20} value={phoneNumber} onChange={event => setPhoneNumber(event.target.value)} placeholder="09xx xxx xxx" required /></label>
          <PasswordField label="Mật khẩu" autoComplete="new-password" value={password} onChange={setPassword} placeholder="Tối thiểu 8 ký tự" />
          <PasswordField label="Xác nhận mật khẩu" autoComplete="new-password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Nhập lại mật khẩu" />
          <small className="customer-auth-hint">Bằng cách đăng ký, bạn đồng ý cho nhà hàng dùng thông tin này để phục vụ đơn hàng.</small>
          <button className="customer-auth-primary" disabled={loading}>{loading ? 'Đang tạo tài khoản…' : 'Đăng ký'}</button>
          <p className="customer-auth-switch">Đã có tài khoản? <button type="button" onClick={() => changeMode('login')}>Đăng nhập</button></p>
        </form>
      ) : null}

      {mode === 'verify-email' || mode === 'two-factor' ? (
        <form className="customer-auth-form" onSubmit={submitCode}>
          <CodeInput label="Mã xác thực" value={code} onChange={setCode} />
          <p className="customer-auth-code-note">Mã gồm 6 chữ số và chỉ có hiệu lực trong thời gian ngắn.</p>
          <button className="customer-auth-primary" disabled={loading}>{loading ? 'Đang xác minh…' : 'Xác minh'}</button>
          {mode === 'verify-email' ? (
            <button type="button" className="customer-auth-secondary" disabled={loading} onClick={() => void resendCode()}>
              Gửi lại mã
            </button>
          ) : null}
          <button type="button" className="customer-auth-guest" onClick={() => changeMode('login')}>Dùng tài khoản khác</button>
        </form>
      ) : null}

      {mode === 'forgot-password' ? (
        <form className="customer-auth-form" onSubmit={submitForgotPassword}>
          <label className="customer-auth-field"><span>Email</span><input type="email" autoComplete="email" maxLength={254} value={email} onChange={event => setEmail(event.target.value)} placeholder="ban@email.com" required autoFocus /></label>
          <button className="customer-auth-primary" disabled={loading}>{loading ? 'Đang gửi mã…' : 'Gửi mã đặt lại'}</button>
        </form>
      ) : null}

      {mode === 'reset-password' ? (
        <form className="customer-auth-form" onSubmit={submitResetPassword}>
          <CodeInput label="Mã đặt lại mật khẩu" value={code} onChange={setCode} />
          <PasswordField label="Mật khẩu mới" autoComplete="new-password" value={password} onChange={setPassword} placeholder="Tối thiểu 8 ký tự" />
          <PasswordField label="Xác nhận mật khẩu mới" autoComplete="new-password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Nhập lại mật khẩu" />
          <button className="customer-auth-primary" disabled={loading}>{loading ? 'Đang đặt lại…' : 'Đặt lại mật khẩu'}</button>
        </form>
      ) : null}
    </section>
  )
}

function AccountRow({
  icon,
  title,
  description,
  onClick,
}: {
  icon: ReactNode
  title: string
  description: string
  onClick: () => void
}) {
  return (
    <button type="button" className="customer-account-row" onClick={onClick}>
      <span className="customer-account-row-icon">{icon}</span>
      <span><strong>{title}</strong><small>{description}</small></span>
      <ChevronIcon />
    </button>
  )
}

function CustomerAccount({
  session,
  onSessionEnded,
  onShowOrder,
  onLogout,
}: {
  session: CustomerSession
  onSessionEnded: (message?: string) => void
  onShowOrder: () => void
  onLogout: () => Promise<void>
}) {
  const [panel, setPanel] = useState<'none' | 'profile' | 'offers' | 'security'>('none')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (newPassword.length < 8) {
      setError('Mật khẩu mới phải có ít nhất 8 ký tự.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Xác nhận mật khẩu mới không khớp.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const message = await changeCustomerPassword({
        currentPassword,
        newPassword,
        confirmNewPassword: confirmPassword,
      })
      onSessionEnded(`${message} Vui lòng đăng nhập lại.`)
    } catch (exception) {
      setError(getErrorMessage(exception))
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    setLoggingOut(true)
    setError('')
    try {
      await onLogout()
    } catch (exception) {
      setError(getErrorMessage(exception))
    } finally {
      setLoggingOut(false)
    }
  }

  const displayName = [session.ho, session.ten].filter(Boolean).join(' ')

  return (
    <section className="customer-account-view" aria-labelledby="customer-account-title">
      <header><CustomerBrand /></header>
      <h1 id="customer-account-title">Tài khoản</h1>
      {error ? <div className="customer-auth-alert error" role="alert"><strong>!</strong><span>{error}</span></div> : null}

      <section className="customer-profile-card">
        <span className="customer-profile-avatar">{session.ten.charAt(0).toLocaleUpperCase('vi')}</span>
        <div><h2>{displayName}</h2><p>{session.email}</p><small>{session.phoneNumber || 'Chưa có số điện thoại'}</small></div>
      </section>

      {panel === 'profile' ? (
        <section className="customer-account-detail">
          <header><h2>Thông tin cá nhân</h2><button type="button" onClick={() => setPanel('none')}>Đóng</button></header>
          <dl><div><dt>Họ tên</dt><dd>{displayName}</dd></div><div><dt>Email</dt><dd>{session.email}</dd></div><div><dt>Số điện thoại</dt><dd>{session.phoneNumber || 'Chưa cập nhật'}</dd></div><div><dt>Trạng thái email</dt><dd>{session.isEmailVerified ? 'Đã xác minh' : 'Chưa xác minh'}</dd></div></dl>
        </section>
      ) : null}

      {panel === 'offers' ? (
        <section className="customer-account-detail customer-offers-detail">
          <header><h2>Ưu đãi của tôi</h2><button type="button" onClick={() => setPanel('none')}>Đóng</button></header>
          <GiftIcon /><p>Khuyến mãi đủ điều kiện sẽ được tính và hiển thị rõ ở bước thanh toán.</p>
        </section>
      ) : null}

      {panel === 'security' ? (
        <section className="customer-account-detail">
          <header><h2>Đổi mật khẩu</h2><button type="button" onClick={() => setPanel('none')}>Đóng</button></header>
          <form className="customer-auth-form" onSubmit={submitPassword}>
            <PasswordField label="Mật khẩu hiện tại" autoComplete="current-password" value={currentPassword} onChange={setCurrentPassword} />
            <PasswordField label="Mật khẩu mới" autoComplete="new-password" value={newPassword} onChange={setNewPassword} />
            <PasswordField label="Xác nhận mật khẩu mới" autoComplete="new-password" value={confirmPassword} onChange={setConfirmPassword} />
            <button className="customer-auth-primary" disabled={loading}>{loading ? 'Đang đổi mật khẩu…' : 'Đổi mật khẩu'}</button>
          </form>
        </section>
      ) : null}

      <div className="customer-account-list">
        <AccountRow icon={<UserIcon />} title="Thông tin cá nhân" description="Xem thông tin tài khoản" onClick={() => setPanel('profile')} />
        <AccountRow icon={<ReceiptIcon />} title="Đơn của tôi" description="Xem toàn bộ lịch sử gọi món" onClick={onShowOrder} />
        <AccountRow icon={<GiftIcon />} title="Ưu đãi của tôi" description="Khuyến mãi được áp dụng khi thanh toán" onClick={() => setPanel('offers')} />
        <AccountRow icon={<ShieldIcon />} title="Bảo mật tài khoản" description="Đổi mật khẩu đăng nhập" onClick={() => setPanel('security')} />
      </div>

      <button type="button" className="customer-account-logout" disabled={loggingOut} onClick={() => void handleLogout()}>
        <LogoutIcon />{loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}
      </button>
    </section>
  )
}

export default function CustomerAccountView(props: CustomerAccountViewProps) {
  if (props.sessionLoading) {
    return (
      <section className="customer-account-loading" role="status">
        <span className="customer-spinner" />
        <h1>Đang mở tài khoản…</h1>
        <p>Hệ thống đang khôi phục phiên khách hàng an toàn.</p>
      </section>
    )
  }
  if (!props.session) {
    return (
      <CustomerAuthView
        initialMessage={props.initialMessage}
        onAuthenticated={props.onAuthenticated}
        onShowMenu={props.onShowMenu}
      />
    )
  }
  return (
    <CustomerAccount
      session={props.session}
      onSessionEnded={props.onSessionEnded}
      onShowOrder={props.onShowOrder}
      onLogout={props.onLogout}
    />
  )
}

import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Phone,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  forgotCustomerPassword,
  loginCustomer,
  registerCustomer,
  resendCustomerVerification,
  resetCustomerPassword,
  verifyCustomerEmail,
  verifyCustomerTwoFactor,
  type CustomerSession,
} from '../services/customerAuth'

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

  useEffect(() => {
    if (!initialMessage) return
    setMessage(initialMessage)
  }, [initialMessage])

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

  const titles: Record<Mode, { eyebrow: string; title: string; description: string }> = {
    login: { eyebrow: 'Chào mừng trở lại', title: 'Đăng nhập', description: 'Theo dõi đơn hàng và quản lý tài khoản khách hàng thuận tiện hơn.' },
    register: { eyebrow: 'Thành viên mới', title: 'Tạo tài khoản', description: 'Lưu đơn và theo dõi những lần ghé nhà hàng trên cùng một tài khoản.' },
    verify: { eyebrow: 'Xác minh', title: 'Kiểm tra email', description: `Nhập mã đã gửi đến ${email || 'email của bạn'}.` },
    twoFactor: { eyebrow: 'Bảo mật', title: 'Xác thực đăng nhập', description: `Nhập mã bảo mật đã gửi đến ${email || 'email của bạn'}.` },
    forgot: { eyebrow: 'Khôi phục', title: 'Quên mật khẩu', description: 'Nhập email để nhận mã đặt lại mật khẩu.' },
    reset: { eyebrow: 'Khôi phục', title: 'Đặt lại mật khẩu', description: 'Nhập mã trong email và tạo mật khẩu mới cho tài khoản.' },
  }

  const submitLabel = {
    login: 'Đăng nhập',
    register: 'Tạo tài khoản',
    verify: 'Xác minh email',
    twoFactor: 'Xác thực',
    forgot: 'Gửi mã đặt lại',
    reset: 'Đổi mật khẩu',
  }[mode]
  const content = titles[mode]
  const showAuthTabs = mode === 'login' || mode === 'register'

  return (
    <section className="relative w-full max-w-xl border border-border bg-background p-7 sm:p-9 md:p-10">
      {onClose ? <Button className="absolute right-4 top-4" variant="ghost" size="icon-sm" type="button" onClick={onClose} aria-label="Đóng đăng nhập"><X /></Button> : null}

      <header className="border-b border-border pb-7 pr-10">
        <p className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">{content.eyebrow}</p>
        <h1 className="mt-2 font-heading text-5xl leading-none tracking-[-0.045em]">{content.title}</h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">{content.description}</p>

        {showAuthTabs ? (
          <div className="mt-7 flex gap-7 border-b border-border" role="tablist" aria-label="Chọn đăng nhập hoặc đăng ký">
            <button type="button" role="tab" aria-selected={mode === 'login'} className={`border-b-2 pb-3 text-[10px] font-semibold tracking-[0.14em] uppercase ${mode === 'login' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground'}`} disabled={busy} onClick={() => move('login')}>Đăng nhập</button>
            <button type="button" role="tab" aria-selected={mode === 'register'} className={`border-b-2 pb-3 text-[10px] font-semibold tracking-[0.14em] uppercase ${mode === 'register' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground'}`} disabled={busy} onClick={() => move('register')}>Đăng ký</button>
          </div>
        ) : null}
      </header>

      <div className="pt-7">
        {message ? <Alert className="mb-6"><AlertTitle>Thông báo</AlertTitle><AlertDescription>{message}</AlertDescription></Alert> : null}
        {error ? <Alert variant="destructive" className="mb-6"><AlertTitle>Không thể hoàn tất</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

        <form className="grid gap-6" onSubmit={submit}>
          {mode === 'register' ? (
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2 text-[10px] font-semibold tracking-[0.14em] uppercase">Họ<div className="relative"><UserRound className="absolute left-0 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={ho} onChange={event => setHo(event.target.value)} autoComplete="family-name" placeholder="Họ" className="border-x-0 border-t-0 pl-7 normal-case tracking-normal shadow-none" /></div></label>
              <label className="grid gap-2 text-[10px] font-semibold tracking-[0.14em] uppercase">Tên *<div className="relative"><UserRound className="absolute left-0 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={ten} onChange={event => setTen(event.target.value)} required autoComplete="given-name" placeholder="Tên" className="border-x-0 border-t-0 pl-7 normal-case tracking-normal shadow-none" /></div></label>
            </div>
          ) : null}

          {mode === 'login' || mode === 'register' || mode === 'forgot' ? (
            <label className="grid gap-2 text-[10px] font-semibold tracking-[0.14em] uppercase">Email *<div className="relative"><Mail className="absolute left-0 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input type="email" value={email} onChange={event => setEmail(event.target.value)} required autoComplete="email" placeholder="email@example.com" className="border-x-0 border-t-0 pl-7 normal-case tracking-normal shadow-none" /></div></label>
          ) : null}

          {mode === 'register' ? (
            <label className="grid gap-2 text-[10px] font-semibold tracking-[0.14em] uppercase">Số điện thoại *<div className="relative"><Phone className="absolute left-0 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input type="tel" value={phoneNumber} onChange={event => setPhoneNumber(event.target.value)} required autoComplete="tel" placeholder="0912 345 678" className="border-x-0 border-t-0 pl-7 normal-case tracking-normal shadow-none" /></div></label>
          ) : null}

          {mode === 'verify' || mode === 'twoFactor' || mode === 'reset' ? (
            <label className="grid gap-2 text-[10px] font-semibold tracking-[0.14em] uppercase">Mã xác thực *<div className="relative"><ShieldCheck className="absolute left-0 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input inputMode="numeric" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} required minLength={6} maxLength={6} autoComplete="one-time-code" placeholder="000000" className="border-x-0 border-t-0 pl-7 font-mono tracking-[0.35em] shadow-none" /></div></label>
          ) : null}

          {mode === 'login' || mode === 'register' || mode === 'reset' ? (
            <label className="grid gap-2 text-[10px] font-semibold tracking-[0.14em] uppercase">
              <span className="flex items-center justify-between gap-4"><span>{mode === 'reset' ? 'Mật khẩu mới *' : 'Mật khẩu *'}</span>{mode === 'login' ? <button className="text-[10px] normal-case tracking-normal text-muted-foreground underline underline-offset-4" type="button" onClick={() => move('forgot')}>Quên mật khẩu?</button> : null}</span>
              <div className="relative"><KeyRound className="absolute left-0 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} required minLength={8} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={mode === 'login' ? 'Nhập mật khẩu' : 'Tối thiểu 8 ký tự'} className="border-x-0 border-t-0 px-7 normal-case tracking-normal shadow-none" /><button className="absolute right-0 top-1/2 grid size-8 -translate-y-1/2 place-items-center text-muted-foreground" type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div>
            </label>
          ) : null}

          <Button className="mt-1 w-full" disabled={busy}>{busy ? 'Đang xử lý…' : submitLabel}</Button>
        </form>

        {mode === 'verify' ? (
          <Button className="mt-4 w-full" variant="ghost" type="button" disabled={busy} onClick={() => {
            setBusy(true)
            setError('')
            void resendCustomerVerification(email)
              .then(setMessage)
              .catch(exception => setError(exception instanceof Error ? exception.message : 'Không gửi lại được mã.'))
              .finally(() => setBusy(false))
          }}>Gửi lại mã xác minh</Button>
        ) : null}

        {!showAuthTabs ? <Button className="mt-4 px-0" variant="link" type="button" onClick={() => move('login')}><ArrowLeft data-icon="inline-start" /> Quay lại đăng nhập</Button> : null}
      </div>
    </section>
  )
}

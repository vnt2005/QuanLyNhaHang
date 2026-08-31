import {
  ClipboardList,
  LogOut,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  changeCustomerPassword,
  logoutCustomer,
  type CustomerSession,
} from '../services/customerAuth'
import AuthPortal from '../components/AuthPortal'
import { navigate } from '../utils/navigation'

type AccountTab = 'profile' | 'security'

export default function AccountPage({
  session,
  initialMessage,
  onSessionChanged,
}: {
  session: CustomerSession | null
  initialMessage?: string
  onSessionChanged: (session: CustomerSession | null) => void
}) {
  const [tab, setTab] = useState<AccountTab>('profile')
  const [error, setError] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')

  if (!session) return <AuthPortal initialMessage={initialMessage} onAuthenticated={onSessionChanged} />

  const displayName = [session.ho, session.ten].filter(Boolean).join(' ')

  async function logout() {
    await logoutCustomer().catch(() => undefined)
    onSessionChanged(null)
    navigate('/')
  }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordMessage('')
    setError('')
    const data = new FormData(event.currentTarget)
    const nextPassword = String(data.get('newPassword') ?? '')
    const confirmPassword = String(data.get('confirmPassword') ?? '')
    if (nextPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận chưa khớp.')
      return
    }

    try {
      const result = await changeCustomerPassword({
        currentPassword: String(data.get('currentPassword') ?? ''),
        newPassword: nextPassword,
        confirmNewPassword: confirmPassword,
      })
      setPasswordMessage(`${result} Vui lòng đăng nhập lại.`)
      onSessionChanged(null)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không đổi được mật khẩu.')
    }
  }

  return (
    <main className="bg-background text-foreground">
      <section className="mx-auto w-[min(1280px,calc(100vw-48px))] py-14 sm:w-[min(1280px,calc(100vw-80px))] md:py-20">
        <header className="border-b border-border pb-9">
          <p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">Tài khoản khách hàng</p>
          <h1 className="mt-3 font-heading text-[clamp(3.8rem,6vw,6.8rem)] leading-[0.88] tracking-[-0.055em]">Xin chào, {session.ten}.</h1>
        </header>

        <div className="mt-10 grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="h-fit border border-border lg:sticky lg:top-28">
            <div className="border-b border-border p-6">
              <span className="grid size-12 place-items-center bg-foreground font-heading text-2xl text-background">{session.ten.charAt(0).toLocaleUpperCase('vi')}</span>
              <strong className="mt-5 block font-heading text-2xl font-medium">{displayName}</strong>
              <small className="mt-2 block break-all text-xs leading-5 text-muted-foreground">{session.email}</small>
              <small className="mt-1 block text-xs text-muted-foreground">{session.phoneNumber || 'Chưa cập nhật số điện thoại'}</small>
            </div>

            <nav className="grid border-b border-border p-3" aria-label="Tài khoản khách hàng">
              <button type="button" className={`flex items-center gap-3 border-l-2 px-4 py-3 text-left text-[10px] font-semibold tracking-[0.14em] uppercase ${tab === 'profile' ? 'border-foreground bg-muted/50 text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`} onClick={() => { setTab('profile'); setError('') }}><UserRound className="size-4" /> Thông tin tài khoản</button>
              <button type="button" className={`flex items-center gap-3 border-l-2 px-4 py-3 text-left text-[10px] font-semibold tracking-[0.14em] uppercase ${tab === 'security' ? 'border-foreground bg-muted/50 text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`} onClick={() => { setTab('security'); setError('') }}><ShieldCheck className="size-4" /> Bảo mật</button>
            </nav>

            <div className="grid gap-2 p-3">
              <Button variant="ghost" className="justify-start" type="button" onClick={() => navigate('/orders')}><ClipboardList data-icon="inline-start" /> Đơn của tôi</Button>
              <Button variant="destructive" className="justify-start" type="button" onClick={() => void logout()}><LogOut data-icon="inline-start" /> Đăng xuất</Button>
            </div>
          </aside>

          <section className="border border-border p-6 sm:p-8 md:p-10">
            {tab === 'profile' ? (
              <>
                <div className="border-b border-border pb-7">
                  <p className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">Hồ sơ</p>
                  <h2 className="mt-2 font-heading text-4xl tracking-[-0.035em]">Thông tin tài khoản</h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">Thông tin đang được sử dụng cho tài khoản khách hàng.</p>
                </div>
                <dl className="divide-y divide-border">
                  {[
                    ['Họ và tên', displayName],
                    ['Email', session.email],
                    ['Số điện thoại', session.phoneNumber || 'Chưa cập nhật'],
                    ['Trạng thái email', session.isEmailVerified ? 'Đã xác minh' : 'Chưa xác minh'],
                  ].map(([label, value]) => <div className="grid gap-2 py-5 sm:grid-cols-[180px_1fr] sm:items-center" key={label}><dt className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">{label}</dt><dd className="m-0 text-sm font-semibold">{value}</dd></div>)}
                </dl>
              </>
            ) : (
              <>
                <div className="border-b border-border pb-7">
                  <p className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">Bảo mật</p>
                  <h2 className="mt-2 font-heading text-4xl tracking-[-0.035em]">Đổi mật khẩu</h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">Cập nhật mật khẩu để bảo vệ lịch sử đơn và phiên đăng nhập.</p>
                </div>
                {error ? <Alert variant="destructive" className="mt-7"><AlertTitle>Không thể đổi mật khẩu</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
                {passwordMessage ? <Alert className="mt-7"><AlertTitle>Đã cập nhật</AlertTitle><AlertDescription>{passwordMessage}</AlertDescription></Alert> : null}
                <form className="mt-8 grid max-w-xl gap-6" onSubmit={submitPassword}>
                  <label className="grid gap-2 text-[10px] font-semibold tracking-[0.14em] uppercase">Mật khẩu hiện tại<Input name="currentPassword" type="password" required autoComplete="current-password" className="normal-case tracking-normal" /></label>
                  <label className="grid gap-2 text-[10px] font-semibold tracking-[0.14em] uppercase">Mật khẩu mới<Input name="newPassword" type="password" required minLength={8} autoComplete="new-password" className="normal-case tracking-normal" /></label>
                  <label className="grid gap-2 text-[10px] font-semibold tracking-[0.14em] uppercase">Xác nhận mật khẩu mới<Input name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" className="normal-case tracking-normal" /></label>
                  <Button className="mt-2 w-fit" type="submit">Đổi mật khẩu</Button>
                </form>
              </>
            )}
          </section>
        </div>
      </section>
    </main>
  )
}

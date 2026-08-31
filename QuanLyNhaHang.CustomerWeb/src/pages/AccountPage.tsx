import { ClipboardList, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { changeCustomerPassword, logoutCustomer, type CustomerSession } from '../services/customerAuth'
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
    <main className="mx-auto w-[min(1120px,calc(100%-40px))] py-16 max-sm:w-[calc(100%-24px)] md:py-20">
      <section className="overflow-hidden rounded-[32px] border border-border bg-card shadow-sm">
        <header className="grid gap-8 bg-primary px-7 py-9 text-primary-foreground sm:grid-cols-[1fr_auto] sm:items-end sm:px-10 sm:py-11">
          <div className="flex items-center gap-5">
            <span className="grid size-16 place-items-center rounded-full bg-primary-foreground/12 font-heading text-3xl ring-1 ring-primary-foreground/25">{session.ten.charAt(0).toLocaleUpperCase('vi')}</span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.14em] opacity-75">Tài khoản khách hàng</p>
              <h1 className="mt-1 font-heading text-4xl leading-none sm:text-5xl">{displayName}</h1>
              <p className="mt-3 text-sm opacity-80">{session.email} · {session.phoneNumber || 'Chưa có số điện thoại'}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => navigate('/orders')}><ClipboardList /> Đơn của tôi</Button>
            <Button variant="outline" className="border-primary-foreground/35 bg-transparent text-primary-foreground hover:bg-primary-foreground hover:text-foreground" onClick={() => void logout()}><LogOut /> Đăng xuất</Button>
          </div>
        </header>

        <div className="border-b border-border px-5 pt-4 sm:px-8">
          <nav className="flex gap-2 overflow-x-auto" aria-label="Tài khoản khách hàng">
            <button type="button" className={`inline-flex items-center gap-2 rounded-t-2xl px-5 py-3 text-sm font-semibold ${tab === 'profile' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => { setTab('profile'); setError('') }}><UserRound className="size-4" /> Hồ sơ</button>
            <button type="button" className={`inline-flex items-center gap-2 rounded-t-2xl px-5 py-3 text-sm font-semibold ${tab === 'security' ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => { setTab('security'); setError('') }}><ShieldCheck className="size-4" /> Bảo mật</button>
          </nav>
        </div>

        <div className="bg-background p-6 sm:p-9 md:p-11">
          {tab === 'profile' ? (
            <div className="grid gap-8 lg:grid-cols-[.75fr_1.25fr]">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[.13em] text-primary">Thông tin cá nhân</span>
                <h2 className="mt-2 font-heading text-4xl">Hồ sơ của bạn</h2>
                <p className="mt-3 max-w-sm text-sm leading-7 text-muted-foreground">Thông tin này đang được dùng cho lịch sử đơn hàng, đặt bàn và các thông báo của tài khoản.</p>
              </div>
              <dl className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Họ và tên', displayName],
                  ['Email', session.email],
                  ['Số điện thoại', session.phoneNumber || 'Chưa cập nhật'],
                  ['Xác minh email', session.isEmailVerified ? 'Đã xác minh' : 'Chưa xác minh'],
                ].map(([label, value]) => (
                  <div className="rounded-2xl border border-border bg-card p-5" key={label}>
                    <dt className="text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">{label}</dt>
                    <dd className="mt-2 break-words text-sm font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : (
            <div className="grid gap-9 lg:grid-cols-[.75fr_1.25fr]">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[.13em] text-primary">Bảo mật</span>
                <h2 className="mt-2 font-heading text-4xl">Đổi mật khẩu</h2>
                <p className="mt-3 max-w-sm text-sm leading-7 text-muted-foreground">Sau khi đổi mật khẩu thành công, phiên hiện tại sẽ yêu cầu đăng nhập lại.</p>
              </div>
              <div>
                {error ? <Alert variant="destructive" className="mb-5"><AlertTitle>Không thể đổi mật khẩu</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
                {passwordMessage ? <Alert className="mb-5"><AlertTitle>Đã cập nhật</AlertTitle><AlertDescription>{passwordMessage}</AlertDescription></Alert> : null}
                <form className="grid gap-5" onSubmit={submitPassword}>
                  <label className="grid gap-2 text-sm font-semibold">Mật khẩu hiện tại<Input name="currentPassword" type="password" required autoComplete="current-password" className="h-11 rounded-xl" /></label>
                  <label className="grid gap-2 text-sm font-semibold">Mật khẩu mới<Input name="newPassword" type="password" required minLength={8} autoComplete="new-password" className="h-11 rounded-xl" /></label>
                  <label className="grid gap-2 text-sm font-semibold">Xác nhận mật khẩu mới<Input name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" className="h-11 rounded-xl" /></label>
                  <Button className="mt-2 w-fit" type="submit">Đổi mật khẩu</Button>
                </form>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}

import { ClipboardList, LogOut, ShieldCheck, UserRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { changeCustomerPassword, logoutCustomer, type CustomerSession } from '../services/customerAuth'
import AuthPortal from '../components/AuthPortal'
import { navigate } from '../utils/navigation'

type AccountTab = 'profile' | 'security'

export default function AccountPage({ session, initialMessage, onSessionChanged }: { session: CustomerSession | null; initialMessage?: string; onSessionChanged: (session: CustomerSession | null) => void }) {
  const [tab, setTab] = useState<AccountTab>('profile')
  const [error, setError] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')

  if (!session) return <AuthPortal initialMessage={initialMessage} onAuthenticated={onSessionChanged} />

  const displayName = [session.ho, session.ten].filter(Boolean).join(' ')

  async function logout() { await logoutCustomer().catch(() => undefined); onSessionChanged(null); navigate('/') }

  async function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPasswordMessage(''); setError('')
    const data = new FormData(event.currentTarget)
    const nextPassword = String(data.get('newPassword') ?? '')
    const confirmPassword = String(data.get('confirmPassword') ?? '')
    if (nextPassword !== confirmPassword) return setError('Mật khẩu xác nhận chưa khớp.')
    try {
      const result = await changeCustomerPassword({ currentPassword: String(data.get('currentPassword') ?? ''), newPassword: nextPassword, confirmNewPassword: confirmPassword })
      setPasswordMessage(`${result} Vui lòng đăng nhập lại.`); onSessionChanged(null)
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'Không đổi được mật khẩu.') }
  }

  return (
    <main className="sera-page">
      <header className="sera-page-head">
        <div><p className="sera-kicker">Tài khoản khách hàng</p><h1 className="sera-display mt-3">{displayName}</h1><p>{session.email} · {session.phoneNumber || 'Chưa có số điện thoại'}</p></div>
        <div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={() => navigate('/orders')}><ClipboardList /> Đơn của tôi</Button><Button variant="ghost" onClick={() => void logout()}><LogOut /> Đăng xuất</Button></div>
      </header>

      <div className="mt-8 grid gap-12 lg:grid-cols-[240px_1fr]">
        <aside>
          <nav className="border-t border-border" aria-label="Tài khoản khách hàng">
            <button type="button" className={`flex w-full items-center gap-3 border-b border-border py-4 text-left text-sm ${tab === 'profile' ? 'font-bold text-foreground' : 'text-muted-foreground'}`} onClick={() => { setTab('profile'); setError('') }}><UserRound className="size-4" /> Hồ sơ</button>
            <button type="button" className={`flex w-full items-center gap-3 border-b border-border py-4 text-left text-sm ${tab === 'security' ? 'font-bold text-foreground' : 'text-muted-foreground'}`} onClick={() => { setTab('security'); setError('') }}><ShieldCheck className="size-4" /> Bảo mật</button>
          </nav>
        </aside>

        {tab === 'profile' ? (
          <section>
            <p className="sera-kicker">Thông tin cá nhân</p>
            <h2 className="mt-2 font-heading text-4xl">Hồ sơ của bạn</h2>
            <p className="sera-copy mt-3 max-w-2xl">Thông tin này đang được dùng cho lịch sử đơn hàng, đặt bàn và các thông báo của tài khoản.</p>
            <dl className="mt-8 border-t border-border">
              {[
                ['Họ và tên', displayName], ['Email', session.email], ['Số điện thoại', session.phoneNumber || 'Chưa cập nhật'], ['Xác minh email', session.isEmailVerified ? 'Đã xác minh' : 'Chưa xác minh'],
              ].map(([label, value]) => <div className="grid gap-3 border-b border-border py-5 sm:grid-cols-[180px_1fr]" key={label}><dt className="text-xs font-bold uppercase tracking-[.1em] text-muted-foreground">{label}</dt><dd className="break-words text-sm font-semibold">{value}</dd></div>)}
            </dl>
          </section>
        ) : (
          <section>
            <p className="sera-kicker">Bảo mật</p>
            <h2 className="mt-2 font-heading text-4xl">Đổi mật khẩu</h2>
            <p className="sera-copy mt-3 max-w-2xl">Sau khi đổi mật khẩu thành công, phiên hiện tại sẽ yêu cầu đăng nhập lại.</p>
            <div className="mt-8 max-w-2xl border-t border-border pt-6">
              {error ? <Alert variant="destructive" className="mb-5"><AlertTitle>Không thể đổi mật khẩu</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
              {passwordMessage ? <Alert className="mb-5"><AlertTitle>Đã cập nhật</AlertTitle><AlertDescription>{passwordMessage}</AlertDescription></Alert> : null}
              <form className="grid gap-6" onSubmit={submitPassword}>
                <label className="sera-field">Mật khẩu hiện tại<Input name="currentPassword" type="password" required autoComplete="current-password" /></label>
                <label className="sera-field">Mật khẩu mới<Input name="newPassword" type="password" required minLength={8} autoComplete="new-password" /></label>
                <label className="sera-field">Xác nhận mật khẩu mới<Input name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" /></label>
                <Button className="w-fit" type="submit">Đổi mật khẩu</Button>
              </form>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

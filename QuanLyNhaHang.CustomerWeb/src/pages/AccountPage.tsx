import {
  ClipboardList,
  LogOut,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { useState, type FormEvent } from 'react'
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

  if (!session) {
    return <AuthPortal initialMessage={initialMessage} onAuthenticated={onSessionChanged} />
  }

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
    <main className="account-page account-premium-page page-section">
      <aside className="account-sidebar account-premium-sidebar">
        <div className="customer-identity">
          <span>{session.ten.charAt(0).toLocaleUpperCase('vi')}</span>
          <div><strong>{displayName}</strong><small>{session.email}</small><small>{session.phoneNumber || 'Chưa cập nhật số điện thoại'}</small></div>
        </div>

        <nav aria-label="Tài khoản khách hàng">
          <button type="button" className={tab === 'profile' ? 'active' : ''} onClick={() => { setTab('profile'); setError('') }}><UserRound /> Thông tin tài khoản</button>
          <button type="button" className={tab === 'security' ? 'active' : ''} onClick={() => { setTab('security'); setError('') }}><ShieldCheck /> Bảo mật</button>
        </nav>

        <button className="account-orders-shortcut" type="button" onClick={() => navigate('/orders')}><ClipboardList /> Xem đơn của tôi</button>
        <button className="logout-button" type="button" onClick={() => void logout()}><LogOut /> Đăng xuất</button>
      </aside>

      <section className="account-content account-premium-content">
        {tab === 'profile' ? (
          <>
            <div className="account-heading"><div><h1>Thông tin tài khoản</h1><p>Thông tin đang được sử dụng cho tài khoản khách hàng.</p></div></div>
            <dl className="profile-details"><div><dt>Họ và tên</dt><dd>{displayName}</dd></div><div><dt>Email</dt><dd>{session.email}</dd></div><div><dt>Số điện thoại</dt><dd>{session.phoneNumber || 'Chưa cập nhật'}</dd></div><div><dt>Trạng thái email</dt><dd>{session.isEmailVerified ? 'Đã xác minh' : 'Chưa xác minh'}</dd></div></dl>
          </>
        ) : (
          <>
            <div className="account-heading"><div><h1>Bảo mật tài khoản</h1><p>Đổi mật khẩu để bảo vệ lịch sử đơn và phiên đăng nhập.</p></div></div>
            {error ? <div className="form-notice error" role="alert">{error}</div> : null}
            {passwordMessage ? <div className="form-notice success">{passwordMessage}</div> : null}
            <form className="security-form" onSubmit={submitPassword}><label>Mật khẩu hiện tại<input name="currentPassword" type="password" required autoComplete="current-password" /></label><label>Mật khẩu mới<input name="newPassword" type="password" required minLength={8} autoComplete="new-password" /></label><label>Xác nhận mật khẩu mới<input name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" /></label><button className="primary-button" type="submit">Đổi mật khẩu</button></form>
          </>
        )}
      </section>
    </main>
  )
}

import {
  ChevronDown,
  ChevronRight,
  ClipboardList,
  LogOut,
  PackageOpen,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import {
  changeCustomerPassword,
  logoutCustomer,
  type CustomerSession,
} from '../api/customerAuth'
import {
  getCustomerOrders,
  type CustomerOrder,
  type CustomerOrderHistory,
} from '../api/customerOrders'
import AuthPanel from '../components/AuthPanel'
import PayOnlineButton from '../components/PayOnlineButton'
import reservationImage from '../assets/reservation-dining-room.webp'
import { navigate } from '../navigation'

type Tab = 'orders' | 'profile' | 'security'

const terminalStatuses = new Set(['Completed', 'Cancelled'])

const statusLabels: Record<string, string> = {
  Pending: 'Đang chờ',
  Confirmed: 'Đã xác nhận',
  Preparing: 'Đang chuẩn bị',
  Cooking: 'Đang chế biến',
  Ready: 'Sẵn sàng phục vụ',
  Served: 'Đã phục vụ',
  Completed: 'Đã hoàn thành',
  Cancelled: 'Đã hủy',
}

function money(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function OrderRow({
  order,
  expanded,
  accessToken,
  onToggle,
}: {
  order: CustomerOrder
  expanded: boolean
  accessToken: string
  onToggle: () => void
}) {
  const lastQrToken = localStorage.getItem('customerLastQrToken')
  const canOrderMore = !terminalStatuses.has(order.status) && Boolean(lastQrToken)
  return (
    <article className={expanded ? 'order-row expanded' : 'order-row'}>
      <button className="order-summary" type="button" onClick={onToggle} aria-expanded={expanded}>
        {expanded ? <ChevronDown /> : <ChevronRight />}
        <strong>{order.orderCode}</strong>
        <span>{dateTime(order.createdAt)}</span>
        <span>{order.restaurantTableName}</span>
        <span>{money(order.totalAmount)}</span>
        <span className={`order-status status-${order.status.toLocaleLowerCase()}`}>{statusLabels[order.status] || order.status}</span>
      </button>
      {expanded ? (
        <div className="order-detail">
          <div className="order-items-heading"><span>Món ăn</span><span>Số lượng</span><span>Đơn giá</span><span>Thành tiền</span></div>
          {order.items.map(item => (
            <div className="order-item-line" key={item.id}>
              <strong>{item.menuItemName}<small>{item.note || ''}</small></strong>
              <span>{item.quantity}</span>
              <span>{money(item.unitPrice)}</span>
              <span>{money(item.totalPrice)}</span>
            </div>
          ))}
          <div className="order-detail-footer">
            {order.note ? <p>Ghi chú: {order.note}</p> : <span />}
            <strong>Tạm tính món <span>{money(order.totalAmount)}</span></strong>
            {order.status !== 'Cancelled' ? <PayOnlineButton orderId={order.id} accessToken={accessToken} className="primary-button compact" /> : null}
            {canOrderMore ? <button className="secondary-button compact" type="button" onClick={() => navigate(`/qr-order/${encodeURIComponent(lastQrToken!)}`)}>Gọi thêm món</button> : null}
          </div>
        </div>
      ) : null}
    </article>
  )
}

export default function AccountPage({
  session,
  initialMessage,
  onSessionChanged,
}: {
  session: CustomerSession | null
  initialMessage?: string
  onSessionChanged: (session: CustomerSession | null) => void
}) {
  const [tab, setTab] = useState<Tab>('orders')
  const [history, setHistory] = useState<CustomerOrderHistory | null>(null)
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')

  const loadOrders = useCallback(async (targetPage = page) => {
    if (!session) return
    setLoading(true)
    setError('')
    try {
      const result = await getCustomerOrders(targetPage, 8)
      setHistory(result)
      setPage(result.pageNumber)
      setExpandedId(current => current || result.items[0]?.id || '')
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không tải được đơn hàng.')
    } finally {
      setLoading(false)
    }
  }, [page, session])

  useEffect(() => {
    if (session && tab === 'orders') void loadOrders(1)
  }, [session, tab])

  if (!session) {
    return (
      <main className="login-page page-section">
        <div className="login-layout">
          <div className="login-photo"><img src={reservationImage} alt="Không gian nhà hàng" /><div><h1>Mỗi lần ghé thăm đều được lưu lại</h1><p>Đăng nhập để theo dõi đơn, xem lại món yêu thích và quản lý tài khoản khách hàng.</p></div></div>
          <AuthPanel initialMessage={initialMessage} onAuthenticated={onSessionChanged} />
        </div>
      </main>
    )
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
    <main className="account-page page-section">
      <aside className="account-sidebar">
        <div className="customer-identity">
          <span>{session.ten.charAt(0).toLocaleUpperCase('vi')}</span>
          <div><strong>{displayName}</strong><small>{session.email}</small><small>{session.phoneNumber || 'Chưa cập nhật số điện thoại'}</small></div>
        </div>
        <nav aria-label="Tài khoản khách hàng">
          <button type="button" className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}><ClipboardList /> Đơn hàng</button>
          <button type="button" className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}><UserRound /> Thông tin tài khoản</button>
          <button type="button" className={tab === 'security' ? 'active' : ''} onClick={() => setTab('security')}><ShieldCheck /> Bảo mật</button>
        </nav>
        <button className="logout-button" type="button" onClick={() => void logout()}><LogOut /> Đăng xuất</button>
      </aside>

      <section className="account-content">
        {tab === 'orders' ? (
          <>
            <div className="account-heading"><div><h1>Đơn của tôi</h1><p>Theo dõi các đơn được lưu trong tài khoản khách hàng.</p></div><button type="button" onClick={() => void loadOrders(page)} disabled={loading}><RefreshCw className={loading ? 'spin' : ''} /> Cập nhật</button></div>
            {error ? <div className="form-notice error" role="alert">{error}</div> : null}
            {loading && !history ? <div className="orders-loading"><RefreshCw className="spin" /> Đang tải đơn hàng…</div> : null}
            {history?.items.length ? (
              <div className="orders-table">
                <div className="orders-table-heading"><span>Mã đơn</span><span>Ngày đặt</span><span>Bàn</span><span>Tổng tiền</span><span>Trạng thái</span></div>
                {history.items.map(order => <OrderRow key={order.id} order={order} accessToken={session.token} expanded={expandedId === order.id} onToggle={() => setExpandedId(current => current === order.id ? '' : order.id)} />)}
                {history.totalPages > 1 ? <div className="pagination"><button type="button" disabled={!history.hasPreviousPage || loading} onClick={() => void loadOrders(page - 1)}>Trang trước</button><span>Trang {history.pageNumber}/{history.totalPages}</span><button type="button" disabled={!history.hasNextPage || loading} onClick={() => void loadOrders(page + 1)}>Trang sau</button></div> : null}
              </div>
            ) : history && !loading ? (
              <div className="account-empty"><PackageOpen /><h2>Chưa có đơn hàng nào</h2><p>Khi gọi món bằng QR trong lúc đăng nhập, đơn sẽ xuất hiện tại đây.</p><button className="secondary-button" type="button" onClick={() => navigate('/menu')}>Xem thực đơn</button></div>
            ) : null}
          </>
        ) : tab === 'profile' ? (
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

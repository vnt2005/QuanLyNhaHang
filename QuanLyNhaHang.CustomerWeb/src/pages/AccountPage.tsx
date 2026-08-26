import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleX,
  ClipboardList,
  Clock3,
  CreditCard,
  LogOut,
  MapPin,
  PackageOpen,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  UserRound,
  UtensilsCrossed,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
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
type OrderFilter = 'all' | 'active' | 'completed' | 'cancelled'

const terminalStatuses = new Set(['Completed', 'Cancelled'])
const activeStatuses = new Set(['Pending', 'Confirmed', 'Preparing', 'Cooking', 'Ready', 'Served'])

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

const orderFilters: Array<{ value: OrderFilter; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'active', label: 'Đang xử lý' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'cancelled', label: 'Đã hủy' },
]

const progressSteps = ['Tiếp nhận', 'Chuẩn bị', 'Sẵn sàng', 'Hoàn tất']

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

function orderProgress(status: string) {
  if (status === 'Completed') return 3
  if (status === 'Ready' || status === 'Served') return 2
  if (status === 'Confirmed' || status === 'Preparing' || status === 'Cooking') return 1
  return 0
}

function matchesFilter(order: CustomerOrder, filter: OrderFilter) {
  if (filter === 'all') return true
  if (filter === 'active') return activeStatuses.has(order.status)
  if (filter === 'completed') return order.status === 'Completed'
  return order.status === 'Cancelled'
}

function matchesSearch(order: CustomerOrder, query: string) {
  if (!query) return true
  const haystack = [
    order.orderCode,
    order.restaurantTableName,
    order.customerName,
    order.customerPhoneNumber,
    ...order.items.map(item => item.menuItemName),
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase('vi')
  return haystack.includes(query.toLocaleLowerCase('vi'))
}

function OrderProgress({ status }: { status: string }) {
  if (status === 'Cancelled') {
    return (
      <div className="customer-order-progress cancelled" aria-label="Đơn hàng đã hủy">
        <span><CircleX aria-hidden="true" /></span>
        <strong>Đơn hàng đã được hủy</strong>
      </div>
    )
  }

  const current = orderProgress(status)
  return (
    <ol className="customer-order-progress" aria-label="Tiến trình đơn hàng">
      {progressSteps.map((label, index) => (
        <li className={index <= current ? 'complete' : ''} aria-current={index === current ? 'step' : undefined} key={label}>
          <span>{index < current || status === 'Completed' ? <Check aria-hidden="true" /> : index + 1}</span>
          <small>{label}</small>
        </li>
      ))}
    </ol>
  )
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
  const isTakeaway = order.orderType === 'Takeaway'

  return (
    <article className={expanded ? 'customer-order-card expanded' : 'customer-order-card'}>
      <button className="customer-order-card-summary" type="button" onClick={onToggle} aria-expanded={expanded}>
        <div className="customer-order-card-title">
          <span className="customer-order-type-icon" aria-hidden="true">{isTakeaway ? <ShoppingBag /> : <UtensilsCrossed />}</span>
          <div>
            <small>{isTakeaway ? 'Đơn mang về' : 'Dùng tại nhà hàng'}</small>
            <strong>{order.orderCode}</strong>
          </div>
        </div>

        <div className="customer-order-card-meta">
          <span><CalendarDays aria-hidden="true" />{dateTime(order.createdAt)}</span>
          <span><MapPin aria-hidden="true" />{isTakeaway ? 'Nhận tại nhà hàng' : order.restaurantTableName}</span>
          <span><CreditCard aria-hidden="true" />{money(order.totalAmount)}</span>
        </div>

        <span className={`customer-order-status status-${order.status.toLocaleLowerCase()}`}>
          {statusLabels[order.status] || order.status}
        </span>
        <span className="customer-order-expand" aria-hidden="true">{expanded ? <ChevronDown /> : <ChevronRight />}</span>
      </button>

      <div className="customer-order-progress-wrap">
        <OrderProgress status={order.status} />
      </div>

      {expanded ? (
        <div className="customer-order-detail">
          <div className="customer-order-items-heading">
            <span>Món ăn</span><span>Số lượng</span><span>Đơn giá</span><span>Thành tiền</span>
          </div>
          <div className="customer-order-items">
            {order.items.map(item => (
              <div className="customer-order-item-line" key={item.id}>
                <strong>{item.menuItemName}<small>{item.note || ''}</small></strong>
                <span>x{item.quantity}</span>
                <span>{money(item.unitPrice)}</span>
                <span>{money(item.totalPrice)}</span>
              </div>
            ))}
          </div>

          <div className="customer-order-detail-footer">
            <div className="customer-order-note">
              <small>Ghi chú</small>
              <p>{order.note || 'Không có ghi chú cho đơn hàng này.'}</p>
            </div>
            <div className="customer-order-total">
              <small>Tổng giá trị món</small>
              <strong>{money(order.totalAmount)}</strong>
            </div>
          </div>

          {!terminalStatuses.has(order.status) || canOrderMore ? (
            <div className="customer-order-actions">
              {!terminalStatuses.has(order.status) ? <PayOnlineButton orderId={order.id} accessToken={accessToken} className="primary-button compact" /> : null}
              {canOrderMore ? <button className="secondary-button compact" type="button" onClick={() => navigate(`/qr-order/${encodeURIComponent(lastQrToken!)}`)}>Gọi thêm món</button> : null}
            </div>
          ) : null}
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
  const [orderSearch, setOrderSearch] = useState('')
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('all')

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

  const visibleOrders = useMemo(() => {
    const query = orderSearch.trim()
    return history?.items.filter(order => matchesFilter(order, orderFilter) && matchesSearch(order, query)) ?? []
  }, [history?.items, orderFilter, orderSearch])

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
    <main className="account-page account-premium-page page-section">
      <aside className="account-sidebar account-premium-sidebar">
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

      <section className="account-content account-premium-content">
        {tab === 'orders' ? (
          <>
            <header className="orders-hero-heading">
              <div>
                <span className="orders-eyebrow"><Clock3 aria-hidden="true" /> Theo dõi hành trình món ăn</span>
                <h1>Đơn của tôi</h1>
                <p>Xem trạng thái phục vụ, kiểm tra chi tiết món và tiếp tục thanh toán trong cùng một nơi.</p>
              </div>
              <button className="orders-refresh-button" type="button" onClick={() => void loadOrders(page)} disabled={loading}>
                <RefreshCw className={loading ? 'spin' : ''} aria-hidden="true" />
                <span>Cập nhật</span>
              </button>
            </header>

            <div className="orders-toolbar">
              <label className="orders-search">
                <Search aria-hidden="true" />
                <span className="sr-only">Tìm đơn hàng</span>
                <input value={orderSearch} onChange={event => setOrderSearch(event.target.value)} placeholder="Tìm mã đơn, bàn hoặc món ăn…" />
              </label>
              <div className="orders-filter-tabs" role="group" aria-label="Lọc trạng thái đơn hàng">
                {orderFilters.map(filter => (
                  <button type="button" className={orderFilter === filter.value ? 'active' : ''} aria-pressed={orderFilter === filter.value} onClick={() => setOrderFilter(filter.value)} key={filter.value}>{filter.label}</button>
                ))}
              </div>
            </div>

            {history ? (
              <div className="orders-result-summary">
                <span><ClipboardList aria-hidden="true" /> {history.totalCount} đơn trong lịch sử</span>
                {(orderSearch.trim() || orderFilter !== 'all') ? <small>Đang hiển thị {visibleOrders.length} kết quả trên trang {history.pageNumber}.</small> : <small>Trang {history.pageNumber} / {Math.max(history.totalPages, 1)}</small>}
              </div>
            ) : null}

            {error ? <div className="form-notice error" role="alert">{error}</div> : null}
            {loading && !history ? <div className="orders-loading"><RefreshCw className="spin" /> Đang tải đơn hàng…</div> : null}

            {history?.items.length ? (
              visibleOrders.length ? (
                <div className="customer-orders-list">
                  {visibleOrders.map(order => <OrderRow key={order.id} order={order} accessToken={session.token} expanded={expandedId === order.id} onToggle={() => setExpandedId(current => current === order.id ? '' : order.id)} />)}
                  {history.totalPages > 1 ? <div className="pagination orders-pagination"><button type="button" disabled={!history.hasPreviousPage || loading} onClick={() => void loadOrders(page - 1)}>Trang trước</button><span>Trang {history.pageNumber}/{history.totalPages}</span><button type="button" disabled={!history.hasNextPage || loading} onClick={() => void loadOrders(page + 1)}>Trang sau</button></div> : null}
                </div>
              ) : (
                <div className="orders-filter-empty"><Search /><h2>Chưa tìm thấy đơn phù hợp</h2><p>Thử đổi từ khóa hoặc chọn trạng thái khác trong các đơn đang hiển thị.</p><button type="button" onClick={() => { setOrderSearch(''); setOrderFilter('all') }}>Xóa bộ lọc</button></div>
              )
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

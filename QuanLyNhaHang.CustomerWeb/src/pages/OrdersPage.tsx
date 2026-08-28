import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  CreditCard,
  MapPin,
  PackageOpen,
  RefreshCw,
  Search,
  ShoppingBag,
  UtensilsCrossed,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CustomerSession } from '../services/customerAuth'
import {
  cancelCustomerOrder,
  getCustomerOrders,
  type CustomerOrder,
  type CustomerOrderHistory,
} from '../services/customerOrders'
import { CUSTOMER_ORDER_CHANGED_EVENT } from '../services/notifications'
import AuthPortal from '../components/AuthPortal'
import { confirmCustomerAction } from '../components/CustomerConfirmDialog'
import PayOnlineButton from '../components/PayOnlineButton'
import { navigate } from '../utils/navigation'

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

function orderItemsPreview(order: CustomerOrder) {
  const first = order.items[0]
  if (!first) return 'Chưa có món'
  const firstLabel = `${first.menuItemName} ×${first.quantity}`
  return order.items.length > 1 ? `${firstLabel} · +${order.items.length - 1} món` : firstLabel
}

function paymentAmountLabel(order: CustomerOrder) {
  return order.paidAmount != null ? 'Đã thanh toán' : 'Tạm tính món'
}

function paymentAmount(order: CustomerOrder) {
  return order.paidAmount ?? order.totalAmount
}

function readLastQrToken() {
  localStorage.removeItem('customerLastQrToken')
  return sessionStorage.getItem('customerLastQrToken')
}

function OrderRow({
  order,
  expanded,
  accessToken,
  cancelling,
  onToggle,
  onCancel,
}: {
  order: CustomerOrder
  expanded: boolean
  accessToken: string
  cancelling: boolean
  onToggle: () => void
  onCancel: () => void
}) {
  const lastQrToken = readLastQrToken()
  const isTakeaway = order.orderType === 'Takeaway'
  const canOrderMore = !isTakeaway && !terminalStatuses.has(order.status) && Boolean(lastQrToken)
  const canCancel = order.status === 'Pending'

  return (
    <article className={expanded ? 'customer-order-card expanded' : 'customer-order-card'}>
      <button className="customer-order-card-summary" type="button" onClick={onToggle} aria-expanded={expanded}>
        <div className="customer-order-card-title">
          <span className="customer-order-type-icon" aria-hidden="true">{isTakeaway ? <ShoppingBag /> : <UtensilsCrossed />}</span>
          <div>
            <small>{isTakeaway ? 'Mang về' : 'Tại bàn'} · {dateTime(order.createdAt)}</small>
            <strong>{order.orderCode}</strong>
            <span className="customer-order-item-preview">{orderItemsPreview(order)}</span>
          </div>
        </div>

        <div className="customer-order-card-meta">
          <span><MapPin aria-hidden="true" /><b>Nhận món</b>{isTakeaway ? 'Tại nhà hàng' : order.restaurantTableName}</span>
          <span><CreditCard aria-hidden="true" /><b>{paymentAmountLabel(order)}</b>{money(paymentAmount(order))}</span>
        </div>

        <span className={`customer-order-status status-${order.status.toLocaleLowerCase()}`}>
          {statusLabels[order.status] || order.status}
        </span>
        <span className="customer-order-expand" aria-hidden="true">{expanded ? <ChevronDown /> : <ChevronRight />}</span>
      </button>

      {expanded ? (
        <div className="customer-order-detail">
          <div className="customer-order-detail-head">
            <div>
              <small>Chi tiết đơn hàng</small>
              <strong>{order.items.length} món · {money(order.totalAmount)}</strong>
            </div>
            <span className={`customer-order-status status-${order.status.toLocaleLowerCase()}`}>
              {statusLabels[order.status] || order.status}
            </span>
          </div>

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
              <small>{paymentAmountLabel(order)}</small>
              <strong>{money(paymentAmount(order))}</strong>
              {order.paidAmount != null && order.paymentMethod ? <span>{order.paymentMethod}</span> : null}
            </div>
          </div>

          {!terminalStatuses.has(order.status) || canOrderMore ? (
            <div className="customer-order-actions">
              {!terminalStatuses.has(order.status) ? <PayOnlineButton orderId={order.id} accessToken={accessToken} className="primary-button compact" /> : null}
              {canCancel ? (
                <button
                  className="customer-order-cancel-button compact"
                  type="button"
                  disabled={cancelling}
                  onClick={onCancel}
                >
                  <XCircle aria-hidden="true" />
                  {cancelling ? 'Đang hủy…' : 'Hủy đơn'}
                </button>
              ) : null}
              {canOrderMore ? <button className="secondary-button compact" type="button" onClick={() => navigate(`/qr-order/${encodeURIComponent(lastQrToken!)}`)}>Gọi thêm món</button> : null}
            </div>
          ) : null}

          {canCancel ? (
            <p className="customer-order-cancel-hint">Bạn chỉ có thể tự hủy khi đơn còn ở trạng thái Đang chờ và chưa phát sinh thanh toán cần đối soát.</p>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}

export default function OrdersPage({
  session,
  initialMessage,
  onSessionChanged,
}: {
  session: CustomerSession | null
  initialMessage?: string
  onSessionChanged: (session: CustomerSession | null) => void
}) {
  const [history, setHistory] = useState<CustomerOrderHistory | null>(null)
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [cancellingId, setCancellingId] = useState('')
  const [orderSearch, setOrderSearch] = useState('')
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('all')

  const loadOrders = useCallback(async (targetPage: number) => {
    if (!session) return
    setLoading(true)
    setError('')
    try {
      const result = await getCustomerOrders(targetPage, 8)
      setHistory(result)
      setPage(result.pageNumber)
      setExpandedId(current => current && result.items.some(item => item.id === current) ? current : '')
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không tải được đơn hàng.')
    } finally {
      setLoading(false)
    }
  }, [session?.userId])

  useEffect(() => {
    if (session) void loadOrders(1)
  }, [session?.userId, loadOrders])

  useEffect(() => {
    if (!session) return

    const refreshFromNotification = () => {
      void loadOrders(page)
    }

    window.addEventListener(CUSTOMER_ORDER_CHANGED_EVENT, refreshFromNotification)
    return () => window.removeEventListener(CUSTOMER_ORDER_CHANGED_EVENT, refreshFromNotification)
  }, [loadOrders, page, session?.userId])

  const visibleOrders = useMemo(() => {
    const query = orderSearch.trim()
    return history?.items.filter(order => matchesFilter(order, orderFilter) && matchesSearch(order, query)) ?? []
  }, [history?.items, orderFilter, orderSearch])

  async function cancelOrder(order: CustomerOrder) {
    if (cancellingId || order.status !== 'Pending') return

    const confirmed = await confirmCustomerAction(
      `Đơn ${order.orderCode} sẽ được hủy nếu vẫn còn ở trạng thái Đang chờ và chưa phát sinh thanh toán. Bạn có muốn tiếp tục?`,
    )
    if (!confirmed) return

    setCancellingId(order.id)
    setError('')
    setMessage('')
    try {
      const result = await cancelCustomerOrder(order.id)
      setMessage(result.message || `Đã hủy đơn ${order.orderCode}.`)
      await loadOrders(page)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không hủy được đơn hàng.')
    } finally {
      setCancellingId('')
    }
  }

  if (!session) {
    return <AuthPortal initialMessage={initialMessage} onAuthenticated={onSessionChanged} />
  }

  return (
    <main className="orders-premium-page page-section">
      <section className="orders-premium-content">
        <header className="orders-hero-heading">
          <div>
            <h1>Đơn của tôi</h1>
            <p>Theo dõi đơn đang xử lý và xem lại lịch sử đặt món của bạn.</p>
          </div>
          <div className="orders-hero-actions">
            {history ? <span className="orders-history-count"><ClipboardList aria-hidden="true" /><strong>{history.totalCount}</strong><small>đơn hàng</small></span> : null}
            <button className="orders-refresh-button" type="button" onClick={() => void loadOrders(page)} disabled={loading}>
              <RefreshCw className={loading ? 'spin' : ''} aria-hidden="true" />
              <span>Cập nhật</span>
            </button>
          </div>
        </header>

        <div className="orders-toolbar">
          <label className="orders-search">
            <Search aria-hidden="true" />
            <span className="sr-only">Tìm đơn hàng</span>
            <input
              value={orderSearch}
              onChange={event => setOrderSearch(event.target.value)}
              placeholder="Tìm mã đơn, bàn hoặc món ăn…"
              autoComplete="off"
            />
          </label>
          <div className="orders-filter-tabs" role="group" aria-label="Lọc trạng thái đơn hàng">
            {orderFilters.map(filter => (
              <button type="button" className={orderFilter === filter.value ? 'active' : ''} aria-pressed={orderFilter === filter.value} onClick={() => setOrderFilter(filter.value)} key={filter.value}>{filter.label}</button>
            ))}
          </div>
        </div>

        {history ? (
          <div className="orders-result-summary">
            <span><ClipboardList aria-hidden="true" /> Danh sách đơn hàng</span>
            {(orderSearch.trim() || orderFilter !== 'all') ? <small>{visibleOrders.length} kết quả trên trang {history.pageNumber}</small> : <small>Trang {history.pageNumber} / {Math.max(history.totalPages, 1)}</small>}
          </div>
        ) : null}

        {message ? <div className="form-notice success" role="status">{message}</div> : null}
        {error ? <div className="form-notice error" role="alert">{error}</div> : null}
        {loading && !history ? <div className="orders-loading"><RefreshCw className="spin" /> Đang tải đơn hàng…</div> : null}

        {history?.items.length ? (
          visibleOrders.length ? (
            <div className="customer-orders-list">
              {visibleOrders.map(order => (
                <OrderRow
                  key={order.id}
                  order={order}
                  accessToken={session.token}
                  expanded={expandedId === order.id}
                  cancelling={cancellingId === order.id}
                  onToggle={() => setExpandedId(current => current === order.id ? '' : order.id)}
                  onCancel={() => void cancelOrder(order)}
                />
              ))}
              {history.totalPages > 1 ? <div className="pagination orders-pagination"><button type="button" disabled={!history.hasPreviousPage || loading} onClick={() => void loadOrders(page - 1)}>Trang trước</button><span>Trang {history.pageNumber}/{history.totalPages}</span><button type="button" disabled={!history.hasNextPage || loading} onClick={() => void loadOrders(page + 1)}>Trang sau</button></div> : null}
            </div>
          ) : (
            <div className="orders-filter-empty"><Search /><h2>Chưa tìm thấy đơn phù hợp</h2><p>Thử đổi từ khóa hoặc chọn trạng thái khác trong các đơn đang hiển thị.</p><button type="button" onClick={() => { setOrderSearch(''); setOrderFilter('all') }}>Xóa bộ lọc</button></div>
          )
        ) : history && !loading ? (
          <div className="account-empty"><PackageOpen /><h2>Chưa có đơn hàng nào</h2><p>Khi gọi món bằng QR trong lúc đăng nhập, đơn sẽ xuất hiện tại đây.</p><button className="secondary-button" type="button" onClick={() => navigate('/menu')}>Xem thực đơn</button></div>
        ) : null}
      </section>
    </main>
  )
}

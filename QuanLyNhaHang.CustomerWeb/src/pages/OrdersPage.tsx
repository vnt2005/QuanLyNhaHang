import {
  ChevronDown,
  ChevronUp,
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value)
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function matchesFilter(order: CustomerOrder, filter: OrderFilter) {
  if (filter === 'all') return true
  if (filter === 'active') return activeStatuses.has(order.status)
  if (filter === 'completed') return order.status === 'Completed'
  return order.status === 'Cancelled'
}

function matchesSearch(order: CustomerOrder, query: string) {
  if (!query) return true
  const haystack = [order.orderCode, order.restaurantTableName, order.customerName, order.customerPhoneNumber, ...order.items.map(item => item.menuItemName)]
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

function OrderCard({
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
    <article className={`bistro-order-card ${expanded ? 'expanded' : ''}`}>
      <div className="order-card-status-rail" aria-hidden="true" />
      <header>
        <span className="order-type-icon">{isTakeaway ? <ShoppingBag /> : <UtensilsCrossed />}</span>
        <div className="order-card-title">
          <small>{isTakeaway ? 'MANG VỀ' : 'TẠI BÀN'} · {dateTime(order.createdAt)}</small>
          <h2>{order.orderCode}</h2>
          <p>{orderItemsPreview(order)}</p>
        </div>
        <Badge variant={order.status === 'Cancelled' ? 'destructive' : 'secondary'}>{statusLabels[order.status] || order.status}</Badge>
      </header>

      <div className="order-card-facts">
        <span><MapPin /><small>Nhận món</small><strong>{isTakeaway ? 'Tại nhà hàng' : order.restaurantTableName}</strong></span>
        <span><CreditCard /><small>{paymentAmountLabel(order)}</small><strong>{money(paymentAmount(order))}</strong></span>
      </div>

      <button className="order-card-expand" type="button" onClick={onToggle} aria-expanded={expanded}>
        <span>{expanded ? 'Thu gọn' : 'Xem chi tiết'}</span>{expanded ? <ChevronUp /> : <ChevronDown />}
      </button>

      {expanded ? (
        <div className="order-card-detail">
          <div className="order-card-lines">
            {order.items.map(item => (
              <div key={item.id}>
                <span><strong>{item.menuItemName}</strong>{item.note ? <small>{item.note}</small> : null}</span>
                <span>x{item.quantity}</span>
                <span>{money(item.unitPrice)}</span>
                <strong>{money(item.totalPrice)}</strong>
              </div>
            ))}
          </div>

          <div className="order-card-detail-bottom">
            <div><small>Ghi chú</small><p>{order.note || 'Không có ghi chú cho đơn hàng này.'}</p></div>
            <div><small>{paymentAmountLabel(order)}</small><strong>{money(paymentAmount(order))}</strong>{order.paidAmount != null && order.paymentMethod ? <span>{order.paymentMethod}</span> : null}</div>
          </div>

          {!terminalStatuses.has(order.status) || canOrderMore ? (
            <div className="order-card-actions">
              {!terminalStatuses.has(order.status) ? <PayOnlineButton orderId={order.id} accessToken={accessToken} /> : null}
              {canCancel ? <Button variant="destructive" disabled={cancelling} onClick={onCancel}><XCircle />{cancelling ? 'Đang hủy…' : 'Hủy đơn'}</Button> : null}
              {canOrderMore ? <Button variant="outline" onClick={() => navigate(`/qr-order/${encodeURIComponent(lastQrToken!)}`)}>Gọi thêm món</Button> : null}
            </div>
          ) : null}

          {canCancel ? <p className="order-cancel-hint">Bạn chỉ có thể tự hủy khi đơn còn ở trạng thái Đang chờ và chưa phát sinh thanh toán cần đối soát.</p> : null}
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

  useEffect(() => { if (session) void loadOrders(1) }, [session?.userId, loadOrders])

  useEffect(() => {
    if (!session) return
    const refreshFromNotification = () => { void loadOrders(page) }
    window.addEventListener(CUSTOMER_ORDER_CHANGED_EVENT, refreshFromNotification)
    return () => window.removeEventListener(CUSTOMER_ORDER_CHANGED_EVENT, refreshFromNotification)
  }, [loadOrders, page, session?.userId])

  const visibleOrders = useMemo(() => {
    const query = orderSearch.trim()
    return history?.items.filter(order => matchesFilter(order, orderFilter) && matchesSearch(order, query)) ?? []
  }, [history?.items, orderFilter, orderSearch])

  async function cancelOrder(order: CustomerOrder) {
    if (cancellingId || order.status !== 'Pending') return
    const confirmed = await confirmCustomerAction(`Đơn ${order.orderCode} sẽ được hủy nếu vẫn còn ở trạng thái Đang chờ và chưa phát sinh thanh toán. Bạn có muốn tiếp tục?`)
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

  if (!session) return <AuthPortal initialMessage={initialMessage} onAuthenticated={onSessionChanged} />

  return (
    <main className="bistro-orders-page">
      <header className="bistro-orders-heading">
        <div>
          <span>LỊCH SỬ KHÁCH HÀNG</span>
          <h1>Đơn của tôi.</h1>
          <p>Theo dõi đơn đang xử lý và xem lại những lần gọi món trước đây.</p>
        </div>
        <div className="orders-total-bubble"><ClipboardList /><span><small>Tổng cộng</small><strong>{history?.totalCount ?? '—'} đơn</strong></span></div>
      </header>

      <section className="bistro-orders-toolbar">
        <label><Search /><Input value={orderSearch} onChange={event => setOrderSearch(event.target.value)} placeholder="Tìm mã đơn, bàn hoặc món ăn..." autoComplete="off" /></label>
        <div>{orderFilters.map(filter => <Button key={filter.value} size="sm" variant={orderFilter === filter.value ? 'default' : 'outline'} onClick={() => setOrderFilter(filter.value)}>{filter.label}</Button>)}</div>
        <Button variant="ghost" onClick={() => void loadOrders(page)} disabled={loading}><RefreshCw className={loading ? 'animate-spin' : ''} />Cập nhật</Button>
      </section>

      {message ? <Alert className="mb-5"><AlertTitle>Đã cập nhật</AlertTitle><AlertDescription>{message}</AlertDescription></Alert> : null}
      {error ? <Alert variant="destructive" className="mb-5"><AlertTitle>Không thể tải đơn</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

      {history?.items.length ? (
        visibleOrders.length ? (
          <>
            <div className="bistro-order-grid">
              {visibleOrders.map(order => (
                <OrderCard
                  key={order.id}
                  order={order}
                  accessToken={session.token}
                  expanded={expandedId === order.id}
                  cancelling={cancellingId === order.id}
                  onToggle={() => setExpandedId(current => current === order.id ? '' : order.id)}
                  onCancel={() => void cancelOrder(order)}
                />
              ))}
            </div>
            {history.totalPages > 1 ? (
              <nav className="bistro-orders-pagination">
                <Button variant="outline" disabled={!history.hasPreviousPage || loading} onClick={() => void loadOrders(page - 1)}>Trang trước</Button>
                <span>Trang <strong>{history.pageNumber}</strong> / {history.totalPages}</span>
                <Button variant="outline" disabled={!history.hasNextPage || loading} onClick={() => void loadOrders(page + 1)}>Trang sau</Button>
              </nav>
            ) : null}
          </>
        ) : (
          <section className="bistro-orders-empty"><Search /><h2>Không thấy đơn phù hợp.</h2><p>Đổi từ khóa hoặc trạng thái lọc để xem lại.</p><Button variant="outline" onClick={() => { setOrderSearch(''); setOrderFilter('all') }}>Xóa bộ lọc</Button></section>
        )
      ) : history && !loading ? (
        <section className="bistro-orders-empty"><PackageOpen /><h2>Chưa có đơn hàng.</h2><p>Khi bạn gọi món hoặc đặt mang về trong lúc đăng nhập, đơn sẽ xuất hiện tại đây.</p><Button onClick={() => navigate('/menu')}>Xem thực đơn</Button></section>
      ) : (
        <section className="bistro-orders-empty"><RefreshCw className="animate-spin" /><h2>Đang tải đơn hàng…</h2></section>
      )}
    </main>
  )
}

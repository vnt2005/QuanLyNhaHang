import {
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
  return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value))
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
    <article className="border border-border bg-background">
      <button className="grid w-full gap-5 p-5 text-left md:grid-cols-[1.3fr_.9fr_auto_auto] md:items-center md:p-6" type="button" onClick={onToggle} aria-expanded={expanded}>
        <div className="flex min-w-0 gap-4">
          <span className="grid size-11 shrink-0 place-items-center border border-border">{isTakeaway ? <ShoppingBag className="size-4" /> : <UtensilsCrossed className="size-4" />}</span>
          <div className="min-w-0">
            <small className="block text-[9px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">{isTakeaway ? 'Mang về' : 'Tại bàn'} · {dateTime(order.createdAt)}</small>
            <strong className="mt-1 block truncate font-heading text-2xl font-medium">{order.orderCode}</strong>
            <span className="mt-1 block truncate text-xs text-muted-foreground">{orderItemsPreview(order)}</span>
          </div>
        </div>
        <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 md:grid-cols-1">
          <span className="flex items-center gap-2"><MapPin className="size-3.5" />{isTakeaway ? 'Tại nhà hàng' : order.restaurantTableName}</span>
          <span className="flex items-center gap-2"><CreditCard className="size-3.5" />{money(paymentAmount(order))}</span>
        </div>
        <Badge variant={order.status === 'Cancelled' ? 'destructive' : 'secondary'}>{statusLabels[order.status] || order.status}</Badge>
        <span className="justify-self-end text-muted-foreground" aria-hidden="true">{expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}</span>
      </button>

      {expanded ? (
        <div className="border-t border-border px-5 py-6 md:px-6">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
            <div><small className="text-[9px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Chi tiết đơn hàng</small><strong className="mt-2 block font-heading text-2xl font-medium">{order.items.length} món · {money(order.totalAmount)}</strong></div>
            <Badge variant={order.status === 'Cancelled' ? 'destructive' : 'outline'}>{statusLabels[order.status] || order.status}</Badge>
          </div>

          <div className="mt-3 hidden grid-cols-[1.4fr_.45fr_.65fr_.65fr] gap-4 border-b border-border py-3 text-[9px] font-semibold tracking-[0.14em] text-muted-foreground uppercase sm:grid"><span>Món ăn</span><span>Số lượng</span><span>Đơn giá</span><span className="text-right">Thành tiền</span></div>
          <div className="divide-y divide-border">
            {order.items.map(item => <div className="grid gap-2 py-4 text-sm sm:grid-cols-[1.4fr_.45fr_.65fr_.65fr] sm:gap-4" key={item.id}><strong className="font-medium">{item.menuItemName}{item.note ? <small className="mt-1 block text-xs font-normal text-muted-foreground">{item.note}</small> : null}</strong><span>x{item.quantity}</span><span>{money(item.unitPrice)}</span><span className="font-semibold sm:text-right">{money(item.totalPrice)}</span></div>)}
          </div>

          <div className="mt-5 grid gap-6 border-t border-border pt-5 sm:grid-cols-[1fr_auto]">
            <div><small className="text-[9px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Ghi chú</small><p className="mt-2 max-w-xl text-xs leading-5 text-muted-foreground">{order.note || 'Không có ghi chú cho đơn hàng này.'}</p></div>
            <div className="sm:text-right"><small className="text-[9px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">{paymentAmountLabel(order)}</small><strong className="mt-2 block text-xl">{money(paymentAmount(order))}</strong>{order.paidAmount != null && order.paymentMethod ? <span className="mt-1 block text-xs text-muted-foreground">{order.paymentMethod}</span> : null}</div>
          </div>

          {!terminalStatuses.has(order.status) || canOrderMore ? <div className="mt-6 flex flex-wrap gap-3 border-t border-border pt-5">{!terminalStatuses.has(order.status) ? <PayOnlineButton orderId={order.id} accessToken={accessToken} /> : null}{canCancel ? <Button variant="destructive" type="button" disabled={cancelling} onClick={onCancel}><XCircle data-icon="inline-start" />{cancelling ? 'Đang hủy…' : 'Hủy đơn'}</Button> : null}{canOrderMore ? <Button variant="outline" type="button" onClick={() => navigate(`/qr-order/${encodeURIComponent(lastQrToken!)}`)}>Gọi thêm món</Button> : null}</div> : null}
          {canCancel ? <p className="mt-4 text-[11px] leading-5 text-muted-foreground">Bạn chỉ có thể tự hủy khi đơn còn ở trạng thái Đang chờ và chưa phát sinh thanh toán cần đối soát.</p> : null}
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
    <main className="bg-background text-foreground">
      <section className="mx-auto w-[min(1320px,calc(100vw-48px))] py-14 sm:w-[min(1320px,calc(100vw-80px))] md:py-20">
        <header className="grid gap-7 border-b border-border pb-9 md:grid-cols-[1fr_auto] md:items-end">
          <div><p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">Lịch sử khách hàng</p><h1 className="mt-3 font-heading text-[clamp(4rem,6vw,7rem)] leading-[0.88] tracking-[-0.055em]">Đơn của tôi.</h1><p className="mt-5 text-sm leading-7 text-muted-foreground">Theo dõi đơn đang xử lý và xem lại lịch sử đặt món của bạn.</p></div>
          <div className="flex items-center gap-3">{history ? <span className="text-xs text-muted-foreground"><strong className="text-xl text-foreground">{history.totalCount}</strong> đơn hàng</span> : null}<Button variant="outline" type="button" onClick={() => void loadOrders(page)} disabled={loading}><RefreshCw className={loading ? 'animate-spin' : ''} data-icon="inline-start" />Cập nhật</Button></div>
        </header>

        <div className="mt-8 grid gap-5 border-b border-border pb-7 lg:grid-cols-[1fr_auto] lg:items-center">
          <label className="relative block max-w-xl border-b border-foreground"><Search className="absolute left-0 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input value={orderSearch} onChange={event => setOrderSearch(event.target.value)} placeholder="Tìm mã đơn, bàn hoặc món ăn…" autoComplete="off" className="h-11 border-0 bg-transparent pl-7 shadow-none focus-visible:ring-0" /></label>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc trạng thái đơn hàng">{orderFilters.map(filter => <Button key={filter.value} type="button" size="xs" variant={orderFilter === filter.value ? 'default' : 'outline'} onClick={() => setOrderFilter(filter.value)}>{filter.label}</Button>)}</div>
        </div>

        {history ? <div className="mt-6 flex items-center justify-between gap-4 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase"><span className="inline-flex items-center gap-2"><ClipboardList className="size-3.5" /> Danh sách đơn hàng</span><span>{orderSearch.trim() || orderFilter !== 'all' ? `${visibleOrders.length} kết quả` : `Trang ${history.pageNumber} / ${Math.max(history.totalPages, 1)}`}</span></div> : null}
        {message ? <Alert className="mt-6"><AlertTitle>Đã cập nhật</AlertTitle><AlertDescription>{message}</AlertDescription></Alert> : null}
        {error ? <Alert variant="destructive" className="mt-6"><AlertTitle>Không tải được đơn hàng</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        {loading && !history ? <div className="mt-10 flex items-center gap-3 border border-border p-6 text-sm text-muted-foreground"><RefreshCw className="size-4 animate-spin" /> Đang tải đơn hàng…</div> : null}

        {history?.items.length ? visibleOrders.length ? <div className="mt-7 grid gap-4">{visibleOrders.map(order => <OrderRow key={order.id} order={order} accessToken={session.token} expanded={expandedId === order.id} cancelling={cancellingId === order.id} onToggle={() => setExpandedId(current => current === order.id ? '' : order.id)} onCancel={() => void cancelOrder(order)} />)}{history.totalPages > 1 ? <div className="mt-5 flex items-center justify-center gap-4 border-t border-border pt-7"><Button variant="outline" type="button" disabled={!history.hasPreviousPage || loading} onClick={() => void loadOrders(page - 1)}>Trang trước</Button><span className="text-xs text-muted-foreground">Trang {history.pageNumber}/{history.totalPages}</span><Button variant="outline" type="button" disabled={!history.hasNextPage || loading} onClick={() => void loadOrders(page + 1)}>Trang sau</Button></div> : null}</div> : <div className="mt-10 grid min-h-72 place-items-center border border-dashed border-border text-center"><div><Search className="mx-auto mb-4 size-6 text-muted-foreground" /><h2 className="font-heading text-3xl">Chưa tìm thấy đơn phù hợp</h2><p className="mt-3 text-sm text-muted-foreground">Thử đổi từ khóa hoặc trạng thái.</p><Button className="mt-6" variant="outline" type="button" onClick={() => { setOrderSearch(''); setOrderFilter('all') }}>Xóa bộ lọc</Button></div></div> : history && !loading ? <div className="mt-10 grid min-h-72 place-items-center border border-dashed border-border text-center"><div><PackageOpen className="mx-auto mb-4 size-6 text-muted-foreground" /><h2 className="font-heading text-3xl">Chưa có đơn hàng nào</h2><p className="mt-3 text-sm text-muted-foreground">Khi gọi món hoặc đặt mang về, đơn sẽ xuất hiện tại đây.</p><Button className="mt-6" variant="outline" type="button" onClick={() => navigate('/menu')}>Xem thực đơn</Button></div></div> : null}
      </section>
    </main>
  )
}

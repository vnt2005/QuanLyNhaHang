import { ChevronDown, ChevronUp, ClipboardList, CreditCard, MapPin, PackageOpen, RefreshCw, Search, ShoppingBag, UtensilsCrossed, XCircle } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { CustomerSession } from '../services/customerAuth'
import { cancelCustomerOrder, getCustomerOrders, type CustomerOrder, type CustomerOrderFilter, type CustomerOrderHistory } from '../services/customerOrders'
import { CUSTOMER_ORDER_CHANGED_EVENT } from '../services/notifications'
import AuthPortal from '../components/AuthPortal'
import { confirmCustomerAction } from '../components/CustomerConfirmDialog'
import PayOnlineButton from '../components/PayOnlineButton'
import { navigate } from '../utils/navigation'
import { getCustomerQrTokenForTable } from '../utils/customerQrAccess'

const terminalStatuses = new Set(['Completed', 'Cancelled'])
const statusLabels: Record<string, string> = { Pending: 'Đang chờ', Confirmed: 'Đã xác nhận', Preparing: 'Đang chuẩn bị', Cooking: 'Đang chế biến', Ready: 'Sẵn sàng phục vụ', Served: 'Đã phục vụ', Completed: 'Đã hoàn thành', Cancelled: 'Đã hủy' }
const orderFilters: Array<{ value: CustomerOrderFilter; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'active', label: 'Đang xử lý' },
  { value: 'completed', label: 'Đã hoàn thành' },
  { value: 'paid', label: 'Đã thanh toán' },
  { value: 'cancelled', label: 'Đã hủy' },
]

function money(value: number) { return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value) }
function dateTime(value: string) { return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) }
function orderItemsPreview(order: CustomerOrder) { const first = order.items[0]; if (!first) return 'Chưa có món'; const firstLabel = `${first.menuItemName} ×${first.quantity}`; return order.items.length > 1 ? `${firstLabel} · +${order.items.length - 1} món` : firstLabel }
function paymentAmountLabel(order: CustomerOrder) { return order.paidAmount != null ? 'Đã thanh toán' : 'Tạm tính món' }
function paymentAmount(order: CustomerOrder) { return order.paidAmount ?? order.totalAmount }
function paymentStatusLabel(order: CustomerOrder) { return order.paidAmount != null ? 'Đã thanh toán' : 'Chưa thanh toán' }

function OrderRow({ order, expanded, accessToken, cancelling, onToggle, onCancel }: { order: CustomerOrder; expanded: boolean; accessToken: string; cancelling: boolean; onToggle: () => void; onCancel: () => void }) {
  const tableQrToken = getCustomerQrTokenForTable(order.restaurantTableId)
  const isTakeaway = order.orderType === 'Takeaway'
  const canOrderMore = !isTakeaway && !terminalStatuses.has(order.status) && Boolean(tableQrToken)
  const canCancel = order.status === 'Pending'

  return (
    <article className="border-b border-border">
      <button type="button" className="grid w-full grid-cols-[42px_minmax(0,1.4fr)_minmax(120px,.6fr)_minmax(120px,.5fr)_auto] items-center gap-5 py-5 text-left max-md:grid-cols-[36px_1fr_auto]" onClick={onToggle} aria-expanded={expanded}>
        <span className="grid size-10 place-items-center border border-border text-accent max-md:size-9">{isTakeaway ? <ShoppingBag className="size-4" /> : <UtensilsCrossed className="size-4" />}</span>
        <span><small className="sera-kicker">{isTakeaway ? 'Mang về' : 'Tại bàn'} · {dateTime(order.createdAt)}</small><strong className="mt-1 block font-heading text-2xl font-medium">{order.orderCode}</strong><span className="mt-1 block text-xs text-muted-foreground">{orderItemsPreview(order)}</span></span>
        <span className="max-md:hidden"><small className="block text-xs text-muted-foreground">Nhận món</small><strong className="text-sm">{isTakeaway ? 'Tại nhà hàng' : order.restaurantTableName}</strong></span>
        <span className="max-md:hidden"><small className="block text-xs text-muted-foreground">{paymentAmountLabel(order)}</small><strong className="text-sm">{money(paymentAmount(order))}</strong></span>
        <span className="flex flex-wrap items-center justify-end gap-2 max-md:flex-col max-md:items-end"><Badge variant={order.status === 'Cancelled' ? 'destructive' : 'secondary'}>{statusLabels[order.status] || order.status}</Badge><Badge variant={order.paidAmount != null ? 'default' : 'outline'}>{paymentStatusLabel(order)}</Badge>{expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}</span>
      </button>

      {expanded ? (
        <div className="grid gap-7 border-t border-border bg-muted/30 px-5 py-6 lg:grid-cols-[1fr_280px]">
          <div>
            <div className="border-t border-border">
              {order.items.map(item => <div className="grid grid-cols-[1fr_60px_120px] gap-3 border-b border-border py-3 text-sm" key={item.id}><span><strong>{item.menuItemName}</strong>{item.note ? <small className="block text-muted-foreground">{item.note}</small> : null}</span><span>x{item.quantity}</span><strong className="text-right">{money(item.totalPrice)}</strong></div>)}
            </div>
            <div className="mt-5"><small className="sera-kicker">Ghi chú</small><p className="mt-2 text-sm text-muted-foreground">{order.note || 'Không có ghi chú cho đơn hàng này.'}</p></div>
          </div>
          <aside className="border-l border-border pl-6 max-lg:border-l-0 max-lg:border-t max-lg:pl-0 max-lg:pt-5">
            <div className="flex items-start gap-3"><CreditCard className="size-5 text-accent" /><div><small className="block text-muted-foreground">{paymentAmountLabel(order)}</small><strong className="text-xl">{money(paymentAmount(order))}</strong>{order.paidAmount != null && order.paymentMethod ? <span className="mt-1 block text-xs text-muted-foreground">{order.paymentMethod}</span> : null}</div></div>
            <div className="mt-4 flex items-start gap-3"><MapPin className="size-5 text-accent" /><div><small className="block text-muted-foreground">Nhận món</small><strong className="text-sm">{isTakeaway ? 'Tại nhà hàng' : order.restaurantTableName}</strong></div></div>
            {!terminalStatuses.has(order.status) || canOrderMore ? <div className="mt-6 grid gap-2">{!terminalStatuses.has(order.status) ? <PayOnlineButton orderId={order.id} accessToken={accessToken} /> : null}{canCancel ? <Button variant="destructive" disabled={cancelling} onClick={event => { event.stopPropagation(); onCancel() }}><XCircle />{cancelling ? 'Đang hủy…' : 'Hủy đơn'}</Button> : null}{canOrderMore && tableQrToken ? <Button variant="outline" onClick={() => navigate(`/qr-order/${encodeURIComponent(tableQrToken)}`)}>Gọi thêm món</Button> : null}</div> : null}
            {canCancel ? <p className="mt-3 text-xs leading-5 text-muted-foreground">Bạn chỉ có thể tự hủy khi đơn còn ở trạng thái Đang chờ và chưa phát sinh thanh toán cần đối soát.</p> : null}
          </aside>
        </div>
      ) : null}
    </article>
  )
}

export default function OrdersPage({ session, initialMessage, onSessionChanged }: { session: CustomerSession | null; initialMessage?: string; onSessionChanged: (session: CustomerSession | null) => void }) {
  const [history, setHistory] = useState<CustomerOrderHistory | null>(null)
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [cancellingId, setCancellingId] = useState('')
  const [orderSearch, setOrderSearch] = useState('')
  const [debouncedOrderSearch, setDebouncedOrderSearch] = useState('')
  const [orderFilter, setOrderFilter] = useState<CustomerOrderFilter>('all')
  const loadRequestRef = useRef(0)
  const ordersListRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedOrderSearch(orderSearch.trim()), 250)
    return () => window.clearTimeout(timer)
  }, [orderSearch])

  const loadOrders = useCallback(async (targetPage: number) => {
    if (!session) return null
    const requestId = ++loadRequestRef.current
    setLoading(true)
    setError('')
    try {
      const result = await getCustomerOrders(targetPage, 8, orderFilter, debouncedOrderSearch)
      if (loadRequestRef.current !== requestId) return null
      setHistory(result)
      setPage(result.pageNumber)
      setExpandedId(current => current && result.items.some(item => item.id === current) ? current : '')
      return result.pageNumber
    } catch (exception) {
      if (loadRequestRef.current !== requestId) return null
      setError(exception instanceof Error ? exception.message : 'Không tải được đơn hàng.')
      return null
    } finally {
      if (loadRequestRef.current === requestId) setLoading(false)
    }
  }, [session?.userId, orderFilter, debouncedOrderSearch])

  useEffect(() => {
    if (session) void loadOrders(1)
    else loadRequestRef.current += 1
    return () => { loadRequestRef.current += 1 }
  }, [session?.userId, loadOrders])

  useEffect(() => {
    if (!session) return
    const refreshFromNotification = () => { void loadOrders(page) }
    window.addEventListener(CUSTOMER_ORDER_CHANGED_EVENT, refreshFromNotification)
    return () => window.removeEventListener(CUSTOMER_ORDER_CHANGED_EVENT, refreshFromNotification)
  }, [loadOrders, page, session?.userId])

  const hasActiveFilter = orderFilter !== 'all' || debouncedOrderSearch.length > 0

  function scrollToOrdersStart() {
    const list = ordersListRef.current
    if (!list) return

    const stickyHeader = document.querySelector<HTMLElement>('.sera-header')
    const headerOffset = (stickyHeader?.getBoundingClientRect().height ?? 0) + 16
    const top = Math.max(0, list.getBoundingClientRect().top + window.scrollY - headerOffset)
    const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'

    window.scrollTo({ top, behavior })
  }

  async function changePage(targetPage: number) {
    if (loading || targetPage === page) return
    const loadedPage = await loadOrders(targetPage)
    if (loadedPage !== targetPage) return
    window.requestAnimationFrame(() => scrollToOrdersStart())
  }

  async function cancelOrder(order: CustomerOrder) {
    if (cancellingId || order.status !== 'Pending') return
    const confirmed = await confirmCustomerAction(`Đơn ${order.orderCode} sẽ được hủy nếu vẫn còn ở trạng thái Đang chờ và chưa phát sinh thanh toán. Bạn có muốn tiếp tục?`)
    if (!confirmed) return
    setCancellingId(order.id); setError(''); setMessage('')
    try { const result = await cancelCustomerOrder(order.id); setMessage(result.message || `Đã hủy đơn ${order.orderCode}.`); await loadOrders(page) }
    catch (exception) { setError(exception instanceof Error ? exception.message : 'Không hủy được đơn hàng.') }
    finally { setCancellingId('') }
  }

  if (!session) return <AuthPortal initialMessage={initialMessage} onAuthenticated={onSessionChanged} />

  return (
    <main className="sera-page">
      <header className="sera-page-head">
        <div><p className="sera-kicker">Lịch sử khách hàng</p><h1 className="sera-display mt-3">Đơn của tôi.</h1><p>Theo dõi đơn đang xử lý và xem lại những lần gọi món trước đây.</p></div>
        <div className="sera-page-summary"><div className="flex items-center gap-3"><ClipboardList className="size-5 text-accent" /><span><small className="block">{hasActiveFilter ? 'Kết quả' : 'Tổng cộng'}</small><strong className="text-foreground">{history?.totalCount ?? '—'} đơn</strong></span></div></div>
      </header>

      <section className="mt-7 grid gap-4 border-b border-border pb-5 lg:grid-cols-[1fr_auto_auto] lg:items-center">
        <label className="sera-search"><Search /><Input value={orderSearch} onChange={event => setOrderSearch(event.target.value)} placeholder="Tìm mã đơn, bàn hoặc món ăn..." autoComplete="off" /></label>
        <div className="flex flex-wrap gap-2">{orderFilters.map(filter => <Button key={filter.value} size="sm" variant={orderFilter === filter.value ? 'default' : 'outline'} onClick={() => setOrderFilter(filter.value)}>{filter.label}</Button>)}</div>
        <Button variant="ghost" onClick={() => void loadOrders(page)} disabled={loading}><RefreshCw className={loading ? 'animate-spin' : ''} />Cập nhật</Button>
      </section>

      {message ? <Alert className="mt-5"><AlertTitle>Đã cập nhật</AlertTitle><AlertDescription>{message}</AlertDescription></Alert> : null}
      {error ? <Alert variant="destructive" className="mt-5"><AlertTitle>Không thể tải đơn</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

      {history?.items.length ? <>
        <div ref={ordersListRef} className="mt-7 border-t border-border">{history.items.map(order => <OrderRow key={order.id} order={order} accessToken={session.token} expanded={expandedId === order.id} cancelling={cancellingId === order.id} onToggle={() => setExpandedId(current => current === order.id ? '' : order.id)} onCancel={() => void cancelOrder(order)} />)}</div>
        {history.totalPages > 1 ? <nav className="sera-menu-pagination"><Button variant="outline" disabled={!history.hasPreviousPage || loading} onClick={() => void changePage(page - 1)}>Trang trước</Button><span>Trang <strong>{history.pageNumber}</strong> / {history.totalPages}</span><Button variant="outline" disabled={!history.hasNextPage || loading} onClick={() => void changePage(page + 1)}>Trang sau</Button></nav> : null}
      </> : history && !loading && hasActiveFilter ? <section className="sera-empty mt-7"><div><Search /><h2>Không thấy đơn phù hợp.</h2><p>Không có đơn nào trong toàn bộ lịch sử khớp bộ lọc hoặc từ khóa hiện tại.</p><Button variant="outline" onClick={() => { setOrderSearch(''); setOrderFilter('all') }}>Xóa bộ lọc</Button></div></section> : history && !loading ? <section className="sera-empty mt-7"><div><PackageOpen /><h2>Chưa có đơn hàng.</h2><p>Khi bạn gọi món hoặc đặt mang về trong lúc đăng nhập, đơn sẽ xuất hiện tại đây.</p><Button onClick={() => navigate('/menu')}>Xem thực đơn</Button></div></section> : <section className="sera-empty mt-7"><div><RefreshCw className="animate-spin" /><h2>Đang tải đơn hàng…</h2></div></section>}
    </main>
  )
}

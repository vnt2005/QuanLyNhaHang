import {
  CheckCircle2,
  ChevronLeft,
  Minus,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  UserRound,
  Utensils,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useVisiblePolling } from '../hooks/useVisiblePolling'
import type { CustomerSession } from '../services/customerAuth'
import { cancelCustomerOrder, claimCustomerOrder, type CustomerOrder } from '../services/customerOrders'
import { CUSTOMER_ORDER_CHANGED_EVENT } from '../services/notifications'
import {
  createQrOrder,
  getQrOrder,
  getQrOrderContext,
  type QrMenuItem,
  type QrOrderTable,
} from '../services/qrOrders'
import { confirmCustomerAction } from '../components/CustomerConfirmDialog'
import PayOnlineButton from '../components/PayOnlineButton'
import heroImage from '../assets/hero-vietnamese-table.webp'
import { navigate } from '../utils/navigation'

type Cart = Record<string, number>

const MAX_ITEM_QUANTITY = 5
const MAX_ORDER_QUANTITY = 50
const terminalStatuses = new Set(['Completed', 'Cancelled'])
const statusLabels: Record<string, string> = {
  Pending: 'Đã tiếp nhận',
  Confirmed: 'Đã xác nhận',
  Preparing: 'Đang chuẩn bị',
  Cooking: 'Đang chế biến',
  Ready: 'Sẵn sàng phục vụ',
  Served: 'Đã phục vụ',
  Completed: 'Đã hoàn thành',
  Cancelled: 'Đã hủy',
}

function normalizeCart(value: Cart): Cart {
  const normalized: Cart = {}
  let remaining = MAX_ORDER_QUANTITY

  for (const [itemId, rawQuantity] of Object.entries(value)) {
    if (remaining <= 0) break
    const numericQuantity = Number(rawQuantity)
    if (!Number.isFinite(numericQuantity)) continue
    const quantity = Math.min(MAX_ITEM_QUANTITY, Math.max(0, Math.floor(numericQuantity)), remaining)
    if (quantity <= 0) continue
    normalized[itemId] = quantity
    remaining -= quantity
  }

  return normalized
}

function readSessionValue(key: string) {
  localStorage.removeItem(key)
  return sessionStorage.getItem(key)
}

function writeSessionValue(key: string, value: string) {
  localStorage.removeItem(key)
  sessionStorage.setItem(key, value)
}

function removeSessionValue(key: string) {
  localStorage.removeItem(key)
  sessionStorage.removeItem(key)
}

function readCart(token: string): Cart {
  try {
    return normalizeCart(JSON.parse(readSessionValue(`customerQrCart:${token}`) || '{}') as Cart)
  } catch {
    return {}
  }
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

export default function QrOrderPage({ token, session }: { token: string; session: CustomerSession | null }) {
  const [table, setTable] = useState<QrOrderTable | null>(null)
  const [items, setItems] = useState<QrMenuItem[]>([])
  const [cart, setCart] = useState<Cart>(() => readCart(token))
  const [category, setCategory] = useState('Tất cả')
  const [keyword, setKeyword] = useState('')
  const [orderNote, setOrderNote] = useState('')
  const [currentOrder, setCurrentOrder] = useState<CustomerOrder | null>(null)
  const [view, setView] = useState<'menu' | 'order'>(() => readSessionValue(`customerQrOrder:${token}`) ? 'order' : 'menu')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const context = await getQrOrderContext(token)
      setTable(context.table)
      setItems(context.menuItems)
      writeSessionValue('customerLastQrToken', token)
      const orderId = readSessionValue(`customerQrOrder:${token}`)
      if (orderId) {
        const order = await getQrOrder(token, orderId).catch(() => null)
        if (order) setCurrentOrder(order)
        else removeSessionValue(`customerQrOrder:${token}`)
      }
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không mở được trang gọi món.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [token])
  useEffect(() => { writeSessionValue(`customerQrCart:${token}`, JSON.stringify(normalizeCart(cart))) }, [cart, token])
  useEffect(() => {
    if (!session || !currentOrder) return
    void claimCustomerOrder(token, currentOrder.id).catch(() => undefined)
  }, [currentOrder?.id, session?.userId, token])

  useVisiblePolling(() => refreshOrder(), 10_000, Boolean(currentOrder && !terminalStatuses.has(currentOrder.status)))

  useEffect(() => {
    if (!currentOrder) return
    const refreshFromNotification = (event: Event) => {
      const detail = (event as CustomEvent<{ orderId?: string }>).detail
      if (detail?.orderId !== currentOrder.id || document.visibilityState !== 'visible') return
      void getQrOrder(token, currentOrder.id).then(setCurrentOrder).catch(() => undefined)
    }
    window.addEventListener(CUSTOMER_ORDER_CHANGED_EVENT, refreshFromNotification)
    return () => window.removeEventListener(CUSTOMER_ORDER_CHANGED_EVENT, refreshFromNotification)
  }, [currentOrder?.id, token])

  const categories = useMemo(() => ['Tất cả', ...Array.from(new Set(items.map(item => item.menuCategoryName)))], [items])
  const filteredItems = useMemo(() => {
    const query = keyword.trim().toLocaleLowerCase('vi')
    return items.filter(item => (category === 'Tất cả' || item.menuCategoryName === category) && (!query || item.name.toLocaleLowerCase('vi').includes(query) || item.description?.toLocaleLowerCase('vi').includes(query)))
  }, [category, items, keyword])
  const selected = useMemo(() => items.map(item => ({ item, quantity: cart[item.id] || 0 })).filter(entry => entry.quantity > 0), [cart, items])
  const totalQuantity = selected.reduce((sum, entry) => sum + entry.quantity, 0)
  const totalAmount = selected.reduce((sum, entry) => sum + entry.item.price * entry.quantity, 0)

  function change(itemId: string, delta: number) {
    setCart(current => {
      const currentQuantity = current[itemId] || 0
      const quantityWithoutCurrentItem = Object.entries(current).filter(([id]) => id !== itemId).reduce((sum, [, quantity]) => sum + quantity, 0)
      const remainingForItem = Math.max(0, MAX_ORDER_QUANTITY - quantityWithoutCurrentItem)
      const quantity = Math.max(0, Math.min(MAX_ITEM_QUANTITY, remainingForItem, currentQuantity + delta))
      if (!quantity) {
        const next = { ...current }
        delete next[itemId]
        return next
      }
      return { ...current, [itemId]: quantity }
    })
  }

  async function submitOrder() {
    if (!selected.length || submitting) return
    if (totalQuantity > MAX_ORDER_QUANTITY) {
      setError(`Một lượt gọi món chỉ được tối đa ${MAX_ORDER_QUANTITY} phần.`)
      return
    }
    if (selected.some(entry => entry.quantity > MAX_ITEM_QUANTITY)) {
      setError(`Mỗi món chỉ được tối đa ${MAX_ITEM_QUANTITY} phần trong một lượt gọi.`)
      return
    }

    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      const response = await createQrOrder(token, {
        signedIn: Boolean(session),
        note: orderNote,
        items: selected.map(entry => ({ menuItemId: entry.item.id, quantity: entry.quantity })),
      })
      setCurrentOrder(response.data)
      writeSessionValue(`customerQrOrder:${token}`, response.data.id)
      removeSessionValue(`customerQrCart:${token}`)
      setCart({})
      setOrderNote('')
      setSuccess(response.message)
      setView('order')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không gửi được món xuống bếp.')
    } finally {
      setSubmitting(false)
    }
  }

  async function refreshOrder() {
    if (!currentOrder || refreshing) return
    setRefreshing(true)
    try {
      setCurrentOrder(await getQrOrder(token, currentOrder.id))
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không cập nhật được đơn.')
    } finally {
      setRefreshing(false)
    }
  }

  async function cancelCurrentOrder() {
    if (!session || !currentOrder || currentOrder.status !== 'Pending' || cancelling) return
    const confirmed = await confirmCustomerAction(`Đơn ${currentOrder.orderCode} sẽ được hủy nếu vẫn còn ở trạng thái Đang chờ và chưa phát sinh thanh toán. Bạn có muốn tiếp tục?`)
    if (!confirmed) return

    setCancelling(true)
    setError('')
    setSuccess('')
    try {
      const response = await cancelCustomerOrder(currentOrder.id)
      setCurrentOrder({ ...currentOrder, status: 'Cancelled' })
      setSuccess(response.message || `Đã hủy đơn ${currentOrder.orderCode}.`)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không hủy được đơn hàng.')
    } finally {
      setCancelling(false)
    }
  }

  function signIn() {
    writeSessionValue('customerReturnPath', window.location.pathname)
    navigate('/login')
  }

  if (loading) {
    return <main className="sera-page"><section className="sera-empty"><div><RefreshCw className="mx-auto animate-spin" /><h2>Đang mở thực đơn của bàn…</h2><p>Hệ thống đang kiểm tra mã QR và tải các món đang phục vụ.</p></div></section></main>
  }

  if (!table || error && !items.length) {
    return <main className="sera-page"><section className="sera-empty"><div><XCircle className="mx-auto text-destructive" /><h2>Không thể mở trang gọi món</h2><p>{error || 'Mã QR không hợp lệ hoặc đã ngừng hoạt động.'}</p><Button variant="outline" type="button" onClick={() => void load()}>Thử lại</Button></div></section></main>
  }

  const statusOrder = ['Pending', 'Confirmed', 'Preparing', 'Cooking', 'Ready', 'Served', 'Completed']
  const activeIndex = currentOrder ? statusOrder.indexOf(currentOrder.status) : -1
  const timelineSteps = [
    { status: 'Pending', threshold: 0 },
    { status: 'Preparing', threshold: 2 },
    { status: 'Ready', threshold: 4 },
    { status: 'Served', threshold: 5 },
  ]

  return (
    <main className="sera-page">
      <Button variant="ghost" className="mb-6 px-0" type="button" onClick={() => navigate('/menu')}><ChevronLeft /> Xem thực đơn chung</Button>

      <header className="sera-page-head">
        <div>
          <p className="sera-kicker">Gọi món bằng QR</p>
          <h1 className="sera-display mt-3">Bàn {table.restaurantTableName}.</h1>
          <p>Chọn món, kiểm tra số lượng và gửi trực tiếp xuống bếp. Mỗi món tối đa {MAX_ITEM_QUANTITY} phần trong một lượt gọi.</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant={view === 'menu' ? 'default' : 'outline'} onClick={() => setView('menu')}><Utensils /> Chọn món</Button>
          <Button type="button" variant={view === 'order' ? 'default' : 'outline'} onClick={() => setView('order')}><ShoppingBag /> Đơn hiện tại</Button>
        </div>
      </header>

      {error ? <Alert variant="destructive" className="mt-6"><AlertTitle>Không thể hoàn tất thao tác</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
      {success ? <Alert className="mt-6"><CheckCircle2 /><AlertTitle>Đã cập nhật</AlertTitle><AlertDescription>{success}</AlertDescription></Alert> : null}

      {view === 'menu' ? (
        <div className="mt-10 grid gap-12 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section>
            <div className="grid gap-5 border-b border-border pb-5">
              <label className="sera-search max-w-xl"><Search /><Input value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="Tìm món trong thực đơn" /></label>
              <div className="flex gap-7 overflow-x-auto">
                {categories.map(value => <button type="button" key={value} className={`shrink-0 border-b pb-3 text-[10px] font-bold uppercase tracking-[.12em] ${category === value ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground'}`} onClick={() => setCategory(value)}>{value}</button>)}
              </div>
            </div>

            {filteredItems.length ? (
              <div className="border-b border-border">
                {filteredItems.map(item => {
                  const quantity = cart[item.id] || 0
                  return (
                    <article className="grid min-h-36 grid-cols-[112px_minmax(0,1fr)_auto] items-center gap-5 border-t border-border py-5 max-sm:grid-cols-[84px_minmax(0,1fr)]" key={item.id}>
                      <img src={item.imageUrl || heroImage} className="size-28 object-cover max-sm:size-[84px]" alt={item.name} />
                      <div>
                        <small className="sera-kicker">{item.menuCategoryName}</small>
                        <h2 className="mt-1 font-heading text-3xl font-medium leading-none max-sm:text-2xl">{item.name}</h2>
                        <p className="mt-2 max-w-xl text-xs leading-5 text-muted-foreground max-sm:hidden">{item.description || 'Món ăn được chuẩn bị tươi mới trong ngày.'}</p>
                        <strong className="mt-3 block text-sm">{formatMoney(item.price)}</strong>
                      </div>
                      <div className="sera-qty max-sm:col-start-2">
                        {quantity ? <Button variant="outline" size="icon" type="button" aria-label={`Bớt ${item.name}`} onClick={() => change(item.id, -1)}><Minus /></Button> : null}
                        {quantity ? <strong>{quantity}</strong> : null}
                        <Button variant="outline" size="icon" type="button" aria-label={`Thêm ${item.name}`} disabled={quantity >= MAX_ITEM_QUANTITY || totalQuantity >= MAX_ORDER_QUANTITY} onClick={() => change(item.id, 1)}><Plus /></Button>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : <section className="sera-empty"><div><Search /><h2>Không có món phù hợp.</h2><p>Đổi từ khóa hoặc danh mục để xem lại thực đơn của bàn.</p></div></section>}
          </section>

          <aside className="h-fit xl:sticky xl:top-28">
            <div className="border-y border-border py-6">
              <div className="flex items-start gap-3"><ShoppingBag className="mt-1 size-5 text-accent" /><div><p className="sera-kicker">Giỏ gọi món</p><h2 className="mt-1 font-heading text-3xl">{totalQuantity ? `${totalQuantity} phần` : 'Chưa chọn món'}</h2></div></div>

              {!session ? <button className="mt-5 flex w-full gap-3 border-y border-border py-4 text-left" type="button" onClick={signIn}><UserRound className="mt-0.5 size-4 text-accent" /><span><strong className="block text-xs">Đăng nhập để lưu lịch sử</strong><small className="mt-1 block text-xs leading-5 text-muted-foreground">Khách chưa đăng nhập vẫn có thể gọi món.</small></span></button> : <p className="mt-5 flex gap-2 text-xs text-muted-foreground"><CheckCircle2 className="size-4 text-accent" /> Đơn sẽ được lưu vào tài khoản {session.ten}.</p>}

              {selected.length ? <div className="mt-5 border-t border-border">{selected.map(entry => <div className="flex justify-between gap-4 border-b border-border py-3 text-xs" key={entry.item.id}><span><strong className="block">{entry.item.name}</strong><small className="mt-1 block text-muted-foreground">{entry.quantity} × {formatMoney(entry.item.price)}</small></span><strong>{formatMoney(entry.item.price * entry.quantity)}</strong></div>)}</div> : <p className="mt-5 border-y border-border py-6 text-center text-xs text-muted-foreground">Thêm món từ thực đơn để bắt đầu.</p>}

              <label className="sera-field mt-5">Ghi chú chung<Textarea value={orderNote} onChange={event => setOrderNote(event.target.value)} maxLength={300} placeholder="Ví dụ: lên món cùng lúc…" /></label>
              <div className="mt-5 flex items-end justify-between border-t border-border pt-5"><span className="text-xs font-bold uppercase tracking-[.1em] text-muted-foreground">Tạm tính</span><strong className="text-xl">{formatMoney(totalAmount)}</strong></div>
              <Button className="mt-5 w-full" size="lg" type="button" disabled={!selected.length || submitting} onClick={() => void submitOrder()}>{submitting ? 'Đang gửi xuống bếp…' : 'Xác nhận gọi món'}</Button>
            </div>
          </aside>
        </div>
      ) : currentOrder ? (
        <section className="mt-10">
          <header className="grid gap-5 border-y border-border py-6 md:grid-cols-[1fr_auto_auto] md:items-center">
            <div><p className="sera-kicker">Mã đơn</p><h2 className="mt-1 font-heading text-4xl font-medium">{currentOrder.orderCode}</h2></div>
            <Badge variant={currentOrder.status === 'Cancelled' ? 'destructive' : 'secondary'}>{statusLabels[currentOrder.status] || currentOrder.status}</Badge>
            <Button variant="outline" type="button" disabled={refreshing} onClick={() => void refreshOrder()}><RefreshCw className={refreshing ? 'animate-spin' : ''} /> Cập nhật</Button>
          </header>

          <div className="mt-8 grid gap-12 lg:grid-cols-[260px_1fr]">
            <ol className="border-t border-border">
              {timelineSteps.map((step, index) => {
                const done = activeIndex >= step.threshold
                return <li className="relative border-b border-border py-5 pl-10" key={step.status}><span className={`absolute left-0 top-5 grid size-6 place-items-center border text-[10px] ${done ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground'}`}>{done ? '✓' : index + 1}</span><small className="sera-kicker">Bước {index + 1}</small><strong className="mt-1 block text-sm">{statusLabels[step.status]}</strong></li>
              })}
            </ol>

            <div>
              <div className="border-t border-border">
                {currentOrder.items.map(item => <div className="grid gap-2 border-b border-border py-4 text-sm sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-8" key={item.id}><span><strong>{item.menuItemName}</strong><small className="mt-1 block text-xs text-muted-foreground">{item.note || statusLabels[item.status] || item.status}</small></span><span>x{item.quantity}</span><strong>{formatMoney(item.totalPrice)}</strong></div>)}
              </div>
              <div className="mt-5 flex items-end justify-between"><span className="text-xs font-bold uppercase tracking-[.1em] text-muted-foreground">Tạm tính món</span><strong className="text-2xl">{formatMoney(currentOrder.totalAmount)}</strong></div>
              <div className="mt-6 flex flex-wrap gap-3 border-t border-border pt-5">
                {!terminalStatuses.has(currentOrder.status) ? <PayOnlineButton orderId={currentOrder.id} qrToken={token} accessToken={session?.token} /> : null}
                {session && currentOrder.status === 'Pending' ? <Button variant="destructive" type="button" disabled={cancelling} onClick={() => void cancelCurrentOrder()}><XCircle /> {cancelling ? 'Đang hủy…' : 'Hủy đơn'}</Button> : null}
                {!terminalStatuses.has(currentOrder.status) ? <Button variant="outline" type="button" onClick={() => setView('menu')}>Gọi thêm món</Button> : null}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="sera-empty mt-10"><div><ShoppingBag /><h2>Chưa có đơn tại bàn này.</h2><p>Chọn món từ thực đơn và gửi xuống bếp khi bạn sẵn sàng.</p><Button type="button" onClick={() => setView('menu')}>Bắt đầu chọn món</Button></div></section>
      )}
    </main>
  )
}

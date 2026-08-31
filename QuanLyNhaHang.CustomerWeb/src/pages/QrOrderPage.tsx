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
    return <main className="mx-auto grid min-h-[55vh] w-[min(1000px,calc(100vw-48px))] place-items-center py-20"><div className="text-center"><RefreshCw className="mx-auto size-6 animate-spin text-muted-foreground" /><h1 className="mt-5 font-heading text-4xl">Đang mở thực đơn của bàn…</h1><p className="mt-3 text-sm text-muted-foreground">Hệ thống đang kiểm tra mã QR và tải các món đang phục vụ.</p></div></main>
  }

  if (!table || error && !items.length) {
    return <main className="mx-auto grid min-h-[55vh] w-[min(1000px,calc(100vw-48px))] place-items-center py-20"><div className="max-w-xl border border-border p-8 text-center"><XCircle className="mx-auto size-7 text-destructive" /><h1 className="mt-5 font-heading text-4xl">Không thể mở trang gọi món</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">{error || 'Mã QR không hợp lệ hoặc đã ngừng hoạt động.'}</p><Button className="mt-6" variant="outline" type="button" onClick={() => void load()}>Thử lại</Button></div></main>
  }

  const statusOrder = ['Pending', 'Confirmed', 'Preparing', 'Cooking', 'Ready', 'Served', 'Completed']
  const activeIndex = currentOrder ? statusOrder.indexOf(currentOrder.status) : -1

  return (
    <main className="bg-background text-foreground">
      <section className="mx-auto w-[min(1440px,calc(100vw-48px))] py-12 sm:w-[min(1440px,calc(100vw-80px))] md:py-16">
        <Button variant="link" className="mb-6 px-0" type="button" onClick={() => navigate('/menu')}><ChevronLeft data-icon="inline-start" /> Xem thực đơn chung</Button>

        <header className="grid gap-7 border-b border-border pb-8 md:grid-cols-[1fr_auto] md:items-end">
          <div><p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">Gọi món bằng QR</p><h1 className="mt-3 font-heading text-[clamp(3.8rem,6vw,7rem)] leading-[0.88] tracking-[-0.055em]">Bàn {table.restaurantTableName}.</h1><p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground">Chọn món, kiểm tra giỏ và gửi trực tiếp xuống bếp.</p></div>
          <div className="flex gap-2"><Button type="button" variant={view === 'menu' ? 'default' : 'outline'} onClick={() => setView('menu')}><Utensils data-icon="inline-start" /> Chọn món</Button><Button type="button" variant={view === 'order' ? 'default' : 'outline'} onClick={() => setView('order')}><ShoppingBag data-icon="inline-start" /> Đơn hiện tại</Button></div>
        </header>

        {error ? <Alert variant="destructive" className="mt-7"><AlertTitle>Không thể hoàn tất thao tác</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        {success ? <Alert className="mt-7"><CheckCircle2 /><AlertTitle>Đã cập nhật</AlertTitle><AlertDescription>{success}</AlertDescription></Alert> : null}

        {view === 'menu' ? (
          <div className="mt-9 grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section>
              <div className="grid gap-5 border-b border-border pb-6">
                <label className="relative block max-w-xl border-b border-foreground"><Search className="absolute left-0 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="h-11 border-0 bg-transparent pl-7 shadow-none focus-visible:ring-0" value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="Tìm món trong thực đơn" /></label>
                <div className="flex gap-7 overflow-x-auto">{categories.map(value => <button type="button" key={value} className={`shrink-0 border-b-2 pb-3 text-[10px] font-semibold tracking-[0.14em] uppercase ${category === value ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground'}`} onClick={() => setCategory(value)}>{value}</button>)}</div>
              </div>

              <div className="mt-7 grid gap-5 md:grid-cols-2">
                {filteredItems.map((item, index) => {
                  const quantity = cart[item.id] || 0
                  return <article className="grid grid-cols-[120px_1fr] border border-border sm:grid-cols-[150px_1fr]" key={item.id}><img src={item.imageUrl || heroImage} className={`${!item.imageUrl ? `fallback-crop crop-${index % 3 + 1}` : ''} size-full min-h-40 object-cover`} alt={item.name} /><div className="flex min-w-0 flex-col p-4"><small className="text-[9px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">{item.menuCategoryName}</small><h2 className="mt-2 font-heading text-2xl font-medium leading-none">{item.name}</h2><p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{item.description || 'Món ăn được chuẩn bị tươi mới trong ngày.'}</p><footer className="mt-auto flex items-end justify-between gap-3 pt-4"><strong className="text-sm">{formatMoney(item.price)}</strong><div className="flex items-center border border-border">{quantity ? <button className="grid size-8 place-items-center" type="button" aria-label={`Bớt ${item.name}`} onClick={() => change(item.id, -1)}><Minus className="size-3" /></button> : null}{quantity ? <span className="grid min-w-8 place-items-center border-x border-border text-xs">{quantity}</span> : null}<button className="grid size-8 place-items-center disabled:opacity-35" type="button" aria-label={`Thêm ${item.name}`} disabled={quantity >= MAX_ITEM_QUANTITY || totalQuantity >= MAX_ORDER_QUANTITY} onClick={() => change(item.id, 1)}><Plus className="size-3" /></button></div></footer></div></article>
                })}
              </div>
            </section>

            <aside className="h-fit border border-border xl:sticky xl:top-28">
              <div className="flex gap-3 border-b border-border p-5"><ShoppingBag className="mt-1 size-4" /><div><h2 className="font-heading text-2xl">Giỏ gọi món</h2><p className="mt-1 text-xs text-muted-foreground">{totalQuantity ? `${totalQuantity}/${MAX_ORDER_QUANTITY} phần · tối đa ${MAX_ITEM_QUANTITY}/món` : 'Chưa chọn món'}</p></div></div>
              <div className="p-5">
                {!session ? <button className="mb-5 flex w-full gap-3 border border-border border-l-2 border-l-foreground p-4 text-left" type="button" onClick={signIn}><UserRound className="mt-0.5 size-4" /><span><strong className="block text-[10px] tracking-[0.12em] uppercase">Đăng nhập để lưu lịch sử</strong><small className="mt-1 block text-xs leading-5 text-muted-foreground">Khách chưa đăng nhập vẫn có thể gọi món.</small></span></button> : <p className="mb-5 flex gap-2 text-xs text-muted-foreground"><CheckCircle2 className="size-4" /> Đơn sẽ được lưu vào tài khoản {session.ten}.</p>}
                {selected.length ? <div className="divide-y divide-border border-y border-border">{selected.map(entry => <div className="flex justify-between gap-4 py-3 text-xs" key={entry.item.id}><span><strong className="block font-medium">{entry.item.name}</strong><small className="mt-1 block text-muted-foreground">{entry.quantity} × {formatMoney(entry.item.price)}</small></span><strong>{formatMoney(entry.item.price * entry.quantity)}</strong></div>)}</div> : <div className="grid min-h-28 place-items-center border border-dashed border-border text-center"><p className="text-xs text-muted-foreground">Thêm món từ thực đơn để bắt đầu.</p></div>}
                <label className="mt-5 grid gap-2 text-[10px] font-semibold tracking-[0.14em] uppercase">Ghi chú chung<Textarea value={orderNote} onChange={event => setOrderNote(event.target.value)} maxLength={300} placeholder="Ví dụ: lên món cùng lúc…" className="min-h-20 normal-case tracking-normal" /></label>
                <div className="mt-5 flex items-end justify-between border-t border-border pt-5"><span className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Tạm tính</span><strong className="text-xl">{formatMoney(totalAmount)}</strong></div>
                <Button className="mt-5 w-full" type="button" disabled={!selected.length || submitting} onClick={() => void submitOrder()}>{submitting ? 'Đang gửi xuống bếp…' : 'Xác nhận gọi món'}</Button>
              </div>
            </aside>
          </div>
        ) : currentOrder ? (
          <section className="mt-9 border border-border">
            <header className="grid gap-5 border-b border-border p-6 md:grid-cols-[1fr_auto_auto] md:items-center"><div><small className="text-[9px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Mã đơn</small><h2 className="mt-2 font-heading text-3xl font-medium">{currentOrder.orderCode}</h2></div><Badge variant={currentOrder.status === 'Cancelled' ? 'destructive' : 'secondary'}>{statusLabels[currentOrder.status] || currentOrder.status}</Badge><Button variant="outline" type="button" disabled={refreshing} onClick={() => void refreshOrder()}><RefreshCw className={refreshing ? 'animate-spin' : ''} data-icon="inline-start" /> Cập nhật</Button></header>

            <div className="grid gap-0 border-b border-border sm:grid-cols-4">{['Pending', 'Preparing', 'Ready', 'Served'].map((step, index) => { const threshold = [0, 2, 4, 5][index]; const done = activeIndex >= threshold; return <div className={`border-b p-5 sm:border-b-0 sm:border-r sm:last:border-r-0 ${done ? 'bg-muted/45' : ''}`} key={step}><span className={`grid size-7 place-items-center border text-[10px] ${done ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground'}`}>{done ? '✓' : index + 1}</span><strong className="mt-3 block text-[10px] tracking-[0.12em] uppercase">{statusLabels[step]}</strong></div> })}</div>

            <div className="p-6">
              <div className="divide-y divide-border border-y border-border">{currentOrder.items.map(item => <div className="grid gap-2 py-4 text-sm sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-8" key={item.id}><span><strong className="font-medium">{item.menuItemName}</strong><small className="mt-1 block text-xs text-muted-foreground">{item.note || statusLabels[item.status] || item.status}</small></span><span>x{item.quantity}</span><strong>{formatMoney(item.totalPrice)}</strong></div>)}</div>
              <div className="mt-5 flex items-end justify-between"><span className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Tạm tính món</span><strong className="text-2xl">{formatMoney(currentOrder.totalAmount)}</strong></div>
              <div className="mt-6 flex flex-wrap gap-3 border-t border-border pt-5">{!terminalStatuses.has(currentOrder.status) ? <PayOnlineButton orderId={currentOrder.id} qrToken={token} accessToken={session?.token} /> : null}{session && currentOrder.status === 'Pending' ? <Button variant="destructive" type="button" disabled={cancelling} onClick={() => void cancelCurrentOrder()}><XCircle data-icon="inline-start" /> {cancelling ? 'Đang hủy…' : 'Hủy đơn'}</Button> : null}{!terminalStatuses.has(currentOrder.status) ? <Button variant="outline" type="button" onClick={() => setView('menu')}>Gọi thêm món</Button> : null}</div>
            </div>
          </section>
        ) : (
          <div className="mt-9 grid min-h-72 place-items-center border border-dashed border-border text-center"><div><ShoppingBag className="mx-auto mb-4 size-6 text-muted-foreground" /><h2 className="font-heading text-3xl">Chưa có đơn tại bàn này</h2><p className="mt-3 text-sm text-muted-foreground">Chọn món từ thực đơn và gửi xuống bếp khi bạn sẵn sàng.</p><Button className="mt-6" type="button" onClick={() => setView('menu')}>Bắt đầu chọn món</Button></div></div>
        )}
      </section>
    </main>
  )
}

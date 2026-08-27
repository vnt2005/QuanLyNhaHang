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
import StatusPanel from '../components/StatusPanel'
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

    const quantity = Math.min(
      MAX_ITEM_QUANTITY,
      Math.max(0, Math.floor(numericQuantity)),
      remaining,
    )

    if (quantity <= 0) continue
    normalized[itemId] = quantity
    remaining -= quantity
  }

  return normalized
}

function readCart(token: string): Cart {
  try {
    return normalizeCart(
      JSON.parse(localStorage.getItem(`customerQrCart:${token}`) || '{}') as Cart,
    )
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

export default function QrOrderPage({
  token,
  session,
}: {
  token: string
  session: CustomerSession | null
}) {
  const [table, setTable] = useState<QrOrderTable | null>(null)
  const [items, setItems] = useState<QrMenuItem[]>([])
  const [cart, setCart] = useState<Cart>(() => readCart(token))
  const [category, setCategory] = useState('Tất cả')
  const [keyword, setKeyword] = useState('')
  const [orderNote, setOrderNote] = useState('')
  const [currentOrder, setCurrentOrder] = useState<CustomerOrder | null>(null)
  const [view, setView] = useState<'menu' | 'order'>(() => localStorage.getItem(`customerQrOrder:${token}`) ? 'order' : 'menu')
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
      localStorage.setItem('customerLastQrToken', token)
      const orderId = localStorage.getItem(`customerQrOrder:${token}`)
      if (orderId) {
        const order = await getQrOrder(token, orderId).catch(() => null)
        if (order) setCurrentOrder(order)
        else localStorage.removeItem(`customerQrOrder:${token}`)
      }
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không mở được trang gọi món.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [token])

  useEffect(() => {
    localStorage.setItem(`customerQrCart:${token}`, JSON.stringify(normalizeCart(cart)))
  }, [cart, token])

  useEffect(() => {
    if (!session || !currentOrder) return
    void claimCustomerOrder(token, currentOrder.id).catch(() => undefined)
  }, [currentOrder?.id, session?.userId, token])

  useEffect(() => {
    if (!currentOrder || terminalStatuses.has(currentOrder.status)) return
    const timer = window.setInterval(() => void refreshOrder(), 10_000)
    return () => window.clearInterval(timer)
  }, [currentOrder?.id, currentOrder?.status, token])

  useEffect(() => {
    if (!currentOrder) return

    const refreshFromNotification = (event: Event) => {
      const detail = (event as CustomEvent<{ orderId?: string }>).detail
      if (detail?.orderId !== currentOrder.id) return

      void getQrOrder(token, currentOrder.id)
        .then(setCurrentOrder)
        .catch(() => undefined)
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
      const quantityWithoutCurrentItem = Object.entries(current)
        .filter(([id]) => id !== itemId)
        .reduce((sum, [, quantity]) => sum + quantity, 0)
      const remainingForItem = Math.max(0, MAX_ORDER_QUANTITY - quantityWithoutCurrentItem)
      const quantity = Math.max(
        0,
        Math.min(
          MAX_ITEM_QUANTITY,
          remainingForItem,
          currentQuantity + delta,
        ),
      )

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
      localStorage.setItem(`customerQrOrder:${token}`, response.data.id)
      localStorage.removeItem(`customerQrCart:${token}`)
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

    const confirmed = await confirmCustomerAction(
      `Đơn ${currentOrder.orderCode} sẽ được hủy nếu vẫn còn ở trạng thái Đang chờ và chưa phát sinh thanh toán. Bạn có muốn tiếp tục?`,
    )
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
    localStorage.setItem('customerReturnPath', window.location.pathname)
    navigate('/login')
  }

  if (loading) return <main className="page-section"><StatusPanel kind="loading" title="Đang mở thực đơn của bàn…" message="Hệ thống đang kiểm tra mã QR và tải các món đang phục vụ." /></main>
  if (!table || error && !items.length) return <main className="page-section"><StatusPanel kind="error" title="Không thể mở trang gọi món" message={error || 'Mã QR không hợp lệ hoặc đã ngừng hoạt động.'} onRetry={() => void load()} /></main>

  return (
    <main className="qr-web-page page-section">
      <button className="text-link back-link" type="button" onClick={() => navigate('/menu')}><ChevronLeft /> Xem thực đơn chung</button>
      <div className="qr-page-heading">
        <div><h1>Gọi món tại {table.restaurantTableName}</h1><p>Chọn món, kiểm tra lại giỏ và gửi trực tiếp xuống bếp.</p></div>
        <div className="qr-view-switch"><button className={view === 'menu' ? 'active' : ''} type="button" onClick={() => setView('menu')}><Utensils /> Chọn món</button><button className={view === 'order' ? 'active' : ''} type="button" onClick={() => setView('order')}><ShoppingBag /> Đơn hiện tại</button></div>
      </div>
      {error ? <div className="form-notice error" role="alert">{error}</div> : null}
      {success ? <div className="form-notice success"><CheckCircle2 /> {success}</div> : null}

      {view === 'menu' ? (
        <div className="qr-order-layout">
          <section className="qr-menu-catalog">
            <div className="qr-catalog-tools"><label><Search /><input value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="Tìm món trong thực đơn" /></label><div className="category-tabs compact-tabs">{categories.map(value => <button type="button" key={value} className={category === value ? 'active' : ''} onClick={() => setCategory(value)}>{value}</button>)}</div></div>
            <div className="qr-menu-grid">
              {filteredItems.map((item, index) => {
                const quantity = cart[item.id] || 0
                return (
                  <article className="qr-menu-item" key={item.id}>
                    <img src={item.imageUrl || heroImage} className={!item.imageUrl ? `fallback-crop crop-${index % 3 + 1}` : ''} alt={item.name} />
                    <div><small>{item.menuCategoryName}</small><h2>{item.name}</h2><p>{item.description || 'Món ăn được chuẩn bị tươi mới trong ngày.'}</p><footer><strong>{formatMoney(item.price)}</strong><div className="quantity-control">{quantity ? <button type="button" aria-label={`Bớt ${item.name}`} onClick={() => change(item.id, -1)}><Minus /></button> : null}{quantity ? <span>{quantity}</span> : null}<button className="add" type="button" aria-label={`Thêm ${item.name}`} disabled={quantity >= MAX_ITEM_QUANTITY || totalQuantity >= MAX_ORDER_QUANTITY} onClick={() => change(item.id, 1)}><Plus /></button></div></footer></div>
                  </article>
                )
              })}
            </div>
          </section>
          <aside className="qr-cart-panel">
            <div className="qr-cart-title"><ShoppingBag /><div><h2>Giỏ gọi món</h2><p>{totalQuantity ? `${totalQuantity}/${MAX_ORDER_QUANTITY} phần đã chọn • tối đa ${MAX_ITEM_QUANTITY}/món` : 'Chưa chọn món'}</p></div></div>
            {!session ? <button className="qr-signin-hint" type="button" onClick={signIn}><UserRound /><span><strong>Đăng nhập để lưu lịch sử</strong><small>Khách chưa đăng nhập vẫn có thể gọi món.</small></span></button> : <p className="qr-signed-in"><CheckCircle2 /> Đơn sẽ được lưu vào tài khoản {session.ten}.</p>}
            {selected.length ? <div className="qr-cart-lines">{selected.map(entry => <div key={entry.item.id}><span><strong>{entry.item.name}</strong><small>{entry.quantity} × {formatMoney(entry.item.price)}</small></span><strong>{formatMoney(entry.item.price * entry.quantity)}</strong></div>)}</div> : <div className="qr-cart-empty"><ShoppingBag /><p>Thêm món từ thực đơn để bắt đầu.</p></div>}
            <label className="qr-order-note">Ghi chú chung<textarea value={orderNote} onChange={event => setOrderNote(event.target.value)} maxLength={300} placeholder="Ví dụ: lên món cùng lúc…" /></label>
            <div className="qr-cart-total"><span>Tạm tính</span><strong>{formatMoney(totalAmount)}</strong></div>
            <button className="primary-button full" type="button" disabled={!selected.length || submitting} onClick={() => void submitOrder()}>{submitting ? 'Đang gửi xuống bếp…' : 'Xác nhận gọi món'}</button>
          </aside>
        </div>
      ) : currentOrder ? (
        <section className="current-order-view">
          <header><div><small>Mã đơn</small><h2>{currentOrder.orderCode}</h2></div><span className={`order-status status-${currentOrder.status.toLocaleLowerCase()}`}>{statusLabels[currentOrder.status] || currentOrder.status}</span><button type="button" disabled={refreshing} onClick={() => void refreshOrder()}><RefreshCw className={refreshing ? 'spin' : ''} /> Cập nhật</button></header>
          <div className="order-progress">{['Pending', 'Preparing', 'Ready', 'Served'].map((step, index) => { const statusOrder = ['Pending', 'Confirmed', 'Preparing', 'Cooking', 'Ready', 'Served', 'Completed']; const activeIndex = statusOrder.indexOf(currentOrder.status); const threshold = [0, 2, 4, 5][index]; return <div className={activeIndex >= threshold ? 'done' : ''} key={step}><span>{activeIndex >= threshold ? '✓' : index + 1}</span><strong>{statusLabels[step]}</strong></div> })}</div>
          <div className="current-order-lines">{currentOrder.items.map(item => <div key={item.id}><span><strong>{item.menuItemName}</strong><small>{item.note || statusLabels[item.status] || item.status}</small></span><span>{item.quantity}</span><strong>{formatMoney(item.totalPrice)}</strong></div>)}</div>
          <footer><span>Tạm tính món</span><strong>{formatMoney(currentOrder.totalAmount)}</strong></footer>
          {!terminalStatuses.has(currentOrder.status) ? <PayOnlineButton orderId={currentOrder.id} qrToken={token} accessToken={session?.token} className="primary-button full" /> : null}
          {session && currentOrder.status === 'Pending' ? <button className="customer-order-cancel-button" type="button" disabled={cancelling} onClick={() => void cancelCurrentOrder()}><XCircle aria-hidden="true" /> {cancelling ? 'Đang hủy…' : 'Hủy đơn'}</button> : null}
          {!terminalStatuses.has(currentOrder.status) ? <button className="secondary-button" type="button" onClick={() => setView('menu')}>Gọi thêm món</button> : null}
        </section>
      ) : (
        <div className="account-empty"><ShoppingBag /><h2>Chưa có đơn tại bàn này</h2><p>Chọn món từ thực đơn và gửi xuống bếp khi bạn sẵn sàng.</p><button className="primary-button" type="button" onClick={() => setView('menu')}>Bắt đầu chọn món</button></div>
      )}
    </main>
  )
}

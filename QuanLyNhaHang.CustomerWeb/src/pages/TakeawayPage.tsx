import {
  CheckCircle2,
  Clock3,
  MapPin,
  Minus,
  PackageOpen,
  Plus,
  ShoppingBag,
  UserRound,
  XCircle,
} from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { CustomerSession } from '../services/customerAuth'
import { cancelCustomerOrder } from '../services/customerOrders'
import {
  createTakeawayOrder,
  type CustomerSiteBootstrap,
  type TakeawayOrderResult,
} from '../services/customerSite'
import heroImage from '../assets/hero-vietnamese-table.webp'
import { confirmCustomerAction } from '../components/CustomerConfirmDialog'
import PayOnlineButton from '../components/PayOnlineButton'
import { navigate } from '../utils/navigation'
import {
  clearTakeawayCart,
  MAX_TAKEAWAY_CART_QUANTITY,
  MAX_TAKEAWAY_ITEM_QUANTITY,
  readTakeawayCart,
  setTakeawayItemQuantity,
  type TakeawayCart,
} from '../utils/takeawayCart'

function money(value: number, code = 'VND') {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: code || 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

function pickupLabel(value: string) {
  if (!value) return 'Sớm nhất có thể'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Sớm nhất có thể'
  return parsed.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  })
}

export default function TakeawayPage({
  data,
  session,
}: {
  data: CustomerSiteBootstrap
  session: CustomerSession | null
}) {
  const [cart, setCart] = useState<TakeawayCart>(() => readTakeawayCart())
  const [customerName, setCustomerName] = useState(() => session ? [session.ho, session.ten].filter(Boolean).join(' ') : '')
  const [phoneNumber, setPhoneNumber] = useState(() => session?.phoneNumber || '')
  const [pickupTime, setPickupTime] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<TakeawayOrderResult | null>(null)

  const lines = useMemo(() => data.menuItems
    .map(item => ({ item, quantity: cart[item.id] || 0 }))
    .filter(line => line.quantity > 0), [cart, data.menuItems])

  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0)
  const totalAmount = lines.reduce((sum, line) => sum + line.item.price * line.quantity, 0)

  function changeQuantity(menuItemId: string, quantity: number) {
    setCart(setTakeawayItemQuantity(menuItemId, quantity))
  }

  function signIn() {
    localStorage.removeItem('customerReturnPath')
    sessionStorage.setItem('customerReturnPath', '/takeaway')
    navigate('/login')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!lines.length || submitting) return

    if (totalQuantity > MAX_TAKEAWAY_CART_QUANTITY) {
      setError(`Một đơn chỉ được tối đa ${MAX_TAKEAWAY_CART_QUANTITY} phần.`)
      return
    }

    if (lines.some(line => line.quantity > MAX_TAKEAWAY_ITEM_QUANTITY)) {
      setError(`Mỗi món chỉ được tối đa ${MAX_TAKEAWAY_ITEM_QUANTITY} phần.`)
      return
    }

    if (!customerName.trim() || !phoneNumber.trim()) {
      setError('Vui lòng nhập tên và số điện thoại người nhận món.')
      return
    }

    let pickupIso: string | null = null
    if (pickupTime) {
      const date = new Date(pickupTime)
      if (Number.isNaN(date.getTime())) {
        setError('Thời gian nhận món không hợp lệ.')
        return
      }
      if (date.getTime() < Date.now() - 60_000) {
        setError('Thời gian nhận món không được ở trong quá khứ.')
        return
      }
      pickupIso = date.toISOString()
    }

    setSubmitting(true)
    setError('')
    try {
      const response = await createTakeawayOrder({
        customerName: customerName.trim(),
        phoneNumber: phoneNumber.trim(),
        pickupTime: pickupIso,
        note: note.trim() || null,
        items: lines.map(line => ({ menuItemId: line.item.id, quantity: line.quantity })),
      }, session?.token)

      clearTakeawayCart()
      setCart({})
      setResult(response.data)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không đặt được món mang về.')
    } finally {
      setSubmitting(false)
    }
  }

  async function cancelPendingResult() {
    if (!session || !result || result.status !== 'Pending' || cancelling) return
    const confirmed = await confirmCustomerAction(
      `Đơn ${result.orderCode} sẽ được hủy nếu vẫn chưa thanh toán và nhà hàng chưa bắt đầu xử lý. Bạn có muốn tiếp tục?`,
    )
    if (!confirmed) return

    setCancelling(true)
    setError('')
    try {
      await cancelCustomerOrder(result.id)
      setResult(current => current ? { ...current, status: 'Cancelled' } : current)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không hủy được đơn hàng.')
    } finally {
      setCancelling(false)
    }
  }

  if (result) {
    const cancelled = result.status === 'Cancelled'
    return (
      <main className="bistro-checkout-result">
        <section>
          <div className={cancelled ? 'result-symbol cancelled' : 'result-symbol'}>{cancelled ? <XCircle /> : <CheckCircle2 />}</div>
          <span>ĐƠN MANG VỀ</span>
          <h1>{cancelled ? 'Đơn đã được hủy.' : 'Đơn đã đến nhà hàng.'}</h1>
          <p>Mã đơn <strong>{result.orderCode}</strong>. {cancelled ? 'Nhà hàng đã nhận trạng thái hủy.' : 'Bếp có thể tiếp nhận và chuẩn bị món mà không cần bạn thanh toán trước.'}</p>

          {!cancelled ? (
            <div className="result-payment-panel">
              <div className="result-pickup-fact"><Clock3 /><span><small>Thời gian nhận</small><strong>{result.pickupTime ? new Date(result.pickupTime).toLocaleString('vi-VN') : 'Sớm nhất có thể'}</strong></span></div>
              <Alert>
                <Clock3 />
                <AlertTitle>Thanh toán sau khi bếp hoàn thành</AlertTitle>
                <AlertDescription>Nếu toàn bộ món đã hoàn thành mà đơn vẫn chưa thanh toán, hệ thống bắt đầu thời hạn 5 phút. Quá thời hạn, đơn sẽ tự động hủy.</AlertDescription>
              </Alert>
              <PayOnlineButton orderId={result.id} accessToken={session?.token} />
            </div>
          ) : null}

          {error ? <Alert variant="destructive"><AlertTitle>Không thể hoàn tất thao tác</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

          <div className="result-actions">
            {!cancelled && session ? <Button variant="destructive" disabled={cancelling} onClick={() => void cancelPendingResult()}><XCircle />{cancelling ? 'Đang hủy…' : 'Hủy đơn'}</Button> : null}
            <Button variant="outline" onClick={() => { setResult(null); navigate('/menu') }}>Xem thực đơn</Button>
            {session ? <Button onClick={() => navigate('/orders')}>Đơn của tôi</Button> : <Button onClick={signIn}>Đăng nhập</Button>}
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="bistro-checkout-page">
      <header className="bistro-checkout-heading">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/menu')}>← Quay lại thực đơn</Button>
          <span>CHECKOUT MANG VỀ</span>
          <h1>Chốt món,<br />chọn giờ nhận.</h1>
        </div>
        <div className="bistro-checkout-steps" aria-label="Các bước đặt món">
          <div className="done"><b>1</b><span>Chọn món</span></div>
          <div className={lines.length ? 'active' : ''}><b>2</b><span>Thông tin nhận</span></div>
          <div><b>3</b><span>Gửi nhà hàng</span></div>
        </div>
      </header>

      {!session ? (
        <button className="bistro-checkout-login" type="button" onClick={signIn}>
          <UserRound /><span><strong>Đăng nhập để lưu đơn</strong><small>Bạn vẫn có thể đặt món mà không cần tài khoản.</small></span><span>Đăng nhập →</span>
        </button>
      ) : null}

      {error ? <Alert variant="destructive" className="mb-6"><AlertTitle>Không thể gửi đơn</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

      {!lines.length ? (
        <section className="bistro-checkout-empty">
          <PackageOpen />
          <h2>Chưa có món nào trong giỏ.</h2>
          <p>Quay lại thực đơn và chọn món bạn muốn mang về.</p>
          <Button onClick={() => navigate('/menu')}>Mở thực đơn</Button>
        </section>
      ) : (
        <form onSubmit={submit} className="bistro-checkout-shell">
          <section className="bistro-checkout-cart">
            <div className="cart-toolbar">
              <div><ShoppingBag /><span><small>{lines.length} món · {totalQuantity}/{MAX_TAKEAWAY_CART_QUANTITY} phần</small><strong>Giỏ mang về</strong></span></div>
              <Button variant="outline" size="sm" type="button" onClick={() => navigate('/menu')}>+ Thêm món</Button>
            </div>

            <div className="cart-card-grid">
              {lines.map(({ item, quantity }, index) => (
                <article className="takeaway-dish-card" key={item.id}>
                  <img src={item.imageUrl || heroImage} className={!item.imageUrl ? `fallback-crop crop-${index % 3 + 1}` : ''} alt={item.name} />
                  <div>
                    <small>{item.menuCategoryName}</small>
                    <h2>{item.name}</h2>
                    <strong>{money(item.price, data.restaurant?.currency)} / phần</strong>
                  </div>
                  <div className="takeaway-card-bottom">
                    <div className="takeaway-qty-control">
                      <Button variant="outline" size="icon-sm" type="button" aria-label={`Bớt ${item.name}`} onClick={() => changeQuantity(item.id, quantity - 1)}><Minus /></Button>
                      <span>{quantity}</span>
                      <Button variant="outline" size="icon-sm" type="button" aria-label={`Thêm ${item.name}`} disabled={quantity >= MAX_TAKEAWAY_ITEM_QUANTITY || totalQuantity >= MAX_TAKEAWAY_CART_QUANTITY} onClick={() => changeQuantity(item.id, quantity + 1)}><Plus /></Button>
                    </div>
                    <strong>{money(item.price * quantity, data.restaurant?.currency)}</strong>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="bistro-checkout-details">
            <div className="checkout-detail-card pickup-card">
              <span>01 · NHẬN MÓN</span>
              <h2>Tại nhà hàng</h2>
              <div className="pickup-place"><MapPin /><span><strong>{data.restaurant?.restaurantName || 'Nhà hàng'}</strong><small>{data.restaurant?.address || 'Địa chỉ đang cập nhật'}</small></span></div>
              <label>Thời gian muốn nhận<Input type="datetime-local" value={pickupTime} onChange={event => setPickupTime(event.target.value)} /></label>
              <small className="detail-hint">Không chọn thời gian = nhà hàng chuẩn bị sớm nhất có thể.</small>
            </div>

            <div className="checkout-detail-card customer-card">
              <span>02 · NGƯỜI NHẬN</span>
              <h2>Thông tin liên hệ</h2>
              <div className="checkout-field-grid">
                <label>Họ và tên<Input required maxLength={150} value={customerName} onChange={event => setCustomerName(event.target.value)} placeholder="Người nhận món" /></label>
                <label>Số điện thoại<Input required maxLength={30} value={phoneNumber} onChange={event => setPhoneNumber(event.target.value)} placeholder="Số điện thoại" inputMode="tel" /></label>
              </div>
              <label>Ghi chú<Textarea maxLength={500} value={note} onChange={event => setNote(event.target.value)} placeholder="Ví dụ: không hành, đóng gói riêng..." /></label>
            </div>
          </section>

          <section className="bistro-checkout-summary">
            <div>
              <span><small>Nhận món</small><strong>{pickupLabel(pickupTime)}</strong></span>
              <span><small>Tổng số phần</small><strong>{totalQuantity}</strong></span>
              <span><small>Tổng cộng</small><strong>{money(totalAmount, data.restaurant?.currency)}</strong></span>
            </div>
            <Button size="lg" type="submit" disabled={submitting}>{submitting ? 'Đang gửi đơn…' : 'Gửi đơn cho nhà hàng →'}</Button>
          </section>
        </form>
      )}
    </main>
  )
}

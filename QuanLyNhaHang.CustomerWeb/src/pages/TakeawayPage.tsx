import {
  CheckCircle2,
  Clock3,
  MapPin,
  Minus,
  PackageOpen,
  Plus,
  ReceiptText,
  ShoppingBag,
  UserRound,
  XCircle,
} from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
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
        items: lines.map(line => ({
          menuItemId: line.item.id,
          quantity: line.quantity,
        })),
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
      <main className="takeaway-page page-section">
        <section className="takeaway-success">
          {cancelled ? <XCircle /> : <CheckCircle2 />}
          <h1>{cancelled ? 'Đơn mang về đã hủy' : 'Đã nhận đơn mang về'}</h1>
          <p>Mã đơn của bạn là <strong>{result.orderCode}</strong>. {cancelled ? 'Đơn đã được hủy và nhà hàng đã nhận thông báo.' : 'Nhà hàng có thể tiếp nhận và bắt đầu chuẩn bị món ngay, bạn không bắt buộc phải thanh toán trước.'}</p>
          {!cancelled ? (
            <>
              {result.pickupTime ? <p>Thời gian nhận dự kiến: <strong>{new Date(result.pickupTime).toLocaleString('vi-VN')}</strong></p> : <p>Nhà hàng sẽ chuẩn bị món sớm nhất có thể sau khi tiếp nhận đơn.</p>}
              <p>Bạn có thể thanh toán online ngay bên dưới hoặc thanh toán sau. Khi bếp hoàn thành toàn bộ món, nếu đơn vẫn chưa được ghi nhận thanh toán thì hệ thống bắt đầu thời hạn <strong>5 phút</strong>; quá 5 phút chưa thanh toán, đơn sẽ tự động hủy và cả bạn lẫn nhà hàng đều nhận thông báo.</p>
              <p>Để tránh đơn trùng/spam, hệ thống sẽ không nhận thêm đơn mang về mới trong 30 phút nếu đơn này vẫn chưa hoàn tất.</p>
              <PayOnlineButton orderId={result.id} accessToken={session?.token} />
            </>
          ) : null}
          {error ? <div className="form-notice error" role="alert">{error}</div> : null}
          <div className="takeaway-success-actions">
            {!cancelled && session ? (
              <button className="customer-order-cancel-button" type="button" disabled={cancelling} onClick={() => void cancelPendingResult()}>
                <XCircle aria-hidden="true" /> {cancelling ? 'Đang hủy…' : 'Hủy đơn'}
              </button>
            ) : null}
            <button className="secondary-button" type="button" onClick={() => { setResult(null); navigate('/menu') }}>Xem thực đơn</button>
            {session ? <button className="secondary-button" type="button" onClick={() => navigate('/orders')}>Xem Đơn của tôi</button> : <button className="secondary-button" type="button" onClick={signIn}>Đăng nhập cho lần sau</button>}
          </div>
          {!session && !cancelled ? <p>Đơn đặt khi chưa đăng nhập không thể tự hủy bằng tài khoản vì hệ thống chưa có thông tin xác thực chủ đơn. Vui lòng liên hệ nhà hàng nếu cần hủy.</p> : null}
        </section>
      </main>
    )
  }

  return (
    <main className="takeaway-page page-section">
      <header className="takeaway-order-header">
        <div>
          <button className="takeaway-back-link" type="button" onClick={() => navigate('/menu')}>← Tiếp tục chọn món</button>
          <h1>Đơn mang về</h1>
          <p>Kiểm tra món đã chọn và thông tin nhận món trước khi gửi đơn cho nhà hàng.</p>
        </div>
        <div className="takeaway-mode-badge">
          <ShoppingBag aria-hidden="true" />
          <span><small>Hình thức</small><strong>Nhận tại nhà hàng</strong></span>
        </div>
      </header>

      {!session ? (
        <button className="takeaway-login-hint" type="button" onClick={signIn}>
          <UserRound /><span><strong>Đăng nhập để lưu đơn vào “Đơn của tôi”</strong><small>Bạn vẫn có thể đặt mang về mà không cần đăng nhập.</small></span>
        </button>
      ) : null}

      {error ? <div className="form-notice error takeaway-page-error" role="alert">{error}</div> : null}

      {!lines.length ? (
        <div className="account-empty takeaway-empty"><PackageOpen /><h2>Giỏ mang về đang trống</h2><p>Mở thực đơn, chọn một món rồi thêm vào giỏ mang về.</p><button className="primary-button" type="button" onClick={() => navigate('/menu')}>Xem thực đơn</button></div>
      ) : (
        <form className="takeaway-layout" onSubmit={submit}>
          <section className="takeaway-order-panel">
            <div className="takeaway-pickup-strip">
              <div>
                <MapPin aria-hidden="true" />
                <span><small>Nhận món</small><strong>{data.restaurant?.restaurantName || 'Tại nhà hàng'}</strong></span>
              </div>
              <div>
                <Clock3 aria-hidden="true" />
                <span><small>Thời gian</small><strong>{pickupLabel(pickupTime)}</strong></span>
              </div>
              <button type="button" onClick={() => navigate('/menu')}>+ Thêm món</button>
            </div>

            <div className="takeaway-cart-heading">
              <div>
                <h2>Giỏ của bạn</h2>
                <p>{totalQuantity}/{MAX_TAKEAWAY_CART_QUANTITY} phần · tối đa {MAX_TAKEAWAY_ITEM_QUANTITY} phần/món</p>
              </div>
              <span>{lines.length} món</span>
            </div>

            <div className="takeaway-lines">
              {lines.map(({ item, quantity }, index) => (
                <article key={item.id}>
                  <img src={item.imageUrl || heroImage} className={!item.imageUrl ? `fallback-crop crop-${index % 3 + 1}` : ''} alt={item.name} />
                  <div className="takeaway-line-copy">
                    <small>{item.menuCategoryName}</small>
                    <strong>{item.name}</strong>
                    <span>{money(item.price, data.restaurant?.currency)} / phần</span>
                  </div>
                  <div className="takeaway-quantity" aria-label={`Số lượng ${item.name}`}>
                    <button type="button" aria-label={`Bớt ${item.name}`} onClick={() => changeQuantity(item.id, quantity - 1)}><Minus /></button>
                    <span>{quantity}</span>
                    <button type="button" aria-label={`Thêm ${item.name}`} disabled={quantity >= MAX_TAKEAWAY_ITEM_QUANTITY || totalQuantity >= MAX_TAKEAWAY_CART_QUANTITY} onClick={() => changeQuantity(item.id, quantity + 1)}><Plus /></button>
                  </div>
                  <strong className="takeaway-line-total">{money(item.price * quantity, data.restaurant?.currency)}</strong>
                </article>
              ))}
            </div>
          </section>

          <aside className="takeaway-checkout">
            <div className="takeaway-checkout-title">
              <ReceiptText aria-hidden="true" />
              <div><h2>Đơn mang về của bạn</h2><p>Nhận tại nhà hàng</p></div>
            </div>

            <div className="takeaway-mini-summary">
              {lines.map(({ item, quantity }) => (
                <div key={item.id}>
                  <span><b>{quantity}×</b> {item.name}</span>
                  <strong>{money(item.price * quantity, data.restaurant?.currency)}</strong>
                </div>
              ))}
            </div>

            <div className="takeaway-checkout-divider" />

            <div className="takeaway-contact-section">
              <h3>Thông tin nhận món</h3>
              <label>Người nhận<input required maxLength={150} value={customerName} onChange={event => setCustomerName(event.target.value)} placeholder="Họ và tên" /></label>
              <label>Số điện thoại<input required maxLength={30} value={phoneNumber} onChange={event => setPhoneNumber(event.target.value)} placeholder="Số điện thoại" inputMode="tel" /></label>
              <label>Thời gian muốn nhận <span className="optional-label">Không chọn = sớm nhất</span><input type="datetime-local" value={pickupTime} onChange={event => setPickupTime(event.target.value)} /></label>
              <label>Ghi chú<textarea maxLength={500} value={note} onChange={event => setNote(event.target.value)} placeholder="Ví dụ: không hành, đóng gói riêng..." /></label>
            </div>

            <div className="takeaway-price-summary">
              <div><span>Tạm tính</span><strong>{money(totalAmount, data.restaurant?.currency)}</strong></div>
              <div className="takeaway-price-total"><span>Tổng cộng</span><strong>{money(totalAmount, data.restaurant?.currency)}</strong></div>
            </div>

            <button className="primary-button full takeaway-submit" type="submit" disabled={submitting}>
              {submitting ? 'Đang gửi đơn…' : 'Gửi đơn mang về'}
            </button>
            <p className="takeaway-payment-note">Bạn không bắt buộc thanh toán trước. Nhà hàng có thể tiếp nhận và chuẩn bị món ngay sau khi nhận đơn.</p>
          </aside>
        </form>
      )}
    </main>
  )
}

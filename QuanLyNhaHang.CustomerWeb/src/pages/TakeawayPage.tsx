import { CheckCircle2, Minus, PackageOpen, Plus, ShoppingBag, UserRound } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import type { CustomerSession } from '../services/customerAuth'
import {
  createTakeawayOrder,
  type CustomerSiteBootstrap,
  type TakeawayOrderResult,
} from '../services/customerSite'
import heroImage from '../assets/hero-vietnamese-table.webp'
import PayOnlineButton from '../components/PayOnlineButton'
import { navigate } from '../utils/navigation'
import {
  clearTakeawayCart,
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
    localStorage.setItem('customerReturnPath', '/takeaway')
    navigate('/login')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!lines.length || submitting) return

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

  if (result) {
    return (
      <main className="takeaway-page page-section">
        <section className="takeaway-success">
          <CheckCircle2 />
          <h1>Đã nhận đơn mang về</h1>
          <p>Mã đơn của bạn là <strong>{result.orderCode}</strong>. Nhà hàng sẽ chuẩn bị món theo yêu cầu.</p>
          {result.pickupTime ? <p>Thời gian nhận dự kiến: <strong>{new Date(result.pickupTime).toLocaleString('vi-VN')}</strong></p> : <p>Nhà hàng sẽ chuẩn bị sớm nhất có thể.</p>}
          <p>Bạn có thể thanh toán online sau khi nhà hàng xác nhận và bắt đầu chuẩn bị món. Trạng thái thanh toán sẽ tự cập nhật tại đây.</p>
          <PayOnlineButton orderId={result.id} accessToken={session?.token} />
          <div>
            <button className="secondary-button" type="button" onClick={() => { setResult(null); navigate('/menu') }}>Đặt thêm món</button>
            {session ? <button className="secondary-button" type="button" onClick={() => navigate('/orders')}>Xem Đơn của tôi</button> : <button className="secondary-button" type="button" onClick={signIn}>Đăng nhập cho lần sau</button>}
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="takeaway-page page-section">
      <div className="takeaway-heading">
        <div><span className="page-kicker">ĐẶT MANG VỀ</span><h1>Chọn món, ghé quán và nhận</h1><p>Đơn mang về không cần chọn bàn hay quét QR. QR chỉ dùng khi bạn gọi món trực tiếp tại bàn.</p></div>
        <ShoppingBag />
      </div>

      {!session ? (
        <button className="takeaway-login-hint" type="button" onClick={signIn}>
          <UserRound /><span><strong>Đăng nhập để lưu đơn vào “Đơn của tôi”</strong><small>Bạn vẫn có thể đặt mang về mà không cần đăng nhập.</small></span>
        </button>
      ) : null}

      {error ? <div className="form-notice error" role="alert">{error}</div> : null}

      {!lines.length ? (
        <div className="account-empty takeaway-empty"><PackageOpen /><h2>Giỏ mang về đang trống</h2><p>Mở thực đơn, chọn một món rồi thêm vào giỏ mang về.</p><button className="primary-button" type="button" onClick={() => navigate('/menu')}>Xem thực đơn</button></div>
      ) : (
        <form className="takeaway-layout" onSubmit={submit}>
          <section className="takeaway-cart">
            <div className="takeaway-section-title"><div><h2>Giỏ mang về</h2><p>{totalQuantity} phần đã chọn</p></div><button type="button" className="text-link" onClick={() => navigate('/menu')}>+ Thêm món</button></div>
            <div className="takeaway-lines">
              {lines.map(({ item, quantity }, index) => (
                <article key={item.id}>
                  <img src={item.imageUrl || heroImage} className={!item.imageUrl ? `fallback-crop crop-${index % 3 + 1}` : ''} alt={item.name} />
                  <div className="takeaway-line-copy"><small>{item.menuCategoryName}</small><strong>{item.name}</strong><span>{money(item.price, data.restaurant?.currency)}</span></div>
                  <div className="takeaway-quantity"><button type="button" aria-label={`Bớt ${item.name}`} onClick={() => changeQuantity(item.id, quantity - 1)}><Minus /></button><span>{quantity}</span><button type="button" aria-label={`Thêm ${item.name}`} onClick={() => changeQuantity(item.id, quantity + 1)}><Plus /></button></div>
                  <strong>{money(item.price * quantity, data.restaurant?.currency)}</strong>
                </article>
              ))}
            </div>
            <div className="takeaway-total"><span>Tạm tính</span><strong>{money(totalAmount, data.restaurant?.currency)}</strong></div>
          </section>

          <aside className="takeaway-checkout">
            <h2>Thông tin nhận món</h2>
            <label>Người nhận<input required maxLength={150} value={customerName} onChange={event => setCustomerName(event.target.value)} placeholder="Họ và tên" /></label>
            <label>Số điện thoại<input required maxLength={30} value={phoneNumber} onChange={event => setPhoneNumber(event.target.value)} placeholder="Số điện thoại" inputMode="tel" /></label>
            <label>Thời gian muốn nhận <span className="optional-label">Không chọn = sớm nhất</span><input type="datetime-local" value={pickupTime} onChange={event => setPickupTime(event.target.value)} /></label>
            <label>Ghi chú<textarea maxLength={500} value={note} onChange={event => setNote(event.target.value)} placeholder="Ví dụ: không hành, đóng gói riêng..." /></label>
            <div className="takeaway-checkout-summary"><span>{totalQuantity} phần</span><strong>{money(totalAmount, data.restaurant?.currency)}</strong></div>
            <button className="primary-button full" type="submit" disabled={submitting}>{submitting ? 'Đang gửi đơn…' : 'Xác nhận đặt mang về'}</button>
          </aside>
        </form>
      )}
    </main>
  )
}

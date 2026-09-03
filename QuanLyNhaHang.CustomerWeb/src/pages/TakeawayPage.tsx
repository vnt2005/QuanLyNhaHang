import { CheckCircle2, Clock3, MapPin, Minus, PackageOpen, Plus, ShoppingBag, UserRound, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { CustomerSession } from '../services/customerAuth'
import { cancelCustomerOrder } from '../services/customerOrders'
import { createTakeawayOrder, type CustomerSiteBootstrap, type TakeawayOrderResult } from '../services/customerSite'
import heroImage from '../assets/hero-vietnamese-table.webp'
import { confirmCustomerAction } from '../components/CustomerConfirmDialog'
import PayOnlineButton from '../components/PayOnlineButton'
import { navigate } from '../utils/navigation'
import { clearTakeawayCart, MAX_TAKEAWAY_CART_QUANTITY, MAX_TAKEAWAY_ITEM_QUANTITY, readTakeawayCart, setTakeawayItemQuantity, type TakeawayCart } from '../utils/takeawayCart'

const CUSTOMER_NAME_PATTERN = /^[\p{L}][\p{L}'’-]*(?:\s+[\p{L}][\p{L}'’-]*)+$/u
const VIETNAMESE_MOBILE_PATTERN = /^0[35789]\d{8}$/

function money(value: number, code = 'VND') {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: code || 'VND', maximumFractionDigits: 0 }).format(value)
}

function pickupLabel(value: string) {
  if (!value) return 'Sớm nhất có thể'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return 'Sớm nhất có thể'
  return parsed.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })
}

function normalizeCustomerName(value: string) {
  return value.trim().replace(/\s+/g, ' ').normalize('NFC')
}

function normalizeVietnameseMobile(value: string) {
  let compact = value.trim().replace(/[\s.-]/g, '')
  if (compact.startsWith('+84')) compact = `0${compact.slice(3)}`
  else if (compact.startsWith('84') && compact.length === 11) compact = `0${compact.slice(2)}`
  return compact
}

function validateContact(customerName: string, phoneNumber: string) {
  const normalizedName = normalizeCustomerName(customerName)
  const normalizedPhone = normalizeVietnameseMobile(phoneNumber)
  const letterCount = normalizedName.match(/\p{L}/gu)?.length ?? 0

  if (normalizedName.length < 4 || normalizedName.length > 60 || letterCount < 4 || !CUSTOMER_NAME_PATTERN.test(normalizedName)) {
    return { error: 'Họ và tên phải có ít nhất 2 từ, chỉ gồm chữ cái, khoảng trắng, dấu nháy hoặc gạch nối.' }
  }

  if (!VIETNAMESE_MOBILE_PATTERN.test(normalizedPhone)) {
    return { error: 'Số điện thoại di động Việt Nam phải gồm 10 số và bắt đầu bằng 03, 05, 07, 08 hoặc 09.' }
  }

  return { customerName: normalizedName, phoneNumber: normalizedPhone }
}

export default function TakeawayPage({ data, session }: { data: CustomerSiteBootstrap; session: CustomerSession | null }) {
  const [cart, setCart] = useState<TakeawayCart>(() => readTakeawayCart())
  const [customerName, setCustomerName] = useState(() => session ? [session.ho, session.ten].filter(Boolean).join(' ') : '')
  const [phoneNumber, setPhoneNumber] = useState(() => session?.phoneNumber || '')
  const [pickupTime, setPickupTime] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<TakeawayOrderResult | null>(null)

  useEffect(() => {
    if (!session) return
    const sessionName = [session.ho, session.ten].filter(Boolean).join(' ')
    setCustomerName(current => current || sessionName)
    setPhoneNumber(current => current || session.phoneNumber || '')
  }, [session?.ho, session?.phoneNumber, session?.ten, session?.userId])

  const lines = useMemo(() => data.menuItems.map(item => ({ item, quantity: cart[item.id] || 0 })).filter(line => line.quantity > 0), [cart, data.menuItems])
  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0)
  const totalAmount = lines.reduce((sum, line) => sum + line.item.price * line.quantity, 0)

  function changeQuantity(menuItemId: string, quantity: number) { setCart(setTakeawayItemQuantity(menuItemId, quantity)) }
  function signIn() { localStorage.removeItem('customerReturnPath'); sessionStorage.setItem('customerReturnPath', '/takeaway'); navigate('/login') }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!lines.length || submitting) return
    if (totalQuantity > MAX_TAKEAWAY_CART_QUANTITY) return setError(`Một đơn chỉ được tối đa ${MAX_TAKEAWAY_CART_QUANTITY} phần.`)
    if (lines.some(line => line.quantity > MAX_TAKEAWAY_ITEM_QUANTITY)) return setError(`Mỗi món chỉ được tối đa ${MAX_TAKEAWAY_ITEM_QUANTITY} phần.`)

    const contact = validateContact(customerName, phoneNumber)
    if (contact.error || !contact.customerName || !contact.phoneNumber) return setError(contact.error || 'Thông tin người nhận không hợp lệ.')

    let pickupIso: string | null = null
    if (pickupTime) {
      const date = new Date(pickupTime)
      if (Number.isNaN(date.getTime())) return setError('Thời gian nhận món không hợp lệ.')
      if (date.getTime() < Date.now() - 60_000) return setError('Thời gian nhận món không được ở trong quá khứ.')
      pickupIso = date.toISOString()
    }

    setCustomerName(contact.customerName)
    setPhoneNumber(contact.phoneNumber)
    setSubmitting(true); setError('')
    try {
      const response = await createTakeawayOrder({
        customerName: contact.customerName, phoneNumber: contact.phoneNumber, pickupTime: pickupIso,
        note: note.trim() || null, items: lines.map(line => ({ menuItemId: line.item.id, quantity: line.quantity })),
      }, session?.token)
      clearTakeawayCart(); setCart({}); setResult(response.data); window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'Không đặt được món mang về.') }
    finally { setSubmitting(false) }
  }

  async function cancelPendingResult() {
    if (!session || !result || result.status !== 'Pending' || cancelling) return
    const confirmed = await confirmCustomerAction(`Đơn ${result.orderCode} sẽ được hủy nếu vẫn chưa thanh toán và nhà hàng chưa bắt đầu xử lý. Bạn có muốn tiếp tục?`)
    if (!confirmed) return
    setCancelling(true); setError('')
    try { await cancelCustomerOrder(result.id); setResult(current => current ? { ...current, status: 'Cancelled' } : current) }
    catch (exception) { setError(exception instanceof Error ? exception.message : 'Không hủy được đơn hàng.') }
    finally { setCancelling(false) }
  }

  if (result) {
    const cancelled = result.status === 'Cancelled'
    return (
      <main className="sera-page">
        <section className="mx-auto max-w-3xl border-y border-border py-14 text-center">
          <div className="mx-auto mb-5 grid size-12 place-items-center border border-border">{cancelled ? <XCircle /> : <CheckCircle2 />}</div>
          <p className="sera-kicker">Đơn mang về</p>
          <h1 className="sera-title mt-3">{cancelled ? 'Đơn đã được hủy.' : 'Đơn đã đến nhà hàng.'}</h1>
          <p className="sera-copy mx-auto mt-5 max-w-xl">Mã đơn <strong className="text-foreground">{result.orderCode}</strong>. {cancelled ? 'Nhà hàng đã nhận trạng thái hủy.' : 'Bếp có thể tiếp nhận và chuẩn bị món mà không cần bạn thanh toán trước.'}</p>
          {!cancelled ? (
            <div className="mt-8 grid gap-5 border-t border-border pt-7 text-left">
              <div className="flex items-center gap-3"><Clock3 className="size-5 text-accent" /><div><small className="text-muted-foreground">Thời gian nhận</small><strong className="block">{result.pickupTime ? new Date(result.pickupTime).toLocaleString('vi-VN') : 'Sớm nhất có thể'}</strong></div></div>
              <Alert><Clock3 /><AlertTitle>Thanh toán sau khi bếp hoàn thành</AlertTitle><AlertDescription>Nếu toàn bộ món đã hoàn thành mà đơn vẫn chưa thanh toán, hệ thống bắt đầu thời hạn 5 phút. Quá thời hạn, đơn sẽ tự động hủy.</AlertDescription></Alert>
              <PayOnlineButton orderId={result.id} accessToken={session?.token} />
            </div>
          ) : null}
          {error ? <Alert variant="destructive" className="mt-5 text-left"><AlertTitle>Không thể hoàn tất thao tác</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {!cancelled && session ? <Button variant="destructive" disabled={cancelling} onClick={() => void cancelPendingResult()}><XCircle />{cancelling ? 'Đang hủy…' : 'Hủy đơn'}</Button> : null}
            <Button variant="outline" onClick={() => { setResult(null); navigate('/menu') }}>Xem thực đơn</Button>
            {session ? <Button onClick={() => navigate('/orders')}>Đơn của tôi</Button> : <Button onClick={signIn}>Đăng nhập</Button>}
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="sera-page">
      <header className="sera-page-head">
        <div><p className="sera-kicker">Mang về</p><h1 className="sera-display mt-3">Chốt món và chọn giờ nhận.</h1><p>Bếp nhận đơn trước. Bạn chỉ thanh toán sau khi món đã nấu xong; nếu quá 5 phút vẫn chưa thanh toán, hệ thống tự hủy theo đúng quy trình hiện tại.</p></div>
        <div className="sera-page-summary"><span>{lines.length} món · {totalQuantity}/{MAX_TAKEAWAY_CART_QUANTITY} phần</span></div>
      </header>

      {!session ? <button className="mt-6 flex w-full items-center gap-4 border-y border-border py-4 text-left" type="button" onClick={signIn}><UserRound className="size-5 text-accent" /><span className="flex-1"><strong className="block text-sm">Đăng nhập để lưu đơn</strong><small className="text-muted-foreground">Bạn vẫn có thể đặt món mà không cần tài khoản; hệ thống áp dụng giới hạn chống spam theo thiết bị và IP.</small></span><span className="sera-link">Đăng nhập</span></button> : null}
      {error ? <Alert variant="destructive" className="mt-6"><AlertTitle>Không thể gửi đơn</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

      {!lines.length ? (
        <section className="sera-empty mt-8"><div><PackageOpen /><h2>Chưa có món nào trong giỏ.</h2><p>Quay lại thực đơn và chọn món bạn muốn mang về.</p><Button onClick={() => navigate('/menu')}>Mở thực đơn</Button></div></section>
      ) : (
        <form onSubmit={submit} className="mt-10 grid gap-12 lg:grid-cols-[1.25fr_.75fr]">
          <div>
            <div className="flex items-end justify-between border-b border-border pb-4"><div><p className="sera-kicker">Giỏ hàng</p><h2 className="font-heading text-4xl">Món đã chọn</h2></div><Button variant="outline" size="sm" type="button" onClick={() => navigate('/menu')}>Thêm món</Button></div>
            <div>
              {lines.map(({ item, quantity }) => (
                <article className="grid grid-cols-[96px_1fr_auto] items-center gap-5 border-b border-border py-5 max-sm:grid-cols-[76px_1fr]" key={item.id}>
                  <img src={item.imageUrl || heroImage} className="aspect-square size-24 object-cover max-sm:size-[76px]" alt={item.name} />
                  <div><small className="sera-kicker">{item.menuCategoryName}</small><h3 className="mt-1 font-heading text-2xl">{item.name}</h3><span className="text-xs text-muted-foreground">{money(item.price, data.restaurant?.currency)} / phần</span></div>
                  <div className="grid justify-items-end gap-3 max-sm:col-start-2 max-sm:justify-items-start"><div className="sera-qty"><Button variant="outline" size="icon" type="button" onClick={() => changeQuantity(item.id, quantity - 1)}><Minus /></Button><strong>{quantity}</strong><Button variant="outline" size="icon" type="button" disabled={quantity >= MAX_TAKEAWAY_ITEM_QUANTITY || totalQuantity >= MAX_TAKEAWAY_CART_QUANTITY} onClick={() => changeQuantity(item.id, quantity + 1)}><Plus /></Button></div><strong>{money(item.price * quantity, data.restaurant?.currency)}</strong></div>
                </article>
              ))}
            </div>
          </div>

          <aside>
            <section className="sera-panel"><p className="sera-kicker">01 · Nhận món</p><h2 className="mt-2 text-3xl">Tại nhà hàng</h2><div className="mt-5 flex gap-3 text-sm"><MapPin className="size-5 text-accent" /><div><strong>{data.restaurant?.restaurantName || 'Nhà hàng'}</strong><small className="block text-muted-foreground">{data.restaurant?.address || 'Địa chỉ đang cập nhật'}</small></div></div><label className="sera-field mt-6">Thời gian muốn nhận<Input type="datetime-local" value={pickupTime} onChange={event => setPickupTime(event.target.value)} /></label></section>
            <section className="sera-panel"><p className="sera-kicker">02 · Người nhận</p><h2 className="mt-2 text-3xl">Thông tin liên hệ</h2><div className="sera-field-grid mt-5"><label className="sera-field">Họ và tên<Input required minLength={4} maxLength={60} autoComplete="name" placeholder="Nguyễn Văn An" value={customerName} onChange={event => setCustomerName(event.target.value)} /><small className="text-muted-foreground">Tối thiểu 2 từ; không dùng số hoặc ký tự lạ.</small></label><label className="sera-field">Số điện thoại<Input required maxLength={16} autoComplete="tel" placeholder="0912345678" value={phoneNumber} onChange={event => setPhoneNumber(event.target.value)} inputMode="tel" /><small className="text-muted-foreground">Số di động Việt Nam 10 số, đầu 03/05/07/08/09.</small></label><label className="sera-field wide">Ghi chú<Textarea maxLength={500} value={note} onChange={event => setNote(event.target.value)} /></label></div></section>
            <section className="sera-panel"><div className="grid gap-3 text-sm"><span className="flex justify-between"><small className="text-muted-foreground">Nhận món</small><strong>{pickupLabel(pickupTime)}</strong></span><span className="flex justify-between"><small className="text-muted-foreground">Tổng số phần</small><strong>{totalQuantity}</strong></span><span className="flex justify-between border-t border-border pt-3 text-base"><small>Tổng cộng</small><strong>{money(totalAmount, data.restaurant?.currency)}</strong></span></div><Button className="mt-5 w-full" size="lg" type="submit" disabled={submitting}><ShoppingBag />{submitting ? 'Đang gửi đơn…' : 'Gửi đơn cho nhà hàng'}</Button></section>
          </aside>
        </form>
      )}
    </main>
  )
}

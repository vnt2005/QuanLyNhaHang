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
      <main className="bg-background text-foreground">
        <section className="mx-auto w-[min(980px,calc(100vw-48px))] py-16 sm:w-[min(980px,calc(100vw-80px))] md:py-24">
          <div className="border border-border p-7 sm:p-10 md:p-14">
            <div className="flex items-start gap-4 border-b border-border pb-8">
              {cancelled ? <XCircle className="mt-1 size-6 text-destructive" /> : <CheckCircle2 className="mt-1 size-6" />}
              <div>
                <p className="text-[10px] font-semibold tracking-[0.2em] text-muted-foreground uppercase">Đơn mang về</p>
                <h1 className="mt-2 font-heading text-5xl leading-none tracking-[-0.04em] sm:text-6xl">{cancelled ? 'Đơn đã hủy' : 'Nhà hàng đã nhận đơn'}</h1>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">Mã đơn <strong className="text-foreground">{result.orderCode}</strong>.</p>
              </div>
            </div>

            {!cancelled ? (
              <div className="grid gap-6 py-8 text-sm leading-7 text-muted-foreground">
                {result.pickupTime ? <p>Thời gian nhận dự kiến: <strong className="text-foreground">{new Date(result.pickupTime).toLocaleString('vi-VN')}</strong></p> : <p>Nhà hàng sẽ chuẩn bị món sớm nhất có thể sau khi tiếp nhận đơn.</p>}
                <Alert>
                  <Clock3 />
                  <AlertTitle>Thanh toán sau khi bếp hoàn thành</AlertTitle>
                  <AlertDescription>Nếu đơn vẫn chưa được ghi nhận thanh toán khi bếp hoàn thành toàn bộ món, hệ thống bắt đầu thời hạn 5 phút. Quá thời hạn chưa thanh toán, đơn sẽ tự động hủy.</AlertDescription>
                </Alert>
                <PayOnlineButton orderId={result.id} accessToken={session?.token} />
              </div>
            ) : <p className="py-8 text-sm leading-7 text-muted-foreground">Đơn đã được hủy và nhà hàng đã nhận thông báo.</p>}

            {error ? <Alert variant="destructive" className="mb-6"><AlertTitle>Không thể hoàn tất thao tác</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

            <div className="flex flex-wrap gap-3 border-t border-border pt-7">
              {!cancelled && session ? <Button variant="destructive" type="button" disabled={cancelling} onClick={() => void cancelPendingResult()}><XCircle data-icon="inline-start" /> {cancelling ? 'Đang hủy…' : 'Hủy đơn'}</Button> : null}
              <Button variant="outline" type="button" onClick={() => { setResult(null); navigate('/menu') }}>Xem thực đơn</Button>
              {session ? <Button type="button" onClick={() => navigate('/orders')}>Xem đơn của tôi</Button> : <Button type="button" onClick={signIn}>Đăng nhập cho lần sau</Button>}
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="bg-background text-foreground">
      <section className="mx-auto w-[min(1440px,calc(100vw-48px))] py-14 sm:w-[min(1440px,calc(100vw-80px))] md:py-20">
        <header className="grid gap-7 border-b border-border pb-9 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <Button variant="link" className="mb-4 px-0" type="button" onClick={() => navigate('/menu')}>← Tiếp tục chọn món</Button>
            <p className="text-[10px] font-semibold tracking-[0.22em] text-muted-foreground uppercase">Nhận tại nhà hàng</p>
            <h1 className="mt-3 font-heading text-[clamp(3.8rem,6vw,7rem)] leading-[0.88] tracking-[-0.055em]">Đơn mang về.</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground">Kiểm tra món đã chọn, thông tin người nhận và thời gian trước khi gửi đơn cho nhà hàng.</p>
          </div>
          <div className="grid grid-cols-2 gap-5 border-l border-border pl-6 text-xs md:min-w-80">
            <span><small className="block tracking-[0.14em] text-muted-foreground uppercase">Số phần</small><strong className="mt-2 block text-lg">{totalQuantity}</strong></span>
            <span><small className="block tracking-[0.14em] text-muted-foreground uppercase">Tạm tính</small><strong className="mt-2 block text-lg">{money(totalAmount, data.restaurant?.currency)}</strong></span>
          </div>
        </header>

        {!session ? (
          <button className="mt-7 flex w-full items-center gap-4 border border-border border-l-2 border-l-foreground px-5 py-4 text-left" type="button" onClick={signIn}>
            <UserRound className="size-5" /><span><strong className="block text-xs tracking-wide">Đăng nhập để lưu đơn vào “Đơn của tôi”</strong><small className="mt-1 block text-xs text-muted-foreground">Bạn vẫn có thể đặt mang về mà không cần đăng nhập.</small></span>
          </button>
        ) : null}

        {error ? <Alert variant="destructive" className="mt-7"><AlertTitle>Không thể gửi đơn</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}

        {!lines.length ? (
          <div className="mt-10 grid min-h-80 place-items-center border border-dashed border-border text-center">
            <div className="max-w-md px-6"><PackageOpen className="mx-auto mb-5 size-7 text-muted-foreground" /><h2 className="font-heading text-4xl">Giỏ mang về đang trống</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Mở thực đơn, chọn một món rồi thêm vào giỏ mang về.</p><Button className="mt-7" type="button" onClick={() => navigate('/menu')}>Xem thực đơn</Button></div>
          </div>
        ) : (
          <form className="mt-10 grid gap-8 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,.65fr)]" onSubmit={submit}>
            <section className="border border-border">
              <div className="grid gap-4 border-b border-border px-5 py-5 sm:grid-cols-[1fr_1fr_auto] sm:items-center">
                <div className="flex gap-3"><MapPin className="mt-0.5 size-4" /><span><small className="block text-[9px] tracking-[0.14em] text-muted-foreground uppercase">Nhận món</small><strong className="mt-1 block text-sm">{data.restaurant?.restaurantName || 'Tại nhà hàng'}</strong></span></div>
                <div className="flex gap-3"><Clock3 className="mt-0.5 size-4" /><span><small className="block text-[9px] tracking-[0.14em] text-muted-foreground uppercase">Thời gian</small><strong className="mt-1 block text-sm">{pickupLabel(pickupTime)}</strong></span></div>
                <Button variant="outline" size="sm" type="button" onClick={() => navigate('/menu')}>+ Thêm món</Button>
              </div>

              <div className="flex items-end justify-between gap-4 border-b border-border px-5 py-6">
                <div><h2 className="font-heading text-3xl">Giỏ của bạn</h2><p className="mt-2 text-xs text-muted-foreground">Tối đa {MAX_TAKEAWAY_CART_QUANTITY} phần · {MAX_TAKEAWAY_ITEM_QUANTITY} phần/món</p></div>
                <span className="text-[10px] font-semibold tracking-[0.14em] uppercase">{lines.length} món</span>
              </div>

              <div>
                {lines.map(({ item, quantity }, index) => (
                  <article className="grid gap-4 border-b border-border p-5 last:border-b-0 sm:grid-cols-[96px_1fr_auto] sm:items-center" key={item.id}>
                    <img src={item.imageUrl || heroImage} className={`${!item.imageUrl ? `fallback-crop crop-${index % 3 + 1}` : ''} aspect-square size-24 object-cover`} alt={item.name} />
                    <div>
                      <small className="text-[9px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">{item.menuCategoryName}</small>
                      <strong className="mt-2 block font-heading text-2xl font-medium">{item.name}</strong>
                      <span className="mt-2 block text-xs text-muted-foreground">{money(item.price, data.restaurant?.currency)} / phần</span>
                    </div>
                    <div className="flex items-center justify-between gap-5 sm:flex-col sm:items-end">
                      <div className="flex items-center border border-border">
                        <button className="grid size-9 place-items-center disabled:opacity-35" type="button" aria-label={`Bớt ${item.name}`} onClick={() => changeQuantity(item.id, quantity - 1)}><Minus className="size-3" /></button>
                        <span className="grid min-w-10 place-items-center border-x border-border text-sm">{quantity}</span>
                        <button className="grid size-9 place-items-center disabled:opacity-35" type="button" aria-label={`Thêm ${item.name}`} disabled={quantity >= MAX_TAKEAWAY_ITEM_QUANTITY || totalQuantity >= MAX_TAKEAWAY_CART_QUANTITY} onClick={() => changeQuantity(item.id, quantity + 1)}><Plus className="size-3" /></button>
                      </div>
                      <strong className="text-sm">{money(item.price * quantity, data.restaurant?.currency)}</strong>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <aside className="h-fit border border-border xl:sticky xl:top-28">
              <div className="flex gap-3 border-b border-border px-5 py-5"><ReceiptText className="mt-1 size-4" /><div><h2 className="font-heading text-2xl">Thông tin nhận món</h2><p className="mt-1 text-xs text-muted-foreground">Nhận tại nhà hàng</p></div></div>
              <div className="grid gap-6 px-5 py-6">
                <label className="grid gap-2 text-[10px] font-semibold tracking-[0.14em] uppercase">Người nhận<Input required maxLength={150} value={customerName} onChange={event => setCustomerName(event.target.value)} placeholder="Họ và tên" className="normal-case tracking-normal" /></label>
                <label className="grid gap-2 text-[10px] font-semibold tracking-[0.14em] uppercase">Số điện thoại<Input required maxLength={30} value={phoneNumber} onChange={event => setPhoneNumber(event.target.value)} placeholder="Số điện thoại" inputMode="tel" className="normal-case tracking-normal" /></label>
                <label className="grid gap-2 text-[10px] font-semibold tracking-[0.14em] uppercase">Thời gian muốn nhận<Input type="datetime-local" value={pickupTime} onChange={event => setPickupTime(event.target.value)} className="normal-case tracking-normal" /></label>
                <label className="grid gap-2 text-[10px] font-semibold tracking-[0.14em] uppercase">Ghi chú<Textarea maxLength={500} value={note} onChange={event => setNote(event.target.value)} placeholder="Ví dụ: không hành, đóng gói riêng..." className="min-h-24 normal-case tracking-normal" /></label>
              </div>
              <div className="border-t border-border px-5 py-5">
                <div className="flex items-end justify-between gap-4"><span className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">Tổng cộng</span><strong className="text-xl">{money(totalAmount, data.restaurant?.currency)}</strong></div>
                <Button className="mt-5 w-full" type="submit" disabled={submitting}>{submitting ? 'Đang gửi đơn…' : 'Gửi đơn mang về'}</Button>
                <p className="mt-4 text-[11px] leading-5 text-muted-foreground">Bạn không bắt buộc thanh toán trước. Nhà hàng có thể tiếp nhận và chuẩn bị món ngay sau khi nhận đơn.</p>
              </div>
            </aside>
          </form>
        )}
      </section>
    </main>
  )
}

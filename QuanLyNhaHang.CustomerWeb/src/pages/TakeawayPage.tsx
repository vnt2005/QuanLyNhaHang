import {
  CheckCircle2,
  Clock3,
  Flame,
  Info,
  MapPin,
  Minus,
  PackageCheck,
  PackageOpen,
  Plus,
  ShoppingBag,
  Sparkles,
  Store,
  Trash2,
  UserRound,
  UtensilsCrossed,
  XCircle,
} from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { CustomerSession } from '../services/customerAuth'
import { cancelCustomerOrder } from '../services/customerOrders'
import {
  createTakeawayOrder,
  type CustomerSiteBootstrap,
  type PublicMenuItem,
  type TakeawayOrderResult,
} from '../services/customerSite'
import { confirmCustomerAction } from '../components/CustomerConfirmDialog'
import PayOnlineButton from '../components/PayOnlineButton'
import { getFallbackDishImage, getFallbackImagePosition } from '../utils/menuCatalog'
import { navigate } from '../utils/navigation'
import {
  addTakeawayItem,
  clearTakeawayCart,
  MAX_TAKEAWAY_CART_QUANTITY,
  MAX_TAKEAWAY_ITEM_QUANTITY,
  readTakeawayCart,
  readTakeawayNotes,
  setTakeawayItemNote,
  setTakeawayItemQuantity,
  TAKEAWAY_CART_EVENT,
  type TakeawayCart,
  type TakeawayNotesMap,
} from '../utils/takeawayCart'

const CUSTOMER_NAME_PATTERN = /^[\p{L}][\p{L}'’-]*(?:\s+[\p{L}][\p{L}'’-]*)+$/u
const VIETNAMESE_MOBILE_PATTERN = /^0[35789]\d{8}$/

function money(value: number, code = 'VND') {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: code || 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

function normalizeCustomerName(value: string) {
  return value.trim().replace(/\s+/g, ' ').normalize('NFC')
}

function normalizeVietnameseMobile(value: string) {
  let compact = value.trim().replace(/[\s.-]/g, '')
  if (compact.startsWith('+84')) compact = `0${compact.slice(3)}`
  else if (compact.startsWith('84') && compact.length === 11)
    compact = `0${compact.slice(2)}`
  return compact
}

function validateContact(customerName: string, phoneNumber: string) {
  const normalizedName = normalizeCustomerName(customerName)
  const normalizedPhone = normalizeVietnameseMobile(phoneNumber)
  const letterCount = normalizedName.match(/\p{L}/gu)?.length ?? 0

  if (
    normalizedName.length < 4 ||
    normalizedName.length > 60 ||
    letterCount < 4 ||
    !CUSTOMER_NAME_PATTERN.test(normalizedName)
  ) {
    return {
      error:
        'Họ và tên phải có ít nhất 2 từ, chỉ gồm chữ cái, khoảng trắng, dấu nháy hoặc gạch nối.',
    }
  }

  if (!VIETNAMESE_MOBILE_PATTERN.test(normalizedPhone)) {
    return {
      error:
        'Số điện thoại di động Việt Nam phải gồm 10 số và bắt đầu bằng 03, 05, 07, 08 hoặc 09.',
    }
  }

  return { customerName: normalizedName, phoneNumber: normalizedPhone }
}

export default function TakeawayPage({
  data,
  session,
}: {
  data: CustomerSiteBootstrap
  session: CustomerSession | null
}) {
  const [cart, setCart] = useState<TakeawayCart>(() => readTakeawayCart())
  const [itemNotes, setItemNotes] = useState<TakeawayNotesMap>(() => readTakeawayNotes())

  // Contact & Order states
  const [customerName, setCustomerName] = useState(() =>
    session ? [session.ho, session.ten].filter(Boolean).join(' ') : '',
  )
  const [phoneNumber, setPhoneNumber] = useState(
    () => session?.phoneNumber || '',
  )
  const [pickupTime, setPickupTime] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<TakeawayOrderResult | null>(null)

  useEffect(() => {
    const updateCartFromStorage = () => {
      setCart(readTakeawayCart())
      setItemNotes(readTakeawayNotes())
    }
    updateCartFromStorage()
    window.addEventListener(TAKEAWAY_CART_EVENT, updateCartFromStorage)
    window.addEventListener('storage', updateCartFromStorage)
    return () => {
      window.removeEventListener(TAKEAWAY_CART_EVENT, updateCartFromStorage)
      window.removeEventListener('storage', updateCartFromStorage)
    }
  }, [session?.userId])

  useEffect(() => {
    if (!session) return
    const sessionName = [session.ho, session.ten].filter(Boolean).join(' ')
    setCustomerName(current => current || sessionName)
    setPhoneNumber(current => current || session.phoneNumber || '')
  }, [session?.ho, session?.phoneNumber, session?.ten, session?.userId])

  const lines = useMemo(
    () =>
      data.menuItems
        .map((item, idx) => ({
          item,
          idx,
          quantity: cart[item.id] || 0,
          itemNote: itemNotes[item.id] || '',
        }))
        .filter(line => line.quantity > 0),
    [cart, data.menuItems, itemNotes],
  )

  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0)
  const subtotalAmount = lines.reduce(
    (sum, line) => sum + line.item.price * line.quantity,
    0,
  )

  const recommendedDishes = useMemo<PublicMenuItem[]>(() => {
    const cartIds = new Set(lines.map(l => l.item.id))
    return data.menuItems
      .filter(item => item.isAvailable && !cartIds.has(item.id))
      .slice(0, 4)
  }, [data.menuItems, lines])

  const quickAddSides = useMemo<PublicMenuItem[]>(() => {
    const cartIds = new Set(lines.map(l => l.item.id))
    return data.menuItems
      .filter(item => item.isAvailable && !cartIds.has(item.id))
      .slice(0, 6)
  }, [data.menuItems, lines])

  function handleQuickAdd(item: PublicMenuItem) {
    addTakeawayItem(item.id, 1)
    setCart(readTakeawayCart())
    setItemNotes(readTakeawayNotes())
  }

  function changeQuantity(menuItemId: string, quantity: number) {
    setCart(setTakeawayItemQuantity(menuItemId, quantity))
    setItemNotes(readTakeawayNotes())
  }

  function changeItemNote(menuItemId: string, nextNote: string) {
    setItemNotes(setTakeawayItemNote(menuItemId, nextNote))
  }

  function signIn() {
    localStorage.removeItem('customerReturnPath')
    sessionStorage.setItem('customerReturnPath', '/takeaway')
    navigate('/login')
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!lines.length || submitting) return
    if (totalQuantity > MAX_TAKEAWAY_CART_QUANTITY)
      return setError(
        `Một đơn chỉ được tối đa ${MAX_TAKEAWAY_CART_QUANTITY} phần.`,
      )
    if (lines.some(line => line.quantity > MAX_TAKEAWAY_ITEM_QUANTITY))
      return setError(
        `Mỗi món chỉ được tối đa ${MAX_TAKEAWAY_ITEM_QUANTITY} phần.`,
      )

    const contact = validateContact(customerName, phoneNumber)
    if (contact.error || !contact.customerName || !contact.phoneNumber)
      return setError(contact.error || 'Thông tin người nhận không hợp lệ.')

    let pickupIso: string | null = null
    if (pickupTime) {
      const date = new Date(pickupTime)
      if (Number.isNaN(date.getTime()))
        return setError('Thời gian nhận món không hợp lệ.')
      if (date.getTime() < Date.now() - 60_000)
        return setError('Thời gian nhận món không được ở trong quá khứ.')
      pickupIso = date.toISOString()
    }

    setCustomerName(contact.customerName)
    setPhoneNumber(contact.phoneNumber)
    setSubmitting(true)
    setError('')
    try {
      const response = await createTakeawayOrder(
        {
          customerName: contact.customerName,
          phoneNumber: contact.phoneNumber,
          pickupTime: pickupIso,
          note: note.trim() || null,
          items: lines.map(line => ({
            menuItemId: line.item.id,
            quantity: line.quantity,
            note: line.itemNote.trim() || null,
          })),
        },
        session?.token,
      )
      clearTakeawayCart()
      setCart({})
      setItemNotes({})
      setResult(response.data)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Không gửi được đơn đặt món.',
      )
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
      setResult(current =>
        current ? { ...current, status: 'Cancelled' } : current,
      )
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Không hủy được đơn hàng.',
      )
    } finally {
      setCancelling(false)
    }
  }

  const currencyCode = data.restaurant?.currency || 'VND'

  if (result) {
    const cancelled = result.status === 'Cancelled'

    return (
      <main className="sera-page">
        <section className="mx-auto max-w-3xl border-y border-border py-14 text-center">
          <div className="mx-auto mb-5 grid size-12 place-items-center border border-border">
            {cancelled ? <XCircle /> : <CheckCircle2 />}
          </div>
          <p className="sera-kicker">Đơn đặt mang về</p>
          <h1 className="sera-title mt-3">
            {cancelled ? 'Đơn đã được hủy.' : 'Đơn mang về đã được gửi đến nhà hàng.'}
          </h1>
          <p className="sera-copy mx-auto mt-5 max-w-xl">
            Mã đơn <strong className="text-foreground">{result.orderCode}</strong>.{' '}
            {cancelled
              ? 'Nhà hàng đã cập nhật trạng thái hủy.'
              : 'Bếp sẽ tiếp nhận và chuẩn bị món cho bạn theo thời gian hẹn.'}
          </p>

          {!cancelled ? (
            <div className="mt-8 grid gap-5 border-t border-border pt-7 text-left">
              <div className="flex items-center gap-3">
                <Store className="size-5 text-accent" />
                <div>
                  <small className="text-muted-foreground">Địa điểm nhận món</small>
                  <strong className="block">
                    {data.restaurant?.restaurantName || 'Nhà hàng'} ·{' '}
                    {data.restaurant?.address || 'Tại quầy'}
                  </strong>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock3 className="size-5 text-accent" />
                <div>
                  <small className="text-muted-foreground">Thời gian nhận tại quầy</small>
                  <strong className="block">
                    {result.pickupTime
                      ? new Date(result.pickupTime).toLocaleString('vi-VN')
                      : 'Sớm nhất có thể'}
                  </strong>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-3">
                <span>Tổng tiền món:</span>
                <strong className="text-xl">
                  {money(result.totalAmount, currencyCode)}
                </strong>
              </div>

              <Alert>
                <Clock3 />
                <AlertTitle>Thanh toán trực tuyến</AlertTitle>
                <AlertDescription>
                  Bạn có thể thanh toán trực tuyến ngay bây giờ qua mã QR hoặc thanh toán tại quầy khi nhận món.
                </AlertDescription>
              </Alert>

              <PayOnlineButton
                orderId={result.id}
                accessToken={session?.token}
              />
            </div>
          ) : null}

          {error ? (
            <Alert variant="destructive" className="mt-5 text-left">
              <AlertTitle>Không thể hoàn tất thao tác</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {!cancelled && session ? (
              <Button
                variant="destructive"
                disabled={cancelling}
                onClick={() => void cancelPendingResult()}
              >
                <XCircle />
                {cancelling ? 'Đang hủy…' : 'Hủy đơn'}
              </Button>
            ) : null}
            <Button
              variant="outline"
              onClick={() => {
                setResult(null)
                navigate('/menu')
              }}
            >
              Xem thực đơn
            </Button>
            {session ? (
              <Button onClick={() => navigate('/orders')}>Đơn của tôi</Button>
            ) : (
              <Button onClick={signIn}>Đăng nhập</Button>
            )}
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="sera-page">
      {lines.length > 0 ? (
      <header className="sera-page-head">
        <div>
          <p className="sera-kicker">Đặt món mang về (Takeaway)</p>
          <h1 className="sera-display mt-3">Chốt món và ghé nhận tại quầy.</h1>
          <p>
            Nhà hàng nhận đơn trước và chuẩn bị món chu đáo theo thời gian hẹn của bạn tại{' '}
            <strong>{data.restaurant?.restaurantName || 'nhà hàng'}</strong>.
          </p>
        </div>
        <div className="sera-page-summary">
          <span>
            {lines.length} món · {totalQuantity}/{MAX_TAKEAWAY_CART_QUANTITY} phần
          </span>
        </div>
      </header>
      ) : null}

      {!session ? (
        <button
          className="mt-6 flex w-full items-center gap-4 border-y border-border py-4 text-left"
          type="button"
          onClick={signIn}
        >
          <UserRound className="size-5 text-accent" />
          <span className="flex-1">
            <strong className="block text-sm">
              Đăng nhập để theo dõi trạng thái đơn hàng thuận tiện hơn
            </strong>
            <small className="text-muted-foreground">
              Bạn vẫn có thể đặt mang về ngay mà không cần tài khoản.
            </small>
          </span>
          <span className="sera-link">Đăng nhập</span>
        </button>
      ) : null}

      {error ? (
        <Alert variant="destructive" className="mt-6">
          <AlertTitle>Không thể gửi đơn</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!lines.length ? (
        <section className="sera-empty mt-8">
          <div>
            <PackageOpen />
            <h2>Chưa có món nào trong giỏ mang về.</h2>
            <p>Khám phá thực đơn để chọn các món ngon của nhà hàng.</p>
            <Button onClick={() => navigate('/menu')}>Mở thực đơn chọn món</Button>
          </div>
        </section>
      ) : (
        <form
          onSubmit={submit}
          className="mt-10 grid gap-12 lg:grid-cols-[1.2fr_.8fr]"
        >
          {/* CỘT TRÁI: DANH SÁCH MÓN ĐÃ CHỌN + CAM KẾT ĐÓNG GÓI + GỢI Ý THÊM NHANH */}
          <div className="grid gap-10 content-start">
            {/* Banner ưu đãi & cam kết mang về */}
            <div className="sera-freeship-banner">
              <div className="sera-freeship-top">
                <div className="sera-freeship-title">
                  <PackageCheck className="size-5 text-accent" />
                  <div>
                    <strong className="block text-sm text-foreground">
                      Chuẩn bị đóng gói chuyên dụng · Miễn phí hộp giữ nhiệt
                    </strong>
                    <span className="text-xs text-muted-foreground">
                      Bếp đóng gói hộp 2 lớp cao cấp, tách riêng xốt chấm và rau tươi để món luôn nóng sốt chuẩn vị khi bạn ghé nhận.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="sera-link text-xs shrink-0"
                  onClick={() => navigate('/menu')}
                >
                  + Mở thực đơn
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-end justify-between border-b border-border pb-4">
                <div>
                  <p className="sera-kicker">Giỏ hàng mang về</p>
                  <h2 className="font-heading text-4xl">Món đã chọn</h2>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => navigate('/menu')}
                >
                  Thêm món khác
                </Button>
              </div>

              <div>
                {lines.map(({ item, idx, quantity, itemNote }) => (
                  <article
                    className="grid grid-cols-[96px_1fr_auto] items-center gap-5 border-b border-border py-5 max-sm:grid-cols-[76px_1fr]"
                    key={item.id}
                  >
                    <img
                      src={item.imageUrl || getFallbackDishImage(item, idx)}
                      style={{
                        objectPosition: getFallbackImagePosition(item, idx),
                      }}
                      className="aspect-square size-24 object-cover max-sm:size-[76px]"
                      alt={item.name}
                    />
                    <div>
                      <small className="sera-kicker">
                        {item.menuCategoryName}
                      </small>
                      <h3 className="mt-1 font-heading text-2xl">
                        {item.name}
                      </h3>
                      <span className="text-xs text-muted-foreground">
                        {money(item.price, currencyCode)} / phần
                      </span>
                      <div className="mt-2">
                        <Input
                          placeholder="Ghi chú món ăn (VD: không ớt, ít đá...)"
                          value={itemNote}
                          maxLength={120}
                          className="h-8 text-xs"
                          onChange={e => changeItemNote(item.id, e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid justify-items-end gap-3 max-sm:col-start-2 max-sm:justify-items-start">
                      <div className="sera-qty">
                        <Button
                          variant="outline"
                          size="icon"
                          type="button"
                          onClick={() =>
                            changeQuantity(item.id, quantity - 1)
                          }
                        >
                          {quantity === 1 ? <Trash2 className="size-3.5 text-muted-foreground" /> : <Minus />}
                        </Button>
                        <strong>{quantity}</strong>
                        <Button
                          variant="outline"
                          size="icon"
                          type="button"
                          disabled={
                            quantity >= MAX_TAKEAWAY_ITEM_QUANTITY ||
                            totalQuantity >= MAX_TAKEAWAY_CART_QUANTITY
                          }
                          onClick={() =>
                            changeQuantity(item.id, quantity + 1)
                          }
                        >
                          <Plus />
                        </Button>
                      </div>
                      <strong>
                        {money(item.price * quantity, currencyCode)}
                      </strong>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            {/* Khối gợi ý thêm món nhẹ / nước uống kèm trong cột trái */}
            {quickAddSides.length > 0 ? (
              <section className="sera-panel" aria-label="Gợi ý thêm món vào giỏ mang về">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="sera-kicker">Gợi ý thêm món</p>
                    <h3 className="mt-1 font-heading text-xl">Thêm món ăn kèm hoặc giải khát</h3>
                  </div>
                  <Sparkles className="size-5 text-accent" />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {quickAddSides.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 border border-border p-3 transition hover:border-accent"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={item.imageUrl || getFallbackDishImage(item, idx)}
                          alt={item.name}
                          className="size-12 shrink-0 object-cover"
                        />
                        <div className="min-w-0 truncate">
                          <strong className="block text-sm truncate">{item.name}</strong>
                          <span className="text-xs text-muted-foreground">
                            {money(item.price, currencyCode)}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        type="button"
                        className="shrink-0 text-xs"
                        onClick={() => handleQuickAdd(item)}
                      >
                        <Plus className="size-3.5 mr-1" /> Thêm
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Thông tin quy trình chuẩn bị tại quầy */}
            <section className="border border-border p-5 text-sm">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Store className="size-4 text-accent" />
                <span>Quy trình nhận món mang về chu đáo</span>
              </div>
              <ul className="mt-3 grid gap-2 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="font-bold text-accent">1.</span>
                  <span>Bếp tiếp nhận đơn hàng, chuẩn bị nguyên liệu tươi và chế biến đúng thời gian bạn đã chọn.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-accent">2.</span>
                  <span>Món được đóng gói kín trong hộp giữ nhiệt thân thiện môi trường, kèm theo gia vị, đồ dùng dùng bữa tiện lợi.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold text-accent">3.</span>
                  <span>Bạn đến quầy thu ngân của nhà hàng, đọc mã đơn hàng hoặc số điện thoại để nhận món nóng sốt mang đi ngay mà không cần chờ đợi.</span>
                </li>
              </ul>
            </section>
          </div>

          {/* CỘT PHẢI: THÔNG TIN NHẬN MÓN & LIÊN HỆ */}
          <aside className="grid gap-6 content-start">
            <section className="sera-panel">
              <p className="sera-kicker">01 · Địa điểm nhận món</p>
              <h2 className="mt-2 text-3xl">Tại nhà hàng</h2>
              <div className="mt-5 flex gap-3 text-sm">
                <MapPin className="size-5 shrink-0 text-accent" />
                <div>
                  <strong>
                    {data.restaurant?.restaurantName || 'Nhà hàng'}
                  </strong>
                  <small className="block text-muted-foreground">
                    {data.restaurant?.address || 'Địa chỉ đang cập nhật'}
                  </small>
                </div>
              </div>
              <label className="sera-field mt-6">
                Thời gian bạn muốn ghé lấy (Tùy chọn)
                <Input
                  type="datetime-local"
                  value={pickupTime}
                  onChange={event => setPickupTime(event.target.value)}
                />
              </label>
            </section>

            <section className="sera-panel">
              <p className="sera-kicker">02 · Người nhận</p>
              <h2 className="mt-2 text-3xl">Thông tin liên hệ</h2>
              <div className="sera-field-grid mt-5">
                <label className="sera-field">
                  Họ và tên *
                  <Input
                    required
                    minLength={4}
                    maxLength={60}
                    autoComplete="name"
                    placeholder="Nguyễn Văn An"
                    value={customerName}
                    onChange={event => setCustomerName(event.target.value)}
                  />
                </label>
                <label className="sera-field">
                  Số điện thoại *
                  <Input
                    required
                    maxLength={16}
                    autoComplete="tel"
                    placeholder="0912345678"
                    value={phoneNumber}
                    onChange={event => setPhoneNumber(event.target.value)}
                    inputMode="tel"
                  />
                </label>

                <label className="sera-field wide">
                  Ghi chú chung cho đơn hàng
                  <Textarea
                    maxLength={350}
                    value={note}
                    onChange={event => setNote(event.target.value)}
                  />
                </label>
              </div>
            </section>

            <section className="sera-panel">
              <p className="sera-kicker">03 · Tổng kết đơn hàng</p>
              <div className="mt-4 grid gap-3 text-sm">
                <span className="flex justify-between">
                  <small className="text-muted-foreground">Hình thức</small>
                  <strong>Tự đến lấy tại quán (Takeaway)</strong>
                </span>
                <span className="flex justify-between">
                  <small className="text-muted-foreground">Thời gian</small>
                  <strong>
                    {pickupTime
                      ? new Date(pickupTime).toLocaleString('vi-VN')
                      : 'Sớm nhất có thể (15 – 20 phút)'}
                  </strong>
                </span>
                <span className="flex justify-between border-t border-border pt-3 text-base">
                  <small className="font-semibold">
                    Tổng tiền món ({totalQuantity} phần)
                  </small>
                  <strong className="text-xl">
                    {money(subtotalAmount, currencyCode)}
                  </strong>
                </span>
              </div>

              <Button
                className="mt-5 w-full"
                size="lg"
                type="submit"
                disabled={submitting}
              >
                <ShoppingBag />
                {submitting
                  ? 'Đang gửi đơn…'
                  : `Đặt mang về · ${money(subtotalAmount, currencyCode)}`}
              </Button>
            </section>
          </aside>
        </form>
      )}

      {/* GỢI Ý MÓN NGON GẦN FOOTER */}
      {recommendedDishes.length > 0 ? (
        <section className="sera-detail-pairings mt-20" aria-label="Gợi ý món ngon từ Bếp">
          <div className="sera-detail-pairings-head">
            <div>
              <p className="sera-kicker">Gợi ý từ Bếp trưởng · Đậm đà phong vị</p>
              <h2 className="font-heading text-3xl md:text-4xl">Có thể bạn sẽ thích</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Các món ngon đặc sắc được thực khách yêu thích và lựa chọn nhiều nhất khi dùng bữa hoặc mang về thưởng thức.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {recommendedDishes.map((item, idx) => (
              <article
                key={item.id}
                className="group flex flex-col border border-border bg-card transition hover:border-accent"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  <img
                    src={item.imageUrl || getFallbackDishImage(item, idx)}
                    alt={item.name}
                    style={{
                      objectPosition: getFallbackImagePosition(item, idx),
                    }}
                    className="size-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <span className="absolute top-2 left-2 bg-background/90 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase backdrop-blur-sm">
                    {item.menuCategoryName}
                  </span>
                </div>
                <div className="flex flex-1 flex-col justify-between p-4">
                  <div>
                    <h3 className="font-heading text-lg font-medium">
                      <button
                        type="button"
                        className="text-left hover:text-accent transition"
                        onClick={() => navigate(`/menu/${encodeURIComponent(item.id)}`)}
                      >
                        {item.name}
                      </button>
                    </h3>
                    <p className="mt-1 font-semibold text-accent">
                      {money(item.price, currencyCode)}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center gap-2 pt-3 border-t border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      type="button"
                      onClick={() => handleQuickAdd(item)}
                    >
                      <Plus className="size-3.5 mr-1" /> Thêm vào đơn
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  )
}

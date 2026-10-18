import {
  CheckCircle2,
  Clock3,
  Compass,
  Flame,
  LocateFixed,
  MapPin,
  Minus,
  Navigation,
  PackageOpen,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Store,
  Truck,
  UserRound,
  Utensils,
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
  type TakeawayOrderResult,
} from '../services/customerSite'
import { confirmCustomerAction } from '../components/CustomerConfirmDialog'
import PayOnlineButton from '../components/PayOnlineButton'
import { getFallbackDishImage, getFallbackImagePosition } from '../utils/menuCatalog'
import { navigate } from '../utils/navigation'
import {
  buildOrderNoteWithDelivery,
  calculateShippingQuote,
  clearTakeawayCart,
  DROPOFF_LABELS,
  EXPRESS_DELIVERY_SURCHARGE,
  findNearestDeliveryZone,
  FREE_SHIPPING_THRESHOLD,
  MAX_TAKEAWAY_CART_QUANTITY,
  MAX_TAKEAWAY_ITEM_QUANTITY,
  NHA_TRANG_DELIVERY_ZONES,
  parseOrderDeliveryMetadata,
  readDeliveryPreferences,
  readTakeawayCart,
  readTakeawayCustomizations,
  RESTAURANT_COORDS,
  saveDeliveryPreferences,
  setTakeawayItemQuantity,
  type DeliverySpeed,
  type DropoffInstruction,
  type FulfillmentMode,
  type TakeawayCart,
  type TakeawayCustomizationMap,
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

function pickupLabel(value: string, mode: FulfillmentMode, etaLabel: string) {
  if (!value) {
    return mode === 'delivery'
      ? `Giao ngay (${etaLabel})`
      : 'Ghé nhận sớm nhất (15 – 20 phút)'
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return mode === 'delivery' ? `Giao ngay (${etaLabel})` : 'Sớm nhất có thể'
  }
  return parsed.toLocaleString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  })
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
  const initialPrefs = useMemo(() => readDeliveryPreferences(), [])

  const [cart, setCart] = useState<TakeawayCart>(() => readTakeawayCart())
  const [customizations, setCustomizations] =
    useState<TakeawayCustomizationMap>(() => readTakeawayCustomizations())

  // Delivery & Pickup states
  const [fulfillmentMode, setFulfillmentMode] = useState<FulfillmentMode>(
    initialPrefs.fulfillmentMode,
  )
  const [selectedZoneId, setSelectedZoneId] = useState<string>(
    initialPrefs.zoneId,
  )
  const [customDistanceKm, setCustomDistanceKm] = useState<number | null>(
    initialPrefs.customDistanceKm,
  )
  const [streetAddress, setStreetAddress] = useState<string>(
    initialPrefs.streetAddress,
  )
  const [buildingOrHotel, setBuildingOrHotel] = useState<string>(
    initialPrefs.buildingOrHotel,
  )
  const [deliverySpeed, setDeliverySpeed] = useState<DeliverySpeed>(
    initialPrefs.deliverySpeed,
  )
  const [dropoffInstruction, setDropoffInstruction] =
    useState<DropoffInstruction>(initialPrefs.dropoffInstruction)
  const [includeCutlery, setIncludeCutlery] = useState<boolean>(
    initialPrefs.includeCutlery,
  )
  const [gpsStatus, setGpsStatus] = useState<string>(
    initialPrefs.gpsLocatedLabel,
  )
  const [locatingGps, setLocatingGps] = useState(false)

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
  const [submittedShippingFee, setSubmittedShippingFee] = useState<number>(0)

  useEffect(() => {
    if (!session) return
    const sessionName = [session.ho, session.ten].filter(Boolean).join(' ')
    setCustomerName(current => current || sessionName)
    setPhoneNumber(current => current || session.phoneNumber || '')
  }, [session?.ho, session?.phoneNumber, session?.ten, session?.userId])

  useEffect(() => {
    saveDeliveryPreferences({
      fulfillmentMode,
      zoneId: selectedZoneId,
      streetAddress,
      buildingOrHotel,
      deliverySpeed,
      dropoffInstruction,
      includeCutlery,
      customDistanceKm,
      gpsLocatedLabel: gpsStatus,
    })
  }, [
    fulfillmentMode,
    selectedZoneId,
    streetAddress,
    buildingOrHotel,
    deliverySpeed,
    dropoffInstruction,
    includeCutlery,
    customDistanceKm,
    gpsStatus,
  ])

  const selectedZone = useMemo(
    () =>
      NHA_TRANG_DELIVERY_ZONES.find(z => z.id === selectedZoneId) ||
      NHA_TRANG_DELIVERY_ZONES[0],
    [selectedZoneId],
  )

  const effectiveDistanceKm = customDistanceKm ?? selectedZone.distanceKm

  const lines = useMemo(
    () =>
      data.menuItems
        .map((item, idx) => ({
          item,
          idx,
          quantity: cart[item.id] || 0,
          customization: customizations[item.id] || null,
        }))
        .filter(line => line.quantity > 0),
    [cart, customizations, data.menuItems],
  )

  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0)
  const subtotalAmount = lines.reduce(
    (sum, line) =>
      sum +
      (line.item.price + (line.customization?.extraUnitPrice || 0)) *
        line.quantity,
    0,
  )

  const shippingQuote = useMemo(
    () =>
      calculateShippingQuote(
        effectiveDistanceKm,
        subtotalAmount,
        deliverySpeed,
      ),
    [effectiveDistanceKm, subtotalAmount, deliverySpeed],
  )

  const activeShippingFee =
    fulfillmentMode === 'delivery' ? shippingQuote.finalFee : 0
  const grandTotalAmount = subtotalAmount + activeShippingFee

  const freeShippingProgressPct = Math.min(
    100,
    Math.round((subtotalAmount / FREE_SHIPPING_THRESHOLD) * 100),
  )

  function changeQuantity(menuItemId: string, quantity: number) {
    setCart(setTakeawayItemQuantity(menuItemId, quantity))
    setCustomizations(readTakeawayCustomizations())
  }

  function handleSelectZone(zoneId: string) {
    setSelectedZoneId(zoneId)
    setCustomDistanceKm(null)
    setGpsStatus('')
  }

  function handleLocateMe() {
    if (locatingGps) return
    setLocatingGps(true)
    setError('')

    const applyCoordinates = (lat: number, lng: number, isFallback = false) => {
      const matched = findNearestDeliveryZone(lat, lng)
      setSelectedZoneId(matched.zone.id)
      setCustomDistanceKm(matched.distanceKm)
      if (!streetAddress.trim()) {
        setStreetAddress(matched.zone.sampleAddress)
      }
      setGpsStatus(
        isFallback
          ? `Đã định vị theo tâm điểm ${matched.zone.name} (${matched.distanceKm} km từ Bếp VNT)`
          : `Định vị GPS thành công: Cách nhà hàng ${matched.distanceKm} km (${matched.zone.name})`,
      )
      setLocatingGps(false)
    }

    if (!('geolocation' in navigator)) {
      applyCoordinates(selectedZone.lat, selectedZone.lng, true)
      return
    }

    navigator.geolocation.getCurrentPosition(
      pos => {
        applyCoordinates(pos.coords.latitude, pos.coords.longitude, false)
      },
      () => {
        // Fallback smoothly if browser blocks permission on localhost or desktop
        applyCoordinates(selectedZone.lat, selectedZone.lng, true)
      },
      { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 },
    )
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

    if (fulfillmentMode === 'delivery') {
      if (streetAddress.trim().length < 6) {
        return setError(
          'Vui lòng nhập địa chỉ giao hàng chi tiết (Số nhà, tên đường hoặc khách sạn).',
        )
      }
    }

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

    const composedOrderNote = buildOrderNoteWithDelivery({
      fulfillmentMode,
      streetAddress,
      buildingOrHotel,
      zoneName: selectedZone.name,
      distanceKm: effectiveDistanceKm,
      shippingFee: activeShippingFee,
      deliverySpeed,
      dropoffInstruction,
      includeCutlery,
      customerNote: note,
    })

    setCustomerName(contact.customerName)
    setPhoneNumber(contact.phoneNumber)
    setSubmitting(true)
    setError('')
    try {
      const feeAtSubmit = activeShippingFee
      const response = await createTakeawayOrder(
        {
          customerName: contact.customerName,
          phoneNumber: contact.phoneNumber,
          pickupTime: pickupIso,
          note: composedOrderNote,
          items: lines.map(line => ({
            menuItemId: line.item.id,
            quantity: line.quantity,
            note: line.customization?.summaryText || null,
          })),
        },
        session?.token,
      )
      clearTakeawayCart()
      setCart({})
      setCustomizations({})
      setSubmittedShippingFee(feeAtSubmit)
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

  if (result) {
    const cancelled = result.status === 'Cancelled'
    const deliveryMeta = parseOrderDeliveryMetadata(result.note)
    const currencyCode = data.restaurant?.currency || 'VND'

    return (
      <main className="sera-page">
        <section className="mx-auto max-w-3xl border-y border-border py-14 text-center">
          <div className="mx-auto mb-5 grid size-12 place-items-center border border-border">
            {cancelled ? <XCircle /> : <CheckCircle2 />}
          </div>
          <p className="sera-kicker">
            {deliveryMeta.isDelivery
              ? 'Đơn giao hàng tận nơi'
              : 'Đơn tự đến lấy tại quán'}
          </p>
          <h1 className="sera-title mt-3">
            {cancelled
              ? 'Đơn đã được hủy.'
              : deliveryMeta.isDelivery
                ? 'Đơn giao tận nơi đã chuyển vào bếp.'
                : 'Đơn mang về đã đến nhà hàng.'}
          </h1>
          <p className="sera-copy mx-auto mt-5 max-w-xl">
            Mã đơn <strong className="text-foreground">{result.orderCode}</strong>
            .{' '}
            {cancelled
              ? 'Nhà hàng đã nhận trạng thái hủy.'
              : deliveryMeta.isDelivery
                ? 'Bếp đang chuẩn bị món nóng và đóng gói hộp giữ nhiệt 2 lớp để tài xế giao tới địa chỉ của bạn.'
                : 'Bếp có thể tiếp nhận và chuẩn bị món ngay mà không cần bạn thanh toán trước.'}
          </p>

          {!cancelled ? (
            <div className="mt-8 grid gap-5 border-t border-border pt-7 text-left">
              {deliveryMeta.isDelivery ? (
                <div className="sera-delivery-result-card">
                  <div className="flex items-start gap-3">
                    <Truck className="mt-0.5 size-5 shrink-0 text-accent" />
                    <div>
                      <small className="sera-kicker">
                        Lộ trình giao hàng tận nơi
                      </small>
                      <strong className="mt-1 block text-base">
                        {deliveryMeta.address}
                      </strong>
                      {deliveryMeta.dropoff ? (
                        <span className="mt-1 block text-xs text-muted-foreground">
                          Hướng dẫn giao: {deliveryMeta.dropoff}
                        </span>
                      ) : null}
                      {deliveryMeta.headerBadge ? (
                        <span className="sera-delivery-result-badge">
                          {deliveryMeta.headerBadge}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-sm">
                    <span>
                      Tiền món:{' '}
                      <strong>{money(result.totalAmount, currencyCode)}</strong>
                      {submittedShippingFee > 0
                        ? ` + Phí ship ${money(submittedShippingFee, currencyCode)}`
                        : ' + Miễn phí giao hàng (0 ₫)'}
                    </span>
                    <strong className="text-base">
                      Tổng dự kiến:{' '}
                      {money(
                        result.totalAmount + submittedShippingFee,
                        currencyCode,
                      )}
                    </strong>
                  </div>
                </div>
              ) : null}

              <div className="flex items-center gap-3">
                <Clock3 className="size-5 text-accent" />
                <div>
                  <small className="text-muted-foreground">
                    {deliveryMeta.isDelivery
                      ? 'Thời gian dự kiến giao tới'
                      : 'Thời gian nhận tại quầy'}
                  </small>
                  <strong className="block">
                    {result.pickupTime
                      ? new Date(result.pickupTime).toLocaleString('vi-VN')
                      : deliveryMeta.isDelivery
                        ? `Giao ngay khi bếp hoàn tất (${shippingQuote.etaLabel})`
                        : 'Sớm nhất có thể (15 – 20 phút)'}
                  </strong>
                </div>
              </div>

              <Alert>
                <Clock3 />
                <AlertTitle>Thanh toán trực tuyến hoặc khi hoàn tất</AlertTitle>
                <AlertDescription>
                  Nếu toàn bộ món đã hoàn thành mà đơn vẫn chưa thanh toán, hệ
                  thống bắt đầu thời hạn 5 phút xác nhận. Bạn có thể thanh toán
                  online ngay bên dưới để tài xế xuất phát tức thì.
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

  const currencyCode = data.restaurant?.currency || 'VND'

  return (
    <main className="sera-page">
      <header className="sera-page-head">
        <div>
          <p className="sera-kicker">
            Kênh Giao hàng tận nơi & Đặt mang về · Nha Trang
          </p>
          <h1 className="sera-display mt-3">
            {fulfillmentMode === 'delivery'
              ? 'Giao món nóng tận cửa nhà bạn.'
              : 'Chốt món và ghé nhận tại quầy.'}
          </h1>
          <p>
            {fulfillmentMode === 'delivery'
              ? 'Đóng gói hộp giữ nhiệt 2 lớp, tách riêng nước xốt và rau sống. Định vị khoảng cách minh bạch, miễn phí giao hàng tiêu chuẩn cho đơn từ 300.000 ₫.'
              : 'Bếp nhận đơn trước và chuẩn bị đúng giờ bạn hẹn ghé lấy tại nhà hàng, hoàn toàn không tốn phí vận chuyển.'}
          </p>
        </div>
        <div className="sera-page-summary">
          <span>
            {lines.length} món · {totalQuantity}/{MAX_TAKEAWAY_CART_QUANTITY}{' '}
            phần
          </span>
        </div>
      </header>

      {/* Bộ chuyển đổi Phương thức nhận món: GIAO HÀNG TẬN NƠI vs TỰ ĐẾN LẤY */}
      <section
        className="sera-fulfillment-switcher"
        aria-label="Chọn hình thức nhận món"
      >
        <button
          type="button"
          className={`sera-fulfillment-tab ${fulfillmentMode === 'delivery' ? 'is-active' : ''}`}
          onClick={() => setFulfillmentMode('delivery')}
        >
          <div className="sera-fulfillment-tab-icon">
            <Truck />
          </div>
          <div className="sera-fulfillment-tab-copy">
            <div className="sera-fulfillment-tab-title">
              <strong>Giao hàng tận nơi (Delivery)</strong>
              <span className="sera-fulfillment-pill is-highlight">
                Freeship đơn từ 300k
              </span>
            </div>
            <p>
              Tài xế giao tận nhà / khách sạn tại Nha Trang trong{' '}
              <strong>{shippingQuote.etaLabel}</strong> · Đóng hộp giữ nhiệt
            </p>
          </div>
        </button>

        <button
          type="button"
          className={`sera-fulfillment-tab ${fulfillmentMode === 'pickup' ? 'is-active' : ''}`}
          onClick={() => setFulfillmentMode('pickup')}
        >
          <div className="sera-fulfillment-tab-icon">
            <Store />
          </div>
          <div className="sera-fulfillment-tab-copy">
            <div className="sera-fulfillment-tab-title">
              <strong>Tự đến lấy tại quán (Takeaway)</strong>
              <span className="sera-fulfillment-pill">0 ₫ phí ship</span>
            </div>
            <p>
              Nhận món trực tiếp tại quầy{' '}
              <strong>{data.restaurant?.restaurantName || 'Nhà hàng VNT'}</strong>{' '}
              · Không chờ đợi
            </p>
          </div>
        </button>
      </section>

      {!session ? (
        <button
          className="mt-6 flex w-full items-center gap-4 border-y border-border py-4 text-left"
          type="button"
          onClick={signIn}
        >
          <UserRound className="size-5 text-accent" />
          <span className="flex-1">
            <strong className="block text-sm">
              Đăng nhập để lưu lịch sử đơn giao hàng & tích điểm
            </strong>
            <small className="text-muted-foreground">
              Bạn vẫn có thể đặt giao tận nơi hoặc mang về ngay mà không cần tài
              khoản.
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
            <h2>Chưa có món nào trong giỏ hàng.</h2>
            <p>
              Khám phá thực đơn để chọn món giao nóng tận nơi hoặc đặt mang về.
            </p>
            <Button onClick={() => navigate('/menu')}>Mở thực đơn chọn món</Button>
          </div>
        </section>
      ) : (
        <form
          onSubmit={submit}
          className="mt-10 grid gap-12 lg:grid-cols-[1.2fr_.8fr]"
        >
          {/* CỘT TRÁI: THANH FREESHIP + GIỎ HÀNG + ĐỊNH VỊ & ĐỊA CHỈ GIAO HÀNG */}
          <div className="grid gap-10 content-start">
            {/* Thanh tiến trình Miễn phí giao hàng (khi chọn Delivery) */}
            {fulfillmentMode === 'delivery' ? (
              <div className="sera-freeship-banner">
                <div className="sera-freeship-top">
                  <div className="sera-freeship-title">
                    <Sparkles className="size-4 text-accent" />
                    {shippingQuote.isFreeShippingUnlocked ? (
                      <span>
                        Chúc mừng! Đơn hàng đã đủ điều kiện{' '}
                        <strong>
                          Miễn phí giao hàng tiêu chuẩn (Giảm{' '}
                          {money(shippingQuote.discountAmount, currencyCode)})
                        </strong>
                        .
                      </span>
                    ) : (
                      <span>
                        Gọi thêm{' '}
                        <strong>
                          {money(
                            shippingQuote.amountNeededForFreeShipping,
                            currencyCode,
                          )}
                        </strong>{' '}
                        để được{' '}
                        <strong>Miễn phí giao hàng tận nơi</strong> (Đơn từ{' '}
                        {money(FREE_SHIPPING_THRESHOLD, currencyCode)}).
                      </span>
                    )}
                  </div>
                  {!shippingQuote.isFreeShippingUnlocked ? (
                    <button
                      type="button"
                      className="sera-link text-xs"
                      onClick={() => navigate('/menu')}
                    >
                      + Chọn thêm món
                    </button>
                  ) : null}
                </div>
                <div className="sera-freeship-track">
                  <div
                    className="sera-freeship-fill"
                    style={{ width: `${freeShippingProgressPct}%` }}
                  />
                </div>
              </div>
            ) : null}

            {/* Danh sách món trong giỏ */}
            <div>
              <div className="flex items-end justify-between border-b border-border pb-4">
                <div>
                  <p className="sera-kicker">Giỏ hàng của bạn</p>
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
                {lines.map(({ item, idx, quantity, customization }) => {
                  const unitPrice =
                    item.price + (customization?.extraUnitPrice || 0)
                  return (
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
                          {money(unitPrice, currencyCode)} / phần
                          {customization && customization.extraUnitPrice > 0
                            ? ` (đã gồm tùy chọn +${money(customization.extraUnitPrice, currencyCode)})`
                            : ''}
                        </span>
                        {customization ? (
                          <p className="mt-1.5 text-xs text-muted-foreground">
                            <strong className="text-foreground">
                              Tùy chọn:
                            </strong>{' '}
                            {customization.summaryText}{' '}
                            <button
                              type="button"
                              className="sera-link ml-1"
                              onClick={() =>
                                navigate(
                                  `/menu/${encodeURIComponent(item.id)}`,
                                )
                              }
                            >
                              Sửa tùy chọn
                            </button>
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Khẩu vị mặc định ·{' '}
                            <button
                              type="button"
                              className="sera-link"
                              onClick={() =>
                                navigate(
                                  `/menu/${encodeURIComponent(item.id)}`,
                                )
                              }
                            >
                              Tùy chỉnh cỡ / độ cay / topping
                            </button>
                          </p>
                        )}
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
                            <Minus />
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
                          {money(unitPrice * quantity, currencyCode)}
                        </strong>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>

            {/* KHỐI ĐỊNH VỊ VỊ TRÍ & ĐỊA CHỈ GIAO HÀNG TẬN NƠI (khi chọn Delivery) */}
            {fulfillmentMode === 'delivery' ? (
              <section
                className="sera-delivery-zone-panel"
                aria-label="Định vị vị trí và chọn khu vực giao hàng"
              >
                <div className="sera-delivery-zone-head">
                  <div>
                    <p className="sera-kicker">
                      Định vị GPS & Tính phí vận chuyển tự động
                    </p>
                    <h2 className="mt-1 font-heading text-3xl">
                      Vị trí nhận hàng & Lộ trình giao
                    </h2>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleLocateMe}
                    disabled={locatingGps}
                    className="sera-gps-btn"
                  >
                    <LocateFixed
                      className={locatingGps ? 'animate-spin' : ''}
                    />
                    {locatingGps
                      ? 'Đang định vị GPS…'
                      : 'Định vị vị trí của tôi (GPS)'}
                  </Button>
                </div>

                {gpsStatus ? (
                  <div className="sera-gps-status-pill" role="status">
                    <Compass className="size-4 shrink-0" />
                    <span>{gpsStatus}</span>
                  </div>
                ) : null}

                {/* Lưới chọn nhanh Khu vực / Phường tại Nha Trang */}
                <div className="sera-zone-picker">
                  <span className="sera-zone-picker-label">
                    Chọn khu vực / phường tại Nha Trang để tính khoảng cách &
                    phí ship:
                  </span>
                  <div className="sera-zone-grid">
                    {NHA_TRANG_DELIVERY_ZONES.map(zone => {
                      const active = zone.id === selectedZoneId
                      return (
                        <button
                          key={zone.id}
                          type="button"
                          className={`sera-zone-card ${active ? 'is-active' : ''}`}
                          onClick={() => handleSelectZone(zone.id)}
                        >
                          <div className="sera-zone-card-top">
                            <strong>{zone.name}</strong>
                            <span className="sera-zone-km-badge">
                              {zone.distanceKm} km
                            </span>
                          </div>
                          <div className="sera-zone-card-meta">
                            <span>⏱ {zone.etaMinutes}</span>
                            <span>
                              Phí gốc: {money(zone.baseFee, currencyCode)}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Bản đồ lộ trình trực quan & Thanh tinh chỉnh khoảng cách */}
                <div className="sera-delivery-route-card">
                  <div className="sera-route-visualizer">
                    <div className="sera-route-node">
                      <span className="sera-route-dot is-origin">
                        <Utensils className="size-3.5" />
                      </span>
                      <div>
                        <small>Điểm xuất phát (Bếp nóng)</small>
                        <strong>
                          {data.restaurant?.restaurantName ||
                            RESTAURANT_COORDS.label}
                        </strong>
                      </div>
                    </div>

                    <div className="sera-route-line">
                      <span className="sera-route-distance-pill">
                        <Navigation className="size-3" /> {effectiveDistanceKm}{' '}
                        km · {shippingQuote.etaLabel}
                      </span>
                    </div>

                    <div className="sera-route-node is-dest">
                      <span className="sera-route-dot is-destination">
                        <MapPin className="size-3.5" />
                      </span>
                      <div>
                        <small>Điểm giao tận nơi</small>
                        <strong>
                          {streetAddress.trim()
                            ? `${streetAddress.trim()} (${selectedZone.name})`
                            : selectedZone.name}
                        </strong>
                      </div>
                    </div>
                  </div>

                  <div className="sera-distance-slider-row">
                    <div className="flex items-center justify-between text-xs">
                      <label htmlFor="delivery-distance-range">
                        Tinh chỉnh khoảng cách thực tế theo số nhà / hẻm (
                        <strong>{effectiveDistanceKm} km</strong>):
                      </label>
                      <span className="font-semibold text-foreground">
                        Phí ship tính theo km:{' '}
                        {shippingQuote.isFreeShippingUnlocked ? (
                          <>
                            <del className="mr-1 text-muted-foreground">
                              {money(shippingQuote.baseFee, currencyCode)}
                            </del>
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {money(shippingQuote.finalFee, currencyCode)}
                            </span>
                          </>
                        ) : (
                          money(shippingQuote.finalFee, currencyCode)
                        )}
                      </span>
                    </div>
                    <input
                      id="delivery-distance-range"
                      type="range"
                      min={0.8}
                      max={9.0}
                      step={0.2}
                      value={effectiveDistanceKm}
                      onChange={e =>
                        setCustomDistanceKm(parseFloat(e.target.value))
                      }
                      className="sera-distance-range"
                    />
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>≤ 2 km: 15.000 ₫</span>
                      <span>2 – 3.5 km: 22.000 ₫</span>
                      <span>3.5 – 5.5 km: 30.000 ₫</span>
                      <span>&gt; 5.5 km: 38.000 ₫</span>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}
          </div>

          {/* CỘT PHẢI: THÔNG TIN GIAO NHẬN + NGƯỜI NHẬN + TỔNG KẾT PHÍ SHIP */}
          <aside className="grid gap-6 content-start">
            {fulfillmentMode === 'delivery' ? (
              <section className="sera-panel">
                <p className="sera-kicker">01 · Địa chỉ giao hàng tận nơi</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <h2 className="text-3xl">Chi tiết nơi nhận</h2>
                  <button
                    type="button"
                    className="sera-link text-xs"
                    onClick={() =>
                      setStreetAddress(selectedZone.sampleAddress)
                    }
                  >
                    Điền mẫu địa chỉ
                  </button>
                </div>

                <div className="mt-5 grid gap-4">
                  <label className="sera-field">
                    Số nhà, tên đường / tuyến phố *
                    <Input
                      required
                      placeholder={selectedZone.sampleAddress}
                      value={streetAddress}
                      onChange={e => setStreetAddress(e.target.value)}
                    />
                    <small className="text-muted-foreground">
                      Khu vực đã chọn: <strong>{selectedZone.name}</strong>
                    </small>
                  </label>

                  <label className="sera-field">
                    Tòa nhà / Khách sạn / Số phòng / Căn hộ (Tùy chọn)
                    <Input
                      placeholder="VD: Khách sạn Havana Tầng 12, hoặc Chung cư CT2..."
                      value={buildingOrHotel}
                      onChange={e => setBuildingOrHotel(e.target.value)}
                    />
                  </label>

                  {/* Chọn tốc độ giao hàng */}
                  <div className="sera-field">
                    <span>Tốc độ giao hàng & Giữ nhiệt</span>
                    <div className="sera-delivery-speed-grid">
                      <button
                        type="button"
                        className={`sera-speed-option ${deliverySpeed === 'standard' ? 'is-active' : ''}`}
                        onClick={() => setDeliverySpeed('standard')}
                      >
                        <div>
                          <strong>Giao tiêu chuẩn</strong>
                          <small>{selectedZone.etaMinutes}</small>
                        </div>
                        <span>
                          {shippingQuote.isFreeShippingUnlocked
                            ? 'Miễn phí'
                            : money(shippingQuote.baseFee, currencyCode)}
                        </span>
                      </button>

                      <button
                        type="button"
                        className={`sera-speed-option ${deliverySpeed === 'express' ? 'is-active' : ''}`}
                        onClick={() => setDeliverySpeed('express')}
                      >
                        <div>
                          <strong>
                            <Flame className="inline size-3.5 text-amber-500" />{' '}
                            Giao nhanh ưu tiên
                          </strong>
                          <small>Đi thẳng · Không ghép đơn</small>
                        </div>
                        <span>
                          +{money(EXPRESS_DELIVERY_SURCHARGE, currencyCode)}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Hướng dẫn giao nhận cho tài xế */}
                  <label className="sera-field">
                    Hướng dẫn khi tài xế tới nơi
                    <select
                      className="sera-review-select w-full"
                      value={dropoffInstruction}
                      onChange={e =>
                        setDropoffInstruction(
                          e.target.value as DropoffInstruction,
                        )
                      }
                    >
                      {(
                        Object.entries(DROPOFF_LABELS) as Array<
                          [DropoffInstruction, string]
                        >
                      ).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="sera-field">
                    Hẹn giờ giao (Để trống nếu muốn giao ngay)
                    <Input
                      type="datetime-local"
                      value={pickupTime}
                      onChange={event => setPickupTime(event.target.value)}
                    />
                  </label>
                </div>
              </section>
            ) : (
              <section className="sera-panel">
                <p className="sera-kicker">01 · Nhận món tại quầy</p>
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
                  Thời gian muốn ghé nhận
                  <Input
                    type="datetime-local"
                    value={pickupTime}
                    onChange={event => setPickupTime(event.target.value)}
                  />
                </label>
              </section>
            )}

            {/* 02 · THÔNG TIN NGƯỜI NHẬN */}
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
                  <small className="text-muted-foreground">
                    Tối thiểu 2 từ; dùng để tài xế/nhà hàng xác nhận.
                  </small>
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
                  <small className="text-muted-foreground">
                    Số di động Việt Nam 10 số, đầu 03/05/07/08/09.
                  </small>
                </label>

                <label className="sera-cutlery-toggle wide">
                  <input
                    type="checkbox"
                    checked={includeCutlery}
                    onChange={e => setIncludeCutlery(e.target.checked)}
                  />
                  <div>
                    <strong>
                      Lấy bộ dụng cụ ăn uống sinh học (Miễn phí)
                    </strong>
                    <small>
                      Gồm đũa tre, muỗng, khăn lạnh và tăm tiệt trùng theo số
                      khẩu phần
                    </small>
                  </div>
                </label>

                <label className="sera-field wide">
                  Ghi chú thêm cho bếp hoặc tài xế
                  <Textarea
                    maxLength={350}
                    placeholder={
                      fulfillmentMode === 'delivery'
                        ? 'VD: Gọi trước 5 phút khi sắp tới, để riêng nước mắm ớt...'
                        : 'VD: Đóng gói kỹ để đi đường xa...'
                    }
                    value={note}
                    onChange={event => setNote(event.target.value)}
                  />
                </label>
              </div>
            </section>

            {/* 03 · TỔNG KẾT CHI PHÍ & PHÍ SHIP */}
            <section className="sera-panel">
              <p className="sera-kicker">03 · Tổng kết thanh toán</p>
              <div className="mt-4 grid gap-3 text-sm">
                <span className="flex justify-between">
                  <small className="text-muted-foreground">Hình thức</small>
                  <strong>
                    {fulfillmentMode === 'delivery'
                      ? `Giao tận nơi (${effectiveDistanceKm} km)`
                      : 'Tự đến lấy tại quán'}
                  </strong>
                </span>
                <span className="flex justify-between">
                  <small className="text-muted-foreground">Thời gian</small>
                  <strong>
                    {pickupLabel(
                      pickupTime,
                      fulfillmentMode,
                      shippingQuote.etaLabel,
                    )}
                  </strong>
                </span>
                <span className="flex justify-between">
                  <small className="text-muted-foreground">
                    Tạm tính món ({totalQuantity} phần)
                  </small>
                  <strong>{money(subtotalAmount, currencyCode)}</strong>
                </span>

                {fulfillmentMode === 'delivery' ? (
                  <>
                    <span className="flex justify-between">
                      <small className="text-muted-foreground">
                        Phí vận chuyển ({effectiveDistanceKm} km)
                      </small>
                      <strong>
                        {money(shippingQuote.baseFee, currencyCode)}
                      </strong>
                    </span>
                    {shippingQuote.speedSurcharge > 0 ? (
                      <span className="flex justify-between">
                        <small className="text-muted-foreground">
                          Phụ phí Giao nhanh ưu tiên
                        </small>
                        <strong>
                          +{money(shippingQuote.speedSurcharge, currencyCode)}
                        </strong>
                      </span>
                    ) : null}
                    {shippingQuote.discountAmount > 0 ? (
                      <span className="flex justify-between text-emerald-700 dark:text-emerald-400">
                        <small>
                          Ưu đãi Freeship (Đơn ≥{' '}
                          {money(FREE_SHIPPING_THRESHOLD, currencyCode)})
                        </small>
                        <strong>
                          -{money(shippingQuote.discountAmount, currencyCode)}
                        </strong>
                      </span>
                    ) : null}
                  </>
                ) : (
                  <span className="flex justify-between text-emerald-700 dark:text-emerald-400">
                    <small>Phí vận chuyển (Nhận tại quầy)</small>
                    <strong>0 ₫ (Miễn phí)</strong>
                  </span>
                )}

                <span className="flex justify-between border-t border-border pt-3 text-base">
                  <small className="font-semibold">Tổng thanh toán</small>
                  <strong className="text-xl">
                    {money(grandTotalAmount, currencyCode)}
                  </strong>
                </span>
              </div>

              <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="size-4 shrink-0 text-accent" />
                <span>
                  Cam kết giao món nóng chuẩn vị · Hoàn tiền nếu món đổ vỡ trên
                  đường giao.
                </span>
              </div>

              <Button
                className="mt-5 w-full"
                size="lg"
                type="submit"
                disabled={submitting}
              >
                {fulfillmentMode === 'delivery' ? <Truck /> : <ShoppingBag />}
                {submitting
                  ? 'Đang gửi đơn…'
                  : fulfillmentMode === 'delivery'
                    ? `Đặt giao tận nơi · ${money(grandTotalAmount, currencyCode)}`
                    : `Đặt mang về · ${money(grandTotalAmount, currencyCode)}`}
              </Button>
            </section>
          </aside>
        </form>
      )}
    </main>
  )
}

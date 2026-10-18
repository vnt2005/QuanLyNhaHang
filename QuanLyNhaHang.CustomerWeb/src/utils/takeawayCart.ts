const CART_KEY = 'customerTakeawayCart:v1'
const CART_CUSTOMIZATIONS_KEY = 'customerTakeawayCustomizations:v1'
export const TAKEAWAY_CART_EVENT = 'takeaway-cart-changed'
export const MAX_TAKEAWAY_ITEM_QUANTITY = 5
export const MAX_TAKEAWAY_CART_QUANTITY = 50

export type TakeawayCart = Record<string, number>

export type TakeawayItemCustomization = {
  sizeId: string
  sizeLabel: string
  sizePriceDelta: number
  spiceId: string
  spiceLabel: string
  prepLabels: string[]
  toppingLabels: string[]
  toppingsPrice: number
  customNote: string
  extraUnitPrice: number
  summaryText: string
}

export type TakeawayCustomizationMap = Record<string, TakeawayItemCustomization>

function normalizeCart(value: TakeawayCart): TakeawayCart {
  const normalized: TakeawayCart = {}
  let remaining = MAX_TAKEAWAY_CART_QUANTITY

  for (const [menuItemId, rawQuantity] of Object.entries(value)) {
    if (remaining <= 0) break

    const numericQuantity = Number(rawQuantity)
    if (!Number.isFinite(numericQuantity)) continue

    const quantity = Math.min(
      MAX_TAKEAWAY_ITEM_QUANTITY,
      Math.max(0, Math.floor(numericQuantity)),
      remaining,
    )

    if (quantity <= 0) continue

    normalized[menuItemId] = quantity
    remaining -= quantity
  }

  return normalized
}

function removeLegacyPersistentCart() {
  localStorage.removeItem(CART_KEY)
  localStorage.removeItem(CART_CUSTOMIZATIONS_KEY)
}

export function readTakeawayCart(): TakeawayCart {
  removeLegacyPersistentCart()
  try {
    const value = JSON.parse(sessionStorage.getItem(CART_KEY) || '{}') as TakeawayCart
    return normalizeCart(value)
  } catch {
    return {}
  }
}

export function readTakeawayCustomizations(): TakeawayCustomizationMap {
  removeLegacyPersistentCart()
  try {
    const raw = sessionStorage.getItem(CART_CUSTOMIZATIONS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as TakeawayCustomizationMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function getTakeawayItemCustomization(menuItemId: string): TakeawayItemCustomization | null {
  const map = readTakeawayCustomizations()
  return map[menuItemId] || null
}

export function saveTakeawayCustomization(
  menuItemId: string,
  customization: TakeawayItemCustomization,
) {
  const map = readTakeawayCustomizations()
  map[menuItemId] = customization
  sessionStorage.setItem(CART_CUSTOMIZATIONS_KEY, JSON.stringify(map))
  window.dispatchEvent(new CustomEvent(TAKEAWAY_CART_EVENT))
  return map
}

function removeTakeawayCustomization(menuItemId: string) {
  const map = readTakeawayCustomizations()
  if (menuItemId in map) {
    delete map[menuItemId]
    sessionStorage.setItem(CART_CUSTOMIZATIONS_KEY, JSON.stringify(map))
  }
}

function save(cart: TakeawayCart) {
  const normalized = normalizeCart(cart)
  removeLegacyPersistentCart()
  sessionStorage.setItem(CART_KEY, JSON.stringify(normalized))
  window.dispatchEvent(new CustomEvent(TAKEAWAY_CART_EVENT))
  return normalized
}

export function addTakeawayItem(
  menuItemId: string,
  quantity = 1,
  customization?: TakeawayItemCustomization,
) {
  const cart = readTakeawayCart()
  const currentQuantity = cart[menuItemId] || 0
  const quantityWithoutCurrentItem = Object.entries(cart)
    .filter(([id]) => id !== menuItemId)
    .reduce((sum, [, value]) => sum + value, 0)
  const remainingForItem = Math.max(
    0,
    MAX_TAKEAWAY_CART_QUANTITY - quantityWithoutCurrentItem,
  )

  cart[menuItemId] = Math.min(
    MAX_TAKEAWAY_ITEM_QUANTITY,
    remainingForItem,
    currentQuantity + Math.max(1, Math.floor(quantity)),
  )

  if (customization) {
    const map = readTakeawayCustomizations()
    map[menuItemId] = customization
    sessionStorage.setItem(CART_CUSTOMIZATIONS_KEY, JSON.stringify(map))
  }

  return save(cart)
}

export function setTakeawayItemQuantity(menuItemId: string, quantity: number) {
  const cart = readTakeawayCart()
  const quantityWithoutCurrentItem = Object.entries(cart)
    .filter(([id]) => id !== menuItemId)
    .reduce((sum, [, value]) => sum + value, 0)
  const remainingForItem = Math.max(
    0,
    MAX_TAKEAWAY_CART_QUANTITY - quantityWithoutCurrentItem,
  )
  const nextQuantity = Math.max(
    0,
    Math.min(
      MAX_TAKEAWAY_ITEM_QUANTITY,
      remainingForItem,
      Math.floor(quantity),
    ),
  )

  if (nextQuantity === 0) {
    delete cart[menuItemId]
    removeTakeawayCustomization(menuItemId)
  } else {
    cart[menuItemId] = nextQuantity
  }

  return save(cart)
}

export function clearTakeawayCart() {
  sessionStorage.removeItem(CART_KEY)
  sessionStorage.removeItem(CART_CUSTOMIZATIONS_KEY)
  removeLegacyPersistentCart()
  window.dispatchEvent(new CustomEvent(TAKEAWAY_CART_EVENT))
}

export function takeawayCartCount() {
  return Object.values(readTakeawayCart()).reduce((sum, quantity) => sum + quantity, 0)
}

/* =========================================================================
   PART 4: KÊNH GIAO HÀNG TẬN NƠI (DELIVERY) & TÍNH PHÍ SHIP / ĐỊNH VỊ
   ========================================================================= */

export type FulfillmentMode = 'delivery' | 'pickup'
export type DeliverySpeed = 'standard' | 'express'
export type DropoffInstruction =
  | 'hand-to-me'
  | 'hotel-lobby'
  | 'call-on-arrival'

export type DeliveryZone = {
  id: string
  name: string
  wardLabel: string
  distanceKm: number
  etaMinutes: string
  baseFee: number
  sampleAddress: string
  lat: number
  lng: number
}

export const RESTAURANT_COORDS = {
  lat: 12.2388,
  lng: 109.1967,
  label: 'Bếp Trung tâm VNT · Lộc Thọ, TP. Nha Trang',
}

export const FREE_SHIPPING_THRESHOLD = 300000
export const MAX_FREE_SHIPPING_DISCOUNT = 30000
export const EXPRESS_DELIVERY_SURCHARGE = 10000

export const NHA_TRANG_DELIVERY_ZONES: DeliveryZone[] = [
  {
    id: 'loc-tho',
    name: 'Phường Lộc Thọ · Cung đường Trần Phú',
    wardLabel: 'Trung tâm biển (< 1.8 km)',
    distanceKm: 1.5,
    etaMinutes: '20 – 25 phút',
    baseFee: 15000,
    sampleAddress: '78 Trần Phú, Phường Lộc Thọ, TP. Nha Trang',
    lat: 12.2355,
    lng: 109.1972,
  },
  {
    id: 'tan-lap',
    name: 'Phường Tân Lập · Khu Phố Tây & Nguyễn Thị Minh Khai',
    wardLabel: 'Nội thành gần (2.2 km)',
    distanceKm: 2.2,
    etaMinutes: '22 – 28 phút',
    baseFee: 18000,
    sampleAddress: '45 Nguyễn Thị Minh Khai, Phường Tân Lập, TP. Nha Trang',
    lat: 12.2321,
    lng: 109.1915,
  },
  {
    id: 'phuoc-tien',
    name: 'Phường Phước Tiến · Phước Hòa · Lê Thành Phương',
    wardLabel: 'Nội thành trung tâm (3.1 km)',
    distanceKm: 3.1,
    etaMinutes: '25 – 32 phút',
    baseFee: 22000,
    sampleAddress: '112 Ngô Gia Tự, Phường Phước Tiến, TP. Nha Trang',
    lat: 12.2442,
    lng: 109.1864,
  },
  {
    id: 'vinh-nguyen',
    name: 'Phường Vĩnh Nguyên · Khu đô thị biển An Viên',
    wardLabel: 'Phía Nam thành phố (4.6 km)',
    distanceKm: 4.6,
    etaMinutes: '30 – 38 phút',
    baseFee: 28000,
    sampleAddress: 'Biệt thự B12 KĐT An Viên, Phường Vĩnh Nguyên, TP. Nha Trang',
    lat: 12.2045,
    lng: 109.2112,
  },
  {
    id: 'vinh-hai',
    name: 'Phường Vĩnh Hải · Vĩnh Phước · Phạm Văn Đồng',
    wardLabel: 'Phía Bắc cầu Trần Phú (5.4 km)',
    distanceKm: 5.4,
    etaMinutes: '32 – 40 phút',
    baseFee: 32000,
    sampleAddress: 'Tòa OC2B Mường Thanh Viễn Triều, Phạm Văn Đồng, Nha Trang',
    lat: 12.2738,
    lng: 109.2028,
  },
  {
    id: 'vinh-hiep',
    name: 'KĐT Mỹ Gia · Vĩnh Thái · Đường 23 Tháng 10',
    wardLabel: 'Phía Tây thành phố (6.5 km)',
    distanceKm: 6.5,
    etaMinutes: '35 – 45 phút',
    baseFee: 38000,
    sampleAddress: 'Gói 2 KĐT Mỹ Gia, Vĩnh Thái, TP. Nha Trang',
    lat: 12.2395,
    lng: 109.1520,
  },
]

export type DeliveryPreferences = {
  fulfillmentMode: FulfillmentMode
  zoneId: string
  streetAddress: string
  buildingOrHotel: string
  deliverySpeed: DeliverySpeed
  dropoffInstruction: DropoffInstruction
  includeCutlery: boolean
  customDistanceKm: number | null
  gpsLocatedLabel: string
}

const DELIVERY_PREFS_KEY = 'customerDeliveryPrefs:v1'

const DEFAULT_DELIVERY_PREFS: DeliveryPreferences = {
  fulfillmentMode: 'delivery',
  zoneId: 'loc-tho',
  streetAddress: '',
  buildingOrHotel: '',
  deliverySpeed: 'standard',
  dropoffInstruction: 'hand-to-me',
  includeCutlery: true,
  customDistanceKm: null,
  gpsLocatedLabel: '',
}

export function readDeliveryPreferences(): DeliveryPreferences {
  try {
    const raw = sessionStorage.getItem(DELIVERY_PREFS_KEY)
    if (!raw) return DEFAULT_DELIVERY_PREFS
    const parsed = JSON.parse(raw) as Partial<DeliveryPreferences>
    return {
      ...DEFAULT_DELIVERY_PREFS,
      ...parsed,
    }
  } catch {
    return DEFAULT_DELIVERY_PREFS
  }
}

export function saveDeliveryPreferences(
  patch: Partial<DeliveryPreferences>,
): DeliveryPreferences {
  const next = {
    ...readDeliveryPreferences(),
    ...patch,
  }
  try {
    sessionStorage.setItem(DELIVERY_PREFS_KEY, JSON.stringify(next))
  } catch {
    // Ignore storage quota errors
  }
  return next
}

export function computeHaversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  // Multiply road factor 1.25 for urban street routing
  const roadDistance = R * c * 1.25
  return Math.max(0.8, Math.round(roadDistance * 10) / 10)
}

export function findNearestDeliveryZone(lat: number, lng: number): {
  zone: DeliveryZone
  distanceKm: number
} {
  let nearest = NHA_TRANG_DELIVERY_ZONES[0]
  let minDistance = Infinity

  for (const zone of NHA_TRANG_DELIVERY_ZONES) {
    const d = computeHaversineDistanceKm(lat, lng, zone.lat, zone.lng)
    if (d < minDistance) {
      minDistance = d
      nearest = zone
    }
  }

  const distFromRestaurant = computeHaversineDistanceKm(
    RESTAURANT_COORDS.lat,
    RESTAURANT_COORDS.lng,
    lat,
    lng,
  )
  // If user is testing outside Nha Trang (> 20km), use the nearest Nha Trang zone distance
  const effectiveDistance =
    distFromRestaurant > 20 ? nearest.distanceKm : distFromRestaurant

  return {
    zone: nearest,
    distanceKm: effectiveDistance,
  }
}

export function calculateShippingQuote(
  distanceKm: number,
  subtotalAmount: number,
  deliverySpeed: DeliverySpeed,
): {
  distanceKm: number
  baseFee: number
  speedSurcharge: number
  discountAmount: number
  finalFee: number
  isFreeShippingUnlocked: boolean
  amountNeededForFreeShipping: number
  etaLabel: string
} {
  let baseFee = 15000
  if (distanceKm <= 2) baseFee = 15000
  else if (distanceKm <= 3.5) baseFee = 22000
  else if (distanceKm <= 5.5) baseFee = 30000
  else baseFee = 38000

  const speedSurcharge =
    deliverySpeed === 'express' ? EXPRESS_DELIVERY_SURCHARGE : 0
  const isFreeShippingUnlocked = subtotalAmount >= FREE_SHIPPING_THRESHOLD
  const discountAmount = isFreeShippingUnlocked
    ? Math.min(baseFee, MAX_FREE_SHIPPING_DISCOUNT)
    : 0
  const finalFee = Math.max(0, baseFee - discountAmount + speedSurcharge)
  const amountNeededForFreeShipping = Math.max(
    0,
    FREE_SHIPPING_THRESHOLD - subtotalAmount,
  )

  const baseMin = Math.round(16 + distanceKm * 3)
  const etaMin = deliverySpeed === 'express' ? Math.max(15, baseMin - 7) : baseMin
  const etaMax = etaMin + 8

  return {
    distanceKm,
    baseFee,
    speedSurcharge,
    discountAmount,
    finalFee,
    isFreeShippingUnlocked,
    amountNeededForFreeShipping,
    etaLabel: `${etaMin} – ${etaMax} phút`,
  }
}

export const DROPOFF_LABELS: Record<DropoffInstruction, string> = {
  'hand-to-me': 'Giao tận tay tại cửa / sảnh chính',
  'hotel-lobby': 'Gửi tại quầy Lễ tân khách sạn / Bảo vệ tòa nhà',
  'call-on-arrival': 'Gọi điện khi tài xế tới nơi (Không bấm chuông)',
}

export function buildOrderNoteWithDelivery(params: {
  fulfillmentMode: FulfillmentMode
  streetAddress: string
  buildingOrHotel: string
  zoneName: string
  distanceKm: number
  shippingFee: number
  deliverySpeed: DeliverySpeed
  dropoffInstruction: DropoffInstruction
  includeCutlery: boolean
  customerNote: string
}): string | null {
  if (params.fulfillmentMode === 'pickup') {
    const parts: string[] = [
      `[TỰ ĐẾN LẤY TẠI QUÁN]`,
      params.includeCutlery ? 'Có lấy đũa muỗng' : 'Không lấy đũa muỗng nhựa/gỗ',
    ]
    if (params.customerNote.trim()) {
      parts.push(`Ghi chú: ${params.customerNote.trim()}`)
    }
    return parts.join(' · ')
  }

  const fullAddress = [
    params.streetAddress.trim(),
    params.buildingOrHotel.trim() ? `(${params.buildingOrHotel.trim()})` : '',
    params.zoneName,
  ]
    .filter(Boolean)
    .join(', ')

  const speedText =
    params.deliverySpeed === 'express'
      ? 'Giao nhanh ưu tiên'
      : 'Giao tiêu chuẩn'
  const feeText =
    params.shippingFee === 0
      ? 'Miễn phí ship (0 ₫)'
      : `Phí ship ${params.shippingFee.toLocaleString('vi-VN')} ₫`

  const segments = [
    `[GIAO TẬN NƠI · ${params.distanceKm} km · ${feeText} · ${speedText}]`,
    `Địa chỉ: ${fullAddress}`,
    `Nhận hàng: ${DROPOFF_LABELS[params.dropoffInstruction]}`,
    params.includeCutlery ? 'Kèm bộ dụng cụ ăn' : 'Không lấy dụng cụ ăn',
  ]
  if (params.customerNote.trim()) {
    segments.push(`Ghi chú bếp/tài xế: ${params.customerNote.trim()}`)
  }

  return segments.join(' | ').slice(0, 500)
}

export function parseOrderDeliveryMetadata(note?: string | null): {
  isDelivery: boolean
  headerBadge: string | null
  address: string | null
  dropoff: string | null
  extraNote: string | null
} {
  if (!note) {
    return {
      isDelivery: false,
      headerBadge: null,
      address: null,
      dropoff: null,
      extraNote: null,
    }
  }

  if (!note.startsWith('[GIAO TẬN NƠI')) {
    return {
      isDelivery: false,
      headerBadge: null,
      address: null,
      dropoff: null,
      extraNote: note,
    }
  }

  const parts = note.split(' | ').map(p => p.trim())
  const headerBadge = parts[0]?.replace(/^\[|\]$/g, '') || 'GIAO TẬN NƠI'
  const addressPart = parts.find(p => p.startsWith('Địa chỉ:'))
  const dropoffPart = parts.find(p => p.startsWith('Nhận hàng:'))
  const otherParts = parts.filter(
    (p, idx) =>
      idx !== 0 && !p.startsWith('Địa chỉ:') && !p.startsWith('Nhận hàng:'),
  )

  return {
    isDelivery: true,
    headerBadge,
    address: addressPart ? addressPart.replace(/^Địa chỉ:\s*/, '') : null,
    dropoff: dropoffPart ? dropoffPart.replace(/^Nhận hàng:\s*/, '') : null,
    extraNote: otherParts.length > 0 ? otherParts.join(' · ') : null,
  }
}


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

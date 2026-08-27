const CART_KEY = 'customerTakeawayCart:v1'
export const TAKEAWAY_CART_EVENT = 'takeaway-cart-changed'
export const MAX_TAKEAWAY_ITEM_QUANTITY = 5
export const MAX_TAKEAWAY_CART_QUANTITY = 50

export type TakeawayCart = Record<string, number>

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

export function readTakeawayCart(): TakeawayCart {
  try {
    const value = JSON.parse(localStorage.getItem(CART_KEY) || '{}') as TakeawayCart
    return normalizeCart(value)
  } catch {
    return {}
  }
}

function save(cart: TakeawayCart) {
  const normalized = normalizeCart(cart)
  localStorage.setItem(CART_KEY, JSON.stringify(normalized))
  window.dispatchEvent(new CustomEvent(TAKEAWAY_CART_EVENT))
  return normalized
}

export function addTakeawayItem(menuItemId: string, quantity = 1) {
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

  if (nextQuantity === 0) delete cart[menuItemId]
  else cart[menuItemId] = nextQuantity

  return save(cart)
}

export function clearTakeawayCart() {
  localStorage.removeItem(CART_KEY)
  window.dispatchEvent(new CustomEvent(TAKEAWAY_CART_EVENT))
}

export function takeawayCartCount() {
  return Object.values(readTakeawayCart()).reduce((sum, quantity) => sum + quantity, 0)
}

const CART_KEY = 'customerTakeawayCart:v1'
const NOTES_KEY = 'customerTakeawayNotes:v1'
export const TAKEAWAY_CART_EVENT = 'takeaway-cart-changed'
export const MAX_TAKEAWAY_ITEM_QUANTITY = 5
export const MAX_TAKEAWAY_CART_QUANTITY = 50

export type TakeawayCart = Record<string, number>
export type TakeawayNotesMap = Record<string, string>

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
  localStorage.removeItem(NOTES_KEY)
  localStorage.removeItem('customerTakeawayCustomizations:v1')
  localStorage.removeItem('customerDeliveryPrefs:v1')
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

export function readTakeawayNotes(): TakeawayNotesMap {
  removeLegacyPersistentCart()
  try {
    const raw = sessionStorage.getItem(NOTES_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as TakeawayNotesMap
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export function getTakeawayItemNote(menuItemId: string): string {
  const map = readTakeawayNotes()
  return map[menuItemId] || ''
}

export function setTakeawayItemNote(menuItemId: string, note: string): TakeawayNotesMap {
  const map = readTakeawayNotes()
  if (!note.trim()) {
    delete map[menuItemId]
  } else {
    map[menuItemId] = note.trim()
  }
  sessionStorage.setItem(NOTES_KEY, JSON.stringify(map))
  return map
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
  note?: string,
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

  if (note !== undefined) {
    setTakeawayItemNote(menuItemId, note)
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
    const map = readTakeawayNotes()
    delete map[menuItemId]
    sessionStorage.setItem(NOTES_KEY, JSON.stringify(map))
  } else {
    cart[menuItemId] = nextQuantity
  }

  return save(cart)
}

export function clearTakeawayCart() {
  sessionStorage.removeItem(CART_KEY)
  sessionStorage.removeItem(NOTES_KEY)
  removeLegacyPersistentCart()
  window.dispatchEvent(new CustomEvent(TAKEAWAY_CART_EVENT))
}

export function takeawayCartCount() {
  return Object.values(readTakeawayCart()).reduce((sum, quantity) => sum + quantity, 0)
}

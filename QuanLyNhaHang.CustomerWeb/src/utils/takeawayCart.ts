const CART_KEY_PREFIX = 'customerTakeawayCart:'
const NOTES_KEY_PREFIX = 'customerTakeawayNotes:'
const LEGACY_CART_KEY = 'customerTakeawayCart:v1'
const LEGACY_NOTES_KEY = 'customerTakeawayNotes:v1'

export const TAKEAWAY_CART_EVENT = 'takeaway-cart-changed'
export const MAX_TAKEAWAY_ITEM_QUANTITY = 5
export const MAX_TAKEAWAY_CART_QUANTITY = 50

export type TakeawayCart = Record<string, number>
export type TakeawayNotesMap = Record<string, string>

function getUserIdFromToken(token: string | null): string | null {
  if (!token) return null
  try {
    const encodedPayload = token.split('.')[1]
    if (!encodedPayload) return null
    const base64 = encodedPayload
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(encodedPayload.length / 4) * 4, '=')
    const payload = JSON.parse(atob(base64)) as Record<string, unknown>
    return (
      (payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] as string) ||
      (payload.sub as string) ||
      (payload.nameid as string) ||
      null
    )
  } catch {
    return null
  }
}

function getActiveStorageScope(): string {
  try {
    const token = sessionStorage.getItem('customerAccessToken')
    const userId = getUserIdFromToken(token)
    return userId ? `user_${userId}` : 'guest'
  } catch {
    return 'guest'
  }
}

function getCartStorageKey(): string {
  return `${CART_KEY_PREFIX}${getActiveStorageScope()}`
}

function getNotesStorageKey(): string {
  return `${NOTES_KEY_PREFIX}${getActiveStorageScope()}`
}

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
  localStorage.removeItem(LEGACY_CART_KEY)
  localStorage.removeItem(LEGACY_NOTES_KEY)
  localStorage.removeItem('customerTakeawayCustomizations:v1')
  localStorage.removeItem('customerDeliveryPrefs:v1')
  sessionStorage.removeItem(LEGACY_CART_KEY)
  sessionStorage.removeItem(LEGACY_NOTES_KEY)
}

export function readTakeawayCart(): TakeawayCart {
  removeLegacyPersistentCart()
  try {
    const key = getCartStorageKey()
    const value = JSON.parse(sessionStorage.getItem(key) || '{}') as TakeawayCart
    return normalizeCart(value)
  } catch {
    return {}
  }
}

export function readTakeawayNotes(): TakeawayNotesMap {
  removeLegacyPersistentCart()
  try {
    const key = getNotesStorageKey()
    const raw = sessionStorage.getItem(key)
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
  const key = getNotesStorageKey()
  sessionStorage.setItem(key, JSON.stringify(map))
  return map
}

function save(cart: TakeawayCart) {
  const normalized = normalizeCart(cart)
  removeLegacyPersistentCart()
  const key = getCartStorageKey()
  sessionStorage.setItem(key, JSON.stringify(normalized))
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
    const key = getNotesStorageKey()
    sessionStorage.setItem(key, JSON.stringify(map))
  } else {
    cart[menuItemId] = nextQuantity
  }

  return save(cart)
}

export function clearTakeawayCart() {
  const cartKey = getCartStorageKey()
  const notesKey = getNotesStorageKey()
  sessionStorage.removeItem(cartKey)
  sessionStorage.removeItem(notesKey)
  removeLegacyPersistentCart()
  window.dispatchEvent(new CustomEvent(TAKEAWAY_CART_EVENT))
}

export function clearGuestTakeawayCart() {
  sessionStorage.removeItem(`${CART_KEY_PREFIX}guest`)
  sessionStorage.removeItem(`${NOTES_KEY_PREFIX}guest`)
  window.dispatchEvent(new CustomEvent(TAKEAWAY_CART_EVENT))
}

export function dispatchTakeawayCartChanged() {
  window.dispatchEvent(new CustomEvent(TAKEAWAY_CART_EVENT))
}

export function takeawayCartCount() {
  return Object.values(readTakeawayCart()).reduce((sum, quantity) => sum + quantity, 0)
}

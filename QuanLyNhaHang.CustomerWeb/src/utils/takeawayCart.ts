const CART_KEY = 'customerTakeawayCart:v1'
const ITEM_NOTES_KEY = 'customerTakeawayItemNotes:v1'
export const TAKEAWAY_CART_EVENT = 'takeaway-cart-changed'
export const MAX_TAKEAWAY_ITEM_QUANTITY = 5
export const MAX_TAKEAWAY_CART_QUANTITY = 50
export const MAX_TAKEAWAY_ITEM_NOTE_LENGTH = 300

export type TakeawayCart = Record<string, number>
export type TakeawayItemNotes = Record<string, string>

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
  try {
    localStorage.removeItem(CART_KEY)
    localStorage.removeItem(ITEM_NOTES_KEY)
    localStorage.removeItem('customerTakeawayItemPrefs:v1')
    localStorage.removeItem('customerDeliveryPrefs:v1')
    sessionStorage.removeItem('customerTakeawayItemPrefs:v1')
    sessionStorage.removeItem('customerDeliveryPrefs:v1')
  } catch {
    // ignore storage errors
  }
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

export function readTakeawayItemNotes(): TakeawayItemNotes {
  removeLegacyPersistentCart()
  try {
    const raw = JSON.parse(sessionStorage.getItem(ITEM_NOTES_KEY) || '{}') as Record<
      string,
      unknown
    >
    const normalized: TakeawayItemNotes = {}
    for (const [menuItemId, value] of Object.entries(raw)) {
      if (typeof value !== 'string') continue
      const trimmed = value.slice(0, MAX_TAKEAWAY_ITEM_NOTE_LENGTH)
      if (trimmed.trim()) {
        normalized[menuItemId] = trimmed
      }
    }
    return normalized
  } catch {
    return {}
  }
}

function saveNotes(notes: TakeawayItemNotes) {
  removeLegacyPersistentCart()
  sessionStorage.setItem(ITEM_NOTES_KEY, JSON.stringify(notes))
  window.dispatchEvent(new CustomEvent(TAKEAWAY_CART_EVENT))
  return notes
}

export function setTakeawayItemNote(menuItemId: string, note: string): TakeawayItemNotes {
  const notes = readTakeawayItemNotes()
  const cleaned = note.slice(0, MAX_TAKEAWAY_ITEM_NOTE_LENGTH)
  if (!cleaned.trim()) {
    delete notes[menuItemId]
  } else {
    notes[menuItemId] = cleaned
  }
  return saveNotes(notes)
}

function save(cart: TakeawayCart) {
  const normalized = normalizeCart(cart)
  removeLegacyPersistentCart()
  sessionStorage.setItem(CART_KEY, JSON.stringify(normalized))
  const notes = readTakeawayItemNotes()
  let notesChanged = false
  for (const itemId of Object.keys(notes)) {
    if (!normalized[itemId]) {
      delete notes[itemId]
      notesChanged = true
    }
  }
  if (notesChanged) {
    sessionStorage.setItem(ITEM_NOTES_KEY, JSON.stringify(notes))
  }
  window.dispatchEvent(new CustomEvent(TAKEAWAY_CART_EVENT))
  return normalized
}

export function addTakeawayItem(
  menuItemId: string,
  quantity = 1,
  note?: string | null,
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

  if (typeof note === 'string' && note.trim()) {
    const notes = readTakeawayItemNotes()
    notes[menuItemId] = note.trim().slice(0, MAX_TAKEAWAY_ITEM_NOTE_LENGTH)
    sessionStorage.setItem(ITEM_NOTES_KEY, JSON.stringify(notes))
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

  if (nextQuantity === 0) delete cart[menuItemId]
  else cart[menuItemId] = nextQuantity

  return save(cart)
}

export function clearTakeawayCart() {
  sessionStorage.removeItem(CART_KEY)
  sessionStorage.removeItem(ITEM_NOTES_KEY)
  removeLegacyPersistentCart()
  window.dispatchEvent(new CustomEvent(TAKEAWAY_CART_EVENT))
}

export function takeawayCartCount() {
  return Object.values(readTakeawayCart()).reduce((sum, quantity) => sum + quantity, 0)
}

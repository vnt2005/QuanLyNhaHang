const CART_VERSION = 1
const CART_PREFIX = 'qr-customer-cart:v1:'
const ORDER_PREFIX = 'qr-customer-order:v1:'

type StoredCart = {
  version: number
  quantities: Record<string, number>
  itemNotes: Record<string, string>
}

function storageKey(prefix: string, token: string) {
  return `${prefix}${encodeURIComponent(token)}`
}

function getStorage() {
  return typeof window === 'undefined' ? null : window.sessionStorage
}

function removeLegacyValue(key: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(key)
  } catch {
    // Legacy cleanup is best effort.
  }
}

function scopedKey(prefix: string, token: string) {
  const key = storageKey(prefix, token)
  removeLegacyValue(key)
  return key
}

export function readQrCart(token: string) {
  const empty = { quantities: {}, itemNotes: {} }
  try {
    const raw = getStorage()?.getItem(scopedKey(CART_PREFIX, token))
    if (!raw) return empty
    const parsed = JSON.parse(raw) as Partial<StoredCart>
    if (parsed.version !== CART_VERSION) return empty

    const quantities: Record<string, number> = {}
    Object.entries(parsed.quantities ?? {}).forEach(([id, quantity]) => {
      if (Number.isInteger(quantity) && quantity > 0 && quantity <= 99) {
        quantities[id] = quantity
      }
    })

    const itemNotes: Record<string, string> = {}
    Object.entries(parsed.itemNotes ?? {}).forEach(([id, note]) => {
      if (typeof note === 'string' && note.trim()) itemNotes[id] = note.slice(0, 300)
    })

    return { quantities, itemNotes }
  } catch {
    return empty
  }
}

export function writeQrCart(
  token: string,
  quantities: Record<string, number>,
  itemNotes: Record<string, string>,
) {
  try {
    const storage = getStorage()
    if (!storage) return
    const key = scopedKey(CART_PREFIX, token)
    if (Object.keys(quantities).length === 0) {
      storage.removeItem(key)
      return
    }
    storage.setItem(key, JSON.stringify({
      version: CART_VERSION,
      quantities,
      itemNotes,
    } satisfies StoredCart))
  } catch {
    // Ordering remains available when storage is blocked or full.
  }
}

export function clearQrCart(token: string) {
  try {
    const key = scopedKey(CART_PREFIX, token)
    getStorage()?.removeItem(key)
  } catch {
    // The server order has already succeeded, so storage cleanup is best effort.
  }
}

export function readCurrentQrOrderId(token: string) {
  try {
    return getStorage()?.getItem(scopedKey(ORDER_PREFIX, token)) || null
  } catch {
    return null
  }
}

export function writeCurrentQrOrderId(token: string, orderId: string) {
  try {
    getStorage()?.setItem(scopedKey(ORDER_PREFIX, token), orderId)
  } catch {
    // The current screen still holds the order when storage is unavailable.
  }
}

export function clearCurrentQrOrderId(token: string) {
  try {
    const key = scopedKey(ORDER_PREFIX, token)
    getStorage()?.removeItem(key)
  } catch {
    // Ignore storage cleanup errors.
  }
}

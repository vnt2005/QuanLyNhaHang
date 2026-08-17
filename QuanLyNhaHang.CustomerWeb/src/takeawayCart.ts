const CART_KEY = 'customerTakeawayCart:v1'
export const TAKEAWAY_CART_EVENT = 'takeaway-cart-changed'

export type TakeawayCart = Record<string, number>

export function readTakeawayCart(): TakeawayCart {
  try {
    const value = JSON.parse(localStorage.getItem(CART_KEY) || '{}') as TakeawayCart
    return Object.fromEntries(
      Object.entries(value).filter(([, quantity]) => Number.isFinite(quantity) && quantity > 0),
    )
  } catch {
    return {}
  }
}

function save(cart: TakeawayCart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart))
  window.dispatchEvent(new CustomEvent(TAKEAWAY_CART_EVENT))
  return cart
}

export function addTakeawayItem(menuItemId: string, quantity = 1) {
  const cart = readTakeawayCart()
  cart[menuItemId] = Math.min(99, (cart[menuItemId] || 0) + Math.max(1, quantity))
  return save(cart)
}

export function setTakeawayItemQuantity(menuItemId: string, quantity: number) {
  const cart = readTakeawayCart()
  const nextQuantity = Math.max(0, Math.min(99, quantity))
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

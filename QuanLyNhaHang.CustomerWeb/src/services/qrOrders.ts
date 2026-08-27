import { apiRequest } from './client'
import {
  getCustomerAccessToken,
  restoreCustomerSession,
} from './customerAuth'
import type { CustomerOrder, OrderItem } from './customerOrders'

export type QrOrderTable = {
  restaurantTableId: string
  restaurantTableName: string
  tableStatus: string
  qrStatus: string
  isActive: boolean
  token: string
}

export type QrMenuItem = {
  id: string
  menuCategoryId: string
  menuCategoryName: string
  name: string
  description?: string | null
  price: number
  imageUrl?: string | null
}

export async function getQrOrderContext(token: string) {
  const encoded = encodeURIComponent(token)
  const [table, menuItems] = await Promise.all([
    apiRequest<QrOrderTable>(`/api/qr-order/${encoded}`),
    apiRequest<QrMenuItem[]>(`/api/qr-order/${encoded}/menu-items`),
  ])
  return { table, menuItems: Array.isArray(menuItems) ? menuItems : [] }
}

export function getQrOrder(token: string, orderId: string) {
  return apiRequest<CustomerOrder>(
    `/api/qr-order/${encodeURIComponent(token)}/orders/${encodeURIComponent(orderId)}`,
  )
}

export async function createQrOrder(
  token: string,
  input: {
    note?: string | null
    items: Array<{ menuItemId: string; quantity: number; note?: string | null }>
    signedIn: boolean
  },
) {
  const payload = {
    ...(input.signedIn ? { token } : {}),
    note: input.note?.trim() || null,
    items: input.items.map(item => ({
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      note: item.note?.trim() || null,
    })),
  }
  const init: RequestInit = { method: 'POST', body: JSON.stringify(payload) }

  if (!input.signedIn) {
    return apiRequest<{ success: boolean; message: string; data: CustomerOrder }>(
      `/api/qr-order/${encodeURIComponent(token)}/orders`,
      init,
    )
  }

  let accessToken = getCustomerAccessToken()
  if (!accessToken) accessToken = (await restoreCustomerSession()).token
  return apiRequest<{
    success: boolean
    message: string
    data: CustomerOrder & { items: OrderItem[] }
  }>('/api/customer/orders', init, accessToken)
}

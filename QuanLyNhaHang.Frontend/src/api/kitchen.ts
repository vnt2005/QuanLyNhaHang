const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7134'

export type KitchenItemStatus = 'Pending' | 'Cooking' | 'Ready' | 'Served' | 'Cancelled'

export type KitchenOrderItem = {
  orderItemId: string
  menuItemId: string
  menuItemName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  status: KitchenItemStatus
  note?: string | null
  createdAt: string
  updatedAt?: string | null
  startedAt?: string | null
  completedAt?: string | null
}

export type KitchenOrder = {
  orderId: string
  orderCode: string
  restaurantTableId: string
  restaurantTableName: string
  orderStatus: string
  createdAt: string
  items: KitchenOrderItem[]
}

type ApiMessage = { success?: boolean; message?: string }

function getErrorMessage(body: unknown): string {
  if (!body || typeof body !== 'object') return 'Yêu cầu không thành công.'
  const value = body as { message?: string; title?: string; errors?: Record<string, string[]> }
  if (value.message) return value.message
  if (value.errors) {
    const first = Object.values(value.errors).flat().find(Boolean)
    if (first) return first
  }
  return value.title ?? 'Yêu cầu không thành công.'
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = sessionStorage.getItem('accessToken')
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })

  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(getErrorMessage(body))
  return body as T
}

export function getKitchenOrders() {
  return request<KitchenOrder[]>('/api/kitchen/orders')
}

export function getKitchenHistory() {
  return request<KitchenOrder[]>('/api/kitchen/history')
}

export function updateKitchenItemStatus(
  orderItemId: string,
  status: KitchenItemStatus,
  note?: string | null,
) {
  return request<ApiMessage>(`/api/kitchen/order-items/${orderItemId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, note: note?.trim() || null }),
  })
}

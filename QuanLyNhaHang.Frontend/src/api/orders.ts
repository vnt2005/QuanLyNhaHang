const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7134'

export type OrderStatus = 'Pending' | 'Cooking' | 'Ready' | 'Served' | 'Completed' | 'Cancelled'
export type OrderItemStatus = 'Pending' | 'Cooking' | 'Ready' | 'Served' | 'Cancelled'

export type OrderItem = {
  id: string
  orderId: string
  menuItemId: string
  menuItemName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  status: OrderItemStatus
  note?: string | null
  createdAt: string
  updatedAt?: string | null
}

export type Order = {
  id: string
  restaurantTableId?: string | null
  restaurantTableName: string
  orderType: 'DineIn' | 'Takeaway'
  customerName?: string | null
  customerPhoneNumber?: string | null
  pickupTime?: string | null
  orderCode: string
  status: OrderStatus
  totalAmount: number
  note?: string | null
  isActive: boolean
  createdAt: string
  updatedAt?: string | null
  items: OrderItem[]
}

export type PaginatedOrders = {
  items: Order[]
  pageNumber: number
  totalPages: number
  totalCount: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export type CreateOrderLine = {
  menuItemId: string
  quantity: number
  note: string
}

export type CreateOrderForm = {
  restaurantTableId: string
  note: string
  items: CreateOrderLine[]
}

type ApiMessage = { id?: string; message?: string }

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

export function getOrders(
  keyword = '',
  restaurantTableId = '',
  status = '',
  pageNumber = 1,
  pageSize = 10,
  onlyUnpaid = false,
) {
  const params = new URLSearchParams({
    pageNumber: String(pageNumber),
    pageSize: String(pageSize),
    isActive: 'true',
  })
  if (keyword.trim()) params.set('keyword', keyword.trim())
  if (restaurantTableId) params.set('restaurantTableId', restaurantTableId)
  if (status) params.set('status', status)
  if (onlyUnpaid) params.set('onlyUnpaid', 'true')
  return request<PaginatedOrders>(`/api/Orders/paginated?${params}`)
}

export function getOrder(id: string) {
  return request<Order>(`/api/Orders/${id}`)
}

export function createOrder(form: CreateOrderForm) {
  return request<ApiMessage>('/api/Orders', {
    method: 'POST',
    body: JSON.stringify({
      restaurantTableId: form.restaurantTableId,
      note: form.note.trim() || null,
      items: form.items.map(item => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        note: item.note.trim() || null,
      })),
    }),
  })
}

export function updateOrderNote(id: string, note: string) {
  return request<ApiMessage>(`/api/Orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ id, note: note.trim() || null }),
  })
}

export function changeOrderStatus(id: string, status: OrderStatus) {
  return request<ApiMessage>(`/api/Orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ id, status }),
  })
}

export function addOrderItem(orderId: string, item: CreateOrderLine) {
  return request<ApiMessage>(`/api/Orders/${orderId}/items`, {
    method: 'POST',
    body: JSON.stringify({
      orderId,
      menuItemId: item.menuItemId,
      quantity: item.quantity,
      note: item.note.trim() || null,
    }),
  })
}

export function updateOrderItemQuantity(orderId: string, orderItemId: string, quantity: number) {
  return request<ApiMessage>(`/api/Orders/${orderId}/items/${orderItemId}`, {
    method: 'PUT',
    body: JSON.stringify({ orderId, orderItemId, quantity }),
  })
}

export function cancelOrderItem(orderId: string, orderItemId: string) {
  return request<ApiMessage>(`/api/Orders/${orderId}/items/${orderItemId}`, { method: 'DELETE' })
}

export function deleteOrder(id: string) {
  return request<ApiMessage>(`/api/Orders/${id}`, { method: 'DELETE' })
}

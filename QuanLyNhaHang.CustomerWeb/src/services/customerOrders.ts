import { authenticatedCustomerRequest } from './customerRequest'

export type OrderItem = {
  id: string
  menuItemId: string
  menuItemName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  status: string
  note?: string | null
}

export type CustomerOrder = {
  id: string
  restaurantTableId?: string | null
  restaurantTableName: string
  orderType: 'DineIn' | 'Takeaway'
  customerName?: string | null
  customerPhoneNumber?: string | null
  pickupTime?: string | null
  orderCode: string
  status: string
  totalAmount: number
  paidAmount?: number | null
  paymentMethod?: string | null
  paidAt?: string | null
  note?: string | null
  createdAt: string
  items: OrderItem[]
}

export type CustomerOrderHistory = {
  items: CustomerOrder[]
  pageNumber: number
  totalPages: number
  totalCount: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export type CustomerOrderFilter = 'all' | 'active' | 'completed' | 'paid' | 'cancelled'

export function getCustomerOrders(
  pageNumber = 1,
  pageSize = 10,
  filter: CustomerOrderFilter = 'all',
  search = '',
) {
  const query = new URLSearchParams({
    pageNumber: String(pageNumber),
    pageSize: String(pageSize),
  })

  if (filter !== 'all') query.set('filter', filter)
  if (search.trim()) query.set('search', search.trim())

  return authenticatedCustomerRequest<CustomerOrderHistory>(
    `/api/customer/orders?${query.toString()}`,
  )
}

export function claimCustomerOrder(qrToken: string, orderId: string) {
  return authenticatedCustomerRequest<{ success: boolean; message: string }>(
    `/api/customer/orders/${encodeURIComponent(orderId)}/claim`,
    {
      method: 'POST',
      body: JSON.stringify({ token: qrToken }),
    },
  )
}

export function cancelCustomerOrder(orderId: string) {
  return authenticatedCustomerRequest<{ success: boolean; message: string }>(
    `/api/customer/orders/${encodeURIComponent(orderId)}/cancel`,
    { method: 'POST' },
  )
}

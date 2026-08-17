import { ApiError, apiRequest } from './client'
import {
  getCustomerAccessToken,
  restoreCustomerSession,
} from './customerAuth'

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

async function authorizedRequest<T>(path: string, init?: RequestInit) {
  let token = getCustomerAccessToken()
  if (!token) token = (await restoreCustomerSession()).token

  try {
    return await apiRequest<T>(path, init, token)
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error
    const restored = await restoreCustomerSession()
    return apiRequest<T>(path, init, restored.token)
  }
}

export function getCustomerOrders(pageNumber = 1, pageSize = 10) {
  const query = new URLSearchParams({
    pageNumber: String(pageNumber),
    pageSize: String(pageSize),
  })
  return authorizedRequest<CustomerOrderHistory>(
    `/api/customer/orders?${query.toString()}`,
  )
}

export function claimCustomerOrder(qrToken: string, orderId: string) {
  return authorizedRequest<{ success: boolean; message: string }>(
    `/api/customer/orders/${encodeURIComponent(orderId)}/claim`,
    {
      method: 'POST',
      body: JSON.stringify({ token: qrToken }),
    },
  )
}

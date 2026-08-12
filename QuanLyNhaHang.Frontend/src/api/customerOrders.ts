import type { QrOrderResult } from './qrOrders'
import { getStoredCustomerAccessToken, restoreCustomerSession } from './customerAuth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7134'

export type CustomerOrderHistory = {
  items: QrOrderResult[]
  pageNumber: number
  totalPages: number
  totalCount: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

type ApiErrorBody = {
  message?: string
  detail?: string
  title?: string
}

export class CustomerOrderApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'CustomerOrderApiError'
    this.status = status
  }
}

let refreshRequest: Promise<string> | null = null

async function refreshAccessToken() {
  if (!refreshRequest) {
    refreshRequest = restoreCustomerSession()
      .then(session => session.token)
      .finally(() => {
        refreshRequest = null
      })
  }

  return refreshRequest
}

async function customerRequest<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
  retryAfterRefresh = true,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...init?.headers,
    },
  })
  const body = await response.json().catch(() => null) as ApiErrorBody | T | null

  if (response.status === 401 && retryAfterRefresh) {
    const refreshedToken = await refreshAccessToken().catch(() => '')
    if (refreshedToken) {
      return customerRequest<T>(path, refreshedToken, init, false)
    }
  }

  if (!response.ok) {
    const error = body as ApiErrorBody | null
    throw new CustomerOrderApiError(
      error?.message ?? error?.detail ?? error?.title ??
        'Không thể tải dữ liệu đơn hàng.',
      response.status,
    )
  }

  return body as T
}

export function getCustomerOrders(
  accessToken = getStoredCustomerAccessToken() ?? '',
  pageNumber = 1,
  pageSize = 10,
) {
  const query = new URLSearchParams({
    pageNumber: String(pageNumber),
    pageSize: String(pageSize),
  })

  return customerRequest<CustomerOrderHistory>(
    `/api/customer/orders?${query.toString()}`,
    getStoredCustomerAccessToken() ?? accessToken,
  )
}

export function claimCustomerOrder(
  accessToken: string,
  qrToken: string,
  orderId: string,
) {
  return customerRequest<{ success: boolean; message: string }>(
    `/api/customer/orders/${encodeURIComponent(orderId)}/claim`,
    getStoredCustomerAccessToken() ?? accessToken,
    {
      method: 'POST',
      body: JSON.stringify({ token: qrToken }),
    },
  )
}

import { getStoredCustomerAccessToken, restoreCustomerSession } from './customerAuth'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7134'

class QrOrderRequestError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'QrOrderRequestError'
    this.status = status
  }
}

export type QrOrderTable = {
  restaurantTableId: string
  restaurantTableName: string
  tableStatus: string
  qrStatus: string
  isActive: boolean
  token: string
}

export type QrOrderMenuItem = {
  id: string
  menuCategoryId: string
  menuCategoryName: string
  name: string
  description?: string | null
  price: number
  imageUrl?: string | null
}

export type QrOrderItemInput = {
  menuItemId: string
  quantity: number
  note?: string | null
}

export type QrOrderResultItem = {
  id: string
  menuItemId: string
  menuItemName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  status: string
  note?: string | null
}

export type QrOrderResult = {
  id: string
  restaurantTableId: string
  restaurantTableName: string
  orderCode: string
  status: string
  totalAmount: number
  note?: string | null
  createdAt: string
  items: QrOrderResultItem[]
}

type ApiEnvelope<T> = {
  success?: boolean
  message?: string
  data?: T
}

function getErrorMessage(body: unknown, status: number) {
  if (body && typeof body === 'object') {
    const value = body as {
      message?: string
      title?: string
      errors?: Record<string, string[]>
    }
    if (value.message) return value.message
    if (value.errors) {
      return Object.values(value.errors).flat().find(Boolean)
        ?? 'Dữ liệu gọi món không hợp lệ.'
    }
    if (value.title) return value.title
  }

  if (status === 429) {
    return 'Bạn thao tác quá nhanh. Vui lòng chờ một chút rồi thử lại.'
  }

  return 'Không thể kết nối tới hệ thống gọi món.'
}

async function publicRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    throw new QrOrderRequestError(
      getErrorMessage(body, response.status),
      response.status,
    )
  }
  return body as T
}

async function customerOrderRequest<T>(
  path: string,
  accessToken: string,
  init: RequestInit,
  retryAfterRefresh = true,
): Promise<T> {
  try {
    return await publicRequest<T>(path, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...init.headers,
      },
    })
  } catch (exception) {
    if (
      retryAfterRefresh &&
      exception instanceof QrOrderRequestError &&
      exception.status === 401
    ) {
      const currentToken = getStoredCustomerAccessToken()
      if (currentToken && currentToken !== accessToken) {
        return customerOrderRequest<T>(path, currentToken, init, false)
      }

      const session = await restoreCustomerSession().catch(() => null)
      if (session?.token) {
        return customerOrderRequest<T>(path, session.token, init, false)
      }
    }
    throw exception
  }
}

export async function getQrOrderContext(token: string) {
  const encodedToken = encodeURIComponent(token)
  const [table, menuItems] = await Promise.all([
    publicRequest<QrOrderTable>(`/api/qr-order/${encodedToken}`),
    publicRequest<QrOrderMenuItem[]>(`/api/qr-order/${encodedToken}/menu-items`),
  ])

  return {
    table,
    menuItems: Array.isArray(menuItems) ? menuItems : [],
  }
}

export function getQrOrder(token: string, orderId: string) {
  return publicRequest<QrOrderResult>(
    `/api/qr-order/${encodeURIComponent(token)}/orders/${encodeURIComponent(orderId)}`,
  )
}

export async function createQrOrder(
  token: string,
  input: {
    items: QrOrderItemInput[]
    note?: string | null
    customerAccessToken?: string | null
  },
) {
  const encodedToken = encodeURIComponent(token)
  const isCustomerOrder = Boolean(input.customerAccessToken)
  const path = isCustomerOrder
    ? '/api/customer/orders'
    : `/api/qr-order/${encodedToken}/orders`
  const init: RequestInit = {
    method: 'POST',
    body: JSON.stringify({
      ...(isCustomerOrder ? { token } : {}),
      note: input.note?.trim() || null,
      items: input.items.map(item => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        note: item.note?.trim() || null,
      })),
    }),
  }
  const customerAccessToken = getStoredCustomerAccessToken()
    ?? input.customerAccessToken
  const result = customerAccessToken
    ? await customerOrderRequest<ApiEnvelope<QrOrderResult>>(
        path,
        customerAccessToken,
        init,
      )
    : await publicRequest<ApiEnvelope<QrOrderResult>>(path, init)

  if (!result.data) throw new Error('Backend không trả thông tin đơn vừa tạo.')
  return {
    message: result.message ?? 'Đã gửi món xuống bếp.',
    data: result.data,
  }
}

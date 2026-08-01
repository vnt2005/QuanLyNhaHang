const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7134'

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
  if (!response.ok) throw new Error(getErrorMessage(body, response.status))
  return body as T
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

export async function createQrOrder(
  token: string,
  input: { items: QrOrderItemInput[]; note?: string | null },
) {
  const encodedToken = encodeURIComponent(token)
  const result = await publicRequest<ApiEnvelope<QrOrderResult>>(
    `/api/qr-order/${encodedToken}/orders`,
    {
      method: 'POST',
      body: JSON.stringify({
        note: input.note?.trim() || null,
        items: input.items.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          note: item.note?.trim() || null,
        })),
      }),
    },
  )

  if (!result.data) throw new Error('Backend không trả thông tin đơn vừa tạo.')
  return {
    message: result.message ?? 'Đã gửi món xuống bếp.',
    data: result.data,
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7134'

export type Payment = {
  id: string
  orderId: string
  paymentCode: string
  totalAmount: number
  discountAmount: number
  serviceChargeAmount: number
  vatAmount: number
  finalAmount: number
  customerPaid: number
  changeAmount: number
  paymentMethod: string
  status: string
  note?: string | null
  paidAt: string
  createdAt: string
  updatedAt?: string | null
}

export type PaginatedPayments = {
  items: Payment[]
  pageNumber: number
  totalPages: number
  totalCount: number
  hasPreviousPage: boolean
  hasNextPage: boolean
  paidCount: number
  cancelledCount: number
  revenue: number
}

function getErrorMessage(body: unknown): string {
  if (!body || typeof body !== 'object') return 'Yêu cầu không thành công.'
  const value = body as { message?: string; title?: string; errors?: Record<string, string[]> }
  if (value.message) return value.message
  if (value.errors) return Object.values(value.errors).flat().find(Boolean) ?? 'Dữ liệu không hợp lệ.'
  return value.title ?? 'Yêu cầu không thành công.'
}

async function request<T>(path: string): Promise<T> {
  const token = sessionStorage.getItem('accessToken')
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(getErrorMessage(body))
  return body as T
}

export function getPayments(keyword = '', pageNumber = 1, pageSize = 10) {
  const params = new URLSearchParams({
    pageNumber: String(pageNumber),
    pageSize: String(pageSize),
    status: 'Paid',
    paymentMethod: 'BankTransfer',
  })
  if (keyword.trim()) params.set('keyword', keyword.trim())
  return request<PaginatedPayments>(`/api/payments/paginated?${params}`)
}

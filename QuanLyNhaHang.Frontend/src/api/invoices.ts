const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7134'

export type InvoiceStatus = 'Issued' | 'Printed' | 'Cancelled'

export type InvoiceItem = {
  id: string
  invoiceId: string
  orderItemId: string
  menuItemId: string
  menuItemName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  note?: string | null
  createdAt: string
}

export type Invoice = {
  id: string
  orderId: string
  paymentId: string
  restaurantTableId: string | null
  invoiceCode: string
  orderCode: string
  paymentCode: string
  restaurantTableName: string
  totalAmount: number
  discountAmount: number
  serviceChargeAmount: number
  vatAmount: number
  finalAmount: number
  customerPaid: number
  changeAmount: number
  paymentMethod: string
  status: InvoiceStatus
  note?: string | null
  issuedAt: string
  createdAt: string
  updatedAt?: string | null
  items: InvoiceItem[]
}

export type PaginatedInvoices = {
  items: Invoice[]
  pageNumber: number
  totalPages: number
  totalCount: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

type InvoiceResponse = { success: boolean; message: string; data: Invoice }
type ApiMessage = { success?: boolean; message?: string }

function getErrorMessage(body: unknown): string {
  if (!body || typeof body !== 'object') return 'Yêu cầu không thành công.'
  const value = body as { message?: string; title?: string; errors?: Record<string, string[]> }
  if (value.message) return value.message
  if (value.errors) return Object.values(value.errors).flat().find(Boolean) ?? 'Dữ liệu không hợp lệ.'
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

export function getInvoices(keyword = '', status = '', paymentMethod = '', pageNumber = 1, pageSize = 10) {
  const params = new URLSearchParams({ pageNumber: String(pageNumber), pageSize: String(pageSize) })
  if (keyword.trim()) params.set('keyword', keyword.trim())
  if (status) params.set('status', status)
  if (paymentMethod) params.set('paymentMethod', paymentMethod)
  return request<PaginatedInvoices>(`/api/invoices/paginated?${params}`)
}

export function getInvoiceList(status = '', paymentMethod = '') {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (paymentMethod) params.set('paymentMethod', paymentMethod)
  const query = params.toString()
  return request<Invoice[]>(`/api/invoices${query ? `?${query}` : ''}`)
}

export function getInvoice(id: string) {
  return request<Invoice>(`/api/invoices/${id}`)
}

export function createInvoice(paymentId: string, note: string) {
  return request<InvoiceResponse>('/api/invoices', {
    method: 'POST',
    body: JSON.stringify({ paymentId, note: note.trim() || null }),
  })
}

export function updateInvoice(id: string, status: InvoiceStatus | null, note: string) {
  return request<InvoiceResponse>(`/api/invoices/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ status, note: note.trim() || null }),
  })
}

export function cancelInvoice(id: string) {
  return request<ApiMessage>(`/api/invoices/${id}`, { method: 'DELETE' })
}

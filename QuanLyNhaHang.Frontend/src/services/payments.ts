import { getRequestProtectionHeaders } from './requestProtection'

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

export type EligibleCounterPaymentOrder = {
  id: string
  orderCode: string
  orderType: 'DineIn' | 'Takeaway'
  restaurantTableName: string
  customerName?: string | null
  status: 'Ready' | 'Served'
  totalAmount: number
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

export type CreatePaymentForm = {
  orderId: string
  discountAmount: number
  serviceChargeAmount: number
  vatAmount: number
  customerPaid: number
  paymentMethod: string
  note: string
  issueInvoice: boolean
}

type PaymentResponse = { success: boolean; message: string; data: Payment }

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
      ...getRequestProtectionHeaders(path, init),
      ...init?.headers,
    },
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(getErrorMessage(body))
  return body as T
}

export function getPayments(keyword = '', status = '', paymentMethod = '', pageNumber = 1, pageSize = 10) {
  const params = new URLSearchParams({ pageNumber: String(pageNumber), pageSize: String(pageSize) })
  if (keyword.trim()) params.set('keyword', keyword.trim())
  if (status) params.set('status', status)
  if (paymentMethod) params.set('paymentMethod', paymentMethod)
  return request<PaginatedPayments>(`/api/payments/paginated?${params}`)
}

export function getEligibleCounterPaymentOrders() {
  return request<EligibleCounterPaymentOrder[]>('/api/payments/eligible-counter-orders')
}

export function createPayment(form: CreatePaymentForm) {
  return request<PaymentResponse>('/api/payments', {
    method: 'POST',
    body: JSON.stringify({
      ...form,
      note: form.note.trim() || null,
    }),
  })
}

export function updatePayment(id: string, form: Omit<CreatePaymentForm, 'orderId' | 'issueInvoice'>) {
  return request<PaymentResponse>(`/api/payments/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ ...form, note: form.note.trim() || null }),
  })
}

export function cancelPayment(id: string) {
  return request<ApiMessage>(`/api/payments/${id}`, { method: 'DELETE' })
}

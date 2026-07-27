const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7134'

export type RevenueReportStatus = 'Generated' | 'Exported' | 'Printed' | 'Cancelled'

export type RevenueReportItem = {
  id: string
  revenueReportId: string
  menuItemId: string
  menuItemName: string
  quantitySold: number
  totalRevenue: number
  createdAt: string
}

export type RevenueReport = {
  id: string
  reportCode: string
  fromDate: string
  toDate: string
  totalInvoices: number
  totalOrders: number
  totalAmount: number
  totalDiscountAmount: number
  totalVatAmount: number
  totalRevenue: number
  totalCustomerPaid: number
  totalChangeAmount: number
  averageRevenuePerInvoice: number
  status: RevenueReportStatus
  note?: string | null
  generatedAt: string
  createdAt: string
  updatedAt?: string | null
  items: RevenueReportItem[]
}

export type RevenueSummaryItem = {
  menuItemId: string
  menuItemName: string
  quantity: number
  unitPrice: number
  totalRevenue: number
}

export type RevenueSummary = {
  fromDate: string
  toDate: string
  totalInvoices: number
  totalOrders: number
  totalAmount: number
  totalDiscountAmount: number
  totalVatAmount: number
  totalRevenue: number
  totalCustomerPaid: number
  totalChangeAmount: number
  averageRevenuePerInvoice: number
  items: RevenueSummaryItem[]
}

export type PaginatedRevenueReports = {
  items: RevenueReport[]
  pageNumber: number
  totalPages: number
  totalCount: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

type RevenueReportResponse = {
  success: boolean
  message: string
  data: RevenueReport
}

type ApiMessage = {
  success?: boolean
  message?: string
}

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

export function getRevenueReports(
  keyword = '',
  status = '',
  fromDate = '',
  toDate = '',
  pageNumber = 1,
  pageSize = 10,
) {
  const params = new URLSearchParams({
    pageNumber: String(pageNumber),
    pageSize: String(pageSize),
  })
  if (keyword.trim()) params.set('keyword', keyword.trim())
  if (status) params.set('status', status)
  if (fromDate) params.set('fromDate', fromDate)
  if (toDate) params.set('toDate', toDate)
  return request<PaginatedRevenueReports>(`/api/revenue-reports/paginated?${params}`)
}

export function getRevenueReport(id: string) {
  return request<RevenueReport>(`/api/revenue-reports/${id}`)
}

export function getRevenueSummary(fromDate: string, toDate: string) {
  const params = new URLSearchParams()
  if (fromDate) params.set('fromDate', fromDate)
  if (toDate) params.set('toDate', toDate)
  const query = params.toString()
  return request<RevenueSummary>(`/api/revenue-reports/summary${query ? `?${query}` : ''}`)
}

export function createRevenueReport(fromDate: string, toDate: string, note: string) {
  return request<RevenueReportResponse>('/api/revenue-reports', {
    method: 'POST',
    body: JSON.stringify({
      fromDate,
      toDate,
      note: note.trim() || null,
    }),
  })
}

export function updateRevenueReport(
  id: string,
  status: RevenueReportStatus | null,
  note: string,
) {
  return request<RevenueReportResponse>(`/api/revenue-reports/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      status,
      note: note.trim() || null,
    }),
  })
}

export function cancelRevenueReport(id: string) {
  return request<ApiMessage>(`/api/revenue-reports/${id}`, { method: 'DELETE' })
}

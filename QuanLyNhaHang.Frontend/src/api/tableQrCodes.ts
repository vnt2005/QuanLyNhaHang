const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7134'

export type TableQrCodeStatus = 'Active' | 'Inactive' | 'Blocked'

export type TableQrCode = {
  id: string
  restaurantTableId: string
  restaurantTableName: string
  token: string
  qrCodeUrl: string
  status: TableQrCodeStatus
  note?: string | null
  isActive: boolean
  createdAt: string
  updatedAt?: string | null
}

export type PaginatedTableQrCodes = {
  items: TableQrCode[]
  pageNumber: number
  totalPages: number
  totalCount: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export type CreateTableQrCodeInput = {
  restaurantTableId: string
  clientBaseUrl: string
  note: string
}

export type UpdateTableQrCodeInput = {
  status: TableQrCodeStatus | null
  note: string
  regenerate: boolean
  clientBaseUrl: string | null
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
  name: string
  price: number
}

type TableQrCodeResponse = {
  success: boolean
  message: string
  data: TableQrCode
}

type ApiMessage = {
  success?: boolean
  message?: string
}

function getErrorMessage(body: unknown): string {
  if (!body || typeof body !== 'object') return 'Yêu cầu không thành công.'
  const value = body as { message?: string; title?: string; errors?: Record<string, string[]> }
  if (value.message) return value.message
  if (value.errors) {
    return Object.values(value.errors).flat().find(Boolean) ?? 'Dữ liệu không hợp lệ.'
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

export function getTableQrCodes(
  keyword = '',
  status = '',
  isActive = '',
  pageNumber = 1,
  pageSize = 10,
) {
  const params = new URLSearchParams({
    pageNumber: String(pageNumber),
    pageSize: String(pageSize),
  })
  if (keyword.trim()) params.set('keyword', keyword.trim())
  if (status) params.set('status', status)
  if (isActive) params.set('isActive', isActive)
  return request<PaginatedTableQrCodes>(`/api/table-qr-codes/paginated?${params}`)
}

export function getAllTableQrCodes() {
  return request<TableQrCode[]>('/api/table-qr-codes')
}

export function getTableQrCode(id: string) {
  return request<TableQrCode>(`/api/table-qr-codes/${id}`)
}

export function createTableQrCode(input: CreateTableQrCodeInput) {
  return request<TableQrCodeResponse>('/api/table-qr-codes', {
    method: 'POST',
    body: JSON.stringify({
      restaurantTableId: input.restaurantTableId,
      clientBaseUrl: input.clientBaseUrl.trim(),
      note: input.note.trim() || null,
    }),
  })
}

export function updateTableQrCode(id: string, input: UpdateTableQrCodeInput) {
  return request<TableQrCodeResponse>(`/api/table-qr-codes/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      id,
      status: input.status,
      note: input.note.trim() || null,
      regenerate: input.regenerate,
      clientBaseUrl: input.clientBaseUrl?.trim() || null,
    }),
  })
}

export function deactivateTableQrCode(id: string) {
  return request<ApiMessage>(`/api/table-qr-codes/${id}`, { method: 'DELETE' })
}

export async function simulateQrScan(token: string) {
  const encodedToken = encodeURIComponent(token)
  const [table, menuItems] = await Promise.all([
    request<QrOrderTable>(`/api/qr-order/${encodedToken}`),
    request<QrOrderMenuItem[]>(`/api/qr-order/${encodedToken}/menu-items`),
  ])
  return { table, menuItems }
}

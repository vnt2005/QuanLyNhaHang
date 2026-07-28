const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7134'

export type ReservationStatus = 'Pending' | 'Confirmed' | 'CheckedIn' | 'Completed' | 'Cancelled' | 'NoShow'

export type Reservation = {
  id: string
  reservationCode: string
  restaurantTableId: string
  restaurantTableName: string
  customerName: string
  phoneNumber: string
  email?: string | null
  numberOfGuests: number
  reservationTime: string
  depositAmount: number
  status: ReservationStatus
  note?: string | null
  createdAt: string
  confirmedAt?: string | null
  checkedInAt?: string | null
  completedAt?: string | null
  cancelledAt?: string | null
  updatedAt?: string | null
}

export type ReservationInput = {
  restaurantTableId: string
  customerName: string
  phoneNumber: string
  email: string
  numberOfGuests: number
  reservationTime: string
  depositAmount: number
  note: string
}

export type PaginatedReservations = {
  items: Reservation[]
  pageNumber: number
  totalPages: number
  totalCount: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

type ApiEnvelope<T> = { success?: boolean; message?: string; data?: T }
type ApiMessage = { success?: boolean; message?: string }

const reservationStatuses: ReservationStatus[] = [
  'Pending',
  'Confirmed',
  'CheckedIn',
  'Completed',
  'Cancelled',
  'NoShow',
]

function getErrorMessage(body: unknown, status: number) {
  if (body && typeof body === 'object') {
    const value = body as { message?: string; title?: string; errors?: Record<string, string[]> }
    if (value.message) return value.message
    if (value.errors) return Object.values(value.errors).flat().find(Boolean) ?? 'Dữ liệu không hợp lệ.'
    if (value.title) return value.title
  }
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (status === 403) return 'Tài khoản không có quyền thao tác với đặt bàn.'
  return 'Yêu cầu đặt bàn không thành công.'
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
  if (!response.ok) throw new Error(getErrorMessage(body, response.status))
  return body as T
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function asNullableString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value : null
}

function asNumber(value: unknown, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function normalizeStatus(value: unknown): ReservationStatus {
  return typeof value === 'string' && reservationStatuses.includes(value as ReservationStatus)
    ? value as ReservationStatus
    : 'Pending'
}

function normalizeReservation(value: unknown): Reservation {
  const item = value && typeof value === 'object' ? value as Record<string, unknown> : {}
  return {
    id: asString(item.id),
    reservationCode: asString(item.reservationCode, 'Chưa có mã'),
    restaurantTableId: asString(item.restaurantTableId),
    restaurantTableName: asString(item.restaurantTableName, 'Không xác định'),
    customerName: asString(item.customerName, 'Không xác định'),
    phoneNumber: asString(item.phoneNumber, '—'),
    email: asNullableString(item.email),
    numberOfGuests: Math.max(0, asNumber(item.numberOfGuests)),
    reservationTime: asString(item.reservationTime),
    depositAmount: Math.max(0, asNumber(item.depositAmount)),
    status: normalizeStatus(item.status),
    note: asNullableString(item.note),
    createdAt: asString(item.createdAt),
    confirmedAt: asNullableString(item.confirmedAt),
    checkedInAt: asNullableString(item.checkedInAt),
    completedAt: asNullableString(item.completedAt),
    cancelledAt: asNullableString(item.cancelledAt),
    updatedAt: asNullableString(item.updatedAt),
  }
}

export async function getReservations(keyword = '', status = '', fromDate = '', toDate = '', pageNumber = 1, pageSize = 12) {
  const params = new URLSearchParams({ pageNumber: String(pageNumber), pageSize: String(pageSize) })
  if (keyword.trim()) params.set('keyword', keyword.trim())
  if (status) params.set('status', status)
  if (fromDate) params.set('fromDate', fromDate)
  if (toDate) params.set('toDate', toDate)

  const result = await request<Partial<PaginatedReservations>>(`/api/reservations/paginated?${params}`)
  const items = Array.isArray(result?.items) ? result.items.map(normalizeReservation) : []
  const normalizedPageNumber = Math.max(1, asNumber(result?.pageNumber, pageNumber))
  const normalizedTotalPages = Math.max(1, asNumber(result?.totalPages, 1))
  const normalizedTotalCount = Math.max(0, asNumber(result?.totalCount, items.length))

  return {
    items,
    pageNumber: normalizedPageNumber,
    totalPages: normalizedTotalPages,
    totalCount: normalizedTotalCount,
    hasPreviousPage: Boolean(result?.hasPreviousPage),
    hasNextPage: Boolean(result?.hasNextPage),
  } satisfies PaginatedReservations
}

export async function getReservation(id: string) {
  return normalizeReservation(await request<unknown>(`/api/reservations/${id}`))
}

function normalizeInput(input: ReservationInput) {
  return {
    restaurantTableId: input.restaurantTableId,
    customerName: input.customerName.trim(),
    phoneNumber: input.phoneNumber.trim(),
    email: input.email.trim() || null,
    numberOfGuests: input.numberOfGuests,
    reservationTime: new Date(input.reservationTime).toISOString(),
    depositAmount: input.depositAmount,
    note: input.note.trim() || null,
  }
}

export function createReservation(input: ReservationInput) {
  return request<ApiEnvelope<Reservation>>('/api/reservations', {
    method: 'POST',
    body: JSON.stringify(normalizeInput(input)),
  })
}

export function updateReservation(id: string, input: ReservationInput) {
  return request<ApiEnvelope<Reservation>>(`/api/reservations/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ id, ...normalizeInput(input) }),
  })
}

export function updateReservationStatus(id: string, status: ReservationStatus) {
  return request<ApiEnvelope<Reservation>>(`/api/reservations/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ id, status }),
  })
}

export function cancelReservation(id: string) {
  return request<ApiMessage>(`/api/reservations/${id}`, { method: 'DELETE' })
}

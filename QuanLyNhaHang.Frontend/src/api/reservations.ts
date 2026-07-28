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

export function getReservations(keyword = '', status = '', fromDate = '', toDate = '', pageNumber = 1, pageSize = 12) {
  const params = new URLSearchParams({ pageNumber: String(pageNumber), pageSize: String(pageSize) })
  if (keyword.trim()) params.set('keyword', keyword.trim())
  if (status) params.set('status', status)
  if (fromDate) params.set('fromDate', fromDate)
  if (toDate) params.set('toDate', toDate)
  return request<PaginatedReservations>(`/api/reservations/paginated?${params}`)
}

export function getReservation(id: string) {
  return request<Reservation>(`/api/reservations/${id}`)
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

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7134'

export type Area = {
  id: string
  name: string
  description?: string | null
  isActive: boolean
  createdAt: string
  updatedAt?: string | null
}

export type AreaForm = {
  id?: string
  name: string
  description: string
}

export type RestaurantTable = {
  id: string
  areaId: string
  areaName: string
  name: string
  capacity: number
  status: TableStatus
  note?: string | null
  isActive: boolean
  createdAt: string
  updatedAt?: string | null
}

export type TableStatus = 'Available' | 'Occupied' | 'Reserved' | 'Cleaning'
export type TableSelectionPurpose = 'Reservation' | 'Order' | 'QrCode'

export type RestaurantTableForm = {
  id?: string
  areaId: string
  name: string
  capacity: number
  note: string
}

export type PaginatedAreas = {
  items: Area[]
  pageNumber: number
  totalPages: number
  totalCount: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export type PaginatedTables = {
  items: RestaurantTable[]
  pageNumber: number
  totalPages: number
  totalCount: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

type ApiMessage = { id?: string; message?: string }
type UnknownRecord = Record<string, unknown>

function getErrorMessage(body: unknown): string {
  if (!body || typeof body !== 'object') return 'Yêu cầu không thành công.'
  const value = body as { message?: string; title?: string; errors?: Record<string, string[]> }
  if (value.message) return value.message
  if (value.errors) {
    const first = Object.values(value.errors).flat().find(Boolean)
    if (first) return first
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

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as UnknownRecord
    : {}
}

function unwrapData(value: unknown): unknown {
  const record = asRecord(value)
  return record.data ?? record.Data ?? value
}

function finiteNumber(value: unknown, fallback: number, minimum: number): number {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(minimum, number) : fallback
}

export async function getAreaList() {
  const response = await request<unknown>('/api/Areas')
  const payload = unwrapData(response)
  return Array.isArray(payload) ? payload as Area[] : []
}

export async function getAreas(keyword = '', pageNumber = 1, pageSize = 12) {
  const params = new URLSearchParams({ pageNumber: String(pageNumber), pageSize: String(pageSize) })
  if (keyword.trim()) params.set('keyword', keyword.trim())

  const response = await request<unknown>(`/api/Areas/paginated?${params}`)
  const payload = unwrapData(response)

  // Compatibility with the old backend contract that returned Area[] directly.
  if (Array.isArray(payload)) {
    return {
      items: payload as Area[],
      pageNumber,
      totalPages: 1,
      totalCount: payload.length,
      hasPreviousPage: false,
      hasNextPage: false,
    } satisfies PaginatedAreas
  }

  const result = asRecord(payload)
  const itemsValue = result.items ?? result.Items
  const items = Array.isArray(itemsValue) ? itemsValue as Area[] : []
  const normalizedPageNumber = finiteNumber(result.pageNumber ?? result.PageNumber, pageNumber, 1)
  const totalPages = finiteNumber(result.totalPages ?? result.TotalPages, 1, 1)
  const totalCount = finiteNumber(result.totalCount ?? result.TotalCount, items.length, 0)

  return {
    items,
    pageNumber: normalizedPageNumber,
    totalPages,
    totalCount,
    hasPreviousPage: Boolean(result.hasPreviousPage ?? result.HasPreviousPage),
    hasNextPage: Boolean(result.hasNextPage ?? result.HasNextPage),
  } satisfies PaginatedAreas
}

export function createArea(form: AreaForm) {
  return request<ApiMessage>('/api/Areas', {
    method: 'POST',
    body: JSON.stringify({ name: form.name.trim(), description: form.description.trim() || null }),
  })
}

export function updateArea(form: AreaForm) {
  if (!form.id) throw new Error('Thiếu mã khu vực cần cập nhật.')
  return request<ApiMessage>(`/api/Areas/${form.id}`, {
    method: 'PUT',
    body: JSON.stringify({ id: form.id, name: form.name.trim(), description: form.description.trim() || null }),
  })
}

export function deleteArea(id: string) {
  return request<ApiMessage>(`/api/Areas/${id}`, { method: 'DELETE' })
}

export async function getTables(
  keyword = '',
  areaId = '',
  status = '',
  pageNumber = 1,
  pageSize = 12,
) {
  const params = new URLSearchParams({ pageNumber: String(pageNumber), pageSize: String(pageSize) })
  if (keyword.trim()) params.set('keyword', keyword.trim())
  if (areaId) params.set('areaId', areaId)
  if (status) params.set('status', status)

  const response = await request<unknown>(`/api/RestaurantTables/paginated?${params}`)
  const payload = unwrapData(response)

  // Compatibility with the old backend contract that returned RestaurantTable[] directly.
  if (Array.isArray(payload)) {
    return {
      items: payload as RestaurantTable[],
      pageNumber,
      totalPages: 1,
      totalCount: payload.length,
      hasPreviousPage: false,
      hasNextPage: false,
    } satisfies PaginatedTables
  }

  const result = asRecord(payload)
  const itemsValue = result.items ?? result.Items
  const items = Array.isArray(itemsValue) ? itemsValue as RestaurantTable[] : []
  const normalizedPageNumber = finiteNumber(result.pageNumber ?? result.PageNumber, pageNumber, 1)
  const totalPages = finiteNumber(result.totalPages ?? result.TotalPages, 1, 1)
  const totalCount = finiteNumber(result.totalCount ?? result.TotalCount, items.length, 0)

  return {
    items,
    pageNumber: normalizedPageNumber,
    totalPages,
    totalCount,
    hasPreviousPage: Boolean(result.hasPreviousPage ?? result.HasPreviousPage),
    hasNextPage: Boolean(result.hasNextPage ?? result.HasNextPage),
  } satisfies PaginatedTables
}

const selectableTablePaths: Record<TableSelectionPurpose, string> = {
  Reservation: '/api/reservations/selectable-tables',
  Order: '/api/Orders/selectable-tables',
  QrCode: '/api/table-qr-codes/selectable-tables',
}

export async function getSelectableTables(purpose: TableSelectionPurpose) {
  const response = await request<unknown>(
    selectableTablePaths[purpose],
    { cache: 'no-store' },
  )
  const payload = unwrapData(response)
  return Array.isArray(payload) ? payload as RestaurantTable[] : []
}

export function createTable(form: RestaurantTableForm) {
  return request<ApiMessage>('/api/RestaurantTables', {
    method: 'POST',
    body: JSON.stringify({
      areaId: form.areaId,
      name: form.name.trim(),
      capacity: form.capacity,
      note: form.note.trim() || null,
    }),
  })
}

export function updateTable(form: RestaurantTableForm) {
  if (!form.id) throw new Error('Thiếu mã bàn cần cập nhật.')
  return request<ApiMessage>(`/api/RestaurantTables/${form.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      id: form.id,
      areaId: form.areaId,
      name: form.name.trim(),
      capacity: form.capacity,
      note: form.note.trim() || null,
    }),
  })
}

export function changeTableStatus(id: string, status: TableStatus) {
  return request<ApiMessage>(`/api/RestaurantTables/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ id, status }),
  })
}

export function deleteTable(id: string) {
  return request<ApiMessage>(`/api/RestaurantTables/${id}`, { method: 'DELETE' })
}

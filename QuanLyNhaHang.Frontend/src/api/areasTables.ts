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

export function getAreaList() {
  return request<Area[]>('/api/Areas')
}

export function getAreas(keyword = '', pageNumber = 1, pageSize = 12) {
  const params = new URLSearchParams({ pageNumber: String(pageNumber), pageSize: String(pageSize) })
  if (keyword.trim()) params.set('keyword', keyword.trim())
  return request<PaginatedAreas>(`/api/Areas/paginated?${params}`)
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

  const result = await request<Partial<PaginatedTables>>(`/api/RestaurantTables/paginated?${params}`)
  const items = Array.isArray(result?.items) ? result.items : []
  const totalPages = Number.isFinite(Number(result?.totalPages)) ? Math.max(1, Number(result?.totalPages)) : 1
  const totalCount = Number.isFinite(Number(result?.totalCount)) ? Math.max(0, Number(result?.totalCount)) : items.length
  const normalizedPageNumber = Number.isFinite(Number(result?.pageNumber)) ? Math.max(1, Number(result?.pageNumber)) : pageNumber

  return {
    items,
    pageNumber: normalizedPageNumber,
    totalPages,
    totalCount,
    hasPreviousPage: Boolean(result?.hasPreviousPage),
    hasNextPage: Boolean(result?.hasNextPage),
  } satisfies PaginatedTables
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

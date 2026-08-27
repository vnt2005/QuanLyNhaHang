const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7134'

export type MenuCategory = {
  id: string
  name: string
  description?: string | null
  displayOrder: number
  isActive: boolean
  createdAt: string
  updatedAt?: string | null
}

export type MenuCategoryForm = {
  id?: string
  name: string
  description: string
  displayOrder: number
}

export type MenuItem = {
  id: string
  menuCategoryId: string
  menuCategoryName: string
  name: string
  description?: string | null
  price: number
  imageUrl?: string | null
  isAvailable: boolean
  isActive: boolean
  createdAt: string
  updatedAt?: string | null
}

export type MenuItemForm = {
  id?: string
  menuCategoryId: string
  name: string
  description: string
  price: number
  imageUrl: string
}

export type PaginatedMenuCategories = {
  items: MenuCategory[]
  pageNumber: number
  totalPages: number
  totalCount: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export type PaginatedMenuItems = {
  items: MenuItem[]
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

function normalizePaginated<T>(response: unknown, pageNumber: number) {
  const payload = unwrapData(response)

  // Compatibility with the old backend contract that returned T[] directly.
  if (Array.isArray(payload)) {
    return {
      items: payload as T[],
      pageNumber,
      totalPages: 1,
      totalCount: payload.length,
      hasPreviousPage: false,
      hasNextPage: false,
    }
  }

  const result = asRecord(payload)
  const itemsValue = result.items ?? result.Items
  const items = Array.isArray(itemsValue) ? itemsValue as T[] : []

  return {
    items,
    pageNumber: finiteNumber(result.pageNumber ?? result.PageNumber, pageNumber, 1),
    totalPages: finiteNumber(result.totalPages ?? result.TotalPages, 1, 1),
    totalCount: finiteNumber(result.totalCount ?? result.TotalCount, items.length, 0),
    hasPreviousPage: Boolean(result.hasPreviousPage ?? result.HasPreviousPage),
    hasNextPage: Boolean(result.hasNextPage ?? result.HasNextPage),
  }
}

export async function getMenuCategoryList() {
  const response = await request<unknown>('/api/MenuCategories')
  const payload = unwrapData(response)
  return Array.isArray(payload) ? payload as MenuCategory[] : []
}

export async function getMenuCategories(
  keyword = '',
  isActive?: boolean,
  pageNumber = 1,
  pageSize = 12,
) {
  const params = new URLSearchParams({ pageNumber: String(pageNumber), pageSize: String(pageSize) })
  if (keyword.trim()) params.set('keyword', keyword.trim())
  if (typeof isActive === 'boolean') params.set('isActive', String(isActive))

  const response = await request<unknown>(`/api/MenuCategories/paginated?${params}`)
  return normalizePaginated<MenuCategory>(response, pageNumber) satisfies PaginatedMenuCategories
}

export function createMenuCategory(form: MenuCategoryForm) {
  return request<ApiMessage>('/api/MenuCategories', {
    method: 'POST',
    body: JSON.stringify({
      name: form.name.trim(),
      description: form.description.trim() || null,
      displayOrder: form.displayOrder,
    }),
  })
}

export function updateMenuCategory(form: MenuCategoryForm) {
  if (!form.id) throw new Error('Thiếu mã danh mục cần cập nhật.')
  return request<ApiMessage>(`/api/MenuCategories/${form.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      id: form.id,
      name: form.name.trim(),
      description: form.description.trim() || null,
      displayOrder: form.displayOrder,
    }),
  })
}

export function deleteMenuCategory(id: string) {
  return request<ApiMessage>(`/api/MenuCategories/${id}`, { method: 'DELETE' })
}

export function changeMenuCategoryStatus(id: string, isActive: boolean) {
  return request<ApiMessage>(`/api/MenuCategories/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ id, isActive }),
  })
}

export async function getMenuItems(
  keyword = '',
  menuCategoryId = '',
  isAvailable?: boolean,
  isActive?: boolean,
  pageNumber = 1,
  pageSize = 12,
) {
  const params = new URLSearchParams({ pageNumber: String(pageNumber), pageSize: String(pageSize) })
  if (keyword.trim()) params.set('keyword', keyword.trim())
  if (menuCategoryId) params.set('menuCategoryId', menuCategoryId)
  if (typeof isAvailable === 'boolean') params.set('isAvailable', String(isAvailable))
  if (typeof isActive === 'boolean') params.set('isActive', String(isActive))

  const response = await request<unknown>(`/api/MenuItems/paginated?${params}`)
  return normalizePaginated<MenuItem>(response, pageNumber) satisfies PaginatedMenuItems
}

export function createMenuItem(form: MenuItemForm) {
  return request<ApiMessage>('/api/MenuItems', {
    method: 'POST',
    body: JSON.stringify({
      menuCategoryId: form.menuCategoryId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: form.price,
      imageUrl: form.imageUrl.trim() || null,
    }),
  })
}

export function updateMenuItem(form: MenuItemForm) {
  if (!form.id) throw new Error('Thiếu mã món ăn cần cập nhật.')
  return request<ApiMessage>(`/api/MenuItems/${form.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      id: form.id,
      menuCategoryId: form.menuCategoryId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: form.price,
      imageUrl: form.imageUrl.trim() || null,
    }),
  })
}

export function changeMenuItemAvailability(id: string, isAvailable: boolean) {
  return request<ApiMessage>(`/api/MenuItems/${id}/availability`, {
    method: 'PATCH',
    body: JSON.stringify({ id, isAvailable }),
  })
}

export function deleteMenuItem(id: string) {
  return request<ApiMessage>(`/api/MenuItems/${id}`, { method: 'DELETE' })
}

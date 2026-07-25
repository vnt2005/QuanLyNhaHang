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

export function getMenuCategoryList() {
  return request<MenuCategory[]>('/api/MenuCategories')
}

export function getMenuCategories(
  keyword = '',
  isActive?: boolean,
  pageNumber = 1,
  pageSize = 12,
) {
  const params = new URLSearchParams({ pageNumber: String(pageNumber), pageSize: String(pageSize) })
  if (keyword.trim()) params.set('keyword', keyword.trim())
  if (typeof isActive === 'boolean') params.set('isActive', String(isActive))
  return request<PaginatedMenuCategories>(`/api/MenuCategories/paginated?${params}`)
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

export function getMenuItems(
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
  return request<PaginatedMenuItems>(`/api/MenuItems/paginated?${params}`)
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

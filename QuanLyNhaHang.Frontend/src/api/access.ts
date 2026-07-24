const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7134'

export type UserAccount = {
  id: string
  ho?: string | null
  ten: string
  email: string
  phoneNumber: string
  role: string
  isActive: boolean
  isEmailVerified: boolean
  createdAt: string
  updatedAt?: string | null
}

export type UserForm = {
  id: string
  ho: string
  ten: string
  email: string
  phoneNumber: string
  role: string
  isActive: boolean
}

export type Role = {
  id: string
  name: string
  displayName: string
  description?: string | null
  isActive: boolean
  createdAt: string
  updatedAt?: string | null
}

export type RoleForm = {
  id?: string
  name: string
  displayName: string
  description: string
  isActive: boolean
}

export type PermissionSelection = {
  permissionId: string
  permissionCode: string
  permissionName: string
  permissionGroupName: string
  isSelected: boolean
}

export type RolePermissionSelection = {
  roleId: string
  roleName: string
  roleDisplayName: string
  permissions: PermissionSelection[]
}

export type PaginatedUsers = {
  items: UserAccount[]
  pageNumber: number
  totalPages: number
  totalCount: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

type ApiMessage = { message?: string }
type ApiEnvelope<T> = { success?: boolean; message?: string; data?: T }

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

export function getUsers(keyword = '', pageNumber = 1, pageSize = 10) {
  const params = new URLSearchParams({ pageNumber: String(pageNumber), pageSize: String(pageSize) })
  if (keyword.trim()) params.set('keyword', keyword.trim())
  return request<PaginatedUsers>(`/api/Users/paginated?${params}`)
}

export function updateUser(form: UserForm) {
  return request<ApiMessage>(`/api/Users/${form.id}`, {
    method: 'PUT',
    body: JSON.stringify(form),
  })
}

export function getRoles(isActive?: boolean) {
  const query = typeof isActive === 'boolean' ? `?isActive=${isActive}` : ''
  return request<Role[]>(`/api/roles${query}`)
}

export function createRole(form: RoleForm) {
  return request<ApiEnvelope<Role>>('/api/roles', {
    method: 'POST',
    body: JSON.stringify({ name: form.name, displayName: form.displayName, description: form.description || null }),
  })
}

export function updateRole(form: RoleForm) {
  if (!form.id) throw new Error('Thiếu mã vai trò cần cập nhật.')
  return request<ApiEnvelope<Role>>(`/api/roles/${form.id}`, {
    method: 'PUT',
    body: JSON.stringify({ displayName: form.displayName, description: form.description || null, isActive: form.isActive }),
  })
}

export function deactivateRole(id: string) {
  return request<ApiEnvelope<never>>(`/api/roles/${id}`, { method: 'DELETE' })
}

export function syncSystemRoles() {
  return request<ApiEnvelope<unknown>>('/api/roles/sync-system', { method: 'POST' })
}

export function getRolePermissionSelection(roleId: string) {
  return request<RolePermissionSelection>(`/api/role-permissions/roles/${roleId}/selection`)
}

export function updateRolePermissions(roleId: string, permissionIds: string[]) {
  return request<ApiEnvelope<unknown>>(`/api/role-permissions/roles/${roleId}`, {
    method: 'PUT',
    body: JSON.stringify({ roleId, permissionIds, confirmRemoveAll: permissionIds.length === 0 }),
  })
}

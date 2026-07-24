const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7134'

export type Employee = {
  id: string
  userId?: string | null
  role?: string | null
  accountIsActive?: boolean | null
  employeeCode: string
  ho?: string | null
  ten: string
  email?: string | null
  phoneNumber: string
  dateOfBirth?: string | null
  address?: string | null
  position: string
  baseSalary: number
  hireDate: string
  isActive: boolean
}

export type EmployeeForm = {
  id?: string
  employeeCode: string
  ho: string
  ten: string
  email: string
  phoneNumber: string
  password: string
  role: string
  dateOfBirth: string
  address: string
  position: string
  baseSalary: number
  hireDate: string
  isActive: boolean
}

export type PaginatedEmployees = {
  items: Employee[]
  pageNumber: number
  totalPages: number
  totalCount: number
  hasPreviousPage: boolean
  hasNextPage: boolean
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
  if (!response.ok) {
    throw new Error(body?.message ?? body?.title ?? 'Yêu cầu không thành công.')
  }
  return body as T
}

export function getEmployees(keyword = '', pageNumber = 1, pageSize = 10) {
  const params = new URLSearchParams({ pageNumber: String(pageNumber), pageSize: String(pageSize) })
  if (keyword.trim()) params.set('keyword', keyword.trim())
  return request<PaginatedEmployees>(`/api/Employees/paginated?${params}`)
}

export function createEmployee(form: EmployeeForm) {
  const { id: _id, isActive: _isActive, ...payload } = form
  return request<{ id: string; message: string }>('/api/Employees', {
    method: 'POST',
    body: JSON.stringify({ ...payload, dateOfBirth: payload.dateOfBirth || null }),
  })
}

export function updateEmployee(form: EmployeeForm) {
  if (!form.id) throw new Error('Thiếu mã nhân viên cần cập nhật.')
  return request<{ message: string }>(`/api/Employees/${form.id}`, {
    method: 'PUT',
    body: JSON.stringify({ ...form, password: form.password || null, dateOfBirth: form.dateOfBirth || null }),
  })
}

export function deactivateEmployee(id: string) {
  return request<{ message: string }>(`/api/Employees/${id}`, { method: 'DELETE' })
}

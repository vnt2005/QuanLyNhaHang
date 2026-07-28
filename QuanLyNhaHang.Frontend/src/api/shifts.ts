const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7134'

export type Shift = {
  id: string
  shiftCode: string
  shiftName: string
  startTime: string
  endTime: string
  description?: string | null
  isActive: boolean
  createdAt: string
  updatedAt?: string | null
}

export type ShiftForm = {
  id?: string
  shiftCode: string
  shiftName: string
  startTime: string
  endTime: string
  description: string
  isActive: boolean
}

export type EmployeeShift = {
  id: string
  employeeId: string
  employeeCode: string
  employeeHo?: string | null
  employeeTen: string
  shiftId: string
  shiftCode: string
  shiftName: string
  startTime: string
  endTime: string
  workDate: string
  note?: string | null
  isActive: boolean
  createdAt: string
  updatedAt?: string | null
}

export type EmployeeShiftForm = {
  id?: string
  employeeId: string
  shiftId: string
  workDate: string
  note: string
  isActive: boolean
}

type Paginated<T> = {
  items: T[]
  pageNumber: number
  totalPages: number
  totalCount: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

type ApiMessage = { id?: string; message?: string }

function errorMessage(body: unknown, status: number) {
  if (body && typeof body === 'object') {
    const value = body as { message?: string; title?: string; errors?: Record<string, string[]> }
    if (value.message) return value.message
    if (value.errors) return Object.values(value.errors).flat().find(Boolean) ?? 'Dữ liệu không hợp lệ.'
    if (value.title) return value.title
  }
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (status === 403) return 'Tài khoản không có quyền quản lý ca làm việc.'
  return 'Yêu cầu ca làm việc không thành công.'
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
  if (!response.ok) throw new Error(errorMessage(body, response.status))
  return body as T
}

function normalizeTime(value: unknown) {
  if (typeof value !== 'string') return '00:00'
  return value.slice(0, 5)
}

function timePayload(value: string) {
  return value.length === 5 ? `${value}:00` : value
}

function normalizePage<T>(result: Partial<Paginated<T>> | null | undefined): Paginated<T> {
  const items = Array.isArray(result?.items) ? result.items : []
  const pageNumber = Math.max(1, Number(result?.pageNumber) || 1)
  const totalPages = Math.max(1, Number(result?.totalPages) || 1)
  const totalCount = Math.max(0, Number(result?.totalCount) || items.length)
  return {
    items,
    pageNumber,
    totalPages,
    totalCount,
    hasPreviousPage: Boolean(result?.hasPreviousPage),
    hasNextPage: Boolean(result?.hasNextPage),
  }
}

function normalizeShift(value: Shift): Shift {
  return {
    ...value,
    shiftCode: value?.shiftCode ?? '',
    shiftName: value?.shiftName ?? '',
    startTime: normalizeTime(value?.startTime),
    endTime: normalizeTime(value?.endTime),
    isActive: Boolean(value?.isActive),
  }
}

function normalizeEmployeeShift(value: EmployeeShift): EmployeeShift {
  return {
    ...value,
    employeeCode: value?.employeeCode ?? '',
    employeeTen: value?.employeeTen ?? '',
    shiftCode: value?.shiftCode ?? '',
    shiftName: value?.shiftName ?? '',
    startTime: normalizeTime(value?.startTime),
    endTime: normalizeTime(value?.endTime),
    isActive: Boolean(value?.isActive),
  }
}

export async function getShiftList() {
  const result = await request<Shift[]>('/api/Shifts')
  return Array.isArray(result) ? result.map(normalizeShift) : []
}

export async function getShifts(keyword = '', pageNumber = 1, pageSize = 10) {
  const params = new URLSearchParams({ pageNumber: String(pageNumber), pageSize: String(pageSize) })
  if (keyword.trim()) params.set('keyword', keyword.trim())
  const result = normalizePage(await request<Paginated<Shift>>(`/api/Shifts/paginated?${params}`))
  return { ...result, items: result.items.map(normalizeShift) }
}

export function createShift(form: ShiftForm) {
  return request<ApiMessage>('/api/Shifts', {
    method: 'POST',
    body: JSON.stringify({
      shiftCode: form.shiftCode.trim().toUpperCase(),
      shiftName: form.shiftName.trim(),
      startTime: timePayload(form.startTime),
      endTime: timePayload(form.endTime),
      description: form.description.trim() || null,
    }),
  })
}

export function updateShift(form: ShiftForm) {
  if (!form.id) throw new Error('Thiếu mã ca làm việc cần cập nhật.')
  return request<ApiMessage>(`/api/Shifts/${form.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      id: form.id,
      shiftCode: form.shiftCode.trim().toUpperCase(),
      shiftName: form.shiftName.trim(),
      startTime: timePayload(form.startTime),
      endTime: timePayload(form.endTime),
      description: form.description.trim() || null,
      isActive: form.isActive,
    }),
  })
}

export function deleteShift(id: string) {
  return request<ApiMessage>(`/api/Shifts/${id}`, { method: 'DELETE' })
}

export async function getEmployeeShifts(
  keyword = '',
  workDate = '',
  employeeId = '',
  shiftId = '',
  pageNumber = 1,
  pageSize = 10,
) {
  const params = new URLSearchParams({ pageNumber: String(pageNumber), pageSize: String(pageSize) })
  if (keyword.trim()) params.set('keyword', keyword.trim())
  if (workDate) params.set('workDate', workDate)
  if (employeeId) params.set('employeeId', employeeId)
  if (shiftId) params.set('shiftId', shiftId)
  const result = normalizePage(await request<Paginated<EmployeeShift>>(`/api/EmployeeShifts/paginated?${params}`))
  return { ...result, items: result.items.map(normalizeEmployeeShift) }
}

export function createEmployeeShift(form: EmployeeShiftForm) {
  return request<ApiMessage>('/api/EmployeeShifts', {
    method: 'POST',
    body: JSON.stringify({
      employeeId: form.employeeId,
      shiftId: form.shiftId,
      workDate: form.workDate,
      note: form.note.trim() || null,
    }),
  })
}

export function updateEmployeeShift(form: EmployeeShiftForm) {
  if (!form.id) throw new Error('Thiếu mã phân công ca cần cập nhật.')
  return request<ApiMessage>(`/api/EmployeeShifts/${form.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      id: form.id,
      employeeId: form.employeeId,
      shiftId: form.shiftId,
      workDate: form.workDate,
      note: form.note.trim() || null,
      isActive: form.isActive,
    }),
  })
}

export function deleteEmployeeShift(id: string) {
  return request<ApiMessage>(`/api/EmployeeShifts/${id}`, { method: 'DELETE' })
}

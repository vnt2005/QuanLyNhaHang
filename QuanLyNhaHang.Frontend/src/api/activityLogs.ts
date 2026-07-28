const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7134'

export type ActivityLogStatus = 'Success' | 'Failed'

export type ActivityLog = {
  id: string
  userId?: string | null
  userName?: string | null
  action: string
  moduleName: string
  entityName?: string | null
  entityId?: string | null
  description: string
  oldValues?: string | null
  newValues?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  status: ActivityLogStatus | string
  createdAt: string
}

export type ActivityLogSummary = {
  totalLogs: number
  totalSuccessLogs: number
  totalFailedLogs: number
  totalTodayLogs: number
  totalTodaySuccessLogs: number
  totalTodayFailedLogs: number
}

export type PaginatedActivityLogs = {
  items: ActivityLog[]
  pageNumber: number
  totalPages: number
  totalCount: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export type ActivityLogFilters = {
  keyword?: string
  userId?: string
  action?: string
  moduleName?: string
  entityName?: string
  entityId?: string
  status?: string
  fromDate?: string
  toDate?: string
}

type ApiMessage = {
  success?: boolean
  message?: string
}

function getErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const value = body as {
      message?: string
      title?: string
      errors?: Record<string, string[]>
    }
    if (value.message) return value.message
    if (value.errors) {
      return Object.values(value.errors).flat().find(Boolean) ?? 'Dữ liệu không hợp lệ.'
    }
    if (value.title) return value.title
  }
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (status === 403) return 'Tài khoản của bạn không có quyền xem hoặc thay đổi nhật ký hoạt động.'
  return 'Yêu cầu nhật ký hoạt động không thành công.'
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

function appendFilters(params: URLSearchParams, filters: ActivityLogFilters) {
  const entries: Array<[keyof ActivityLogFilters, string]> = [
    ['keyword', filters.keyword ?? ''],
    ['userId', filters.userId ?? ''],
    ['action', filters.action ?? ''],
    ['moduleName', filters.moduleName ?? ''],
    ['entityName', filters.entityName ?? ''],
    ['entityId', filters.entityId ?? ''],
    ['status', filters.status ?? ''],
    ['fromDate', filters.fromDate ?? ''],
    ['toDate', filters.toDate ?? ''],
  ]

  entries.forEach(([key, value]) => {
    if (value.trim()) params.set(key, value.trim())
  })
}

export function getActivityLogsPaginated(
  filters: ActivityLogFilters,
  pageNumber = 1,
  pageSize = 15,
) {
  const params = new URLSearchParams({
    pageNumber: String(pageNumber),
    pageSize: String(pageSize),
  })
  appendFilters(params, filters)
  return request<PaginatedActivityLogs>(`/api/activity-logs/paginated?${params}`)
}

export function getActivityLogSummary(filters: ActivityLogFilters) {
  const params = new URLSearchParams()
  if (filters.userId?.trim()) params.set('userId', filters.userId.trim())
  if (filters.moduleName?.trim()) params.set('moduleName', filters.moduleName.trim())
  if (filters.fromDate?.trim()) params.set('fromDate', filters.fromDate.trim())
  if (filters.toDate?.trim()) params.set('toDate', filters.toDate.trim())
  const query = params.size ? `?${params}` : ''
  return request<ActivityLogSummary>(`/api/activity-logs/summary${query}`)
}

export function getActivityLog(id: string) {
  return request<ActivityLog>(`/api/activity-logs/${id}`)
}

export function deleteActivityLog(id: string) {
  return request<ApiMessage>(`/api/activity-logs/${id}`, { method: 'DELETE' })
}

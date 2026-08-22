const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7134'
).replace(/\/+$/, '')

export const NOTIFICATIONS_HUB_URL =
  `${API_BASE_URL}/hubs/admin-notifications`

export const ADMIN_NOTIFICATION_EVENT = 'vnt:admin-notification'

export type AdminNotification = {
  id: string
  userId: string
  type: string
  title: string
  message: string
  severity: string
  target?: string | null
  entityId?: string | null
  isRead: boolean
  readAt?: string | null
  createdAt: string
}

export type NotificationFeed = {
  items: AdminNotification[]
  unreadCount: number
}

type ApiProblem = {
  message?: string
  detail?: string
  title?: string
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? value as Record<string, unknown>
    : {}
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function nullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function errorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const problem = body as ApiProblem
    if (problem.message) return problem.message
    if (problem.detail) return problem.detail
    if (problem.title) return problem.title
  }
  if (status === 401) {
    return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  }
  if (status === 403) {
    return 'Tài khoản không có quyền xem thông báo quản trị.'
  }
  return 'Không thể đồng bộ thông báo. Vui lòng thử lại.'
}

async function request(path: string, init?: RequestInit): Promise<unknown> {
  const token = sessionStorage.getItem('accessToken')
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(errorMessage(body, response.status))
  return body
}

export function normalizeNotification(
  value: unknown,
): AdminNotification | null {
  const source = objectValue(value)
  const id = stringValue(source.id)
  const title = stringValue(source.title)
  const message = stringValue(source.message)
  const createdAt = stringValue(source.createdAt)

  if (!id || !title || !message || !createdAt) return null

  return {
    id,
    userId: stringValue(source.userId),
    type: stringValue(source.type),
    title,
    message,
    severity: stringValue(source.severity) || 'info',
    target: nullableString(source.target),
    entityId: nullableString(source.entityId),
    isRead: source.isRead === true,
    readAt: nullableString(source.readAt),
    createdAt,
  }
}

export async function getNotificationFeed(options?: {
  limit?: number
  unreadOnly?: boolean
  signal?: AbortSignal
}): Promise<NotificationFeed> {
  const params = new URLSearchParams({
    limit: String(options?.limit ?? 20),
    unreadOnly: String(options?.unreadOnly ?? false),
  })
  const body = objectValue(await request(
    `/api/notifications?${params}`,
    { signal: options?.signal },
  ))
  const items = Array.isArray(body.items)
    ? body.items
        .map(normalizeNotification)
        .filter((item): item is AdminNotification => item !== null)
    : []
  const unreadCount = Number(body.unreadCount)

  return {
    items,
    unreadCount: Number.isFinite(unreadCount)
      ? Math.max(0, unreadCount)
      : 0,
  }
}

export async function markNotificationRead(
  id: string,
): Promise<AdminNotification | null> {
  const body = objectValue(await request(
    `/api/notifications/${encodeURIComponent(id)}/read`,
    { method: 'PATCH' },
  ))
  return normalizeNotification(body.data)
}

export async function markAllNotificationsRead(): Promise<number> {
  const body = objectValue(await request(
    '/api/notifications/read-all',
    { method: 'PATCH' },
  ))
  const updatedCount = Number(body.updatedCount)
  return Number.isFinite(updatedCount) ? Math.max(0, updatedCount) : 0
}

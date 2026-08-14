import { apiRequest } from './client'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7134').replace(/\/+$/, '')
const HUB_PATH = '/hubs/admin-notifications'
const RECORD_SEPARATOR = '\u001e'

export type CustomerNotification = {
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
  items: CustomerNotification[]
  unreadCount: number
}

type FeedResponse = NotificationFeed

type Envelope<T> = { data?: T; updatedCount?: number }

type SignalRInvocation = {
  type?: number
  target?: string
  arguments?: unknown[]
}

function normalizeNotification(value: unknown): CustomerNotification | null {
  if (!value || typeof value !== 'object') return null
  const source = value as Record<string, unknown>
  const id = typeof source.id === 'string' ? source.id : ''
  const title = typeof source.title === 'string' ? source.title : ''
  const message = typeof source.message === 'string' ? source.message : ''
  const createdAt = typeof source.createdAt === 'string' ? source.createdAt : ''
  if (!id || !title || !message || !createdAt) return null

  return {
    id,
    userId: typeof source.userId === 'string' ? source.userId : '',
    type: typeof source.type === 'string' ? source.type : '',
    title,
    message,
    severity: typeof source.severity === 'string' ? source.severity : 'info',
    target: typeof source.target === 'string' ? source.target : null,
    entityId: typeof source.entityId === 'string' ? source.entityId : null,
    isRead: source.isRead === true,
    readAt: typeof source.readAt === 'string' ? source.readAt : null,
    createdAt,
  }
}

export async function getCustomerNotificationFeed(
  accessToken: string,
  unreadOnly = false,
): Promise<NotificationFeed> {
  const result = await apiRequest<FeedResponse>(
    `/api/notifications?limit=20&unreadOnly=${unreadOnly}`,
    undefined,
    accessToken,
  )
  return {
    items: Array.isArray(result.items)
      ? result.items.map(normalizeNotification).filter((item): item is CustomerNotification => item !== null)
      : [],
    unreadCount: Number.isFinite(Number(result.unreadCount)) ? Math.max(0, Number(result.unreadCount)) : 0,
  }
}

export async function markCustomerNotificationRead(
  id: string,
  accessToken: string,
) {
  const result = await apiRequest<Envelope<CustomerNotification>>(
    `/api/notifications/${encodeURIComponent(id)}/read`,
    { method: 'PATCH' },
    accessToken,
  )
  return normalizeNotification(result.data)
}

export async function markAllCustomerNotificationsRead(accessToken: string) {
  const result = await apiRequest<Envelope<never>>(
    '/api/notifications/read-all',
    { method: 'PATCH' },
    accessToken,
  )
  return Number.isFinite(Number(result.updatedCount)) ? Math.max(0, Number(result.updatedCount)) : 0
}

function hubUrl(path: string) {
  const base = new URL(API_BASE_URL)
  base.pathname = path
  return base
}

export async function connectCustomerNotificationStream(
  accessToken: string,
  onNotification: (notification: CustomerNotification) => void,
  onStateChange: (state: 'connected' | 'reconnecting' | 'offline') => void,
) {
  let disposed = false
  let socket: WebSocket | null = null
  let retryTimer: number | undefined
  let retryDelay = 1_000

  async function start() {
    if (disposed) return
    onStateChange(retryDelay === 1_000 ? 'offline' : 'reconnecting')

    try {
      const negotiate = await fetch(`${API_BASE_URL}${HUB_PATH}/negotiate?negotiateVersion=1`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      if (!negotiate.ok) throw new Error('Không thể thương lượng kết nối realtime.')
      const payload = await negotiate.json() as { connectionToken?: string }
      if (!payload.connectionToken) throw new Error('Máy chủ không trả về mã kết nối realtime.')

      const url = hubUrl(HUB_PATH)
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
      url.searchParams.set('id', payload.connectionToken)
      url.searchParams.set('access_token', accessToken)

      socket = new WebSocket(url.toString())

      socket.onopen = () => {
        retryDelay = 1_000
        socket?.send(JSON.stringify({ protocol: 'json', version: 1 }) + RECORD_SEPARATOR)
      }

      socket.onmessage = event => {
        const frames = String(event.data).split(RECORD_SEPARATOR).filter(Boolean)
        for (const frame of frames) {
          let message: SignalRInvocation
          try {
            message = JSON.parse(frame) as SignalRInvocation
          } catch {
            continue
          }

          if (message.type === undefined) {
            onStateChange('connected')
            continue
          }

          if (message.type === 6) continue
          if (message.type !== 1 || message.target !== 'NotificationReceived') continue
          const notification = normalizeNotification(message.arguments?.[0])
          if (notification) onNotification(notification)
        }
      }

      socket.onerror = () => socket?.close()
      socket.onclose = () => {
        if (disposed) return
        onStateChange('reconnecting')
        window.clearTimeout(retryTimer)
        retryTimer = window.setTimeout(() => void start(), retryDelay)
        retryDelay = Math.min(retryDelay * 2, 30_000)
      }
    } catch {
      if (disposed) return
      onStateChange('offline')
      window.clearTimeout(retryTimer)
      retryTimer = window.setTimeout(() => void start(), retryDelay)
      retryDelay = Math.min(retryDelay * 2, 30_000)
    }
  }

  void start()

  return () => {
    disposed = true
    window.clearTimeout(retryTimer)
    socket?.close()
  }
}

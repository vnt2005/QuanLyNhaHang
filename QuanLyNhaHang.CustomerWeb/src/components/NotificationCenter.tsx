import { Bell, CheckCheck, X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import type { CustomerSession } from '../api/customerAuth'
import { ApiError } from '../api/client'
import {
  connectCustomerNotificationStream,
  getCustomerNotificationFeed,
  markAllCustomerNotificationsRead,
  markCustomerNotificationRead,
  type CustomerNotification,
} from '../api/notifications'
import { navigate } from '../navigation'
import './NotificationCenter.css'

type RealtimeState = 'connected' | 'reconnecting' | 'offline'

const MAX_VISIBLE_NOTIFICATIONS = 20

function relativeTime(value: string) {
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return ''

  const elapsedSeconds = Math.max(
    0,
    Math.floor((Date.now() - timestamp) / 1000),
  )

  if (elapsedSeconds < 60) return 'Vừa xong'
  if (elapsedSeconds < 3600) {
    return `${Math.floor(elapsedSeconds / 60)} phút trước`
  }
  if (elapsedSeconds < 86_400) {
    return `${Math.floor(elapsedSeconds / 3600)} giờ trước`
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

function statusLabel(type: string) {
  if (type.endsWith('.Cooking')) return 'Đang nấu'
  if (type.endsWith('.Served')) return 'Đã phục vụ'
  if (type.endsWith('.Completed')) return 'Hoàn tất'
  if (type.endsWith('.Cancelled')) return 'Đã hủy'
  if (type.startsWith('Order.')) return 'Đơn hàng'
  if (type.startsWith('Reservation.')) return 'Đặt bàn'
  return 'Cập nhật'
}

export default function NotificationCenter({
  session,
  onSessionRefresh,
}: {
  session: CustomerSession
  onSessionRefresh: () => Promise<CustomerSession | null>
}) {
  const [items, setItems] = useState<CustomerNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [markingAll, setMarkingAll] = useState(false)
  const [realtimeState, setRealtimeState] =
    useState<RealtimeState>('offline')
  const [toast, setToast] = useState<CustomerNotification | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const knownIdsRef = useRef(new Set<string>())
  const refreshRequestRef = useRef<Promise<CustomerSession | null> | null>(null)

  const refreshSession = useCallback(() => {
    if (!refreshRequestRef.current) {
      const request = onSessionRefresh().finally(() => {
        if (refreshRequestRef.current === request) {
          refreshRequestRef.current = null
        }
      })
      refreshRequestRef.current = request
    }

    return refreshRequestRef.current
  }, [onSessionRefresh])

  const requestWithRefresh = useCallback(async <T,>(
    request: (accessToken: string) => Promise<T>,
  ) => {
    try {
      return await request(session.token)
    } catch (exception) {
      if (!(exception instanceof ApiError) || exception.status !== 401) {
        throw exception
      }

      const refreshedSession = await refreshSession()
      if (!refreshedSession) throw exception
      return request(refreshedSession.token)
    }
  }, [refreshSession, session.token])

  const applyFeed = useCallback((feed: {
    items: CustomerNotification[]
    unreadCount: number
  }) => {
    knownIdsRef.current = new Set(feed.items.map(item => item.id))
    setItems(feed.items)
    setUnreadCount(feed.unreadCount)
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    void requestWithRefresh(getCustomerNotificationFeed)
      .then(feed => {
        if (active) applyFeed(feed)
      })
      .catch(exception => {
        if (!active) return
        setError(exception instanceof Error
          ? exception.message
          : 'Không thể tải thông báo.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [applyFeed, requestWithRefresh])

  useEffect(() => {
    let disconnect: (() => void) | undefined
    let active = true

    void connectCustomerNotificationStream(
      session.token,
      notification => {
        if (!active || notification.userId !== session.userId) return

        const isNew = !knownIdsRef.current.has(notification.id)
        knownIdsRef.current.add(notification.id)

        setItems(current => [
          notification,
          ...current.filter(item => item.id !== notification.id),
        ].slice(0, MAX_VISIBLE_NOTIFICATIONS))

        if (isNew && !notification.isRead) {
          setUnreadCount(current => current + 1)
          setToast(notification)
        }
      },
      state => {
        if (active) setRealtimeState(state)
      },
      async () => (await refreshSession())?.token ?? null,
    ).then(cleanup => {
      if (!active) cleanup()
      else disconnect = cleanup
    })

    return () => {
      active = false
      disconnect?.()
    }
  }, [refreshSession, session.token, session.userId])

  useEffect(() => {
    if (!open) return

    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsideClick)
    document.addEventListener('keydown', closeOnEscape)

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsideClick)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 5_000)
    return () => window.clearTimeout(timer)
  }, [toast])

  const openNotification = useCallback(async (
    notification: CustomerNotification,
  ) => {
    if (!notification.isRead) {
      try {
        const updated = await requestWithRefresh(
          accessToken => markCustomerNotificationRead(
            notification.id,
            accessToken,
          ),
        )
        setItems(current => current.map(item =>
          item.id === notification.id
            ? (updated ?? { ...item, isRead: true })
            : item,
        ))
        setUnreadCount(current => Math.max(0, current - 1))
      } catch (exception) {
        setError(exception instanceof Error
          ? exception.message
          : 'Không thể đánh dấu thông báo đã đọc.')
      }
    }

    setOpen(false)
    setToast(current => current?.id === notification.id ? null : current)
    if (notification.target) navigate(notification.target)
  }, [requestWithRefresh])

  async function markAllRead() {
    if (!unreadCount || markingAll) return

    setMarkingAll(true)
    setError('')
    try {
      await requestWithRefresh(markAllCustomerNotificationsRead)
      setUnreadCount(0)
      setItems(current => current.map(item => ({ ...item, isRead: true })))
    } catch (exception) {
      setError(exception instanceof Error
        ? exception.message
        : 'Không thể đánh dấu tất cả đã đọc.')
    } finally {
      setMarkingAll(false)
    }
  }

  const badge = unreadCount > 99 ? '99+' : String(unreadCount)

  return (
    <div className="customer-notification-center" ref={rootRef}>
      <button
        className={`customer-notification-trigger${open ? ' active' : ''}`}
        type="button"
        aria-label={unreadCount
          ? `Thông báo, ${unreadCount} chưa đọc`
          : 'Thông báo'}
        aria-expanded={open}
        aria-controls="customer-notification-panel"
        onClick={() => setOpen(current => !current)}
      >
        <Bell aria-hidden="true" />
        {unreadCount > 0
          ? <span className="customer-notification-badge">{badge}</span>
          : null}
      </button>

      {open ? (
        <section
          className="customer-notification-panel"
          id="customer-notification-panel"
          aria-label="Thông báo của bạn"
        >
          <header className="customer-notification-header">
            <div>
              <h2>Thông báo</h2>
              <p>{unreadCount
                ? `${unreadCount} thông báo chưa đọc`
                : 'Bạn đã xem tất cả thông báo'}</p>
            </div>
            <button
              type="button"
              className="customer-notification-read-all"
              onClick={() => void markAllRead()}
              disabled={!unreadCount || markingAll}
            >
              <CheckCheck aria-hidden="true" />
              <span>{markingAll ? 'Đang xử lý…' : 'Đọc tất cả'}</span>
            </button>
          </header>

          {error ? (
            <div className="customer-notification-error" role="alert">
              {error}
            </div>
          ) : null}

          <div className="customer-notification-list">
            {loading ? (
              <div className="customer-notification-empty" role="status">
                Đang tải thông báo…
              </div>
            ) : items.length ? (
              items.map(notification => (
                <button
                  type="button"
                  className={`customer-notification-item${
                    notification.isRead ? '' : ' unread'
                  }`}
                  key={notification.id}
                  onClick={() => void openNotification(notification)}
                >
                  <span className={`customer-notification-dot ${notification.severity}`} />
                  <span className="customer-notification-copy">
                    <span className="customer-notification-meta">
                      <strong>{statusLabel(notification.type)}</strong>
                      <time>{relativeTime(notification.createdAt)}</time>
                    </span>
                    <b>{notification.title}</b>
                    <span>{notification.message}</span>
                  </span>
                  {!notification.isRead
                    ? <i aria-label="Chưa đọc" />
                    : null}
                </button>
              ))
            ) : (
              <div className="customer-notification-empty">
                <Bell aria-hidden="true" />
                <strong>Chưa có thông báo nào</strong>
                <span>Cập nhật về đơn hàng của bạn sẽ xuất hiện tại đây.</span>
              </div>
            )}
          </div>

          <footer className={`customer-notification-realtime ${realtimeState}`}>
            <i />
            {realtimeState === 'connected'
              ? 'Đang nhận cập nhật theo thời gian thực'
              : realtimeState === 'reconnecting'
                ? 'Đang kết nối lại…'
                : 'Realtime tạm gián đoạn'}
          </footer>
        </section>
      ) : null}

      {toast ? (
        <aside className="customer-notification-toast" role="status">
          <button
            type="button"
            className="customer-notification-toast-main"
            onClick={() => void openNotification(toast)}
          >
            <Bell aria-hidden="true" />
            <span>
              <small>THÔNG BÁO MỚI</small>
              <strong>{toast.title}</strong>
              <span>{toast.message}</span>
            </span>
          </button>
          <button
            type="button"
            className="customer-notification-toast-close"
            aria-label="Đóng thông báo"
            onClick={() => setToast(null)}
          >
            <X aria-hidden="true" />
          </button>
        </aside>
      ) : null}
    </div>
  )
}

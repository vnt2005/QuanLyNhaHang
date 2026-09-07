import {
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useVisiblePolling } from '../hooks/useVisiblePolling'
import {
  ADMIN_NOTIFICATION_EVENT,
  getNotificationFeed,
  markAllNotificationsRead,
  markNotificationRead,
  normalizeNotification,
  NOTIFICATIONS_HUB_URL,
  type AdminNotification,
} from '../services/notifications'

type NotificationCenterProps = {
  onNavigate: (target: string) => void
}

type RealtimeState = 'connected' | 'reconnecting' | 'offline'

type NotificationFeed = {
  items: AdminNotification[]
  unreadCount: number
}

const MAX_VISIBLE_NOTIFICATIONS = 20

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function notificationSymbol(type: string) {
  if (type.startsWith('Order.')) return '▣'
  if (type.startsWith('Reservation.')) return '◫'
  return '•'
}

function relativeTime(value: string) {
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return ''

  const elapsedSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
  if (elapsedSeconds < 60) return 'Vừa xong'
  if (elapsedSeconds < 3600) return `${Math.floor(elapsedSeconds / 60)} phút trước`
  if (elapsedSeconds < 86_400) return `${Math.floor(elapsedSeconds / 3600)} giờ trước`

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

export default function NotificationCenter({
  onNavigate,
}: NotificationCenterProps) {
  const [items, setItems] = useState<AdminNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [markingAll, setMarkingAll] = useState(false)
  const [realtimeState, setRealtimeState] =
    useState<RealtimeState>('offline')
  const [toast, setToast] = useState<AdminNotification | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const knownIdsRef = useRef(new Set<string>())
  const unreadOnlyRef = useRef(unreadOnly)
  const feedCacheRef = useRef<{
    all: AdminNotification[] | null
    unread: AdminNotification[] | null
  }>({ all: null, unread: null })

  useEffect(() => {
    unreadOnlyRef.current = unreadOnly
  }, [unreadOnly])

  const applyFeed = useCallback((
    feed: NotificationFeed,
    mode = unreadOnlyRef.current,
  ) => {
    feed.items.forEach(item => knownIdsRef.current.add(item.id))
    if (mode) {
      feedCacheRef.current.unread = feed.items
    } else {
      feedCacheRef.current.all = feed.items
    }
    setItems(feed.items)
    setUnreadCount(feed.unreadCount)
  }, [])

  const reconcile = useCallback(async () => {
    const mode = unreadOnlyRef.current
    try {
      const feed = await getNotificationFeed({
        limit: MAX_VISIBLE_NOTIFICATIONS,
        unreadOnly: mode,
      })
      applyFeed(feed, mode)
    } catch {
      // SignalR keeps delivering when available; retry on the next visible tick.
    }
  }, [applyFeed])

  useEffect(() => {
    const controller = new AbortController()
    const cached = unreadOnly
      ? feedCacheRef.current.unread
      : feedCacheRef.current.all
    const derivedUnread = unreadOnly && cached === null
      ? feedCacheRef.current.all?.filter(item => !item.isRead) ?? null
      : null
    const immediateItems = cached ?? derivedUnread

    setError('')
    if (immediateItems !== null) {
      setItems(immediateItems)
      setLoading(false)
    } else {
      setLoading(true)
    }

    getNotificationFeed({
      limit: MAX_VISIBLE_NOTIFICATIONS,
      unreadOnly,
      signal: controller.signal,
    })
      .then(feed => applyFeed(feed, unreadOnly))
      .catch(exception => {
        if (exception instanceof DOMException && exception.name === 'AbortError') {
          return
        }
        setError(exception instanceof Error
          ? exception.message
          : 'Không thể tải thông báo.')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [applyFeed, unreadOnly])

  useEffect(() => {
    let disposed = false
    let startRetry: number | undefined
    let retryDelay = 1_000

    const connection = new HubConnectionBuilder()
      .withUrl(NOTIFICATIONS_HUB_URL, {
        accessTokenFactory: () =>
          sessionStorage.getItem('accessToken') ?? '',
      })
      .withAutomaticReconnect([0, 2_000, 10_000, 30_000])
      // Connection shutdown during navigation/StrictMode is expected and is
      // represented by realtimeState instead of surfacing a console error.
      .configureLogging(LogLevel.None)
      .build()

    const refreshFeed = async () => {
      const mode = unreadOnlyRef.current
      try {
        const feed = await getNotificationFeed({
          limit: MAX_VISIBLE_NOTIFICATIONS,
          unreadOnly: mode,
        })
        if (!disposed) applyFeed(feed, mode)
      } catch {
        // The next successful API load reconciles persisted notifications.
      }
    }

    const start = async () => {
      if (disposed || connection.state !== HubConnectionState.Disconnected) {
        return
      }

      try {
        await connection.start()
        if (disposed) {
          await connection.stop()
          return
        }
        retryDelay = 1_000
        setRealtimeState('connected')
        await refreshFeed()
      } catch {
        if (disposed) return
        setRealtimeState('offline')
        window.clearTimeout(startRetry)
        startRetry = window.setTimeout(() => void start(), retryDelay)
        retryDelay = Math.min(retryDelay * 2, 30_000)
      }
    }

    connection.on('NotificationReceived', (payload: unknown) => {
      const notification = normalizeNotification(payload)
      if (!notification || disposed) return

      const isNew = !knownIdsRef.current.has(notification.id)
      knownIdsRef.current.add(notification.id)

      if (feedCacheRef.current.all !== null) {
        feedCacheRef.current.all = [
          notification,
          ...feedCacheRef.current.all.filter(item => item.id !== notification.id),
        ].slice(0, MAX_VISIBLE_NOTIFICATIONS)
      }
      if (feedCacheRef.current.unread !== null) {
        feedCacheRef.current.unread = notification.isRead
          ? feedCacheRef.current.unread.filter(item => item.id !== notification.id)
          : [
              notification,
              ...feedCacheRef.current.unread.filter(item => item.id !== notification.id),
            ].slice(0, MAX_VISIBLE_NOTIFICATIONS)
      }

      setItems(current => {
        if (unreadOnlyRef.current && notification.isRead) {
          return current.filter(item => item.id !== notification.id)
        }
        return [
          notification,
          ...current.filter(item => item.id !== notification.id),
        ].slice(0, MAX_VISIBLE_NOTIFICATIONS)
      })

      if (isNew && !notification.isRead) {
        setUnreadCount(current => current + 1)
        setToast(notification)
      }

      window.dispatchEvent(new CustomEvent(
        ADMIN_NOTIFICATION_EVENT,
        { detail: notification },
      ))
    })

    connection.onreconnecting(() => setRealtimeState('reconnecting'))
    connection.onreconnected(() => {
      setRealtimeState('connected')
      void refreshFeed()
    })
    connection.onclose(() => {
      if (disposed) return
      setRealtimeState('offline')
      window.clearTimeout(startRetry)
      startRetry = window.setTimeout(() => void start(), 5_000)
    })

    void start()

    return () => {
      disposed = true
      window.clearTimeout(startRetry)
      connection.off('NotificationReceived')
      void connection.stop()
    }
  }, [applyFeed])

  useVisiblePolling(reconcile, 30_000)

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
    notification: AdminNotification,
  ) => {
    if (!notification.isRead) {
      try {
        const updated = await markNotificationRead(notification.id)
        feedCacheRef.current.all = feedCacheRef.current.all?.map(item =>
          item.id === notification.id
            ? (updated ?? { ...item, isRead: true })
            : item,
        ) ?? null
        feedCacheRef.current.unread = feedCacheRef.current.unread?.filter(
          item => item.id !== notification.id,
        ) ?? null
        setItems(current => current
          .map(item => item.id === notification.id
            ? (updated ?? { ...item, isRead: true })
            : item)
          .filter(item => !unreadOnlyRef.current || !item.isRead))
        setUnreadCount(current => Math.max(0, current - 1))
      } catch (exception) {
        setError(exception instanceof Error
          ? exception.message
          : 'Không thể đánh dấu thông báo đã đọc.')
      }
    }

    setOpen(false)
    setToast(current => current?.id === notification.id ? null : current)
    if (notification.target) onNavigate(notification.target)
  }, [onNavigate])

  async function markAllRead() {
    if (!unreadCount || markingAll) return
    setMarkingAll(true)
    setError('')
    try {
      await markAllNotificationsRead()
      setUnreadCount(0)
      feedCacheRef.current.all = feedCacheRef.current.all?.map(item => ({
        ...item,
        isRead: true,
      })) ?? null
      feedCacheRef.current.unread = []
      setItems(current => unreadOnlyRef.current
        ? []
        : current.map(item => ({ ...item, isRead: true })))
    } catch (exception) {
      setError(exception instanceof Error
        ? exception.message
        : 'Không thể đánh dấu tất cả đã đọc.')
    } finally {
      setMarkingAll(false)
    }
  }

  function selectNotificationFilter(nextUnreadOnly: boolean) {
    if (nextUnreadOnly === unreadOnly) return

    const cached = nextUnreadOnly
      ? feedCacheRef.current.unread
        ?? feedCacheRef.current.all?.filter(item => !item.isRead)
        ?? null
      : feedCacheRef.current.all

    setError('')
    if (cached !== null) {
      setItems(cached)
      setLoading(false)
    }
    setUnreadOnly(nextUnreadOnly)
  }

  const badge = unreadCount > 99 ? '99+' : String(unreadCount)

  return (
    <div className="notification-center" ref={rootRef}>
      <button
        type="button"
        className={`notification-trigger${open ? ' active' : ''}`}
        aria-label={unreadCount
          ? `Mở thông báo, ${unreadCount} chưa đọc`
          : 'Mở thông báo'}
        aria-expanded={open}
        aria-controls="admin-notification-panel"
        onClick={() => setOpen(current => !current)}
      >
        <BellIcon />
        {unreadCount > 0
          ? <span className="notification-badge">{badge}</span>
          : null}
      </button>

      {open
        ? <section
          className="notification-panel"
          id="admin-notification-panel"
          aria-label="Thông báo quản trị"
        >
          <header className="notification-panel-header">
            <div>
              <h2>Thông báo</h2>
              <span>{unreadCount
                ? `${unreadCount} thông báo chưa đọc`
                : 'Bạn đã xem tất cả thông báo'}</span>
            </div>
            <button
              type="button"
              onClick={() => void markAllRead()}
              disabled={!unreadCount || markingAll}
            >
              {markingAll ? 'Đang xử lý…' : 'Đọc tất cả'}
            </button>
          </header>

          <div className="notification-tabs" role="tablist">
            <button
              type="button"
              className={!unreadOnly ? 'active' : ''}
              role="tab"
              aria-selected={!unreadOnly}
              onClick={() => selectNotificationFilter(false)}
            >
              Tất cả
            </button>
            <button
              type="button"
              className={unreadOnly ? 'active' : ''}
              role="tab"
              aria-selected={unreadOnly}
              onClick={() => selectNotificationFilter(true)}
            >
              Chưa đọc {unreadCount ? `(${unreadCount})` : ''}
            </button>
          </div>

          {error
            ? <div className="notification-error" role="alert">
              <span>!</span>{error}
            </div>
            : null}

          <div className="notification-list">
            {loading
              ? <div className="notification-loading" role="status">
                <span />
                <span />
                <span />
              </div>
              : items.length
                ? items.map(notification => (
                  <button
                    type="button"
                    className={`notification-item${
                      notification.isRead ? '' : ' unread'
                    }`}
                    key={notification.id}
                    onClick={() => void openNotification(notification)}
                  >
                    <span
                      className={`notification-type ${notification.severity}`}
                      aria-hidden="true"
                    >
                      {notificationSymbol(notification.type)}
                    </span>
                    <span className="notification-copy">
                      <strong>{notification.title}</strong>
                      <span>{notification.message}</span>
                      <small>{relativeTime(notification.createdAt)}</small>
                    </span>
                    {!notification.isRead
                      ? <i aria-label="Chưa đọc" />
                      : null}
                  </button>
                ))
                : <div className="notification-empty">
                  <span aria-hidden="true">✓</span>
                  <strong>{unreadOnly
                    ? 'Không còn thông báo chưa đọc'
                    : 'Chưa có thông báo nào'}</strong>
                  <small>Thông báo vận hành mới sẽ xuất hiện tại đây.</small>
                </div>}
          </div>

          <footer className={`notification-realtime ${realtimeState}`}>
            <i />
            {realtimeState === 'connected'
              ? 'Đang nhận thông báo theo thời gian thực'
              : realtimeState === 'reconnecting'
                ? 'Đang kết nối lại…'
                : 'Realtime tạm gián đoạn, dữ liệu vẫn được lưu'}
          </footer>
        </section>
        : null}

      {toast
        ? <aside className="notification-toast" role="status">
          <button
            type="button"
            className="notification-toast-main"
            onClick={() => void openNotification(toast)}
          >
            <span className={`notification-type ${toast.severity}`}>
              {notificationSymbol(toast.type)}
            </span>
            <span>
              <small>THÔNG BÁO MỚI</small>
              <strong>{toast.title}</strong>
              <span>{toast.message}</span>
            </span>
          </button>
          <button
            type="button"
            className="notification-toast-close"
            aria-label="Đóng thông báo"
            onClick={() => setToast(null)}
          >
            ×
          </button>
        </aside>
        : null}
    </div>
  )
}

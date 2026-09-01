import { Bell, CheckCheck, X } from 'lucide-react'
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { useVisiblePolling } from '../hooks/useVisiblePolling'
import type { CustomerSession } from '../services/customerAuth'
import { ApiError } from '../services/client'
import {
  connectCustomerNotificationStream,
  CUSTOMER_ORDER_CHANGED_EVENT,
  getCustomerNotificationFeed,
  markAllCustomerNotificationsRead,
  markCustomerNotificationRead,
  type CustomerNotification,
} from '../services/notifications'
import { navigate } from '../utils/navigation'

const REALTIME_REFRESH_COOLDOWN_MS = 60_000
const MAX_VISIBLE_NOTIFICATIONS = 20

type RealtimeState = 'connected' | 'reconnecting' | 'offline'

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

function statusLabel(type: string) {
  if (type.endsWith('.Cooking')) return 'Đang nấu'
  if (type.endsWith('.Served')) return 'Đã phục vụ'
  if (type.endsWith('.Completed')) return 'Hoàn tất'
  if (type.endsWith('.Cancelled') || type.endsWith('.CancelledByCustomer')) return 'Đã hủy'
  if (type.startsWith('Order.')) return 'Đơn hàng'
  if (type.startsWith('Reservation.')) return 'Đặt bàn'
  return 'Cập nhật'
}

function severityClass(severity: string) {
  if (severity === 'error' || severity === 'danger') return 'bg-destructive'
  if (severity === 'warning') return 'bg-accent'
  return 'bg-foreground'
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
  const [realtimeState, setRealtimeState] = useState<RealtimeState>('offline')
  const [toast, setToast] = useState<CustomerNotification | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const knownIdsRef = useRef(new Set<string>())
  const feedInitializedRef = useRef(false)
  const refreshRequestRef = useRef<Promise<CustomerSession | null> | null>(null)
  const realtimeRefreshAtRef = useRef(0)

  const refreshSession = useCallback(() => {
    if (!refreshRequestRef.current) {
      const request = onSessionRefresh().finally(() => {
        if (refreshRequestRef.current === request) refreshRequestRef.current = null
      })
      refreshRequestRef.current = request
    }
    return refreshRequestRef.current
  }, [onSessionRefresh])

  const requestWithRefresh = useCallback(async <T,>(request: (accessToken: string) => Promise<T>) => {
    try {
      return await request(session.token)
    } catch (exception) {
      if (!(exception instanceof ApiError) || exception.status !== 401) throw exception
      const refreshedSession = await refreshSession()
      if (!refreshedSession) throw exception
      return request(refreshedSession.token)
    }
  }, [refreshSession, session.token])

  const emitOrderChanged = useCallback((notification: CustomerNotification) => {
    if (!notification.entityId) return
    if (!notification.type.startsWith('Order.') && !notification.type.startsWith('Payment.')) return

    window.dispatchEvent(new CustomEvent(CUSTOMER_ORDER_CHANGED_EVENT, {
      detail: { orderId: notification.entityId, type: notification.type },
    }))
  }, [])

  const applyFeed = useCallback((feed: { items: CustomerNotification[]; unreadCount: number }) => {
    const previousIds = knownIdsRef.current
    const newUnreadNotifications = feedInitializedRef.current
      ? feed.items.filter(item => !item.isRead && !previousIds.has(item.id))
      : []

    knownIdsRef.current = new Set(feed.items.map(item => item.id))
    feedInitializedRef.current = true
    setItems(feed.items)
    setUnreadCount(feed.unreadCount)

    if (newUnreadNotifications.length > 0) {
      setToast(newUnreadNotifications[0])
      newUnreadNotifications.forEach(emitOrderChanged)
    }
  }, [emitOrderChanged])

  const reconcile = useCallback(async () => {
    try {
      const feed = await requestWithRefresh(getCustomerNotificationFeed)
      applyFeed(feed)
    } catch {
      // Keep the current feed and retry on the next visible resume/tick.
    }
  }, [applyFeed, requestWithRefresh])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    void requestWithRefresh(getCustomerNotificationFeed)
      .then(feed => { if (active) applyFeed(feed) })
      .catch(exception => {
        if (!active) return
        setError(exception instanceof Error ? exception.message : 'Không thể tải thông báo.')
      })
      .finally(() => { if (active) setLoading(false) })

    return () => { active = false }
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
        setItems(current => [notification, ...current.filter(item => item.id !== notification.id)].slice(0, MAX_VISIBLE_NOTIFICATIONS))

        if (isNew && !notification.isRead) {
          setUnreadCount(current => current + 1)
          setToast(notification)
          emitOrderChanged(notification)
        }
      },
      state => {
        if (!active) return
        if (state === 'connected') {
          realtimeRefreshAtRef.current = 0
          void requestWithRefresh(getCustomerNotificationFeed).then(applyFeed).catch(() => undefined)
        }
        setRealtimeState(state)
      },
      async () => {
        const now = Date.now()
        if (now - realtimeRefreshAtRef.current < REALTIME_REFRESH_COOLDOWN_MS) return null
        realtimeRefreshAtRef.current = now
        return (await refreshSession())?.token ?? null
      },
    ).then(cleanup => {
      if (!active) cleanup()
      else disconnect = cleanup
    })

    return () => {
      active = false
      disconnect?.()
    }
  }, [applyFeed, emitOrderChanged, refreshSession, requestWithRefresh, session.token, session.userId])

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

  const openNotification = useCallback(async (notification: CustomerNotification) => {
    if (!notification.isRead) {
      try {
        const updated = await requestWithRefresh(accessToken => markCustomerNotificationRead(notification.id, accessToken))
        setItems(current => current.map(item => item.id === notification.id ? (updated ?? { ...item, isRead: true }) : item))
        setUnreadCount(current => Math.max(0, current - 1))
      } catch (exception) {
        setError(exception instanceof Error ? exception.message : 'Không thể đánh dấu thông báo đã đọc.')
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
      setError(exception instanceof Error ? exception.message : 'Không thể đánh dấu tất cả đã đọc.')
    } finally {
      setMarkingAll(false)
    }
  }

  const badge = unreadCount > 99 ? '99+' : String(unreadCount)

  return (
    <div className="relative" ref={rootRef}>
      <Button
        variant="ghost"
        size="icon"
        type="button"
        className="relative"
        aria-label={unreadCount ? `Thông báo, ${unreadCount} chưa đọc` : 'Thông báo'}
        aria-expanded={open}
        aria-controls="customer-notification-panel"
        onClick={() => setOpen(current => !current)}
      >
        <Bell />
        {unreadCount > 0 ? <span className="absolute -right-1 -top-1 grid min-w-4.5 h-4.5 place-items-center bg-accent px-1 text-[9px] font-bold text-accent-foreground">{badge}</span> : null}
      </Button>

      {open ? (
        <section
          className="sera-floating-surface absolute right-0 top-[calc(100%+14px)] z-50 w-[min(420px,calc(100vw-24px))] border border-border bg-background"
          id="customer-notification-panel"
          aria-label="Thông báo của bạn"
        >
          <header className="flex items-start justify-between gap-4 border-b border-border p-5">
            <div><p className="sera-kicker">Cập nhật</p><h2 className="mt-1 font-heading text-3xl font-medium">Thông báo</h2><p className="mt-1 text-xs text-muted-foreground">{unreadCount ? `${unreadCount} thông báo chưa đọc` : 'Bạn đã xem tất cả thông báo'}</p></div>
            <Button variant="ghost" size="sm" type="button" onClick={() => void markAllRead()} disabled={!unreadCount || markingAll}><CheckCheck />{markingAll ? 'Đang xử lý…' : 'Đọc tất cả'}</Button>
          </header>

          {error ? <div className="border-b border-destructive/30 bg-destructive/5 px-5 py-3 text-xs text-destructive" role="alert">{error}</div> : null}

          <div className="max-h-[min(520px,65vh)] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground" role="status">Đang tải thông báo…</div>
            ) : items.length ? (
              items.map(notification => (
                <button
                  type="button"
                  className={`grid w-full grid-cols-[8px_1fr_auto] gap-3 border-b border-border px-5 py-4 text-left transition-colors hover:bg-muted/60 ${notification.isRead ? 'bg-background' : 'bg-muted/35'}`}
                  key={notification.id}
                  onClick={() => void openNotification(notification)}
                >
                  <span className={`mt-1.5 size-2 ${severityClass(notification.severity)}`} />
                  <span>
                    <span className="flex flex-wrap items-center justify-between gap-2"><strong className="text-[10px] uppercase tracking-[.1em] text-muted-foreground">{statusLabel(notification.type)}</strong><time className="text-[10px] text-muted-foreground">{relativeTime(notification.createdAt)}</time></span>
                    <b className="mt-1 block font-heading text-lg font-medium">{notification.title}</b>
                    <span className="mt-1 block text-xs leading-5 text-muted-foreground">{notification.message}</span>
                  </span>
                  {!notification.isRead ? <i className="mt-1 size-1.5 bg-accent" aria-label="Chưa đọc" /> : null}
                </button>
              ))
            ) : (
              <div className="p-10 text-center"><Bell className="mx-auto size-5 text-muted-foreground" /><strong className="mt-4 block font-heading text-2xl font-medium">Chưa có thông báo nào</strong><span className="mt-2 block text-xs leading-5 text-muted-foreground">Cập nhật về đơn hàng của bạn sẽ xuất hiện tại đây.</span></div>
            )}
          </div>

          <footer className="flex items-center gap-2 border-t border-border px-5 py-3 text-[10px] font-bold uppercase tracking-[.08em] text-muted-foreground">
            <i className={`size-2 ${realtimeState === 'connected' ? 'bg-emerald-600' : realtimeState === 'reconnecting' ? 'bg-accent' : 'bg-muted-foreground'}`} />
            {realtimeState === 'connected' ? 'Đang nhận cập nhật theo thời gian thực' : realtimeState === 'reconnecting' ? 'Đang kết nối lại…' : 'Realtime tạm gián đoạn'}
          </footer>
        </section>
      ) : null}

      {toast && typeof document !== 'undefined' ? createPortal(
        <aside className="sera-floating-surface fixed right-5 top-24 z-[100] grid w-[min(400px,calc(100vw-32px))] grid-cols-[1fr_auto] border border-border bg-background max-sm:right-4 max-sm:top-20" role="status">
          <button type="button" className="flex gap-3 p-4 text-left" onClick={() => void openNotification(toast)}>
            <Bell className="mt-0.5 size-4 shrink-0 text-accent" />
            <span><small className="sera-kicker">Thông báo mới</small><strong className="mt-1 block font-heading text-xl font-medium">{toast.title}</strong><span className="mt-1 block text-xs leading-5 text-muted-foreground">{toast.message}</span></span>
          </button>
          <button type="button" className="grid w-11 place-items-center border-l border-border text-muted-foreground hover:text-foreground" aria-label="Đóng thông báo" onClick={() => setToast(null)}><X className="size-4" /></button>
        </aside>,
        document.body,
      ) : null}
    </div>
  )
}

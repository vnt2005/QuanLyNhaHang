import { useAutoDismissMessage } from '../design-system/useAutoDismissMessage'
import { confirmAction } from '../design-system/confirmDialog'
import { useEffect, useMemo, useState } from 'react'
import {
  getKitchenHistory,
  getKitchenOrders,
  updateKitchenItemStatus,
  type KitchenItemStatus,
  type KitchenOrder,
  type KitchenOrderItem,
} from '../api/kitchen'

const activeStatuses: { value: KitchenItemStatus; label: string }[] = [
  { value: 'Pending', label: 'Chờ bếp' },
  { value: 'Cooking', label: 'Đang chế biến' },
  { value: 'Ready', label: 'Hoàn thành' },
]

const historyStatuses: { value: KitchenItemStatus; label: string }[] = [
  { value: 'Served', label: 'Đã phục vụ / giao' },
  { value: 'Cancelled', label: 'Đã hủy' },
]

function minutesSince(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000))
  if (minutes < 1) return 'Vừa xong'
  if (minutes < 60) return `${minutes} phút`
  const hours = Math.floor(minutes / 60)
  return `${hours} giờ ${minutes % 60} phút`
}

function itemTime(item: KitchenOrderItem) {
  if (item.status === 'Cooking' && item.startedAt) return `Đang nấu ${minutesSince(item.startedAt)}`
  if (item.status === 'Ready' && item.completedAt) return `Xong ${minutesSince(item.completedAt)} trước`
  return `Chờ ${minutesSince(item.createdAt)}`
}

function orderLocation(order: KitchenOrder) {
  if (order.orderType !== 'Takeaway') return order.restaurantTableName
  const parts = ['Mang về']
  if (order.customerName) parts.push(order.customerName)
  if (order.pickupTime) parts.push(`nhận ${new Date(order.pickupTime).toLocaleString('vi-VN')}`)
  return parts.join(' • ')
}

const emptyCopy: Record<KitchenItemStatus, string> = {
  Pending: 'Chưa có món đang chờ',
  Cooking: 'Không có món đang nấu dở',
  Ready: 'Chưa có món chờ giao',
  Served: 'Chưa có món đã phục vụ',
  Cancelled: 'Chưa có món đã hủy',
}

export default function KitchenPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([])
  const [history, setHistory] = useState<KitchenOrder[]>([])
  const [view, setView] = useState<'board' | 'history'>('board')
  const [keyword, setKeyword] = useState('')
  const [tableFilter, setTableFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  useAutoDismissMessage(message, setMessage)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  async function loadData(silent = false) {
    if (!silent) setLoading(true)
    setError('')
    try {
      const [currentOrders, historyOrders] = await Promise.all([
        getKitchenOrders(),
        getKitchenHistory(),
      ])
      setOrders(currentOrders ?? [])
      setHistory(historyOrders ?? [])
      setLastUpdated(new Date())
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không tải được dữ liệu bếp.')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
    const timer = window.setInterval(() => void loadData(true), 15000)
    return () => window.clearInterval(timer)
  }, [])

  async function changeStatus(item: KitchenOrderItem, status: KitchenItemStatus) {
    const label = [...activeStatuses, ...historyStatuses].find(x => x.value === status)?.label ?? status
    if (!await confirmAction(`Chuyển món ${item.menuItemName} sang “${label}”?`)) return
    setSavingId(item.orderItemId); setError(''); setMessage('')
    try {
      const result = await updateKitchenItemStatus(item.orderItemId, status, item.note)
      setMessage(result.message ?? 'Cập nhật trạng thái món thành công.')
      await loadData(true)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không cập nhật được trạng thái món.')
    } finally { setSavingId('') }
  }

  const source = view === 'board' ? orders : history
  const tables = useMemo(() => {
    const map = new Map<string, string>()
    ;[...orders, ...history].forEach(order => {
      if (order.restaurantTableId) map.set(order.restaurantTableId, order.restaurantTableName)
    })
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  }, [orders, history])

  const filtered = useMemo(() => source
    .map(order => ({
      ...order,
      items: order.items.filter(item => {
        const text = `${order.orderCode} ${orderLocation(order)} ${order.customerName ?? ''} ${item.menuItemName} ${item.note ?? ''}`.toLowerCase()
        return (!keyword.trim() || text.includes(keyword.trim().toLowerCase())) &&
          (!tableFilter || order.restaurantTableId === tableFilter)
      }),
    }))
    .filter(order => order.items.length > 0), [source, keyword, tableFilter])

  const columns = activeStatuses.map(status => ({
    ...status,
    cards: filtered.flatMap(order => order.items
      .filter(item => item.status === status.value)
      .map(item => ({ order, item }))),
  }))

  const summary = useMemo(() => ({
    pending: orders.flatMap(x => x.items).filter(x => x.status === 'Pending').length,
    cooking: orders.flatMap(x => x.items).filter(x => x.status === 'Cooking').length,
    ready: orders.flatMap(x => x.items).filter(x => x.status === 'Ready').length,
    urgent: orders.flatMap(x => x.items).filter(x => x.status === 'Pending' && Date.now() - new Date(x.createdAt).getTime() >= 15 * 60000).length,
  }), [orders, lastUpdated])

  return <section className="kitchen-page">
    <div className="kitchen-hero">
      <div className="kitchen-hero-copy">
        <div className="kitchen-breadcrumb"><span>Hệ thống</span><b>›</b><strong>Nhà bếp</strong></div>
        <div className="kitchen-title-row">
          <span className="kitchen-title-icon" aria-hidden="true">👨‍🍳</span>
          <div><h2>MÀN HÌNH NHÀ BẾP</h2><p>Quản lý và bưng món chính xác, theo dõi tập trung từ danh sách bếp nấu.</p></div>
        </div>
      </div>
      <div className="kitchen-hero-actions">
        <div className={`kitchen-delay-badge${summary.urgent > 0 ? ' urgent' : ''}`}>
          <span aria-hidden="true">⚠</span>
          {summary.urgent > 0 ? `${summary.urgent} món chờ trên 15 phút` : 'Không có món chờ lâu'}
        </div>
        <button className="kitchen-refresh" onClick={() => void loadData()} disabled={loading}><span aria-hidden="true">↻</span> Làm mới bảng bếp</button>
      </div>
    </div>

    <div className="kitchen-meta-row">
      <div className="kitchen-live-stats" aria-label="Tổng quan bếp hiện tại">
        <span><i className="pending" />Chờ bếp <strong>{summary.pending}</strong></span>
        <span><i className="cooking" />Đang chế biến <strong>{summary.cooking}</strong></span>
        <span><i className="ready" />Hoàn thành <strong>{summary.ready}</strong></span>
      </div>
      <span className="kitchen-updated">{lastUpdated ? `Cập nhật lúc ${lastUpdated.toLocaleTimeString('vi-VN')}` : 'Chưa cập nhật'}</span>
    </div>

    {message && <div className="inline-alert success kitchen-alert">{message}</div>}
    {error && <div className="inline-alert error kitchen-alert">{error}</div>}

    <div className="kitchen-controls">
      <div className="kitchen-tabs"><button className={view === 'board' ? 'active' : ''} onClick={() => setView('board')}>Đang xử lý</button><button className={view === 'history' ? 'active' : ''} onClick={() => setView('history')}>Lịch sử</button></div>
      <label className="kitchen-search"><span aria-hidden="true">⌕</span><input value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="Tìm mã đơn, bàn, khách hoặc món..." /></label>
      <select value={tableFilter} onChange={event => setTableFilter(event.target.value)} aria-label="Lọc theo bàn"><option value="">Tất cả bàn + mang về</option>{tables.map(table => <option key={table.id} value={table.id}>{table.name}</option>)}</select>
    </div>

    {loading ? <div className="kitchen-empty kitchen-loading"><span className="kitchen-empty-icon">♨</span><strong>Đang tải dữ liệu bếp...</strong></div> : view === 'board' ? <div className="kitchen-board">
      {columns.map(column => <section className={`kitchen-column ${column.value.toLowerCase()}`} key={column.value}>
        <header><div className="kitchen-column-heading"><span className="kitchen-state-dot" /><h3>{column.label}</h3></div><span className="kitchen-count">{column.cards.length} món</span></header>
        <div className="kitchen-column-body">{column.cards.length === 0 ? <div className="kitchen-empty small"><span className="kitchen-empty-icon" aria-hidden="true">♨</span><strong>{emptyCopy[column.value]}</strong></div> : column.cards.map(({ order, item }) => <article className={`kitchen-ticket ${Date.now() - new Date(item.createdAt).getTime() >= 15 * 60000 && item.status === 'Pending' ? 'late' : ''}`} key={item.orderItemId}>
          <div className="ticket-main">
            <div className="ticket-copy"><strong className="ticket-dish-name">{item.menuItemName}</strong><span className="ticket-order-meta">⌖ {orderLocation(order)} <b>|</b> {order.orderCode}</span></div>
            <span className="ticket-quantity">x{item.quantity}</span>
          </div>
          {item.note && <p className="ticket-note"><strong>Ghi chú:</strong> {item.note}</p>}
          <div className="ticket-footer">
            <span className="ticket-time">◷ {itemTime(item)}</span>
            <div className="ticket-actions">
              {item.status === 'Pending' && <><button className="kitchen-action primary" disabled={savingId === item.orderItemId} onClick={() => void changeStatus(item, 'Cooking')}>▶ Chế biến</button><button className="kitchen-action danger" disabled={savingId === item.orderItemId} onClick={() => void changeStatus(item, 'Cancelled')}>Hủy</button></>}
              {item.status === 'Cooking' && <><button className="kitchen-action primary" disabled={savingId === item.orderItemId} onClick={() => void changeStatus(item, 'Ready')}>✓ Hoàn thành</button><button className="kitchen-action secondary" disabled={savingId === item.orderItemId} onClick={() => void changeStatus(item, 'Pending')}>Trả về chờ</button></>}
              {item.status === 'Ready' && <button className="kitchen-action served" disabled={savingId === item.orderItemId} onClick={() => void changeStatus(item, 'Served')}>{order.orderType === 'Takeaway' ? '✓ Đã giao khách' : '✓ Đã giao món'}</button>}
            </div>
          </div>
        </article>)}</div>
      </section>)}
    </div> : <div className="kitchen-history">
      {filtered.length === 0 ? <div className="kitchen-empty"><span className="kitchen-empty-icon" aria-hidden="true">⌛</span><strong>Không có lịch sử phù hợp.</strong></div> : filtered.map(order => <article className="history-order" key={order.orderId}>
        <header><div><strong>{order.orderCode}</strong><span>{orderLocation(order)} • {new Date(order.createdAt).toLocaleString('vi-VN')}</span></div></header>
        <div>{order.items.map(item => <div className="history-item" key={item.orderItemId}><div><strong>{item.quantity} × {item.menuItemName}</strong><span>{item.note || 'Không ghi chú'}</span></div><span className={`history-status ${item.status.toLowerCase()}`}>{historyStatuses.find(x => x.value === item.status)?.label ?? item.status}</span></div>)}</div>
      </article>)}
    </div>}
  </section>
}

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
  { value: 'Cooking', label: 'Đang nấu' },
  { value: 'Ready', label: 'Hoàn thành' },
]

const historyStatuses: { value: KitchenItemStatus; label: string }[] = [
  { value: 'Served', label: 'Đã phục vụ' },
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
    ;[...orders, ...history].forEach(order => map.set(order.restaurantTableId, order.restaurantTableName))
    return Array.from(map.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  }, [orders, history])

  const filtered = useMemo(() => source
    .map(order => ({
      ...order,
      items: order.items.filter(item => {
        const text = `${order.orderCode} ${order.restaurantTableName} ${item.menuItemName} ${item.note ?? ''}`.toLowerCase()
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
    <div className="page-toolbar kitchen-toolbar">
      <div><h2>Màn hình bếp</h2><p>Theo dõi và xử lý món theo đúng thứ tự phục vụ.</p></div>
      <div className="kitchen-toolbar-actions"><span>{lastUpdated ? `Cập nhật ${lastUpdated.toLocaleTimeString('vi-VN')}` : 'Chưa cập nhật'}</span><button onClick={() => void loadData()} disabled={loading}>↻ Làm mới</button></div>
    </div>

    <div className="kitchen-summary">
      <article><span>Chờ bếp</span><strong>{summary.pending}</strong></article>
      <article><span>Đang nấu</span><strong>{summary.cooking}</strong></article>
      <article><span>Hoàn thành</span><strong>{summary.ready}</strong></article>
      <article className={summary.urgent > 0 ? 'urgent' : ''}><span>Chờ trên 15 phút</span><strong>{summary.urgent}</strong></article>
    </div>

    {message && <div className="inline-alert success">{message}</div>}
    {error && <div className="inline-alert error">{error}</div>}

    <div className="kitchen-controls">
      <div className="kitchen-tabs"><button className={view === 'board' ? 'active' : ''} onClick={() => setView('board')}>Đang xử lý</button><button className={view === 'history' ? 'active' : ''} onClick={() => setView('history')}>Lịch sử</button></div>
      <input value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="Tìm mã đơn, bàn hoặc món..." />
      <select value={tableFilter} onChange={event => setTableFilter(event.target.value)}><option value="">Tất cả bàn</option>{tables.map(table => <option key={table.id} value={table.id}>{table.name}</option>)}</select>
    </div>

    {loading ? <div className="kitchen-empty">Đang tải dữ liệu bếp...</div> : view === 'board' ? <div className="kitchen-board">
      {columns.map(column => <section className={`kitchen-column ${column.value.toLowerCase()}`} key={column.value}>
        <header><div><h3>{column.label}</h3><span>{column.cards.length} món</span></div></header>
        <div className="kitchen-column-body">{column.cards.length === 0 ? <div className="kitchen-empty small">Không có món.</div> : column.cards.map(({ order, item }) => <article className={`kitchen-ticket ${Date.now() - new Date(item.createdAt).getTime() >= 15 * 60000 && item.status === 'Pending' ? 'late' : ''}`} key={item.orderItemId}>
          <div className="ticket-head"><div><strong>{order.orderCode}</strong><span>{order.restaurantTableName}</span></div><span className="ticket-time">{itemTime(item)}</span></div>
          <div className="ticket-dish"><strong>{item.quantity} × {item.menuItemName}</strong>{item.note && <p>Ghi chú: {item.note}</p>}</div>
          <div className="ticket-actions">
            {item.status === 'Pending' && <><button className="primary-button" disabled={savingId === item.orderItemId} onClick={() => void changeStatus(item, 'Cooking')}>Bắt đầu nấu</button><button className="danger" disabled={savingId === item.orderItemId} onClick={() => void changeStatus(item, 'Cancelled')}>Hủy món</button></>}
            {item.status === 'Cooking' && <><button className="primary-button" disabled={savingId === item.orderItemId} onClick={() => void changeStatus(item, 'Ready')}>Hoàn thành</button><button disabled={savingId === item.orderItemId} onClick={() => void changeStatus(item, 'Pending')}>Trả về chờ</button></>}
            {item.status === 'Ready' && <button className="served-button" disabled={savingId === item.orderItemId} onClick={() => void changeStatus(item, 'Served')}>Đã giao món</button>}
          </div>
        </article>)}</div>
      </section>)}
    </div> : <div className="kitchen-history">
      {filtered.length === 0 ? <div className="kitchen-empty">Không có lịch sử phù hợp.</div> : filtered.map(order => <article className="history-order" key={order.orderId}>
        <header><div><strong>{order.orderCode}</strong><span>{order.restaurantTableName} • {new Date(order.createdAt).toLocaleString('vi-VN')}</span></div></header>
        <div>{order.items.map(item => <div className="history-item" key={item.orderItemId}><div><strong>{item.quantity} × {item.menuItemName}</strong><span>{item.note || 'Không ghi chú'}</span></div><span className={`history-status ${item.status.toLowerCase()}`}>{historyStatuses.find(x => x.value === item.status)?.label ?? item.status}</span></div>)}</div>
      </article>)}
    </div>}
  </section>
}

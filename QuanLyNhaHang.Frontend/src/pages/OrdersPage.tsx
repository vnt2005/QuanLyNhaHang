import { useAutoDismissMessage } from '../hooks/useAutoDismissMessage'
import { confirmAction } from '../components/ConfirmDialog'
import { useEffect, useMemo, useState } from 'react'
import { getTables, type RestaurantTable } from '../services/areasTables'
import {
  deleteOrder,
  getOrder,
  getOrders,
  type Order,
  type OrderStatus,
} from '../services/orders'
import {
  ADMIN_NOTIFICATION_EVENT,
  type AdminNotification,
} from '../services/notifications'

const statuses: { value: OrderStatus; label: string }[] = [
  { value: 'Pending', label: 'Chờ xử lý' },
  { value: 'Cooking', label: 'Đang nấu' },
  { value: 'Ready', label: 'Sẵn sàng' },
  { value: 'Served', label: 'Đã phục vụ / giao' },
  { value: 'Completed', label: 'Hoàn tất' },
  { value: 'Cancelled', label: 'Đã hủy' },
]

const money = (value: number) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
}).format(value)

function orderContext(order: Order) {
  if (order.orderType !== 'Takeaway') return order.restaurantTableName
  const parts = ['Mang về']
  if (order.customerName) parts.push(order.customerName)
  if (order.customerPhoneNumber) parts.push(order.customerPhoneNumber)
  if (order.pickupTime) parts.push(`nhận ${new Date(order.pickupTime).toLocaleString('vi-VN')}`)
  return parts.join(' • ')
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [keyword, setKeyword] = useState('')
  const [tableFilter, setTableFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [hasPreviousPage, setHasPreviousPage] = useState(false)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  useAutoDismissMessage(message, setMessage)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  async function loadOrders(targetPage = page) {
    setLoading(true)
    setError('')
    try {
      const data = await getOrders(keyword, tableFilter, statusFilter, targetPage, 10)
      setOrders(data.items ?? [])
      setPage(data.pageNumber || targetPage)
      setTotalPages(Math.max(data.totalPages || 1, 1))
      setTotalCount(data.totalCount || 0)
      setHasPreviousPage(Boolean(data.hasPreviousPage))
      setHasNextPage(Boolean(data.hasNextPage))
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không tải được danh sách đơn hàng.')
    } finally {
      setLoading(false)
    }
  }

  async function loadTables() {
    try {
      const tableResult = await getTables('', '', '', 1, 100)
      setTables(tableResult.items ?? [])
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không tải được dữ liệu bàn.')
    }
  }

  useEffect(() => {
    void Promise.all([loadOrders(1), loadTables()])
  }, [])

  async function refreshSelected(id: string) {
    const detail = await getOrder(id)
    setSelectedOrder(detail)
  }

  useEffect(() => {
    const refreshFromNotification = (event: Event) => {
      const notification = (event as CustomEvent<AdminNotification>).detail
      if (!notification || (!notification.type.startsWith('Order.') && !notification.type.startsWith('Payment.'))) return

      void Promise.all([loadOrders(page), loadTables()])
      if (selectedOrder && notification.entityId === selectedOrder.id) {
        void refreshSelected(selectedOrder.id)
      }
    }

    window.addEventListener(ADMIN_NOTIFICATION_EVENT, refreshFromNotification)
    return () => window.removeEventListener(ADMIN_NOTIFICATION_EVENT, refreshFromNotification)
  }, [page, selectedOrder?.id, keyword, tableFilter, statusFilter])

  async function openDetail(order: Order) {
    setError('')
    setMessage('')
    setSaving(true)
    try {
      await refreshSelected(order.id)
      setDetailOpen(true)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không tải được chi tiết đơn hàng.')
    } finally {
      setSaving(false)
    }
  }

  async function removeOrder(order: Order) {
    if (order.isPaid) {
      setError('Đơn đã thanh toán nên không thể xóa trực tiếp. Cần xử lý hoàn tiền/đối soát riêng.')
      return
    }
    if (!await confirmAction(`Xóa đơn ${order.orderCode}?`)) return

    setSaving(true)
    setError('')
    setMessage('')
    try {
      const result = await deleteOrder(order.id)
      setMessage(result.message ?? 'Đã xóa đơn hàng.')
      const targetPage = orders.length === 1 && page > 1 ? page - 1 : page
      if (selectedOrder?.id === order.id) {
        setDetailOpen(false)
        setSelectedOrder(null)
      }
      await Promise.all([loadOrders(targetPage), loadTables()])
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không xóa được đơn hàng.')
    } finally {
      setSaving(false)
    }
  }

  const summary = useMemo(() => ({
    pending: orders.filter(x => x.status === 'Pending').length,
    cooking: orders.filter(x => x.status === 'Cooking').length,
    ready: orders.filter(x => x.status === 'Ready').length,
  }), [orders])

  return <section className="orders-page">
    <div className="page-toolbar">
      <div>
        <h2>Quản lý đơn hàng</h2>
        <p>Admin chỉ xem chi tiết và xóa các đơn được tạo từ website khách hàng.</p>
      </div>
    </div>

    <div className="order-summary">
      <article><span>Tổng đơn phù hợp</span><strong>{totalCount}</strong></article>
      <article><span>Chờ xử lý trên trang</span><strong>{summary.pending}</strong></article>
      <article><span>Đang nấu trên trang</span><strong>{summary.cooking}</strong></article>
      <article><span>Sẵn sàng trên trang</span><strong>{summary.ready}</strong></article>
    </div>

    {message && <div className="inline-alert success">{message}</div>}
    {error && <div className="inline-alert error">{error}</div>}

    <form className="order-filters" onSubmit={event => { event.preventDefault(); void loadOrders(1) }}>
      <input
        value={keyword}
        onChange={event => setKeyword(event.target.value)}
        placeholder="Tìm mã đơn, bàn, khách mang về hoặc ghi chú..."
      />
      <select value={tableFilter} onChange={event => setTableFilter(event.target.value)}>
        <option value="">Tất cả bàn + mang về</option>
        {tables.map(table => <option key={table.id} value={table.id}>{table.name}</option>)}
      </select>
      <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
        <option value="">Tất cả trạng thái</option>
        {statuses.map(status => <option key={status.value} value={status.value}>{status.label}</option>)}
      </select>
      <button type="submit">Lọc</button>
    </form>

    <div className="order-list">
      {loading
        ? <div className="empty-order-state">Đang tải đơn hàng...</div>
        : orders.length === 0
          ? <div className="empty-order-state">Không có đơn hàng phù hợp.</div>
          : orders.map(order => <article className="order-card" key={order.id}>
            <div className="order-card-head">
              <div>
                <strong>{order.orderCode}</strong>
                <span>{orderContext(order)} • {new Date(order.createdAt).toLocaleString('vi-VN')}</span>
              </div>
              <span className={`order-status ${order.status.toLowerCase()}`}>
                {statuses.find(x => x.value === order.status)?.label ?? order.status}
              </span>
            </div>
            <div className="order-card-body">
              <p>{order.note || 'Không có ghi chú.'}</p>
              <div>
                <span>{order.items?.filter(x => x.status !== 'Cancelled').length ?? 0} món{order.isPaid ? ' • Đã thanh toán' : ''}</span>
                <strong>{money(order.totalAmount)}</strong>
              </div>
            </div>
            <div className="order-card-actions">
              <button onClick={() => void openDetail(order)}>Chi tiết</button>
              {order.status !== 'Completed' && !order.isPaid && (
                <button className="danger" onClick={() => void removeOrder(order)} disabled={saving}>Xóa</button>
              )}
            </div>
          </article>)}
    </div>

    <div className="pagination">
      <span>Trang {page}/{totalPages} • {totalCount} đơn</span>
      <div>
        <button disabled={!hasPreviousPage || loading} onClick={() => void loadOrders(page - 1)}>Trước</button>
        <button disabled={!hasNextPage || loading} onClick={() => void loadOrders(page + 1)}>Sau</button>
      </div>
    </div>

    {detailOpen && selectedOrder && (
      <div className="modal-backdrop" onMouseDown={() => !saving && setDetailOpen(false)}>
        <div
          className="employee-modal order-detail-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-detail-title"
          onMouseDown={event => event.stopPropagation()}
        >
          <div className="modal-heading">
            <div>
              <span className="modal-kicker">CHI TIẾT ĐƠN HÀNG</span>
              <h2 id="order-detail-title">{selectedOrder.orderCode}</h2>
              <p>
                {orderContext(selectedOrder)} • Tổng tiền {money(selectedOrder.totalAmount)}
                {selectedOrder.isPaid ? ' • Đã thanh toán' : ''}
              </p>
            </div>
            <button type="button" aria-label="Đóng" onClick={() => setDetailOpen(false)}>×</button>
          </div>

          <div className="order-detail-content">
            {error && <div className="modal-alert error" role="alert">{error}</div>}

            <section className="order-detail-section">
              <div className="order-detail-section-heading">
                <div><span>GHI CHÚ</span><h3>Ghi chú đơn hàng</h3></div>
                <small>Thông tin do khách gửi cùng đơn.</small>
              </div>
              <div className="detail-note">
                <p>{selectedOrder.note?.trim() || 'Không có ghi chú.'}</p>
              </div>
            </section>

            <section className="order-detail-section">
              <div className="order-detail-section-heading">
                <div><span>MÓN TRONG ĐƠN</span><h3>{selectedOrder.items.length} món đã thêm</h3></div>
                <small>Chỉ xem thông tin món; chỉnh sửa đơn đã được tắt ở Admin.</small>
              </div>
              <div className="detail-items">
                {selectedOrder.items.map(item => (
                  <div className={`detail-item ${item.status.toLowerCase()}`} key={item.id}>
                    <div>
                      <strong>{item.menuItemName}</strong>
                      <span>{money(item.unitPrice)} • {item.note || 'Không ghi chú'}</span>
                    </div>
                    <div className="detail-item-actions">
                      <span className={`order-item-status ${item.status.toLowerCase()}`}>
                        {statuses.find(status => status.value === item.status)?.label ?? item.status}
                      </span>
                      <span>Số lượng: {item.quantity}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <div className="modal-actions modal-footer">
            <button type="button" onClick={() => setDetailOpen(false)}>Đóng</button>
            {selectedOrder.status !== 'Completed' && !selectedOrder.isPaid && (
              <button type="button" className="danger" onClick={() => void removeOrder(selectedOrder)} disabled={saving}>
                Xóa đơn
              </button>
            )}
          </div>
        </div>
      </div>
    )}
  </section>
}

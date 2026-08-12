import { useEffect, useState } from 'react'
import {
  CustomerOrderApiError,
  getCustomerOrders,
  type CustomerOrderHistory,
} from '../../api/customerOrders'
import type { CustomerSession } from '../../api/customerAuth'
import type { QrOrderResult, QrOrderTable } from '../../api/qrOrders'
import { CustomerHeader, formatMoney } from '../qr-order/QrOrderUi'

type CustomerOrderHistoryViewProps = {
  table: QrOrderTable
  session: CustomerSession
  revision: number
  onOrderMore: () => void
  onSessionEnded: (message?: string) => void
}

function formatOrderDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'Cooking': return 'Đang nấu'
    case 'Ready': return 'Sẵn sàng'
    case 'Served': return 'Đã phục vụ'
    case 'Completed': return 'Hoàn tất'
    case 'Cancelled': return 'Đã hủy'
    default: return 'Đã nhận'
  }
}

function getStatusClass(status: string) {
  if (status === 'Cancelled') return 'cancelled'
  if (status === 'Completed' || status === 'Served') return 'completed'
  return 'active'
}

function OrderHistoryCard({ order }: { order: QrOrderResult }) {
  const [expanded, setExpanded] = useState(false)
  const itemQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <article className="customer-history-card">
      <button
        type="button"
        className="customer-history-summary"
        aria-expanded={expanded}
        onClick={() => setExpanded(value => !value)}
      >
        <span>
          <small>{formatOrderDate(order.createdAt)}</small>
          <strong>{order.orderCode}</strong>
          <em>{order.restaurantTableName} · {itemQuantity} món</em>
        </span>
        <span className="customer-history-summary-side">
          <i className={getStatusClass(order.status)}>{getStatusLabel(order.status)}</i>
          <strong>{formatMoney(order.totalAmount)}</strong>
          <b aria-hidden="true">{expanded ? '−' : '+'}</b>
        </span>
      </button>

      {expanded ? (
        <div className="customer-history-detail">
          <ul>
            {order.items.map(item => (
              <li key={item.id}>
                <span><strong>{item.menuItemName}</strong><small>× {item.quantity}</small></span>
                <b>{formatMoney(item.totalPrice)}</b>
              </li>
            ))}
          </ul>
          {order.note ? <p><strong>Ghi chú:</strong> {order.note}</p> : null}
        </div>
      ) : null}
    </article>
  )
}

export default function CustomerOrderHistoryView({
  table,
  session,
  revision,
  onOrderMore,
  onSessionEnded,
}: CustomerOrderHistoryViewProps) {
  const [pageNumber, setPageNumber] = useState(1)
  const [history, setHistory] = useState<CustomerOrderHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [requestRevision, setRequestRevision] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')

    void getCustomerOrders(session.token, pageNumber)
      .then(result => {
        if (active) setHistory(result)
      })
      .catch(exception => {
        if (!active) return
        if (exception instanceof CustomerOrderApiError && exception.status === 401) {
          onSessionEnded('Phiên khách hàng đã hết hạn. Vui lòng đăng nhập lại.')
          return
        }
        setError(
          exception instanceof Error
            ? exception.message
            : 'Không thể tải lịch sử đơn hàng.',
        )
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [onSessionEnded, pageNumber, requestRevision, revision, session.token])

  return (
    <>
      <CustomerHeader table={table} />
      <section className="customer-history-heading">
        <div>
          <span>
            <h1>Đơn của tôi</h1>
            <p>Lịch sử gọi món của tài khoản {session.email}</p>
          </span>
          <button
            type="button"
            disabled={loading}
            onClick={() => setRequestRevision(value => value + 1)}
          >
            {loading ? 'Đang tải…' : 'Làm mới'}
          </button>
        </div>
      </section>

      {error ? (
        <section className="customer-history-error" role="alert">
          <strong>Chưa tải được đơn hàng</strong>
          <p>{error}</p>
          <button type="button" onClick={() => setRequestRevision(value => value + 1)}>Thử lại</button>
        </section>
      ) : loading && !history ? (
        <section className="customer-history-loading" role="status">
          <span className="customer-spinner" />
          <p>Đang tải lịch sử đơn hàng…</p>
        </section>
      ) : history?.items.length ? (
        <>
          <section className="customer-history-list" aria-label="Lịch sử đơn hàng">
            {history.items.map(order => <OrderHistoryCard key={order.id} order={order} />)}
          </section>
          {history.totalPages > 1 ? (
            <nav className="customer-history-pagination" aria-label="Phân trang lịch sử đơn hàng">
              <button type="button" disabled={!history.hasPreviousPage || loading} onClick={() => setPageNumber(value => value - 1)}>Trang trước</button>
              <span>Trang {history.pageNumber}/{history.totalPages}</span>
              <button type="button" disabled={!history.hasNextPage || loading} onClick={() => setPageNumber(value => value + 1)}>Trang sau</button>
            </nav>
          ) : null}
          <button type="button" className="customer-order-more customer-history-order-more" onClick={onOrderMore}>Gọi thêm món</button>
        </>
      ) : (
        <section className="customer-empty-state order">
          <span className="customer-history-empty-icon">◎</span>
          <h2>Bạn chưa có đơn nào</h2>
          <p>Đơn gọi khi đăng nhập sẽ được lưu vào tài khoản và xem lại trên mọi thiết bị.</p>
          <button type="button" onClick={onOrderMore}>Xem thực đơn</button>
        </section>
      )}
    </>
  )
}

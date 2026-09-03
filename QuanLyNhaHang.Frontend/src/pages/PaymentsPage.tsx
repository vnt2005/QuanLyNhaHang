import { FormEvent, useEffect, useRef, useState } from 'react'
import { getPayments, type Payment } from '../services/payments'
import {
  ADMIN_NOTIFICATION_EVENT,
  type AdminNotification,
} from '../services/notifications'

const money = (value: number) => new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
}).format(value)

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [revenue, setRevenue] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const latestRequest = useRef(0)
  const realtimeRefreshRef = useRef<() => void>(() => undefined)

  async function loadPayments(targetPage = page) {
    const requestId = ++latestRequest.current
    setLoading(true)
    setError('')

    try {
      const result = await getPayments(
        keyword,
        'Paid',
        'BankTransfer',
        targetPage,
        10,
      )
      if (requestId !== latestRequest.current) return

      setPayments(result.items ?? [])
      setPage(result.pageNumber ?? targetPage)
      setTotalPages(Math.max(1, result.totalPages ?? 1))
      setTotalCount(result.totalCount ?? 0)
      setRevenue(result.revenue ?? 0)
    } catch (exception) {
      if (requestId !== latestRequest.current) return
      setError(exception instanceof Error
        ? exception.message
        : 'Không tải được lịch sử thanh toán SePay.')
    } finally {
      if (requestId === latestRequest.current) setLoading(false)
    }
  }

  useEffect(() => {
    void loadPayments(1)
  }, [])

  realtimeRefreshRef.current = () => {
    void loadPayments(page)
  }

  useEffect(() => {
    const refreshPayments = (event: Event) => {
      const notification = (event as CustomEvent<AdminNotification>).detail
      if (!notification?.type.startsWith('Payment.')) return
      realtimeRefreshRef.current()
    }

    window.addEventListener(ADMIN_NOTIFICATION_EVENT, refreshPayments)
    return () => window.removeEventListener(ADMIN_NOTIFICATION_EVENT, refreshPayments)
  }, [])

  function submitFilter(event: FormEvent) {
    event.preventDefault()
    void loadPayments(1)
  }

  return <section className="payments-page">
    <div className="page-toolbar">
      <div>
        <h2>Lịch sử thanh toán SePay</h2>
        <p>
          Chỉ hiển thị giao dịch chuyển khoản đã được SePay xác minh thành công.
          Web App quản trị không thể tạo, sửa, hủy hoặc đánh dấu thanh toán thay khách hàng.
        </p>
      </div>
    </div>

    <div className="payment-summary">
      <article><span>Giao dịch SePay</span><strong>{totalCount}</strong></article>
      <article><span>Đã xác minh</span><strong>{totalCount}</strong></article>
      <article><span>Doanh thu SePay</span><strong>{money(revenue)}</strong></article>
    </div>

    {error && <div className="inline-alert error">{error}</div>}

    <form className="payment-filters" onSubmit={submitFilter}>
      <input
        value={keyword}
        onChange={event => setKeyword(event.target.value)}
        placeholder="Tìm mã thanh toán hoặc mã giao dịch SePay..."
      />
      <button type="submit">Tìm</button>
    </form>

    <div className="payment-table-wrap">
      <table className="payment-table">
        <thead>
          <tr>
            <th>Mã</th>
            <th>Thời gian</th>
            <th>Phương thức</th>
            <th>Tổng món</th>
            <th>Giảm/Phí/VAT</th>
            <th>Thực thu</th>
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {loading
            ? <tr><td colSpan={7}>Đang tải...</td></tr>
            : payments.length === 0
              ? <tr><td colSpan={7}>Chưa có giao dịch SePay đã xác minh.</td></tr>
              : payments.map(payment => <tr key={payment.id}>
                  <td>
                    <strong>{payment.paymentCode}</strong>
                    <small>{payment.note || 'SePay đã xác minh'}</small>
                  </td>
                  <td>{new Date(payment.paidAt).toLocaleString('vi-VN')}</td>
                  <td>Chuyển khoản SePay</td>
                  <td>{money(payment.totalAmount)}</td>
                  <td>
                    <span>-{money(payment.discountAmount)}</span>
                    <small>Phí +{money(payment.serviceChargeAmount)}</small>
                    <small>VAT +{money(payment.vatAmount)}</small>
                  </td>
                  <td><strong>{money(payment.finalAmount)}</strong></td>
                  <td><span className="payment-status paid">Đã xác minh</span></td>
                </tr>)}
        </tbody>
      </table>
    </div>

    <div className="pagination">
      <span>Trang {page}/{totalPages} • {totalCount} giao dịch SePay</span>
      <div>
        <button disabled={page <= 1 || loading} onClick={() => void loadPayments(page - 1)}>Trước</button>
        <button disabled={page >= totalPages || loading} onClick={() => void loadPayments(page + 1)}>Sau</button>
      </div>
    </div>
  </section>
}

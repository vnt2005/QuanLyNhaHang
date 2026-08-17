import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, XCircle } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CustomerSession } from '../api/customerAuth'
import {
  cancelCustomerPaymentAttempt,
  getCustomerPaymentStatus,
  type CustomerPaymentStatus,
} from '../api/customerPayments'
import { navigate } from '../navigation'
import '../payment.css'

function money(value?: number | null) {
  if (value == null) return ''
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

export default function PaymentResultPage({ session }: { session: CustomerSession | null }) {
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const orderId = params.get('orderId') || ''
  const attemptId = params.get('attemptId') || ''
  const gatewayResult = params.get('result') || ''
  const qrToken = orderId ? localStorage.getItem(`customerPaymentQrToken:${orderId}`) : null
  const cancelHandled = useRef(false)
  const [status, setStatus] = useState<CustomerPaymentStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadStatus() {
    if (!orderId) {
      setError('Thiếu mã đơn hàng để kiểm tra thanh toán.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      setStatus(await getCustomerPaymentStatus(orderId, qrToken, session?.token))
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không kiểm tra được trạng thái thanh toán.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (
      gatewayResult !== 'cancel' ||
      !orderId ||
      !attemptId ||
      cancelHandled.current
    ) return

    cancelHandled.current = true
    void (async () => {
      try {
        await cancelCustomerPaymentAttempt(orderId, attemptId, qrToken, session?.token)
      } catch (exception) {
        setError(exception instanceof Error ? exception.message : 'Không đồng bộ được trạng thái hủy thanh toán.')
      } finally {
        await loadStatus()
      }
    })()
  }, [attemptId, gatewayResult, orderId, session?.token])

  useEffect(() => {
    if (gatewayResult === 'cancel' && attemptId) return
    void loadStatus()
  }, [attemptId, gatewayResult, orderId, session?.token])

  useEffect(() => {
    if (
      gatewayResult !== 'success' ||
      status?.paid ||
      status?.requiresReview ||
      !orderId
    ) return

    let attempts = 0
    const timer = window.setInterval(() => {
      attempts += 1
      void loadStatus()
      if (attempts >= 5) window.clearInterval(timer)
    }, 2000)
    return () => window.clearInterval(timer)
  }, [gatewayResult, orderId, status?.paid, status?.requiresReview])

  function goBack() {
    const returnPath = localStorage.getItem('customerPaymentReturnPath')
    navigate(returnPath || (session ? '/orders' : '/menu'))
  }

  const paid = status?.paid === true
  const requiresReview = status?.requiresReview === true
  const cancelled = gatewayResult === 'cancel' && !paid && !requiresReview
  const expired = status?.attemptStatus === 'Expired' && !paid && !requiresReview

  const heading = paid
    ? 'Thanh toán thành công'
    : requiresReview
      ? 'Giao dịch đang được kiểm tra'
      : expired
        ? 'Phiên thanh toán đã hết hạn'
        : cancelled
          ? 'Bạn đã hủy thanh toán'
          : 'Đang xác nhận thanh toán'

  return (
    <main className="payment-result-page page-section">
      <section className={`payment-result-card ${paid ? 'paid' : cancelled || expired ? 'cancelled' : 'pending'}`}>
        {paid
          ? <CheckCircle2 />
          : requiresReview
            ? <AlertTriangle />
            : cancelled || expired
              ? <XCircle />
              : <Clock3 />}
        <span className="page-kicker">THANH TOÁN ONLINE</span>
        <h1>{heading}</h1>

        {status ? (
          <p>
            Đơn <strong>{status.orderCode}</strong>
            {paid && status.amount != null
              ? <> đã thanh toán <strong>{money(status.amount)}</strong>.</>
              : '.'}
          </p>
        ) : null}

        {!paid && !requiresReview && gatewayResult === 'success' ? (
          <p>
            Ngân hàng có thể đã báo thành công nhưng hệ thống vẫn cần nhận webhook hợp lệ từ payOS trước khi ghi nhận đã thanh toán.
          </p>
        ) : null}

        {requiresReview ? (
          <>
            <p>
              Hệ thống đã nhận tín hiệu giao dịch nhưng chưa thể tự gắn khoản tiền này vào đơn hàng. Giao dịch đã được giữ lại để nhân viên đối soát và xử lý an toàn, bao gồm hoàn tiền nếu cần.
            </p>
            {status?.receivedAmount != null ? (
              <p>Số tiền hệ thống ghi nhận từ cổng thanh toán: <strong>{money(status.receivedAmount)}</strong>.</p>
            ) : null}
          </>
        ) : null}

        {cancelled ? (
          <p>Đơn hàng vẫn được giữ nguyên. Payment link hiện tại sẽ được hủy để tránh thanh toán nhầm về sau.</p>
        ) : null}

        {expired ? (
          <p>Liên kết thanh toán cũ không còn hiệu lực. Bạn có thể quay lại đơn để tạo một phiên thanh toán mới.</p>
        ) : null}

        {status?.paymentCode ? <p>Mã thanh toán: <strong>{status.paymentCode}</strong></p> : null}
        {error ? <div className="form-notice error" role="alert">{error}</div> : null}

        <div className="payment-result-actions">
          {!paid && !cancelled && !expired && !requiresReview ? (
            <button
              className="secondary-button"
              type="button"
              disabled={loading}
              onClick={() => void loadStatus()}
            >
              <RefreshCw className={loading ? 'spin' : ''} /> Kiểm tra lại
            </button>
          ) : null}
          <button className="primary-button" type="button" onClick={goBack}>
            {paid ? 'Quay lại đơn hàng' : 'Quay lại'}
          </button>
        </div>
      </section>
    </main>
  )
}

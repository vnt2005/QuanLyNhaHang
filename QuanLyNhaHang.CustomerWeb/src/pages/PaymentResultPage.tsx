import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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
  const requestedAttemptId = params.get('attemptId') || ''
  const qrToken = orderId ? localStorage.getItem(`customerPaymentQrToken:${orderId}`) : null
  const [status, setStatus] = useState<CustomerPaymentStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState('')

  async function loadStatus(showLoading = true) {
    if (!orderId) {
      setError('Thiếu mã đơn hàng để kiểm tra thanh toán.')
      setLoading(false)
      return
    }

    if (showLoading) setLoading(true)
    setError('')
    try {
      setStatus(await getCustomerPaymentStatus(
        orderId,
        qrToken,
        session?.token,
        requestedAttemptId,
      ))
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không kiểm tra được trạng thái thanh toán.')
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  useEffect(() => {
    void loadStatus()
  }, [orderId, requestedAttemptId, session?.token])

  const paid = status?.paid === true
  const requiresReview = status?.requiresReview === true
  const cancelled = status?.attemptStatus === 'Cancelled'
  const expired = status?.attemptStatus === 'Expired'
  const failed = status?.attemptStatus === 'Failed'
  const pending = !paid && !requiresReview && !cancelled && !expired && !failed

  useEffect(() => {
    if (!orderId || !pending || !status) return

    const timer = window.setInterval(() => {
      void loadStatus(false)
    }, 3000)

    return () => window.clearInterval(timer)
  }, [orderId, pending, status?.attemptId, session?.token])

  async function cancelPayment() {
    const attemptId = status?.attemptId || requestedAttemptId
    if (!orderId || !attemptId || cancelling || paid) return

    setCancelling(true)
    setError('')
    try {
      await cancelCustomerPaymentAttempt(orderId, attemptId, qrToken, session?.token)
      await loadStatus(false)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không hủy được phiên thanh toán.')
    } finally {
      setCancelling(false)
    }
  }

  function goBack() {
    const returnPath = localStorage.getItem('customerPaymentReturnPath')
    navigate(returnPath || (session ? '/orders' : '/menu'))
  }

  const heading = paid
    ? 'Thanh toán thành công'
    : requiresReview
      ? 'Giao dịch đang được kiểm tra'
      : expired
        ? 'Mã thanh toán đã hết hạn'
        : cancelled
          ? 'Bạn đã hủy thanh toán'
          : failed
            ? 'Không thể tiếp tục phiên thanh toán'
            : 'Quét QR để thanh toán'

  return (
    <main className="payment-result-page page-section">
      <section className={`payment-result-card ${paid ? 'paid' : cancelled || expired || failed ? 'cancelled' : 'pending'}`}>
        {paid
          ? <CheckCircle2 />
          : requiresReview
            ? <AlertTriangle />
            : cancelled || expired || failed
              ? <XCircle />
              : <Clock3 />}
        <span className="page-kicker">THANH TOÁN QUA SEPAY</span>
        <h1>{heading}</h1>

        {status ? (
          <p>
            Đơn <strong>{status.orderCode}</strong>
            {paid && status.amount != null
              ? <> đã thanh toán <strong>{money(status.amount)}</strong>.</>
              : '.'}
          </p>
        ) : null}

        {pending && status?.qrCode ? (
          <div className="payment-qr-panel">
            <img src={status.qrCode} alt="Mã QR VietQR thanh toán đơn hàng" />
            <div className="payment-transfer-details">
              <div><span>Ngân hàng</span><strong>{status.bankCode || 'HDBank'}</strong></div>
              <div><span>Chủ tài khoản</span><strong>{status.accountHolder || '—'}</strong></div>
              <div><span>Số tài khoản</span><strong>{status.accountNumber || '—'}</strong></div>
              <div><span>Số tiền</span><strong>{money(status.expectedAmount ?? status.amount)}</strong></div>
              <div><span>Nội dung</span><strong>{status.transferContent || '—'}</strong></div>
            </div>
            <p className="payment-transfer-warning">
              Vui lòng giữ nguyên <strong>số tiền</strong> và <strong>nội dung chuyển khoản</strong> để SePay tự động xác nhận đúng đơn.
            </p>
          </div>
        ) : null}

        {pending && status && !status.qrCode ? (
          <div className="form-notice error" role="alert">
            Chưa lấy được mã QR thanh toán. Hãy quay lại đơn hàng và tạo lại phiên thanh toán.
          </div>
        ) : null}

        {pending && status?.qrCode ? (
          <p className="payment-auto-check">
            <RefreshCw className="spin" /> Hệ thống đang tự kiểm tra giao dịch qua webhook SePay mỗi vài giây.
          </p>
        ) : null}

        {requiresReview ? (
          <>
            <p>
              SePay đã báo có giao dịch nhưng hệ thống chưa thể tự gắn khoản tiền này vào đơn hàng. Giao dịch được giữ lại để đối soát an toàn.
            </p>
            {status?.receivedAmount != null ? (
              <p>Số tiền nhận được: <strong>{money(status.receivedAmount)}</strong>.</p>
            ) : null}
          </>
        ) : null}

        {cancelled ? (
          <p>
            Đơn hàng vẫn được giữ nguyên. Nếu bạn chuyển tiền bằng QR cũ sau khi hủy, giao dịch sẽ được đưa vào đối soát thay vì tự ghi nhận.
          </p>
        ) : null}

        {expired ? (
          <p>
            Phiên QR này đã hết hạn. Bạn có thể quay lại đơn hàng để tạo mã thanh toán mới.
          </p>
        ) : null}

        {failed ? <p>Phiên thanh toán không còn hợp lệ. Hãy quay lại đơn hàng và thử tạo mã QR mới.</p> : null}
        {status?.paymentCode ? <p>Mã thanh toán hệ thống: <strong>{status.paymentCode}</strong></p> : null}
        {error ? <div className="form-notice error" role="alert">{error}</div> : null}

        <div className="payment-result-actions">
          {pending ? (
            <button
              className="secondary-button"
              type="button"
              disabled={loading}
              onClick={() => void loadStatus()}
            >
              <RefreshCw className={loading ? 'spin' : ''} /> Kiểm tra ngay
            </button>
          ) : null}
          {pending && (status?.attemptId || requestedAttemptId) ? (
            <button
              className="secondary-button danger-button"
              type="button"
              disabled={cancelling}
              onClick={() => void cancelPayment()}
            >
              {cancelling ? 'Đang hủy…' : 'Hủy phiên thanh toán'}
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

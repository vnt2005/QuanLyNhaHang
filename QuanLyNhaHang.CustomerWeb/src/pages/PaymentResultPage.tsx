import { CheckCircle2, Clock3, RefreshCw, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { CustomerSession } from '../api/customerAuth'
import { getCustomerPaymentStatus, type CustomerPaymentStatus } from '../api/customerPayments'
import { navigate } from '../navigation'

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
  const gatewayResult = params.get('result') || ''
  const qrToken = orderId ? localStorage.getItem(`customerPaymentQrToken:${orderId}`) : null
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

  useEffect(() => { void loadStatus() }, [orderId, session?.token])

  useEffect(() => {
    if (gatewayResult !== 'success' || status?.paid || !orderId) return
    let attempts = 0
    const timer = window.setInterval(() => {
      attempts += 1
      void loadStatus()
      if (attempts >= 5) window.clearInterval(timer)
    }, 2000)
    return () => window.clearInterval(timer)
  }, [gatewayResult, orderId, status?.paid])

  function goBack() {
    const returnPath = localStorage.getItem('customerPaymentReturnPath')
    navigate(returnPath || (session ? '/orders' : '/menu'))
  }

  const paid = status?.paid === true
  const cancelled = gatewayResult === 'cancel' && !paid

  return (
    <main className="payment-result-page page-section">
      <section className={`payment-result-card ${paid ? 'paid' : cancelled ? 'cancelled' : 'pending'}`}>
        {paid ? <CheckCircle2 /> : cancelled ? <XCircle /> : <Clock3 />}
        <span className="page-kicker">THANH TOÁN ONLINE</span>
        <h1>{paid ? 'Thanh toán thành công' : cancelled ? 'Bạn đã hủy thanh toán' : 'Đang xác nhận thanh toán'}</h1>
        {status ? <p>Đơn <strong>{status.orderCode}</strong>{paid && status.amount != null ? <> đã thanh toán <strong>{money(status.amount)}</strong>.</> : '.'}</p> : null}
        {!paid && gatewayResult === 'success' ? <p>Ngân hàng có thể đã báo thành công nhưng hệ thống vẫn cần nhận webhook hợp lệ từ payOS trước khi ghi nhận đã thanh toán.</p> : null}
        {cancelled ? <p>Đơn hàng vẫn được giữ nguyên. Bạn có thể quay lại đơn và thanh toán lại khi cần.</p> : null}
        {status?.paymentCode ? <p>Mã thanh toán: <strong>{status.paymentCode}</strong></p> : null}
        {error ? <div className="form-notice error" role="alert">{error}</div> : null}
        <div className="payment-result-actions">
          {!paid && !cancelled ? <button className="secondary-button" type="button" disabled={loading} onClick={() => void loadStatus()}><RefreshCw className={loading ? 'spin' : ''} /> Kiểm tra lại</button> : null}
          <button className="primary-button" type="button" onClick={goBack}>{paid ? 'Quay lại đơn hàng' : 'Quay lại'}</button>
        </div>
      </section>
    </main>
  )
}

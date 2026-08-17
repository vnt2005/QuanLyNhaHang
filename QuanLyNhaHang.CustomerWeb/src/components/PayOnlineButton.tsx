import { CheckCircle2, QrCode } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  createCustomerPaymentQr,
  getCustomerPaymentStatus,
} from '../api/customerPayments'
import { navigate } from '../navigation'

export default function PayOnlineButton({
  orderId,
  qrToken,
  accessToken,
  className = 'primary-button',
}: {
  orderId: string
  qrToken?: string | null
  accessToken?: string | null
  className?: string
}) {
  const [loading, setLoading] = useState(false)
  const [paid, setPaid] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    void getCustomerPaymentStatus(orderId, qrToken, accessToken)
      .then(status => {
        if (active) setPaid(status.paid)
      })
      .catch(() => undefined)
    return () => { active = false }
  }, [accessToken, orderId, qrToken])

  async function pay() {
    if (loading || paid) return
    setLoading(true)
    setError('')
    try {
      const result = await createCustomerPaymentQr(orderId, qrToken, accessToken)
      if (result.alreadyPaid) {
        setPaid(true)
        navigate(`/payment-result?orderId=${encodeURIComponent(orderId)}`)
        return
      }

      if (!result.attemptId || !result.qrCode || !result.transferContent) {
        throw new Error('SePay chưa trả về đầy đủ thông tin QR thanh toán.')
      }

      if (qrToken) localStorage.setItem(`customerPaymentQrToken:${orderId}`, qrToken)
      localStorage.setItem('customerPaymentReturnPath', window.location.pathname)
      navigate(
        `/payment-result?orderId=${encodeURIComponent(orderId)}` +
        `&attemptId=${encodeURIComponent(result.attemptId)}`,
      )
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không tạo được mã QR thanh toán.')
      setLoading(false)
    }
  }

  return (
    <div className="customer-online-payment-action">
      <button className={className} type="button" disabled={loading || paid} onClick={() => void pay()}>
        {paid ? <CheckCircle2 /> : <QrCode />}
        {paid ? 'Đã thanh toán' : loading ? 'Đang tạo mã QR…' : 'Thanh toán online'}
      </button>
      {error ? <small className="payment-inline-error" role="alert">{error}</small> : null}
    </div>
  )
}

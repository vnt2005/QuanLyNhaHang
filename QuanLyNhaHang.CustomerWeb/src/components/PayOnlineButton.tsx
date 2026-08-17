import { useState } from 'react'
import { CreditCard } from 'lucide-react'
import { createCustomerPaymentLink } from '../api/customerPayments'
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
  const [error, setError] = useState('')

  async function pay() {
    if (loading) return
    setLoading(true)
    setError('')
    try {
      const result = await createCustomerPaymentLink(orderId, qrToken, accessToken)
      if (result.alreadyPaid) {
        navigate(`/payment-result?result=success&orderId=${encodeURIComponent(orderId)}`)
        return
      }
      if (!result.checkoutUrl) throw new Error('Cổng thanh toán chưa trả về liên kết thanh toán.')

      if (qrToken) localStorage.setItem(`customerPaymentQrToken:${orderId}`, qrToken)
      localStorage.setItem('customerPaymentReturnPath', window.location.pathname)
      window.location.assign(result.checkoutUrl)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không mở được cổng thanh toán.')
      setLoading(false)
    }
  }

  return (
    <div className="customer-online-payment-action">
      <button className={className} type="button" disabled={loading} onClick={() => void pay()}>
        <CreditCard /> {loading ? 'Đang mở thanh toán…' : 'Thanh toán online'}
      </button>
      {error ? <small className="payment-inline-error" role="alert">{error}</small> : null}
    </div>
  )
}

import { CheckCircle2, Clock3, QrCode } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  createCustomerPaymentQr,
  getCustomerPaymentStatus,
} from '../api/customerPayments'
import { navigate } from '../navigation'
import PromotionCodeBox from './PromotionCodeBox'

const terminalOrderStatuses = new Set(['Completed', 'Cancelled'])

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
  const [checking, setChecking] = useState(true)
  const [loading, setLoading] = useState(false)
  const [paid, setPaid] = useState(false)
  const [canPay, setCanPay] = useState(false)
  const [orderStatus, setOrderStatus] = useState('')
  const [unavailableReason, setUnavailableReason] = useState('')
  const [error, setError] = useState('')
  const payingRef = useRef(false)

  useEffect(() => {
    let active = true
    let initialCheck = true
    let timer: number | undefined

    async function refreshStatus() {
      if (initialCheck) setChecking(true)

      try {
        const status = await getCustomerPaymentStatus(orderId, qrToken, accessToken)
        if (!active) return

        setPaid(status.paid)
        setCanPay(status.canPay)
        setOrderStatus(status.orderStatus)
        setUnavailableReason(status.paymentUnavailableReason || '')
        setError('')

        if (status.paid || terminalOrderStatuses.has(status.orderStatus)) {
          if (timer !== undefined) window.clearInterval(timer)
        }
      } catch (exception) {
        if (!active) return
        setCanPay(false)
        setUnavailableReason('')
        setError(exception instanceof Error
          ? exception.message
          : 'Không kiểm tra được trạng thái thanh toán.')
      } finally {
        if (active && initialCheck) setChecking(false)
        initialCheck = false
      }
    }

    void refreshStatus()
    timer = window.setInterval(() => void refreshStatus(), 10_000)

    return () => {
      active = false
      if (timer !== undefined) window.clearInterval(timer)
    }
  }, [accessToken, orderId, qrToken])

  async function pay() {
    if (payingRef.current || checking || loading || paid || !canPay) return
    payingRef.current = true
    setLoading(true)
    setError('')

    try {
      const result = await createCustomerPaymentQr(orderId, qrToken, accessToken)
      if (result.alreadyPaid) {
        setPaid(true)
        setCanPay(false)
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
    } finally {
      payingRef.current = false
      setLoading(false)
    }
  }

  const blockedLabel = orderStatus === 'Pending'
    ? 'Chờ nhà hàng xác nhận'
    : orderStatus === 'Cancelled'
      ? 'Đơn đã hủy'
      : orderStatus === 'Completed'
        ? 'Đơn đã hoàn thành'
        : 'Chưa thể thanh toán'

  return (
    <div className="customer-online-payment-action">
      {!paid && !terminalOrderStatuses.has(orderStatus)
        ? <PromotionCodeBox orderId={orderId} qrToken={qrToken} accessToken={accessToken} />
        : null}
      <button
        className={className}
        type="button"
        disabled={checking || loading || paid || !canPay}
        onClick={() => void pay()}
      >
        {paid ? <CheckCircle2 /> : canPay ? <QrCode /> : <Clock3 />}
        {paid
          ? 'Đã thanh toán'
          : checking
            ? 'Đang kiểm tra…'
            : loading
              ? 'Đang tạo mã QR…'
              : canPay
                ? 'Thanh toán online'
                : blockedLabel}
      </button>
      {!paid && !checking && !canPay && unavailableReason
        ? <small className="payment-inline-note">{unavailableReason}</small>
        : null}
      {error ? <small className="payment-inline-error" role="alert">{error}</small> : null}
    </div>
  )
}

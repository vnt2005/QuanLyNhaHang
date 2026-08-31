import { CheckCircle2, Clock3, QrCode } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useVisiblePolling } from '../hooks/useVisiblePolling'
import {
  createCustomerPaymentQr,
  getCustomerPaymentStatus,
} from '../services/customerPayments'
import { navigate } from '../utils/navigation'
import PromotionCodeBox from './PromotionCodeBox'

const terminalOrderStatuses = new Set(['Completed', 'Cancelled'])

export default function PayOnlineButton({
  orderId,
  qrToken,
  accessToken,
  className,
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

  async function refreshStatus(showChecking = false) {
    if (showChecking) setChecking(true)
    try {
      const status = await getCustomerPaymentStatus(orderId, qrToken, accessToken)
      setPaid(status.paid)
      setCanPay(status.canPay)
      setOrderStatus(status.orderStatus)
      setUnavailableReason(status.paymentUnavailableReason || '')
      setError('')
    } catch (exception) {
      setCanPay(false)
      setUnavailableReason('')
      setError(exception instanceof Error ? exception.message : 'Không kiểm tra được trạng thái thanh toán.')
    } finally {
      if (showChecking) setChecking(false)
    }
  }

  useEffect(() => {
    let active = true
    setChecking(true)
    void getCustomerPaymentStatus(orderId, qrToken, accessToken)
      .then(status => {
        if (!active) return
        setPaid(status.paid)
        setCanPay(status.canPay)
        setOrderStatus(status.orderStatus)
        setUnavailableReason(status.paymentUnavailableReason || '')
        setError('')
      })
      .catch(exception => {
        if (!active) return
        setCanPay(false)
        setUnavailableReason('')
        setError(exception instanceof Error ? exception.message : 'Không kiểm tra được trạng thái thanh toán.')
      })
      .finally(() => { if (active) setChecking(false) })
    return () => { active = false }
  }, [accessToken, orderId, qrToken])

  useVisiblePolling(() => refreshStatus(false), 10_000, !paid && !terminalOrderStatuses.has(orderStatus))

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
      if (!result.attemptId || !result.qrCode || !result.transferContent) throw new Error('SePay chưa trả về đầy đủ thông tin QR thanh toán.')
      const qrTokenKey = `customerPaymentQrToken:${orderId}`
      localStorage.removeItem(qrTokenKey)
      localStorage.removeItem('customerPaymentReturnPath')
      if (qrToken) sessionStorage.setItem(qrTokenKey, qrToken)
      sessionStorage.setItem('customerPaymentReturnPath', window.location.pathname)
      navigate(`/payment-result?orderId=${encodeURIComponent(orderId)}&attemptId=${encodeURIComponent(result.attemptId)}`)
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
    <div className="grid w-full gap-4">
      {!paid && !terminalOrderStatuses.has(orderStatus) ? <PromotionCodeBox orderId={orderId} qrToken={qrToken} accessToken={accessToken} /> : null}
      <Button className={className} type="button" disabled={checking || loading || paid || !canPay} onClick={() => void pay()}>
        {paid ? <CheckCircle2 data-icon="inline-start" /> : canPay ? <QrCode data-icon="inline-start" /> : <Clock3 data-icon="inline-start" />}
        {paid ? 'Đã thanh toán' : checking ? 'Đang kiểm tra…' : loading ? 'Đang tạo mã QR…' : canPay ? 'Thanh toán online' : blockedLabel}
      </Button>
      {!paid && !checking && !canPay && unavailableReason ? <Alert><AlertTitle>Thanh toán chưa sẵn sàng</AlertTitle><AlertDescription>{unavailableReason}</AlertDescription></Alert> : null}
      {error ? <Alert variant="destructive"><AlertTitle>Không thể tạo thanh toán</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
    </div>
  )
}

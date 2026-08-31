import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, XCircle } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useVisiblePolling } from '../hooks/useVisiblePolling'
import type { CustomerSession } from '../services/customerAuth'
import {
  cancelCustomerPaymentAttempt,
  getCustomerPaymentStatus,
  type CustomerPaymentStatus,
} from '../services/customerPayments'
import { navigate } from '../utils/navigation'

function money(value?: number | null) {
  if (value == null) return ''
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

function readSessionValue(key: string) {
  localStorage.removeItem(key)
  return sessionStorage.getItem(key)
}

export default function PaymentResultPage({ session }: { session: CustomerSession | null }) {
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const orderId = params.get('orderId') || ''
  const requestedAttemptId = params.get('attemptId') || ''
  const qrTokenKey = orderId ? `customerPaymentQrToken:${orderId}` : ''
  const qrToken = qrTokenKey ? readSessionValue(qrTokenKey) : null
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
      setStatus(await getCustomerPaymentStatus(orderId, qrToken, session?.token, requestedAttemptId))
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không kiểm tra được trạng thái thanh toán.')
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  useEffect(() => { void loadStatus() }, [orderId, requestedAttemptId, session?.token])

  const paid = status?.paid === true
  const requiresReview = status?.requiresReview === true
  const cancelled = status?.attemptStatus === 'Cancelled'
  const expired = status?.attemptStatus === 'Expired'
  const failed = status?.attemptStatus === 'Failed'
  const pending = !paid && !requiresReview && !cancelled && !expired && !failed
  const channelUnavailable = pending && status?.paymentChannelReady === false

  useVisiblePolling(() => loadStatus(false), 3000, Boolean(orderId && pending && status))

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
    const returnPath = readSessionValue('customerPaymentReturnPath')
    sessionStorage.removeItem('customerPaymentReturnPath')
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
            : channelUnavailable
              ? 'Kênh thanh toán đang tạm ngừng'
              : 'Quét QR để thanh toán'

  const icon = paid
    ? <CheckCircle2 className="size-6" />
    : requiresReview || channelUnavailable
      ? <AlertTriangle className="size-6" />
      : cancelled || expired || failed
        ? <XCircle className="size-6" />
        : <Clock3 className="size-6" />

  return (
    <main className="sera-page">
      <header className="sera-page-head">
        <div>
          <p className="sera-kicker">Thanh toán qua SePay</p>
          <h1 className="sera-title mt-3">{heading}</h1>
          {status ? <p>Đơn <strong className="text-foreground">{status.orderCode}</strong>{paid && status.amount != null ? <> đã thanh toán <strong className="text-foreground">{money(status.amount)}</strong>.</> : '.'}</p> : <p>Hệ thống đang kiểm tra phiên thanh toán của đơn hàng.</p>}
        </div>
        <div className="flex items-center justify-end gap-4">
          <span className="grid size-12 place-items-center border border-border text-accent">{icon}</span>
          <Badge variant={paid ? 'default' : cancelled || expired || failed ? 'destructive' : 'secondary'}>{paid ? 'Đã thanh toán' : pending ? 'Đang chờ' : requiresReview ? 'Đối soát' : status?.attemptStatus || 'Đang xử lý'}</Badge>
        </div>
      </header>

      <section className="mt-10">
        {pending && !channelUnavailable && status?.qrCode ? (
          <div className="grid gap-12 lg:grid-cols-[360px_minmax(0,1fr)]">
            <div>
              <p className="sera-kicker mb-4">Mã VietQR</p>
              <div className="border-y border-border bg-white py-6"><img src={status.qrCode} alt="Mã QR VietQR thanh toán đơn hàng" className="mx-auto aspect-square w-full max-w-[320px] object-contain" /></div>
              <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><RefreshCw className="size-3.5 animate-spin" /> Hệ thống tự kiểm tra giao dịch mỗi vài giây.</p>
            </div>

            <div>
              <p className="sera-kicker">Thông tin chuyển khoản</p>
              <dl className="mt-4 border-t border-border">
                {[
                  ['Ngân hàng', status.bankCode || 'HDBank'],
                  ['Chủ tài khoản', status.accountHolder || '—'],
                  ['Số tài khoản', status.accountNumber || '—'],
                  ['Số tiền', money(status.expectedAmount ?? status.amount)],
                  ['Nội dung', status.transferContent || '—'],
                ].map(([label, value]) => <div className="grid gap-2 border-b border-border py-4 sm:grid-cols-[150px_1fr]" key={label}><dt className="text-[10px] font-bold uppercase tracking-[.12em] text-muted-foreground">{label}</dt><dd className="m-0 break-words text-sm font-semibold">{value}</dd></div>)}
              </dl>
              <Alert className="mt-6"><AlertTriangle /><AlertTitle>Giữ nguyên số tiền và nội dung</AlertTitle><AlertDescription>SePay dựa vào hai thông tin này để tự động xác nhận đúng đơn hàng.</AlertDescription></Alert>
            </div>
          </div>
        ) : null}

        <div className="mt-8 grid gap-4">
          {channelUnavailable ? <Alert variant="destructive"><AlertTitle>Kênh xác nhận SePay đang mất kết nối</AlertTitle><AlertDescription>{status?.paymentUnavailableReason || 'Không chuyển khoản cho đến khi nhà hàng mở lại kênh thanh toán.'} Mã QR đã được ẩn để tránh tiền đã chuyển nhưng đơn hàng chưa được tự động cập nhật.</AlertDescription></Alert> : null}
          {pending && !channelUnavailable && status && !status.qrCode ? <Alert variant="destructive"><AlertTitle>Chưa lấy được mã QR</AlertTitle><AlertDescription>Hãy quay lại đơn hàng và tạo lại phiên thanh toán.</AlertDescription></Alert> : null}
          {requiresReview ? <Alert><AlertTriangle /><AlertTitle>Giao dịch cần đối soát</AlertTitle><AlertDescription>SePay đã báo có giao dịch nhưng hệ thống chưa thể tự gắn khoản tiền này vào đơn hàng.{status?.receivedAmount != null ? ` Số tiền nhận được: ${money(status.receivedAmount)}.` : ''}</AlertDescription></Alert> : null}
          {cancelled ? <Alert><XCircle /><AlertTitle>Phiên thanh toán đã hủy</AlertTitle><AlertDescription>Đơn hàng vẫn được giữ nguyên. Nếu chuyển tiền bằng QR cũ sau khi hủy, giao dịch sẽ được đưa vào đối soát thay vì tự ghi nhận.</AlertDescription></Alert> : null}
          {expired ? <Alert><Clock3 /><AlertTitle>Phiên QR đã hết hạn</AlertTitle><AlertDescription>Bạn có thể quay lại đơn hàng để tạo mã thanh toán mới.</AlertDescription></Alert> : null}
          {failed ? <Alert variant="destructive"><AlertTitle>Phiên thanh toán không còn hợp lệ</AlertTitle><AlertDescription>Hãy quay lại đơn hàng và thử tạo mã QR mới.</AlertDescription></Alert> : null}
          {error ? <Alert variant="destructive"><AlertTitle>Không thể cập nhật trạng thái</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
        </div>

        {status?.paymentCode ? <p className="mt-5 text-xs text-muted-foreground">Mã thanh toán hệ thống: <strong className="text-foreground">{status.paymentCode}</strong></p> : null}

        <div className="mt-8 flex flex-wrap gap-3 border-t border-border pt-6">
          {pending ? <Button variant="outline" type="button" disabled={loading} onClick={() => void loadStatus()}><RefreshCw className={loading ? 'animate-spin' : ''} /> Kiểm tra ngay</Button> : null}
          {pending && (status?.attemptId || requestedAttemptId) ? <Button variant="destructive" type="button" disabled={cancelling} onClick={() => void cancelPayment()}>{cancelling ? 'Đang hủy…' : 'Hủy phiên thanh toán'}</Button> : null}
          <Button type="button" onClick={goBack}>{paid ? 'Quay lại đơn hàng' : 'Quay lại'}</Button>
        </div>
      </section>
    </main>
  )
}

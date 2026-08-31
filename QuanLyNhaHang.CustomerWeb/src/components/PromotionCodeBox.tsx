import { CheckCircle2, LoaderCircle, Tag } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  applyCustomerPromotion,
  getAppliedCustomerPromotion,
  type CustomerPromotion,
} from '../services/customerPromotions'

function money(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

export default function PromotionCodeBox({
  orderId,
  qrToken,
  accessToken,
}: {
  orderId: string
  qrToken?: string | null
  accessToken?: string | null
}) {
  const [code, setCode] = useState('')
  const [applied, setApplied] = useState<CustomerPromotion | null>(null)
  const [checking, setChecking] = useState(true)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState('')
  const identity = `${orderId}\n${qrToken ?? ''}`
  const identityRef = useRef(identity)

  useEffect(() => {
    identityRef.current = identity
    setCode('')
    setApplied(null)
    setApplying(false)
    setError('')
  }, [identity])

  useEffect(() => {
    let active = true
    setChecking(true)
    setError('')

    void getAppliedCustomerPromotion(orderId, qrToken, accessToken)
      .then(response => {
        if (!active) return
        setApplied(response.data)
        setCode(response.data?.promotionCode ?? '')
      })
      .catch(exception => {
        if (!active) return
        setError(exception instanceof Error ? exception.message : 'Không kiểm tra được mã khuyến mãi của đơn.')
      })
      .finally(() => {
        if (active) setChecking(false)
      })

    return () => { active = false }
  }, [accessToken, orderId, qrToken])

  async function apply() {
    const normalized = code.trim().toUpperCase()
    if (!normalized || applying || applied) return
    const requestIdentity = identityRef.current
    setApplying(true)
    setError('')
    try {
      const response = await applyCustomerPromotion(orderId, normalized, qrToken, accessToken)
      if (identityRef.current !== requestIdentity) return
      setApplied(response.data)
      setCode(response.data.promotionCode)
    } catch (exception) {
      if (identityRef.current !== requestIdentity) return
      setError(exception instanceof Error ? exception.message : 'Không áp dụng được mã khuyến mãi.')
    } finally {
      if (identityRef.current === requestIdentity) setApplying(false)
    }
  }

  return (
    <section className="border border-border p-5">
      <div className="flex gap-3 border-b border-border pb-4">
        <Tag className="mt-0.5 size-4" />
        <div>
          <strong className="block text-[10px] tracking-[0.14em] uppercase">Mã khuyến mãi</strong>
          <small className="mt-2 block text-[11px] leading-5 text-muted-foreground">Nếu đã mở QR trước đó, hệ thống sẽ hủy QR cũ khi áp mã và tạo lại theo số tiền mới.</small>
        </div>
      </div>

      {applied ? (
        <div className="mt-4 flex gap-3 border-l-2 border-foreground pl-4">
          <CheckCircle2 className="mt-0.5 size-4" />
          <div><strong className="block text-sm">{applied.promotionCode} · {applied.promotionName}</strong><span className="mt-1 block text-xs">Giảm {money(applied.discountAmount)}</span><small className="mt-2 block text-[11px] leading-5 text-muted-foreground">Tạm tính sau giảm: {money(applied.finalAmount)}. Phí phục vụ/VAT (nếu có) được tính ở bước thanh toán.</small></div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Input value={code} onChange={event => setCode(event.target.value.toUpperCase())} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void apply() } }} placeholder="Nhập mã, ví dụ: GIAM10" maxLength={50} autoComplete="off" disabled={checking || applying} aria-label="Mã khuyến mãi" />
          <Button variant="outline" type="button" disabled={checking || applying || !code.trim()} onClick={() => void apply()}>{checking || applying ? <LoaderCircle className="animate-spin" data-icon="inline-start" /> : <Tag data-icon="inline-start" />}{checking ? 'Đang kiểm tra' : applying ? 'Đang áp dụng' : 'Áp dụng'}</Button>
        </div>
      )}

      {error ? <Alert variant="destructive" className="mt-4"><AlertTitle>Không áp dụng được mã</AlertTitle><AlertDescription>{error}</AlertDescription></Alert> : null}
    </section>
  )
}

import { CheckCircle2, LoaderCircle, Tag } from 'lucide-react'
import { useEffect, useState } from 'react'
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

  useEffect(() => {
    let active = true
    setChecking(true)
    setError('')

    void getAppliedCustomerPromotion(orderId, qrToken, accessToken)
      .then(response => {
        if (!active) return
        setApplied(response.data)
        if (response.data) setCode(response.data.promotionCode)
      })
      .catch(exception => {
        if (!active) return
        setError(exception instanceof Error
          ? exception.message
          : 'Không kiểm tra được mã khuyến mãi của đơn.')
      })
      .finally(() => {
        if (active) setChecking(false)
      })

    return () => { active = false }
  }, [accessToken, orderId, qrToken])

  async function apply() {
    const normalized = code.trim().toUpperCase()
    if (!normalized || applying || applied) return

    setApplying(true)
    setError('')
    try {
      const response = await applyCustomerPromotion(
        orderId,
        normalized,
        qrToken,
        accessToken,
      )
      setApplied(response.data)
      setCode(response.data.promotionCode)
    } catch (exception) {
      setError(exception instanceof Error
        ? exception.message
        : 'Không áp dụng được mã khuyến mãi.')
    } finally {
      setApplying(false)
    }
  }

  return (
    <section className={applied ? 'customer-promotion-box applied' : 'customer-promotion-box'}>
      <div className="customer-promotion-heading">
        <Tag />
        <div>
          <strong>Mã khuyến mãi</strong>
          <small>Nếu đã mở QR thanh toán trước đó, hệ thống sẽ tự hủy QR cũ khi bạn áp mã và tạo QR mới theo số tiền sau giảm ở lần thanh toán tiếp theo.</small>
        </div>
      </div>

      {applied ? (
        <div className="customer-promotion-applied">
          <CheckCircle2 />
          <div>
            <strong>{applied.promotionCode} · {applied.promotionName}</strong>
            <span>Giảm {money(applied.discountAmount)}</span>
            <small>Tạm tính sau giảm: {money(applied.finalAmount)}. Phí phục vụ/VAT (nếu có) được tính ở bước thanh toán.</small>
          </div>
        </div>
      ) : (
        <div className="customer-promotion-form">
          <input
            value={code}
            onChange={event => setCode(event.target.value.toUpperCase())}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void apply()
              }
            }}
            placeholder="Nhập mã, ví dụ: GIAM10"
            maxLength={50}
            autoComplete="off"
            disabled={checking || applying}
            aria-label="Mã khuyến mãi"
          />
          <button
            className="secondary-button compact"
            type="button"
            disabled={checking || applying || !code.trim()}
            onClick={() => void apply()}
          >
            {checking || applying ? <LoaderCircle className="spin" /> : <Tag />}
            {checking ? 'Đang kiểm tra' : applying ? 'Đang áp dụng' : 'Áp dụng'}
          </button>
        </div>
      )}

      {error ? <small className="customer-promotion-error" role="alert">{error}</small> : null}
    </section>
  )
}

import { optionalCustomerRequest } from './customerRequest'

export type CustomerPromotion = {
  promotionId: string
  promotionCode: string
  promotionName: string
  discountType: 'Percent' | 'Amount'
  discountValue: number
  orderAmount: number
  discountAmount: number
  finalAmount: number
  promotionUsageId: string
  orderId: string
  note?: string | null
}

type AppliedPromotionResponse = {
  success: boolean
  data: CustomerPromotion | null
}

type ApplyPromotionResponse = {
  success: boolean
  message: string
  data: CustomerPromotion
}

export function getAppliedCustomerPromotion(
  orderId: string,
  qrToken?: string | null,
  accessToken?: string | null,
) {
  const params = new URLSearchParams()
  if (qrToken) params.set('qrToken', qrToken)
  const query = params.size ? `?${params}` : ''
  return optionalCustomerRequest<AppliedPromotionResponse>(
    `/api/customer-promotions/orders/${encodeURIComponent(orderId)}/applied${query}`,
    undefined,
    accessToken,
  )
}

export function applyCustomerPromotion(
  orderId: string,
  promotionCode: string,
  qrToken?: string | null,
  accessToken?: string | null,
) {
  return optionalCustomerRequest<ApplyPromotionResponse>(
    `/api/customer-promotions/orders/${encodeURIComponent(orderId)}/apply`,
    {
      method: 'POST',
      body: JSON.stringify({
        promotionCode: promotionCode.trim().toUpperCase(),
        qrToken: qrToken || null,
      }),
    },
    accessToken,
  )
}

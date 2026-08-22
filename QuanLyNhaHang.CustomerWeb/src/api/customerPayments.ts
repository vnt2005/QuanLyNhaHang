import { apiRequest } from './client'

export type CustomerPaymentInstruction = {
  success: boolean
  alreadyPaid: boolean
  reused?: boolean
  orderId?: string
  orderCode?: string
  attemptId?: string
  attemptStatus?: string
  expiresAt?: string
  qrCode?: string
  transferContent?: string
  bankCode?: string
  accountNumber?: string
  accountHolder?: string
  paymentCode?: string
  amount: number
  subtotal?: number
  discountAmount?: number
  serviceChargeAmount?: number
  vatAmount?: number
  paymentMethod?: string
}

export type CustomerPaymentStatus = {
  orderId: string
  orderCode: string
  orderStatus: string
  paid: boolean
  canPay: boolean
  paymentUnavailableReason?: string | null
  paymentCode?: string | null
  amount?: number | null
  paidAt?: string | null
  paymentMethod?: string | null
  paymentChannelReady?: boolean
  paymentChannelRequired?: boolean
  paymentChannelLastConfirmedAt?: string | null
  attemptId?: string | null
  attemptStatus?: string | null
  requiresReview?: boolean
  reviewReason?: string | null
  expectedAmount?: number | null
  receivedAmount?: number | null
  expiresAt?: string | null
  qrCode?: string | null
  transferContent?: string | null
  bankCode?: string | null
  accountNumber?: string | null
  accountHolder?: string | null
}

export function createCustomerPaymentQr(
  orderId: string,
  qrToken?: string | null,
  accessToken?: string | null,
) {
  return apiRequest<CustomerPaymentInstruction>(
    `/api/customer-payments/orders/${encodeURIComponent(orderId)}/sepay-qr`,
    {
      method: 'POST',
      body: JSON.stringify({ qrToken: qrToken || null }),
    },
    accessToken,
  )
}

export function cancelCustomerPaymentAttempt(
  orderId: string,
  attemptId: string,
  qrToken?: string | null,
  accessToken?: string | null,
) {
  return apiRequest<{ success: boolean; attemptStatus?: string; requiresReview?: boolean }>(
    `/api/customer-payments/orders/${encodeURIComponent(orderId)}/attempts/${encodeURIComponent(attemptId)}/cancel`,
    {
      method: 'POST',
      body: JSON.stringify({ qrToken: qrToken || null }),
    },
    accessToken,
  )
}

export function getCustomerPaymentStatus(
  orderId: string,
  qrToken?: string | null,
  accessToken?: string | null,
  attemptId?: string | null,
) {
  const params = new URLSearchParams()
  if (qrToken) params.set('qrToken', qrToken)
  if (attemptId) params.set('attemptId', attemptId)
  const query = params.size > 0 ? `?${params}` : ''
  return apiRequest<CustomerPaymentStatus>(
    `/api/customer-payments/orders/${encodeURIComponent(orderId)}/status${query}`,
    undefined,
    accessToken,
  )
}

import { apiRequest } from './client'

export type CustomerPaymentLink = {
  success: boolean
  alreadyPaid: boolean
  orderId?: string
  orderCode?: string
  checkoutUrl?: string
  qrCode?: string
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
  paymentCode?: string | null
  amount?: number | null
  paidAt?: string | null
  paymentMethod?: string | null
}

export function createCustomerPaymentLink(
  orderId: string,
  qrToken?: string | null,
  accessToken?: string | null,
) {
  return apiRequest<CustomerPaymentLink>(
    `/api/customer-payments/orders/${encodeURIComponent(orderId)}/payos-link`,
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
) {
  const query = qrToken ? `?qrToken=${encodeURIComponent(qrToken)}` : ''
  return apiRequest<CustomerPaymentStatus>(
    `/api/customer-payments/orders/${encodeURIComponent(orderId)}/status${query}`,
    undefined,
    accessToken,
  )
}

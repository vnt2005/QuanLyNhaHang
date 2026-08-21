export type PaymentOrderType = 'DineIn' | 'Takeaway'

export type PaymentChargeSetting = {
  defaultVatPercent: number
  serviceChargePercent: number
}

export function calculateConfiguredCharges(
  totalAmount: number,
  discountAmount: number,
  setting: PaymentChargeSetting | null,
  orderType: PaymentOrderType,
) {
  const discountedSubtotal = Math.max(0, totalAmount - discountAmount)
  const serviceChargeAmount = orderType === 'DineIn'
    ? Math.round(
        discountedSubtotal * (setting?.serviceChargePercent ?? 0) / 100,
      )
    : 0
  const vatAmount = Math.round(
    (discountedSubtotal + serviceChargeAmount)
      * (setting?.defaultVatPercent ?? 0) / 100,
  )

  return { serviceChargeAmount, vatAmount }
}

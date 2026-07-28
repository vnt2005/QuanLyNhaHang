const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7134'

export type DiscountType = 'Percent' | 'Amount'
export type PromotionUsageStatus = 'Applied' | 'Cancelled'

export type Promotion = {
  id: string
  promotionCode: string
  name: string
  description?: string | null
  discountType: DiscountType
  discountValue: number
  minimumOrderAmount: number
  maximumDiscountAmount?: number | null
  startDate: string
  endDate: string
  usageLimit?: number | null
  usedCount: number
  isActive: boolean
  createdAt: string
  updatedAt?: string | null
}

export type PromotionUsage = {
  id: string
  promotionId: string
  promotionCode: string
  promotionName: string
  orderId: string
  orderCode: string
  paymentId?: string | null
  paymentCode?: string | null
  orderAmount: number
  discountAmount: number
  status: PromotionUsageStatus
  note?: string | null
  usedAt: string
  cancelledAt?: string | null
}

export type PaginatedPromotions = {
  items: Promotion[]
  pageNumber: number
  totalPages: number
  totalCount: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export type PaginatedPromotionUsages = {
  items: PromotionUsage[]
  pageNumber: number
  totalPages: number
  totalCount: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export type PromotionInput = {
  promotionCode: string
  name: string
  description: string
  discountType: DiscountType
  discountValue: number
  minimumOrderAmount: number
  maximumDiscountAmount: number | null
  startDate: string
  endDate: string
  usageLimit: number | null
}

export type UpdatePromotionInput = Omit<PromotionInput, 'promotionCode'> & {
  isActive: boolean
}

export type ApplyPromotionResult = {
  promotionId: string
  promotionCode: string
  promotionName: string
  discountType: DiscountType
  discountValue: number
  orderAmount: number
  discountAmount: number
  finalAmount: number
  promotionUsageId: string
  orderId: string
  note?: string | null
}

export type PromotionOrderItem = {
  quantity: number
  totalPrice: number
  status: string
}

export type PromotionOrder = {
  id: string
  restaurantTableName: string
  orderCode: string
  status: string
  totalAmount: number
  createdAt: string
  items?: PromotionOrderItem[]
}

export type PromotionPayment = {
  id: string
  orderId: string
  paymentCode: string
  finalAmount: number
  status: string
  paidAt: string
}

type PaginatedOrders = {
  items: PromotionOrder[]
}

type PaginatedPayments = {
  items: PromotionPayment[]
}

type PromotionResponse = {
  success: boolean
  message: string
  data: Promotion
}

type ApplyPromotionResponse = {
  success: boolean
  message: string
  data: ApplyPromotionResult
}

type PromotionUsageResponse = {
  success: boolean
  message: string
  data: PromotionUsage
}

type ApiMessage = {
  success?: boolean
  message?: string
}

function getErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const value = body as {
      message?: string
      title?: string
      errors?: Record<string, string[]>
    }
    if (value.message) return value.message
    if (value.errors) {
      return Object.values(value.errors).flat().find(Boolean) ?? 'Dữ liệu không hợp lệ.'
    }
    if (value.title) return value.title
  }
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (status === 403) return 'Tài khoản của bạn không có quyền thực hiện thao tác này.'
  return 'Yêu cầu không thành công.'
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = sessionStorage.getItem('accessToken')
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(getErrorMessage(body, response.status))
  return body as T
}

export function getPromotions(
  keyword = '',
  discountType = '',
  isActive = '',
  isValidNow = '',
  pageNumber = 1,
  pageSize = 8,
) {
  const params = new URLSearchParams({
    pageNumber: String(pageNumber),
    pageSize: String(pageSize),
  })
  if (keyword.trim()) params.set('keyword', keyword.trim())
  if (discountType) params.set('discountType', discountType)
  if (isActive) params.set('isActive', isActive)
  if (isValidNow) params.set('isValidNow', isValidNow)
  return request<PaginatedPromotions>(`/api/promotions/paginated?${params}`)
}

export function getAllPromotions() {
  return request<Promotion[]>('/api/promotions')
}

export function getPromotion(id: string) {
  return request<Promotion>(`/api/promotions/${id}`)
}

export function createPromotion(input: PromotionInput) {
  return request<PromotionResponse>('/api/promotions', {
    method: 'POST',
    body: JSON.stringify({
      ...input,
      promotionCode: input.promotionCode.trim().toUpperCase(),
      name: input.name.trim(),
      description: input.description.trim() || null,
    }),
  })
}

export function updatePromotion(id: string, input: UpdatePromotionInput) {
  return request<PromotionResponse>(`/api/promotions/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      id,
      ...input,
      name: input.name.trim(),
      description: input.description.trim() || null,
    }),
  })
}

export function deactivatePromotion(id: string) {
  return request<ApiMessage>(`/api/promotions/${id}`, { method: 'DELETE' })
}

export function applyPromotion(orderId: string, promotionCode: string, note: string) {
  return request<ApplyPromotionResponse>('/api/promotions/apply', {
    method: 'POST',
    body: JSON.stringify({
      orderId,
      promotionCode: promotionCode.trim().toUpperCase(),
      note: note.trim() || null,
    }),
  })
}

export function getPromotionUsages(
  keyword = '',
  promotionId = '',
  status = '',
  fromDate = '',
  toDate = '',
  pageNumber = 1,
  pageSize = 10,
) {
  const params = new URLSearchParams({
    pageNumber: String(pageNumber),
    pageSize: String(pageSize),
  })
  if (keyword.trim()) params.set('keyword', keyword.trim())
  if (promotionId) params.set('promotionId', promotionId)
  if (status) params.set('status', status)
  if (fromDate) params.set('fromDate', fromDate)
  if (toDate) params.set('toDate', toDate)
  return request<PaginatedPromotionUsages>(`/api/promotion-usages/paginated?${params}`)
}

export function getAllPromotionUsages() {
  return request<PromotionUsage[]>('/api/promotion-usages')
}

export function getPromotionUsage(id: string) {
  return request<PromotionUsage>(`/api/promotion-usages/${id}`)
}

export function updatePromotionUsagePayment(id: string, paymentId: string) {
  return request<PromotionUsageResponse>(`/api/promotion-usages/${id}/payment`, {
    method: 'PATCH',
    body: JSON.stringify({ id, paymentId }),
  })
}

export function cancelPromotionUsage(id: string) {
  return request<ApiMessage>(`/api/promotion-usages/${id}`, { method: 'DELETE' })
}

export async function getPromotionOrders() {
  const params = new URLSearchParams({
    pageNumber: '1',
    pageSize: '100',
    isActive: 'true',
  })
  const result = await request<PaginatedOrders>(`/api/Orders/paginated?${params}`)
  return result.items ?? []
}

export async function getPaidPromotionPayments() {
  const params = new URLSearchParams({
    pageNumber: '1',
    pageSize: '100',
    status: 'Paid',
  })
  const result = await request<PaginatedPayments>(`/api/payments/paginated?${params}`)
  return result.items ?? []
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7134'

export type RestaurantSetting = {
  id: string
  restaurantName: string
  address: string
  phoneNumber: string
  email?: string | null
  taxCode?: string | null
  websiteUrl?: string | null
  logoUrl?: string | null
  defaultVatPercent: number
  serviceChargePercent: number
  currency: string
  openingTime: string
  closingTime: string
  invoiceFooter?: string | null
  qrOrderWelcomeMessage?: string | null
  isActive: boolean
  createdAt: string
  updatedAt?: string | null
}

export type PaginatedRestaurantSettings = {
  items: RestaurantSetting[]
  pageNumber: number
  totalPages: number
  totalCount: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export type RestaurantSettingInput = {
  restaurantName: string
  address: string
  phoneNumber: string
  email: string
  taxCode: string
  websiteUrl: string
  logoUrl: string
  defaultVatPercent: number
  serviceChargePercent: number
  currency: string
  openingTime: string
  closingTime: string
  invoiceFooter: string
  qrOrderWelcomeMessage: string
}

export type UpdateRestaurantSettingInput = RestaurantSettingInput & {
  isActive: boolean
}

type RestaurantSettingResponse = {
  success: boolean
  message: string
  data: RestaurantSetting
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

function normalizeInput(input: RestaurantSettingInput) {
  return {
    restaurantName: input.restaurantName.trim(),
    address: input.address.trim(),
    phoneNumber: input.phoneNumber.trim(),
    email: input.email.trim() || null,
    taxCode: input.taxCode.trim() || null,
    websiteUrl: input.websiteUrl.trim() || null,
    logoUrl: input.logoUrl.trim() || null,
    defaultVatPercent: input.defaultVatPercent,
    serviceChargePercent: input.serviceChargePercent,
    currency: input.currency.trim().toUpperCase(),
    openingTime: input.openingTime,
    closingTime: input.closingTime,
    invoiceFooter: input.invoiceFooter.trim() || null,
    qrOrderWelcomeMessage: input.qrOrderWelcomeMessage.trim() || null,
  }
}

export function getRestaurantSettings(isActive = '') {
  const params = new URLSearchParams()
  if (isActive) params.set('isActive', isActive)
  const query = params.toString()
  return request<RestaurantSetting[]>(`/api/restaurant-settings${query ? `?${query}` : ''}`)
}

export function getPaginatedRestaurantSettings(
  keyword = '',
  isActive = '',
  pageNumber = 1,
  pageSize = 8,
) {
  const params = new URLSearchParams({
    pageNumber: String(pageNumber),
    pageSize: String(pageSize),
  })
  if (keyword.trim()) params.set('keyword', keyword.trim())
  if (isActive) params.set('isActive', isActive)
  return request<PaginatedRestaurantSettings>(
    `/api/restaurant-settings/paginated?${params}`,
  )
}

export function getRestaurantSetting(id: string) {
  return request<RestaurantSetting>(`/api/restaurant-settings/${id}`)
}

export function createRestaurantSetting(input: RestaurantSettingInput) {
  return request<RestaurantSettingResponse>('/api/restaurant-settings', {
    method: 'POST',
    body: JSON.stringify(normalizeInput(input)),
  })
}

export function updateRestaurantSetting(id: string, input: UpdateRestaurantSettingInput) {
  return request<RestaurantSettingResponse>(`/api/restaurant-settings/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      id,
      ...normalizeInput(input),
      isActive: input.isActive,
    }),
  })
}

export function deactivateRestaurantSetting(id: string) {
  return request<ApiMessage>(`/api/restaurant-settings/${id}`, { method: 'DELETE' })
}

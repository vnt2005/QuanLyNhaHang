const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7134'

const CUSTOMER_ACCESS_TOKEN_KEY = 'customerAccessToken'
const CUSTOMER_REFRESH_TOKEN_KEY = 'customerRefreshToken'

type ApiEnvelope<T> = {
  message?: string
  data?: T
}

type ApiProblem = {
  message?: string
  title?: string
  detail?: string
  errors?: Record<string, string[]>
}

type CustomerAuthResult = {
  userId?: string
  sessionId?: string | null
  ho?: string | null
  ten?: string
  email?: string
  phoneNumber?: string | null
  role?: string
  isActive?: boolean
  isEmailVerified?: boolean
  requiresEmailVerification?: boolean
  twoFactorEnabled?: boolean
  requiresTwoFactor?: boolean
  token?: string
  refreshToken?: string
  refreshTokenExpiresAt?: string | null
  permissions?: string[]
  message?: string
}

export type CustomerSession = {
  userId: string
  sessionId?: string | null
  ho?: string | null
  ten: string
  email: string
  phoneNumber?: string | null
  role: 'Customer'
  isEmailVerified: boolean
  token: string
  refreshToken: string
  refreshTokenExpiresAt?: string | null
}

export type CustomerLoginOutcome =
  | { kind: 'authenticated'; session: CustomerSession; message: string }
  | { kind: 'two-factor'; email: string; message: string }
  | { kind: 'verify-email'; email: string; message: string }

export type CustomerRegisterInput = {
  ho?: string
  ten: string
  email: string
  phoneNumber: string
  password: string
}

export type CustomerPasswordInput = {
  currentPassword: string
  newPassword: string
  confirmNewPassword: string
}

const refreshRequests = new Map<string, Promise<CustomerSession>>()

function getErrorMessage(body: unknown, status: number) {
  if (body && typeof body === 'object') {
    const value = body as ApiProblem
    if (value.message) return value.message
    if (value.detail) return value.detail
    if (value.errors) {
      return Object.values(value.errors).flat().find(Boolean)
        ?? 'Dữ liệu không hợp lệ.'
    }
    if (value.title) return value.title
  }
  if (status === 401) return 'Email, mật khẩu hoặc mã xác thực không đúng.'
  if (status === 403) return 'Tài khoản không có quyền thực hiện thao tác này.'
  if (status === 429) return 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.'
  return 'Không thể xác thực tài khoản. Vui lòng thử lại.'
}

async function request<T>(
  path: string,
  init?: RequestInit,
  accessToken?: string,
): Promise<ApiEnvelope<T>> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(getErrorMessage(body, response.status))
  return (body ?? {}) as ApiEnvelope<T>
}

function resultFrom(envelope: ApiEnvelope<CustomerAuthResult>) {
  return {
    ...(envelope.data ?? {}),
    message: envelope.message ?? envelope.data?.message,
  }
}

async function revokeUnexpectedSession(result: CustomerAuthResult) {
  if (!result.refreshToken) return
  await request<never>('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: result.refreshToken }),
  }).catch(() => undefined)
}

async function requireCustomerRole(result: CustomerAuthResult) {
  if (result.role && result.role !== 'Customer') {
    await revokeUnexpectedSession(result)
    throw new Error('Trang này chỉ dành cho tài khoản khách hàng.')
  }
}

function storeCustomerSession(session: CustomerSession) {
  sessionStorage.setItem(CUSTOMER_ACCESS_TOKEN_KEY, session.token)
  localStorage.setItem(CUSTOMER_REFRESH_TOKEN_KEY, session.refreshToken)
}

function toCustomerSession(result: CustomerAuthResult): CustomerSession {
  if (
    result.role !== 'Customer'
    || !result.userId
    || !result.ten
    || !result.email
    || !result.token
    || !result.refreshToken
  ) {
    throw new Error('Máy chủ không trả về phiên khách hàng hợp lệ.')
  }

  const session: CustomerSession = {
    userId: result.userId,
    sessionId: result.sessionId,
    ho: result.ho,
    ten: result.ten,
    email: result.email,
    phoneNumber: result.phoneNumber,
    role: 'Customer',
    isEmailVerified: Boolean(result.isEmailVerified),
    token: result.token,
    refreshToken: result.refreshToken,
    refreshTokenExpiresAt: result.refreshTokenExpiresAt,
  }
  storeCustomerSession(session)
  return session
}

async function authOutcome(
  result: CustomerAuthResult,
  fallbackEmail: string,
): Promise<CustomerLoginOutcome> {
  await requireCustomerRole(result)
  const email = result.email?.trim().toLowerCase() || fallbackEmail.trim().toLowerCase()
  const message = result.message ?? 'Đăng nhập thành công.'

  if (result.requiresEmailVerification) {
    return { kind: 'verify-email', email, message }
  }
  if (result.requiresTwoFactor) {
    return { kind: 'two-factor', email, message }
  }
  return { kind: 'authenticated', session: toCustomerSession(result), message }
}

export function hasStoredCustomerSession() {
  return Boolean(localStorage.getItem(CUSTOMER_REFRESH_TOKEN_KEY))
}

export function clearCustomerSession() {
  sessionStorage.removeItem(CUSTOMER_ACCESS_TOKEN_KEY)
  localStorage.removeItem(CUSTOMER_REFRESH_TOKEN_KEY)
}

export function getStoredCustomerAccessToken() {
  return sessionStorage.getItem(CUSTOMER_ACCESS_TOKEN_KEY)
}

export async function loginCustomer(email: string, password: string) {
  const envelope = await request<CustomerAuthResult>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
    }),
  })
  return authOutcome(resultFrom(envelope), email)
}

export async function verifyCustomerTwoFactor(email: string, code: string) {
  const envelope = await request<CustomerAuthResult>('/api/auth/verify-2fa', {
    method: 'POST',
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      code: code.trim(),
    }),
  })
  return authOutcome(resultFrom(envelope), email)
}

export async function registerCustomer(input: CustomerRegisterInput) {
  const envelope = await request<CustomerAuthResult>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      ho: input.ho?.trim() || null,
      ten: input.ten.trim(),
      email: input.email.trim().toLowerCase(),
      phoneNumber: input.phoneNumber.trim(),
      password: input.password,
    }),
  })
  const result = resultFrom(envelope)
  await requireCustomerRole(result)
  return {
    email: result.email?.trim().toLowerCase() || input.email.trim().toLowerCase(),
    message: result.message ?? 'Đăng ký thành công. Vui lòng xác minh email.',
  }
}

export async function verifyCustomerEmail(email: string, code: string) {
  const envelope = await request<never>('/api/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      code: code.trim(),
    }),
  })
  return envelope.message ?? 'Xác minh email thành công.'
}

export async function resendCustomerVerification(email: string) {
  const envelope = await request<never>('/api/auth/resend-verification-email', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  })
  return envelope.message ?? 'Đã gửi lại mã xác minh email.'
}

export async function forgotCustomerPassword(email: string) {
  const envelope = await request<never>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  })
  return envelope.message ?? 'Nếu email tồn tại, mã đặt lại mật khẩu đã được gửi.'
}

export async function resetCustomerPassword(
  email: string,
  code: string,
  newPassword: string,
) {
  const envelope = await request<never>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      code: code.trim(),
      newPassword,
    }),
  })
  return envelope.message ?? 'Đặt lại mật khẩu thành công.'
}

export async function changeCustomerPassword(input: CustomerPasswordInput) {
  const accessToken = sessionStorage.getItem(CUSTOMER_ACCESS_TOKEN_KEY)
  if (!accessToken) throw new Error('Phiên khách hàng đã hết hạn. Vui lòng đăng nhập lại.')
  const envelope = await request<never>(
    '/api/auth/change-password',
    { method: 'POST', body: JSON.stringify(input) },
    accessToken,
  )
  clearCustomerSession()
  return envelope.message ?? 'Đổi mật khẩu thành công.'
}

export function restoreCustomerSession(): Promise<CustomerSession> {
  const refreshToken = localStorage.getItem(CUSTOMER_REFRESH_TOKEN_KEY) ?? ''
  if (!refreshToken) return Promise.reject(new Error('Không có phiên khách hàng đã lưu.'))

  const existing = refreshRequests.get(refreshToken)
  if (existing) return existing

  const refresh = request<CustomerAuthResult>('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  })
    .then(resultFrom)
    .then(async result => {
      await requireCustomerRole(result)
      return toCustomerSession(result)
    })
    .catch(exception => {
      clearCustomerSession()
      throw exception
    })

  refreshRequests.set(refreshToken, refresh)
  refresh.then(
    () => window.setTimeout(() => refreshRequests.delete(refreshToken), 10_000),
    () => window.setTimeout(() => refreshRequests.delete(refreshToken), 10_000),
  )
  return refresh
}

export async function logoutCustomer() {
  const refreshToken = localStorage.getItem(CUSTOMER_REFRESH_TOKEN_KEY) ?? ''
  clearCustomerSession()
  if (!refreshToken) return 'Đã đăng xuất.'
  const envelope = await request<never>('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  })
  return envelope.message ?? 'Đăng xuất thành công.'
}

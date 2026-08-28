import { clearTakeawayCart } from '../utils/takeawayCart'
import { ApiError, apiRequest } from './client'

const ACCESS_TOKEN_KEY = 'customerAccessToken'
const REFRESH_TOKEN_KEY = 'customerRefreshToken'

type ApiEnvelope<T> = { message?: string; data?: T }

type CustomerAuthResult = {
  userId?: string
  sessionId?: string | null
  ho?: string | null
  ten?: string
  email?: string
  phoneNumber?: string | null
  role?: string
  isEmailVerified?: boolean
  requiresEmailVerification?: boolean
  requiresTwoFactor?: boolean
  token?: string
  refreshToken?: string
  refreshTokenExpiresAt?: string | null
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

export type RegisterCustomerInput = {
  ho?: string
  ten: string
  email: string
  phoneNumber: string
  password: string
}

let refreshRequest: Promise<CustomerSession> | null = null

export class CustomerSessionRefreshSupersededError extends Error {
  constructor() {
    super('Phiên làm mới đã được thay thế bởi lần đăng nhập mới.')
    this.name = 'CustomerSessionRefreshSupersededError'
  }
}

function unwrap(envelope: ApiEnvelope<CustomerAuthResult>) {
  return {
    ...(envelope.data ?? {}),
    message: envelope.message ?? envelope.data?.message,
  }
}

async function rejectEmployeeSession(result: CustomerAuthResult) {
  if (!result.role || result.role === 'Customer') return
  if (result.refreshToken) {
    await apiRequest('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: result.refreshToken }),
    }).catch(() => undefined)
  }
  throw new Error('Website này chỉ dành cho tài khoản khách hàng.')
}

function saveSession(session: CustomerSession) {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, session.token)
  sessionStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken)
  removeLegacyPersistentSession()
}

function storedRefreshToken() {
  return sessionStorage.getItem(REFRESH_TOKEN_KEY) ?? ''
}

function removeLegacyPersistentSession() {
  // Refresh tokens used to be stored persistently. Remove that old value so
  // upgrading the website immediately signs out previously remembered users.
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

function toSession(result: CustomerAuthResult) {
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
  saveSession(session)
  return session
}

async function outcome(result: CustomerAuthResult, fallbackEmail: string) {
  await rejectEmployeeSession(result)
  const email = result.email?.trim().toLowerCase()
    || fallbackEmail.trim().toLowerCase()
  const message = result.message ?? 'Đăng nhập thành công.'
  if (result.requiresEmailVerification) {
    return { kind: 'verify-email', email, message } as const
  }
  if (result.requiresTwoFactor) {
    return { kind: 'two-factor', email, message } as const
  }
  return {
    kind: 'authenticated',
    session: toSession(result),
    message,
  } as const
}

export function getCustomerAccessToken() {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY)
}

export function hasCustomerSession() {
  removeLegacyPersistentSession()
  return Boolean(storedRefreshToken())
}

export function clearCustomerSession() {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  sessionStorage.removeItem(REFRESH_TOKEN_KEY)
  removeLegacyPersistentSession()
}

function clearCustomerLogoutState() {
  clearTakeawayCart()
  localStorage.removeItem('customerLastQrToken')
  localStorage.removeItem('customerReturnPath')
}

function clearCustomerSessionIfCurrent(refreshToken: string) {
  if (storedRefreshToken() !== refreshToken) return
  clearCustomerSession()
}

export async function loginCustomer(email: string, password: string) {
  const envelope = await apiRequest<ApiEnvelope<CustomerAuthResult>>(
    '/api/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    },
  )
  return outcome(unwrap(envelope), email)
}

export async function registerCustomer(input: RegisterCustomerInput) {
  const envelope = await apiRequest<ApiEnvelope<CustomerAuthResult>>(
    '/api/auth/register',
    {
      method: 'POST',
      body: JSON.stringify({
        ho: input.ho?.trim() || null,
        ten: input.ten.trim(),
        email: input.email.trim().toLowerCase(),
        phoneNumber: input.phoneNumber.trim(),
        password: input.password,
      }),
    },
  )
  const result = unwrap(envelope)
  await rejectEmployeeSession(result)
  return {
    email: result.email?.trim().toLowerCase()
      || input.email.trim().toLowerCase(),
    message: result.message ?? 'Đăng ký thành công. Vui lòng xác minh email.',
  }
}

export async function verifyCustomerEmail(email: string, code: string) {
  const envelope = await apiRequest<ApiEnvelope<never>>('/api/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim() }),
  })
  return envelope.message ?? 'Xác minh email thành công.'
}

export async function resendCustomerVerification(email: string) {
  const envelope = await apiRequest<ApiEnvelope<never>>(
    '/api/auth/resend-verification-email',
    {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    },
  )
  return envelope.message ?? 'Đã gửi lại mã xác minh.'
}

export async function verifyCustomerTwoFactor(email: string, code: string) {
  const envelope = await apiRequest<ApiEnvelope<CustomerAuthResult>>(
    '/api/auth/verify-2fa',
    {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim() }),
    },
  )
  return outcome(unwrap(envelope), email)
}

export async function forgotCustomerPassword(email: string) {
  const envelope = await apiRequest<ApiEnvelope<never>>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  })
  return envelope.message ?? 'Nếu email tồn tại, mã đặt lại đã được gửi.'
}

export async function resetCustomerPassword(
  email: string,
  code: string,
  newPassword: string,
) {
  const envelope = await apiRequest<ApiEnvelope<never>>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      code: code.trim(),
      newPassword,
    }),
  })
  return envelope.message ?? 'Đặt lại mật khẩu thành công.'
}

export async function changeCustomerPassword(input: {
  currentPassword: string
  newPassword: string
  confirmNewPassword: string
}) {
  const token = getCustomerAccessToken()
  if (!token) throw new ApiError('Phiên đăng nhập đã hết hạn.', 401)
  const envelope = await apiRequest<ApiEnvelope<never>>(
    '/api/auth/change-password',
    { method: 'POST', body: JSON.stringify(input) },
    token,
  )
  clearCustomerSession()
  clearCustomerLogoutState()
  return envelope.message ?? 'Đổi mật khẩu thành công.'
}

export function restoreCustomerSession() {
  removeLegacyPersistentSession()
  const refreshToken = storedRefreshToken()
  if (!refreshToken) {
    return Promise.reject(new Error('Không có phiên khách hàng đã lưu.'))
  }
  if (refreshRequest) return refreshRequest

  refreshRequest = apiRequest<ApiEnvelope<CustomerAuthResult>>('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  })
    .then(unwrap)
    .then(async result => {
      await rejectEmployeeSession(result)
      if (storedRefreshToken() !== refreshToken) {
        throw new CustomerSessionRefreshSupersededError()
      }
      return toSession(result)
    })
    .catch(error => {
      if (storedRefreshToken() !== refreshToken) {
        throw error instanceof CustomerSessionRefreshSupersededError
          ? error
          : new CustomerSessionRefreshSupersededError()
      }
      clearCustomerSessionIfCurrent(refreshToken)
      throw error
    })
    .finally(() => {
      refreshRequest = null
    })

  return refreshRequest
}

export async function logoutCustomer() {
  const refreshToken = storedRefreshToken()
  clearCustomerSession()
  clearCustomerLogoutState()
  if (!refreshToken) return
  await apiRequest('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  })
}

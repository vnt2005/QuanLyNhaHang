const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export type LoginRequest = {
  email: string
  password: string
}

export type RegisterInput = {
  ho?: string
  ten: string
  email: string
  phoneNumber: string
  password: string
}

export type LoginResult = {
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
  token?: string
  refreshToken?: string
  refreshTokenExpiresAt?: string | null
  permissions?: string[]
  message?: string
}

export type CurrentSession = {
  userId: string
  sessionId: string
  ho?: string | null
  ten: string
  email: string
  phoneNumber?: string | null
  role: string
  isActive: boolean
  isEmailVerified: boolean
  permissions: string[]
}

export type AuthSession = {
  sessionId: string
  createdAt: string
  expiresAt: string
  lastUsedAt?: string | null
  revokedAt?: string | null
  revocationReason?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  isActive: boolean
  isCurrent: boolean
}

export type ChangePasswordInput = {
  currentPassword: string
  newPassword: string
  confirmNewPassword: string
}

export type ResetPasswordInput = {
  email: string
  code: string
  newPassword: string
}

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

export class AuthApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'AuthApiError'
    this.status = status
  }
}

const ACCESS_TOKEN_KEY = 'accessToken'
const REFRESH_TOKEN_KEY = 'refreshToken'
const refreshRequests = new Map<string, Promise<LoginResult>>()

function removeLegacyPersistentAuth() {
  // Refresh tokens used to be persistent. Never migrate them into the new
  // per-tab session because opening a new browser session must start signed out.
  localStorage.removeItem(REFRESH_TOKEN_KEY)
}

function storedRefreshToken() {
  removeLegacyPersistentAuth()
  return sessionStorage.getItem(REFRESH_TOKEN_KEY) ?? ''
}

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
  if (status === 401) return 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.'
  if (status === 403) return 'Tài khoản không có quyền thực hiện thao tác này.'
  if (status === 429) return 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.'
  return 'Yêu cầu xác thực không thành công.'
}

async function request<T>(
  path: string,
  init?: RequestInit,
  authenticated = false,
  accessTokenOverride?: string,
): Promise<ApiEnvelope<T>> {
  const accessToken =
    accessTokenOverride ?? sessionStorage.getItem(ACCESS_TOKEN_KEY)

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(authenticated && accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : {}),
        ...init?.headers,
      },
    })
  } catch {
    throw new AuthApiError(
      'Không kết nối được API của hệ thống. Vui lòng kiểm tra Docker/API đang chạy.',
      0,
    )
  }

  const body = await response.json().catch(() => null)
  if (!response.ok) {
    throw new AuthApiError(getErrorMessage(body, response.status), response.status)
  }
  return (body ?? {}) as ApiEnvelope<T>
}

function authResult(envelope: ApiEnvelope<LoginResult>): LoginResult {
  return {
    ...(envelope.data ?? {}),
    permissions: Array.isArray(envelope.data?.permissions)
      ? envelope.data.permissions
      : [],
    message: envelope.message ?? envelope.data?.message,
  }
}

export function storeAuthResult(result: LoginResult) {
  if (result.token) sessionStorage.setItem(ACCESS_TOKEN_KEY, result.token)
  if (result.refreshToken) {
    sessionStorage.setItem(REFRESH_TOKEN_KEY, result.refreshToken)
  }
  removeLegacyPersistentAuth()
}

export function clearStoredAuth() {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  sessionStorage.removeItem(REFRESH_TOKEN_KEY)
  removeLegacyPersistentAuth()
}

export function getStoredRefreshToken() {
  return storedRefreshToken()
}

export async function login(payload: LoginRequest): Promise<LoginResult> {
  const envelope = await request<LoginResult>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: payload.email.trim().toLowerCase(),
      password: payload.password,
    }),
  })
  return authResult(envelope)
}

export async function register(
  input: RegisterInput,
): Promise<LoginResult> {
  const envelope = await request<LoginResult>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      ho: input.ho?.trim() || null,
      ten: input.ten.trim(),
      email: input.email.trim().toLowerCase(),
      phoneNumber: input.phoneNumber.trim(),
      password: input.password,
    }),
  })
  return authResult(envelope)
}

export function refreshSession(refreshToken: string): Promise<LoginResult> {
  const existing = refreshRequests.get(refreshToken)
  if (existing) return existing

  const refresh = request<LoginResult>('/api/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  }).then(authResult)

  refreshRequests.set(refreshToken, refresh)
  window.setTimeout(() => refreshRequests.delete(refreshToken), 10_000)
  return refresh
}

export async function logoutSession(refreshToken: string) {
  if (!refreshToken) return 'Đã đăng xuất.'
  const envelope = await request<never>('/api/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  })
  return envelope.message ?? 'Đăng xuất thành công.'
}

export async function getCurrentSession(): Promise<CurrentSession> {
  const envelope = await request<CurrentSession>(
    '/api/auth/me',
    undefined,
    true,
  )
  if (!envelope.data) throw new Error('Không nhận được thông tin tài khoản.')
  return {
    ...envelope.data,
    permissions: Array.isArray(envelope.data.permissions)
      ? envelope.data.permissions
      : [],
  }
}

export async function getAuthSessions(): Promise<AuthSession[]> {
  const envelope = await request<AuthSession[]>(
    '/api/auth/sessions',
    undefined,
    true,
  )
  return Array.isArray(envelope.data) ? envelope.data : []
}

export async function revokeAuthSession(sessionId: string) {
  const envelope = await request<never>(
    `/api/auth/sessions/${sessionId}`,
    { method: 'DELETE' },
    true,
  )
  return envelope.message ?? 'Đã thu hồi phiên đăng nhập.'
}

export async function logoutAllSessions() {
  const envelope = await request<{ revokedCount?: number }>(
    '/api/auth/logout-all',
    { method: 'POST' },
    true,
  )
  return {
    message: envelope.message ?? 'Đã đăng xuất khỏi tất cả thiết bị.',
    revokedCount: Number(envelope.data?.revokedCount) || 0,
  }
}

export async function changePassword(
  input: ChangePasswordInput,
  accessToken: string,
) {
  const envelope = await request<never>(
    '/api/auth/change-password',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    true,
    accessToken,
  )
  return envelope.message ?? 'Đổi mật khẩu thành công.'
}

export async function forgotPassword(email: string) {
  const envelope = await request<never>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  })
  return envelope.message ?? 'Nếu email tồn tại, mã đặt lại mật khẩu đã được gửi.'
}

export async function resetPassword(input: ResetPasswordInput) {
  const envelope = await request<never>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      email: input.email.trim().toLowerCase(),
      code: input.code.trim(),
      newPassword: input.newPassword,
    }),
  })
  return envelope.message ?? 'Đặt lại mật khẩu thành công.'
}

export async function verifyEmail(email: string, code: string) {
  const envelope = await request<never>('/api/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      code: code.trim(),
    }),
  })
  return envelope.message ?? 'Xác minh email thành công.'
}

export async function resendVerificationEmail(email: string) {
  const envelope = await request<never>(
    '/api/auth/resend-verification-email',
    {
      method: 'POST',
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    },
  )
  return envelope.message ?? 'Đã gửi lại mã xác minh email.'
}

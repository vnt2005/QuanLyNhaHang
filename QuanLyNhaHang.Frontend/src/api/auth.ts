const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7134'

export type LoginRequest = {
  email: string
  password: string
}

export type LoginResult = {
  userId?: string
  ho?: string | null
  ten?: string
  email?: string
  phoneNumber?: string | null
  role?: string
  token?: string
  refreshToken?: string
  requiresTwoFactor?: boolean
  twoFactorToken?: string
  message?: string
}

type ApiEnvelope<T> = {
  message?: string
  data?: T
}

export async function login(payload: LoginRequest): Promise<LoginResult> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const body = (await response.json().catch(() => null)) as ApiEnvelope<LoginResult> | null

  if (!response.ok) {
    throw new Error(body?.message ?? 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.')
  }

  return {
    ...(body?.data ?? {}),
    message: body?.message ?? body?.data?.message,
  }
}

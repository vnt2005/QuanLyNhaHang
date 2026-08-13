const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7134'

type ApiProblem = {
  message?: string
  title?: string
  detail?: string
  errors?: Record<string, string[]>
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function errorMessage(body: unknown, status: number) {
  if (body && typeof body === 'object') {
    const problem = body as ApiProblem
    if (problem.message) return problem.message
    if (problem.detail) return problem.detail
    if (problem.errors) {
      return Object.values(problem.errors).flat().find(Boolean)
        ?? 'Dữ liệu chưa hợp lệ.'
    }
    if (problem.title) return problem.title
  }

  if (status === 401) return 'Phiên đăng nhập đã hết hạn.'
  if (status === 403) return 'Bạn không có quyền thực hiện thao tác này.'
  if (status === 429) return 'Bạn thao tác quá nhanh. Vui lòng thử lại sau.'
  return 'Không thể kết nối tới hệ thống nhà hàng.'
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
  accessToken?: string | null,
) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init?.headers,
    },
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError(errorMessage(body, response.status), response.status)
  }
  return body as T
}

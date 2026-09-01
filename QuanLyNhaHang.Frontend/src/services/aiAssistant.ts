const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7134'

export type AiAssistantAdminConfig = {
  enabled: boolean
  providerConfigured: boolean
  model: string
  welcomeMessage: string
  systemPrompt: string
  knowledgeBase: string
  suggestedQuestions: string[]
  maxOutputTokens: number
  updatedAt?: string | null
}

export type UpdateAiAssistantConfig = {
  enabled: boolean
  model: string
  welcomeMessage: string
  systemPrompt: string
  knowledgeBase: string
  suggestedQuestions: string[]
  maxOutputTokens: number
}

type UpdateResponse = {
  success: boolean
  message: string
  data: AiAssistantAdminConfig
}

type ApiProblem = {
  message?: string
  detail?: string
  title?: string
}

function getErrorMessage(body: unknown, status: number) {
  if (body && typeof body === 'object') {
    const problem = body as ApiProblem
    if (problem.message) return problem.message
    if (problem.detail) return problem.detail
    if (problem.title) return problem.title
  }

  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (status === 403) return 'Tài khoản của bạn không có quyền quản lý trợ lý AI.'
  return 'Không thể kết nối tới cấu hình trợ lý AI.'
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

export function getAiAssistantAdminConfig() {
  return request<AiAssistantAdminConfig>('/api/ai-assistant/admin-config')
}

export function updateAiAssistantAdminConfig(input: UpdateAiAssistantConfig) {
  return request<UpdateResponse>('/api/ai-assistant/admin-config', {
    method: 'PUT',
    body: JSON.stringify(input),
  })
}

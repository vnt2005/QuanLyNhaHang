const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7134'
const AI_REQUEST_TIMEOUT_MS = 70_000

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

export type AiAssistantAdminMessage = {
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
}

export type AiAssistantChatResponse = {
  message: string
  model: string
  blocked: boolean
  inputTokens: number
  outputTokens: number
  providerRequestId?: string | null
  dataSources: string[]
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
  traceId?: string
}

function withTraceId(message: string, traceId?: string) {
  return traceId ? `${message} (traceId: ${traceId})` : message
}

function getErrorMessage(body: unknown, status: number) {
  const problem = body && typeof body === 'object'
    ? body as ApiProblem
    : undefined

  if (problem?.message) return withTraceId(problem.message, problem.traceId)
  if (problem?.detail) return withTraceId(problem.detail, problem.traceId)
  if (problem?.title) return withTraceId(problem.title, problem.traceId)

  if (status === 401) return withTraceId(
    'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    problem?.traceId,
  )
  if (status === 403) return withTraceId(
    'Tài khoản của bạn không có quyền quản lý trợ lý AI.',
    problem?.traceId,
  )
  if (status === 429) return withTraceId(
    'Bạn đang hỏi AI quá nhanh. Vui lòng thử lại sau.',
    problem?.traceId,
  )
  return withTraceId(
    'Không thể kết nối tới cấu hình trợ lý AI.',
    problem?.traceId,
  )
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

async function requestAi<T>(path: string, init: RequestInit) {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    AI_REQUEST_TIMEOUT_MS,
  )

  try {
    return await request<T>(path, {
      ...init,
      signal: controller.signal,
    })
  } catch (exception) {
    if (controller.signal.aborted) {
      throw new Error(
        'Trợ lý AI phản hồi quá lâu. Vui lòng kiểm tra kết nối máy chủ/Gemini rồi thử lại.',
      )
    }

    throw exception
  } finally {
    window.clearTimeout(timeoutId)
  }
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

export function sendAiAssistantAdminMessage(
  message: string,
  history: AiAssistantAdminMessage[],
) {
  return requestAi<AiAssistantChatResponse>('/api/ai-assistant/admin-chat', {
    method: 'POST',
    body: JSON.stringify({
      message,
      history: history.map(({ role, content }) => ({ role, content })),
    }),
  })
}

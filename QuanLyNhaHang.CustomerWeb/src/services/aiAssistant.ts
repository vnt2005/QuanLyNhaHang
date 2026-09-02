import { getCustomerAccessToken } from './customerAuth'
import { apiRequest } from './client'

const AI_REQUEST_TIMEOUT_MS = 70_000

export type AiAssistantPublicConfig = {
  enabled: boolean
  providerConfigured: boolean
  welcomeMessage: string
  suggestedQuestions: string[]
}

export type AiAssistantMessage = {
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

export function getAiAssistantPublicConfig() {
  return apiRequest<AiAssistantPublicConfig>('/api/ai-assistant/public-config')
}

export async function sendAiAssistantMessage(
  message: string,
  history: AiAssistantMessage[],
) {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    AI_REQUEST_TIMEOUT_MS,
  )

  try {
    return await apiRequest<AiAssistantChatResponse>(
      '/api/ai-assistant/chat',
      {
        method: 'POST',
        body: JSON.stringify({
          message,
          history: history.map(({ role, content }) => ({ role, content })),
        }),
        signal: controller.signal,
      },
      getCustomerAccessToken(),
    )
  } catch (exception) {
    if (controller.signal.aborted) {
      throw new Error('Trợ lý AI phản hồi quá lâu. Vui lòng thử lại sau.')
    }

    throw exception
  } finally {
    window.clearTimeout(timeoutId)
  }
}

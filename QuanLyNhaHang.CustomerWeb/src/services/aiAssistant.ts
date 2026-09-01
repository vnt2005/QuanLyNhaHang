import { apiRequest } from './client'

export type AiAssistantPublicConfig = {
  enabled: boolean
  providerConfigured: boolean
  welcomeMessage: string
  suggestedQuestions: string[]
}

export type AiAssistantMessage = {
  role: 'user' | 'assistant'
  content: string
}

export type AiAssistantChatResponse = {
  message: string
  model: string
  blocked: boolean
  inputTokens: number
  outputTokens: number
  providerRequestId?: string | null
}

export function getAiAssistantPublicConfig() {
  return apiRequest<AiAssistantPublicConfig>('/api/ai-assistant/public-config')
}

export function sendAiAssistantMessage(
  message: string,
  history: AiAssistantMessage[],
) {
  return apiRequest<AiAssistantChatResponse>('/api/ai-assistant/chat', {
    method: 'POST',
    body: JSON.stringify({ message, history }),
  })
}

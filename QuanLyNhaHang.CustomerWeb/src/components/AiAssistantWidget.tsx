import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import {
  getAiAssistantPublicConfig,
  sendAiAssistantMessage,
  type AiAssistantMessage,
  type AiAssistantPublicConfig,
} from '../services/aiAssistant'

const MAX_MESSAGE_LENGTH = 1200

export default function AiAssistantWidget() {
  const [config, setConfig] = useState<AiAssistantPublicConfig | null>(null)
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<AiAssistantMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const messagesRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let active = true

    void getAiAssistantPublicConfig()
      .then((result) => {
        if (active) setConfig(result)
      })
      .catch(() => {
        if (active) setConfig(null)
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.setTimeout(() => inputRef.current?.focus(), 0)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    const node = messagesRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [messages, open, sending])

  const visible = Boolean(config?.enabled && config.providerConfigured)
  const history = useMemo(() => messages.slice(-8), [messages])

  if (!visible || !config) return null

  async function submitMessage(rawMessage: string) {
    const message = rawMessage.trim()
    if (!message || sending) return

    const userMessage: AiAssistantMessage = { role: 'user', content: message }
    setMessages((current) => [...current, userMessage])
    setInput('')
    setError('')
    setSending(true)

    try {
      const result = await sendAiAssistantMessage(message, history)
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: result.message,
          sources: result.dataSources ?? [],
        },
      ])
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Trợ lý AI chưa thể phản hồi. Vui lòng thử lại.',
      )
    } finally {
      setSending(false)
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    void submitMessage(input)
  }

  return (
    <div className="ai-assistant-shell">
      {open ? (
        <section
          className="ai-assistant-panel"
          role="dialog"
          aria-modal="false"
          aria-label="Trợ lý AI nhà hàng"
        >
          <header className="ai-assistant-header">
            <div>
              <span className="ai-assistant-kicker">TRỢ LÝ AI</span>
              <strong>Hỏi dữ liệu nhà hàng</strong>
              <small>Đọc dữ liệu hệ thống theo thời gian thực</small>
            </div>
            <button
              type="button"
              className="ai-assistant-close"
              onClick={() => setOpen(false)}
              aria-label="Đóng trợ lý AI"
            >
              ×
            </button>
          </header>

          <div className="ai-assistant-messages" ref={messagesRef} aria-live="polite">
            <div className="ai-assistant-message assistant">
              {config.welcomeMessage}
            </div>

            {messages.map((message, index) => (
              <div
                className={`ai-assistant-message-group ${message.role}`}
                key={`${message.role}-${index}-${message.content.slice(0, 24)}`}
              >
                <div className={`ai-assistant-message ${message.role}`}>
                  {message.content}
                </div>
                {message.role === 'assistant' && message.sources?.length ? (
                  <div className="ai-assistant-sources" aria-label="Nguồn dữ liệu hệ thống">
                    <span>Dữ liệu:</span>
                    {message.sources.map((source) => (
                      <b key={source}>{source}</b>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}

            {sending ? (
              <div className="ai-assistant-message assistant ai-assistant-thinking">
                Đang truy vấn dữ liệu nhà hàng…
              </div>
            ) : null}
          </div>

          {messages.length === 0 && config.suggestedQuestions.length > 0 ? (
            <div className="ai-assistant-suggestions" aria-label="Câu hỏi gợi ý">
              {config.suggestedQuestions.map((question) => (
                <button
                  type="button"
                  key={question}
                  onClick={() => void submitMessage(question)}
                  disabled={sending}
                >
                  {question}
                </button>
              ))}
            </div>
          ) : null}

          {error ? <p className="ai-assistant-error">{error}</p> : null}

          <form className="ai-assistant-form" onSubmit={handleSubmit}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              maxLength={MAX_MESSAGE_LENGTH}
              rows={2}
              placeholder="Hỏi món, giá, bàn, đơn hàng…"
              aria-label="Nội dung hỏi trợ lý AI"
              disabled={sending}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  event.currentTarget.form?.requestSubmit()
                }
              }}
            />
            <button type="submit" disabled={sending || !input.trim()}>
              Gửi
            </button>
          </form>

          <small className="ai-assistant-privacy">
            Khi đăng nhập, AI chỉ được đọc đơn và thông báo của chính tài khoản đó. Không nhập mật khẩu hoặc thông tin thanh toán nhạy cảm.
          </small>
        </section>
      ) : null}

      <button
        type="button"
        className="ai-assistant-launcher"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? 'Đóng trợ lý AI' : 'Mở trợ lý AI'}
      >
        <span aria-hidden="true">AI</span>
        <strong>Trợ lý</strong>
      </button>
    </div>
  )
}

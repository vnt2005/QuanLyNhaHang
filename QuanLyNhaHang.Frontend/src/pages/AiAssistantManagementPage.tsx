import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { useAutoDismissMessage } from '../hooks/useAutoDismissMessage'
import {
  getAiAssistantAdminConfig,
  sendAiAssistantAdminMessage,
  updateAiAssistantAdminConfig,
  type AiAssistantAdminConfig,
  type AiAssistantAdminMessage,
} from '../services/aiAssistant'

const fallbackConfig: AiAssistantAdminConfig = {
  enabled: false,
  providerConfigured: false,
  model: 'gemini-3.7-flash',
  welcomeMessage: '',
  systemPrompt: '',
  knowledgeBase: '',
  suggestedQuestions: [],
  maxOutputTokens: 500,
  updatedAt: null,
}

const adminSuggestedQuestions = [
  'Tình hình vận hành hôm nay thế nào?',
  'Bếp đang tồn những món nào?',
  'Nguyên liệu nào đang sắp hết?',
  'Đặt bàn hôm nay đang ra sao?',
  'Doanh thu và thanh toán hôm nay thế nào?',
]

function formatUpdatedAt(value?: string | null) {
  if (!value) return 'Chưa cập nhật'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Chưa cập nhật'
    : date.toLocaleString('vi-VN')
}

function RobotAvatarIcon({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="18" cy="4.5" r="2.5" fill="#38bdf8" />
      <line x1="18" y1="7" x2="18" y2="11" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="5" y="11" width="26" height="19" rx="7" fill="#0f2639" stroke="#38bdf8" strokeWidth="2.2" />
      <rect x="2" y="16.5" width="3" height="8" rx="1.5" fill="#38bdf8" />
      <rect x="31" y="16.5" width="3" height="8" rx="1.5" fill="#38bdf8" />
      <rect x="8" y="14" width="20" height="13" rx="4" fill="#081420" />
      <circle cx="13" cy="20.5" r="2.5" fill="#38bdf8" />
      <circle cx="23" cy="20.5" r="2.5" fill="#38bdf8" />
      <path d="M15 23.5C16 24.8 20 24.8 21 23.5" stroke="#38bdf8" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

function SendIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

interface AiAdminChatInputProps {
  disabled: boolean
  sending: boolean
  onSubmit: (text: string) => void
}

function AiAdminChatInput({ disabled, sending, onSubmit }: AiAdminChatInputProps) {
  const [canSend, setCanSend] = useState(false)
  const isComposingRef = useRef(false)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = inputRef.current?.value.trim() ?? ''
    if (!trimmed || disabled || sending) return
    onSubmit(trimmed)
    if (inputRef.current) {
      inputRef.current.value = ''
    }
    setCanSend(false)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      if (isComposingRef.current || event.nativeEvent.isComposing) {
        return
      }
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const hasContent = Boolean(event.target.value.trim())
    if (hasContent !== canSend) {
      setCanSend(hasContent)
    }
  }

  return (
    <form className="ai-admin-chat-form" onSubmit={handleSubmit}>
      <textarea
        ref={inputRef}
        rows={1}
        maxLength={1200}
        onChange={handleInput}
        onCompositionStart={() => {
          isComposingRef.current = true
        }}
        onCompositionEnd={() => {
          isComposingRef.current = false
        }}
        onKeyDown={handleKeyDown}
        placeholder="Hỏi doanh thu, đơn bếp, bàn, tồn kho…"
        disabled={disabled || sending}
      />
      <button
        type="submit"
        className="ai-admin-send-btn"
        disabled={disabled || sending || !canSend}
        aria-label="Gửi câu hỏi"
      >
        <SendIcon size={16} />
        <span>{sending ? 'Đang hỏi…' : 'Gửi'}</span>
      </button>
    </form>
  )
}

interface AiAdminFieldTextareaProps {
  name: string
  label: string
  rows: number
  maxLength?: number
  placeholder: string
  helpText?: string
  value: string
  onChange: (value: string) => void
}

function AiAdminFieldTextarea({
  name,
  label,
  rows,
  maxLength,
  placeholder,
  helpText,
  value,
  onChange,
}: AiAdminFieldTextareaProps) {
  const [localValue, setLocalValue] = useState(value)
  const debounceRef = useRef<number | null>(null)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = event.target.value
    setLocalValue(next)
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current)
    }
    debounceRef.current = window.setTimeout(() => {
      onChange(next)
    }, 150)
  }

  const handleBlur = (event: React.FocusEvent<HTMLTextAreaElement>) => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    onChange(event.target.value)
  }

  return (
    <label>
      <span>{label}</span>
      <textarea
        name={name}
        rows={rows}
        maxLength={maxLength}
        value={localValue}
        onChange={handleInput}
        onBlur={handleBlur}
        placeholder={placeholder}
      />
      {helpText ? <small>{helpText}</small> : null}
    </label>
  )
}

interface AiAdminTextareaCardProps {
  name: string
  label: string
  title: string
  maxLength: number
  rows: number
  placeholder: string
  helpText: string
  value: string
  onChange: (value: string) => void
}

function AiAdminTextareaCard({
  name,
  label,
  title,
  maxLength,
  rows,
  placeholder,
  helpText,
  value,
  onChange,
}: AiAdminTextareaCardProps) {
  const [localValue, setLocalValue] = useState(value)
  const debounceRef = useRef<number | null>(null)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleInput = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = event.target.value
    setLocalValue(next)
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current)
    }
    debounceRef.current = window.setTimeout(() => {
      onChange(next)
    }, 150)
  }

  const handleBlur = (event: React.FocusEvent<HTMLTextAreaElement>) => {
    if (debounceRef.current) {
      window.clearTimeout(debounceRef.current)
      debounceRef.current = null
    }
    onChange(event.target.value)
  }

  return (
    <div className="ai-admin-card">
      <div className="ai-admin-section-heading">
        <div>
          <span className="ai-admin-label">{label}</span>
          <h3>{title}</h3>
        </div>
        <small>
          {localValue.length}/{maxLength}
        </small>
      </div>
      <textarea
        name={name}
        className="ai-admin-large-textarea"
        rows={rows}
        maxLength={maxLength}
        value={localValue}
        onChange={handleInput}
        onBlur={handleBlur}
        placeholder={placeholder}
      />
      <p className="ai-admin-help">{helpText}</p>
    </div>
  )
}

export default function AiAssistantManagementPage() {
  const [config, setConfig] = useState<AiAssistantAdminConfig>(fallbackConfig)
  const [suggestedQuestions, setSuggestedQuestions] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [adminMessages, setAdminMessages] = useState<AiAssistantAdminMessage[]>([])
  const [adminSending, setAdminSending] = useState(false)
  const [adminError, setAdminError] = useState('')
  const [chatOpen, setChatOpen] = useState(false)

  const adminMessagesRef = useRef<HTMLDivElement | null>(null)
  const adminMessagesEndRef = useRef<HTMLDivElement | null>(null)

  const scrollAdminToBottom = useCallback((smooth = true) => {
    const performScroll = () => {
      if (adminMessagesEndRef.current) {
        adminMessagesEndRef.current.scrollIntoView({
          behavior: smooth ? 'smooth' : 'auto',
          block: 'end',
        })
      }
      if (adminMessagesRef.current) {
        adminMessagesRef.current.scrollTop = adminMessagesRef.current.scrollHeight
      }
    }

    requestAnimationFrame(() => {
      performScroll()
      setTimeout(performScroll, 60)
      setTimeout(performScroll, 200)
    })
  }, [])

  useEffect(() => {
    if (chatOpen) {
      scrollAdminToBottom(false)
    }
  }, [chatOpen, scrollAdminToBottom])

  useEffect(() => {
    if (chatOpen) {
      scrollAdminToBottom(true)
    }
  }, [adminMessages, chatOpen, adminSending, scrollAdminToBottom])

  useEffect(() => {
    if (!chatOpen) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setChatOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [chatOpen])

  useAutoDismissMessage(message, setMessage, 4000)
  useAutoDismissMessage(error, setError, 5000)

  useEffect(() => {
    let active = true

    void getAiAssistantAdminConfig()
      .then((result) => {
        if (!active) return
        setConfig(result)
        setSuggestedQuestions(result.suggestedQuestions.join('\n'))
      })
      .catch((exception) => {
        if (active) {
          setError(
            exception instanceof Error
              ? exception.message
              : 'Không tải được cấu hình trợ lý AI.',
          )
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  function updateField<K extends keyof AiAssistantAdminConfig>(
    key: K,
    value: AiAssistantAdminConfig[K],
  ) {
    setConfig((current) => ({ ...current, [key]: value }))
  }

  async function handleToggleCustomerAi(newEnabled: boolean) {
    if (saving) return
    updateField('enabled', newEnabled)
    setSaving(true)
    setError('')
    setMessage('')

    try {
      const form = document.getElementById('ai-admin-config-form') as HTMLFormElement | null
      const formData = form ? new FormData(form) : null
      const modelVal = (formData?.get('model')?.toString() ?? config.model).trim()
      const welcomeVal = (formData?.get('welcomeMessage')?.toString() ?? config.welcomeMessage).trim()
      const systemVal = (formData?.get('systemPrompt')?.toString() ?? config.systemPrompt).trim()
      const knowledgeVal = (formData?.get('knowledgeBase')?.toString() ?? config.knowledgeBase).trim()
      const questionsVal = formData?.get('suggestedQuestions')?.toString() ?? suggestedQuestions
      const maxTokensVal = Number(formData?.get('maxOutputTokens')) || config.maxOutputTokens

      const result = await updateAiAssistantAdminConfig({
        enabled: newEnabled,
        model: modelVal,
        welcomeMessage: welcomeVal,
        systemPrompt: systemVal,
        knowledgeBase: knowledgeVal,
        suggestedQuestions: questionsVal
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
        maxOutputTokens: maxTokensVal,
      })

      setConfig(result.data)
      setSuggestedQuestions(result.data.suggestedQuestions.join('\n'))
      setMessage(newEnabled ? 'Đã bật hiển thị AI cho khách hàng.' : 'Đã tắt hiển thị AI cho khách hàng.')
    } catch (exception) {
      updateField('enabled', !newEnabled)
      const text = exception instanceof Error
        ? exception.message
        : 'Không thể cập nhật trạng thái hiển thị AI.'
      setError(text)
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit(event?: FormEvent) {
    if (event) event.preventDefault()
    if (saving) return

    setSaving(true)
    setError('')
    setMessage('')

    try {
      const form = (event?.currentTarget as HTMLFormElement | null) ??
        (document.getElementById('ai-admin-config-form') as HTMLFormElement | null)
      const formData = form ? new FormData(form) : null
      const modelVal = (formData?.get('model')?.toString() ?? config.model).trim()
      const welcomeVal = (formData?.get('welcomeMessage')?.toString() ?? config.welcomeMessage).trim()
      const systemVal = (formData?.get('systemPrompt')?.toString() ?? config.systemPrompt).trim()
      const knowledgeVal = (formData?.get('knowledgeBase')?.toString() ?? config.knowledgeBase).trim()
      const questionsVal = formData?.get('suggestedQuestions')?.toString() ?? suggestedQuestions
      const maxTokensVal = Number(formData?.get('maxOutputTokens')) || config.maxOutputTokens

      const result = await updateAiAssistantAdminConfig({
        enabled: config.enabled,
        model: modelVal,
        welcomeMessage: welcomeVal,
        systemPrompt: systemVal,
        knowledgeBase: knowledgeVal,
        suggestedQuestions: questionsVal
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
        maxOutputTokens: maxTokensVal,
      })

      setConfig(result.data)
      setSuggestedQuestions(result.data.suggestedQuestions.join('\n'))
      setMessage(result.message || 'Cập nhật cấu hình trợ lý AI thành công.')
    } catch (exception) {
      const text = exception instanceof Error
        ? exception.message
        : 'Không lưu được cấu hình trợ lý AI.'
      setError(text)
    } finally {
      setSaving(false)
    }
  }

  async function askAdminAi(rawMessage: string) {
    const text = rawMessage.trim()
    if (!text || adminSending) return

    const history = adminMessages.slice(-8)
    setAdminMessages((current) => [...current, { role: 'user', content: text }])
    setAdminError('')
    setAdminSending(true)

    try {
      const result = await sendAiAssistantAdminMessage(text, history)
      setAdminMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: result.message,
          sources: result.dataSources ?? [],
        },
      ])
    } catch (exception) {
      setAdminError(
        exception instanceof Error
          ? exception.message
          : 'AI quản trị chưa thể truy vấn dữ liệu.',
      )
    } finally {
      setAdminSending(false)
    }
  }

  if (loading) {
    return (
      <section className="ai-admin-page ai-admin-loading" role="status">
        <span className="account-security-spinner" />
        <div>
          <strong>Đang tải cấu hình trợ lý AI…</strong>
          <small>Đang đọc trạng thái AI và kho kiến thức của nhà hàng.</small>
        </div>
      </section>
    )
  }

  return (
    <section className="ai-admin-page">
      <div className="ai-admin-card ai-admin-control-card">
        <div>
          <span className="ai-admin-label">CustomerWeb</span>
          <h3>Hiển thị AI cho khách hàng</h3>
          <p>
            Khi bật, AI có thể đọc thông tin nhà hàng, món, giá, khuyến mãi, bàn và
            nếu khách đăng nhập thì đọc thêm đơn/thông báo của đúng tài khoản đó.
          </p>
        </div>
        <div className="ai-admin-control-actions">
          <label className="ai-admin-switch">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(event) => void handleToggleCustomerAi(event.target.checked)}
              disabled={!config.providerConfigured || saving}
            />
            <span aria-hidden="true" />
            <strong>{config.enabled ? 'Đang bật' : 'Đang tắt'}</strong>
          </label>

          <button
            type="submit"
            form="ai-admin-config-form"
            className="ai-admin-save-btn"
            disabled={saving}
          >
            {saving ? 'Đang lưu…' : 'Lưu cấu hình AI'}
          </button>
        </div>
      </div>

      <div className="ai-admin-bot-banner">
        <div className="ai-admin-bot-badge">
          <RobotAvatarIcon size={36} />
          <span className="ai-admin-bot-pulse" />
        </div>
        <div className="ai-admin-bot-text">
          <span className="ai-admin-label">AI DÀNH CHO ADMIN</span>
          <h3>Trợ lý AI Quản trị Nhà hàng</h3>
          <p>
            Hỏi trực tiếp dữ liệu vận hành: doanh thu, bếp, đơn hàng, tồn kho, đặt bàn…
          </p>
        </div>
        <button
          type="button"
          className="ai-admin-bot-toggle-btn"
          onClick={() => setChatOpen(true)}
        >
          <RobotAvatarIcon size={20} />
          <span>Hỏi AI ngay</span>
        </button>
      </div>

      <div className="ai-admin-floating-shell">
        <button
          type="button"
          className={`ai-admin-floating-launcher ${chatOpen ? 'active' : ''}`}
          onClick={() => setChatOpen((prev) => !prev)}
          aria-expanded={chatOpen}
          aria-label={chatOpen ? 'Đóng trợ lý AI' : 'Mở trợ lý AI'}
          title="Hỏi AI Quản trị"
        >
          <RobotAvatarIcon size={32} />
          <span className="ai-admin-floating-ping" />
        </button>
      </div>

      {chatOpen && (
        <div className="ai-admin-chat-popup-overlay" onClick={() => setChatOpen(false)}>
          <div
            className="ai-admin-chat-popup"
            role="dialog"
            aria-modal="true"
            aria-label="Trợ lý AI Quản trị"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="ai-admin-chat-popup-header">
              <div className="ai-admin-chat-popup-heading">
                <RobotAvatarIcon size={28} />
                <div>
                  <strong>AI Quản trị Nhà hàng</strong>
                  <small>Dữ liệu vận hành trực tiếp (Read-Only)</small>
                </div>
              </div>
              <button
                type="button"
                className="ai-admin-chat-popup-close"
                onClick={() => setChatOpen(false)}
                aria-label="Đóng cửa sổ chat"
              >
                ✕
              </button>
            </header>

            <div
              className="ai-admin-chat-messages"
              ref={adminMessagesRef}
              aria-live="polite"
            >
              {adminMessages.length === 0 ? (
                <div className="ai-admin-chat-empty">
                  <div className="ai-admin-chat-empty-icon">
                    <RobotAvatarIcon size={46} />
                  </div>
                  <strong>Hỏi AI về bất kỳ module vận hành nào</strong>
                  <span>AI sẽ truy vấn trực tiếp cơ sở dữ liệu hệ thống để trả lời.</span>
                  <div className="ai-admin-chat-empty-suggestions">
                    {adminSuggestedQuestions.map((question) => (
                      <button
                        type="button"
                        key={question}
                        className="ai-admin-empty-chip"
                        onClick={() => void askAdminAi(question)}
                        disabled={adminSending || !config.providerConfigured}
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                adminMessages.map((item, index) => (
                  <div className={`ai-admin-chat-row ${item.role}`} key={`${item.role}-${index}`}>
                    <div className="ai-admin-chat-bubble">{item.content}</div>
                  </div>
                ))
              )}

              {adminSending ? (
                <div className="ai-admin-chat-row assistant">
                  <div className="ai-admin-chat-bubble thinking">
                    <span className="ai-thinking-text">Đang suy nghĩ</span>
                  </div>
                </div>
              ) : null}

              <div ref={adminMessagesEndRef} aria-hidden="true" style={{ height: 1, minHeight: 1 }} />
            </div>

            {adminMessages.length > 0 ? (
              <div className="ai-admin-chat-chips-scroll" aria-label="Gợi ý câu hỏi nhanh">
                {adminSuggestedQuestions.map((question) => (
                  <button
                    type="button"
                    key={question}
                    className="ai-admin-chip-btn"
                    onClick={() => void askAdminAi(question)}
                    disabled={adminSending || !config.providerConfigured}
                  >
                    {question}
                  </button>
                ))}
              </div>
            ) : null}

            {adminError ? <div className="ai-admin-alert error">{adminError}</div> : null}

            <AiAdminChatInput
              disabled={!config.providerConfigured}
              sending={adminSending}
              onSubmit={(text) => void askAdminAi(text)}
            />
          </div>
        </div>
      )}

      {error ? (
        <div className="ai-admin-alert error" role="alert" aria-live="assertive">
          <span>{error}</span>
          <button type="button" aria-label="Đóng thông báo lỗi" onClick={() => setError('')}>
            ×
          </button>
        </div>
      ) : null}
      {message ? (
        <div className="ai-admin-alert success" role="status" aria-live="polite">
          <span>{message}</span>
          <button type="button" aria-label="Đóng thông báo" onClick={() => setMessage('')}>
            ×
          </button>
        </div>
      ) : null}

      <form id="ai-admin-config-form" className="ai-admin-form" onSubmit={handleSubmit}>
        <div className="ai-admin-grid">
          <div className="ai-admin-card">
            <div className="ai-admin-section-heading">
              <div>
                <span className="ai-admin-label">Mô hình</span>
                <h3>Model & giới hạn phản hồi</h3>
              </div>
            </div>

            <label>
              <span>Gemini model</span>
              <input
                name="model"
                value={config.model}
                onChange={(event) => updateField('model', event.target.value)}
                maxLength={100}
                placeholder="gemini-3.7-flash"
                required
              />
              <small>Gemini Flash phù hợp truy vấn dữ liệu nhanh cho chatbot.</small>
            </label>

            <label>
              <span>Token đầu ra tối đa</span>
              <input
                name="maxOutputTokens"
                type="number"
                min={100}
                max={2000}
                step={50}
                value={config.maxOutputTokens}
                onChange={(event) =>
                  updateField('maxOutputTokens', Number(event.target.value) || 100)
                }
              />
              <small>Giới hạn 100–2000 token để kiểm soát độ dài và quota.</small>
            </label>
          </div>

          <div className="ai-admin-card">
            <div className="ai-admin-section-heading">
              <div>
                <span className="ai-admin-label">CustomerWeb</span>
                <h3>Lời chào & câu hỏi gợi ý</h3>
              </div>
            </div>

            <AiAdminFieldTextarea
              name="welcomeMessage"
              label="Lời chào"
              rows={3}
              maxLength={1000}
              value={config.welcomeMessage}
              onChange={(value) => updateField('welcomeMessage', value)}
              placeholder="Xin chào! Tôi có thể giúp gì cho bạn?"
            />

            <AiAdminFieldTextarea
              name="suggestedQuestions"
              label="Câu hỏi gợi ý"
              rows={5}
              value={suggestedQuestions}
              onChange={(value) => setSuggestedQuestions(value)}
              placeholder={'Mỗi dòng một câu hỏi\nHôm nay có món gì nổi bật?'}
              helpText="Tối đa 6 câu, mỗi câu tối đa 160 ký tự."
            />
          </div>
        </div>

        <AiAdminTextareaCard
          name="systemPrompt"
          label="Quy tắc"
          title="System prompt của nhà hàng"
          maxLength={8000}
          rows={8}
          value={config.systemPrompt}
          onChange={(value) => updateField('systemPrompt', value)}
          placeholder="Quy định giọng điệu, phạm vi trả lời và cách xử lý khi AI không chắc chắn…"
          helpText="Backend luôn bổ sung quyền truy cập dữ liệu và quy tắc bảo mật bắt buộc; nội dung tại đây không thể cho AI vượt qua các giới hạn đó."
        />

        <AiAdminTextareaCard
          name="knowledgeBase"
          label="Kiến thức bổ sung"
          title="Thông tin riêng do quản trị viên cung cấp"
          maxLength={30000}
          rows={10}
          value={config.knowledgeBase}
          onChange={(value) => updateField('knowledgeBase', value)}
          placeholder="Ví dụ: chính sách giữ bàn, khu vực gửi xe, quy định nhận món mang về…"
          helpText="Không cần chép thực đơn, đơn hàng, bàn, thanh toán, doanh thu, kho hoặc dữ liệu vận hành vào đây. AI tự lấy từ database qua công cụ read-only khi cần."
        />

        <div className="ai-admin-footer">
          <small>Cập nhật gần nhất: {formatUpdatedAt(config.updatedAt)}</small>
        </div>
      </form>
    </section>
  )
}

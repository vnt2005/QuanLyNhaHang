import { FormEvent, useEffect, useState } from 'react'
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

const liveModules = [
  'Dashboard',
  'Tài khoản & phân quyền',
  'Nhân viên & ca làm',
  'Khu vực & bàn',
  'Thực đơn',
  'Đơn hàng & bếp',
  'Thanh toán & hóa đơn',
  'Doanh thu',
  'Đặt bàn',
  'Khuyến mãi',
  'Tồn kho',
  'Nhật ký & thông báo',
  'QR & thao tác bàn',
  'Cấu hình nhà hàng',
]

function formatUpdatedAt(value?: string | null) {
  if (!value) return 'Chưa cập nhật'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Chưa cập nhật'
    : date.toLocaleString('vi-VN')
}

export default function AiAssistantManagementPage() {
  const [config, setConfig] = useState<AiAssistantAdminConfig>(fallbackConfig)
  const [suggestedQuestions, setSuggestedQuestions] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [adminMessages, setAdminMessages] = useState<AiAssistantAdminMessage[]>([])
  const [adminInput, setAdminInput] = useState('')
  const [adminSending, setAdminSending] = useState(false)
  const [adminError, setAdminError] = useState('')

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

  function showToast(type: 'success' | 'error', text: string) {
    setToast({ type, text })
    window.setTimeout(() => {
      setToast((current) => current?.text === text ? null : current)
    }, 3500)
  }

  function updateField<K extends keyof AiAssistantAdminConfig>(
    key: K,
    value: AiAssistantAdminConfig[K],
  ) {
    setConfig((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (saving) return

    setSaving(true)
    setError('')
    setMessage('')

    try {
      const result = await updateAiAssistantAdminConfig({
        enabled: config.enabled,
        model: config.model.trim(),
        welcomeMessage: config.welcomeMessage.trim(),
        systemPrompt: config.systemPrompt.trim(),
        knowledgeBase: config.knowledgeBase.trim(),
        suggestedQuestions: suggestedQuestions
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
        maxOutputTokens: config.maxOutputTokens,
      })

      setConfig(result.data)
      setSuggestedQuestions(result.data.suggestedQuestions.join('\n'))
      setMessage(result.message)
      showToast('success', 'Đã lưu cấu hình AI thành công.')
    } catch (exception) {
      const text = exception instanceof Error
        ? exception.message
        : 'Không lưu được cấu hình trợ lý AI.'
      setError(text)
      showToast('error', text)
    } finally {
      setSaving(false)
    }
  }

  async function askAdminAi(rawMessage: string) {
    const text = rawMessage.trim()
    if (!text || adminSending) return

    const history = adminMessages.slice(-8)
    setAdminMessages((current) => [...current, { role: 'user', content: text }])
    setAdminInput('')
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

  function handleAdminChatSubmit(event: FormEvent) {
    event.preventDefault()
    void askAdminAi(adminInput)
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
      {toast ? (
        <div className={`ai-admin-toast ${toast.type}`} role="status">
          <strong>{toast.type === 'success' ? 'Đã lưu' : 'Có lỗi'}</strong>
          <span>{toast.text}</span>
        </div>
      ) : null}

      <div className="ai-admin-hero">
        <div>
          <span className="eyebrow">AI OPERATIONS</span>
          <h2>Trợ lý AI nhà hàng</h2>
          <p>
            Một AI cho khách hàng và một chế độ AI quản trị. Cả hai đều tự truy vấn
            dữ liệu mới nhất từ hệ thống thay vì dựa vào nội dung chép tay.
          </p>
        </div>
        <div className={`ai-admin-provider ${config.providerConfigured ? 'ready' : 'missing'}`}>
          <span aria-hidden="true" />
          <div>
            <strong>
              {config.providerConfigured
                ? 'Google AI Studio đã sẵn sàng'
                : 'Chưa có Gemini API key'}
            </strong>
            <small>
              {config.providerConfigured
                ? 'API key chỉ tồn tại ở backend.'
                : 'Cấu hình GEMINI_API_KEY trên backend để bật trợ lý.'}
            </small>
          </div>
        </div>
      </div>

      <div className="ai-admin-live-card">
        <div className="ai-admin-live-copy">
          <span className="ai-admin-label">Dữ liệu trực tiếp</span>
          <h3>AI đọc các module WebApp theo yêu cầu</h3>
          <p>
            Customer AI chỉ thấy dữ liệu công khai và dữ liệu thuộc chính tài khoản
            Customer đã đăng nhập. AI quản trị có thể đọc dữ liệu vận hành rộng hơn
            nhưng vẫn là read-only và không nhận mật khẩu, API key, mã xác minh hay QR token.
          </p>
        </div>
        <div className="ai-admin-module-list">
          {liveModules.map((module) => <span key={module}>{module}</span>)}
        </div>
      </div>

      <div className="ai-admin-chat-card">
        <div className="ai-admin-section-heading">
          <div>
            <span className="ai-admin-label">AI dành cho Admin</span>
            <h3>Hỏi trực tiếp dữ liệu vận hành</h3>
            <p>
              Ví dụ hỏi doanh thu, bếp, đơn hàng, tồn kho, đặt bàn hoặc tình trạng hệ thống.
              AI sẽ gọi công cụ đọc dữ liệu thật rồi mới trả lời.
            </p>
          </div>
          <span className="ai-admin-readonly">READ ONLY</span>
        </div>

        <div className="ai-admin-chat-suggestions">
          {adminSuggestedQuestions.map((question) => (
            <button
              type="button"
              key={question}
              onClick={() => void askAdminAi(question)}
              disabled={adminSending || !config.providerConfigured}
            >
              {question}
            </button>
          ))}
        </div>

        <div className="ai-admin-chat-messages" aria-live="polite">
          {adminMessages.length === 0 ? (
            <div className="ai-admin-chat-empty">
              <strong>Hỏi AI về bất kỳ module vận hành nào.</strong>
              <span>AI sẽ hiển thị nguồn dữ liệu hệ thống đã truy vấn sau mỗi câu trả lời.</span>
            </div>
          ) : null}
          {adminMessages.map((item, index) => (
            <div className={`ai-admin-chat-row ${item.role}`} key={`${item.role}-${index}`}>
              <div className="ai-admin-chat-bubble">{item.content}</div>
              {item.role === 'assistant' && item.sources?.length ? (
                <div className="ai-admin-chat-sources">
                  <small>Dữ liệu:</small>
                  {item.sources.map((source) => <span key={source}>{source}</span>)}
                </div>
              ) : null}
            </div>
          ))}
          {adminSending ? (
            <div className="ai-admin-chat-row assistant">
              <div className="ai-admin-chat-bubble thinking">Đang truy vấn dữ liệu WebApp…</div>
            </div>
          ) : null}
        </div>

        {adminError ? <div className="ai-admin-alert error">{adminError}</div> : null}

        <form className="ai-admin-chat-form" onSubmit={handleAdminChatSubmit}>
          <textarea
            rows={2}
            maxLength={1200}
            value={adminInput}
            onChange={(event) => setAdminInput(event.target.value)}
            placeholder="Ví dụ: Hôm nay có bao nhiêu đơn đang nấu và tồn kho nào cần chú ý?"
            disabled={adminSending || !config.providerConfigured}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }
            }}
          />
          <button
            type="submit"
            disabled={adminSending || !adminInput.trim() || !config.providerConfigured}
          >
            {adminSending ? 'Đang hỏi…' : 'Hỏi dữ liệu'}
          </button>
        </form>
      </div>

      {error ? <div className="ai-admin-alert error">{error}</div> : null}
      {message ? <div className="ai-admin-alert success">{message}</div> : null}

      <form className="ai-admin-form" onSubmit={handleSubmit}>
        <div className="ai-admin-card ai-admin-control-card">
          <div>
            <span className="ai-admin-label">CustomerWeb</span>
            <h3>Hiển thị AI cho khách hàng</h3>
            <p>
              Khi bật, AI có thể đọc thông tin nhà hàng, món, giá, khuyến mãi, bàn và
              nếu khách đăng nhập thì đọc thêm đơn/thông báo của đúng tài khoản đó.
            </p>
          </div>
          <label className="ai-admin-switch">
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(event) => updateField('enabled', event.target.checked)}
              disabled={!config.providerConfigured}
            />
            <span aria-hidden="true" />
            <strong>{config.enabled ? 'Đang bật' : 'Đang tắt'}</strong>
          </label>
        </div>

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

            <label>
              <span>Lời chào</span>
              <textarea
                rows={3}
                maxLength={1000}
                value={config.welcomeMessage}
                onChange={(event) => updateField('welcomeMessage', event.target.value)}
                placeholder="Xin chào! Tôi có thể giúp gì cho bạn?"
              />
            </label>

            <label>
              <span>Câu hỏi gợi ý</span>
              <textarea
                rows={5}
                value={suggestedQuestions}
                onChange={(event) => setSuggestedQuestions(event.target.value)}
                placeholder={'Mỗi dòng một câu hỏi\nHôm nay có món gì nổi bật?'}
              />
              <small>Tối đa 6 câu, mỗi câu tối đa 160 ký tự.</small>
            </label>
          </div>
        </div>

        <div className="ai-admin-card">
          <div className="ai-admin-section-heading">
            <div>
              <span className="ai-admin-label">Quy tắc</span>
              <h3>System prompt của nhà hàng</h3>
            </div>
            <small>{config.systemPrompt.length}/8000</small>
          </div>
          <textarea
            className="ai-admin-large-textarea"
            rows={8}
            maxLength={8000}
            value={config.systemPrompt}
            onChange={(event) => updateField('systemPrompt', event.target.value)}
            placeholder="Quy định giọng điệu, phạm vi trả lời và cách xử lý khi AI không chắc chắn…"
          />
          <p className="ai-admin-help">
            Backend luôn bổ sung quyền truy cập dữ liệu và quy tắc bảo mật bắt buộc;
            nội dung tại đây không thể cho AI vượt qua các giới hạn đó.
          </p>
        </div>

        <div className="ai-admin-card">
          <div className="ai-admin-section-heading">
            <div>
              <span className="ai-admin-label">Kiến thức bổ sung</span>
              <h3>Thông tin riêng do quản trị viên cung cấp</h3>
            </div>
            <small>{config.knowledgeBase.length}/30000</small>
          </div>
          <textarea
            className="ai-admin-large-textarea"
            rows={10}
            maxLength={30000}
            value={config.knowledgeBase}
            onChange={(event) => updateField('knowledgeBase', event.target.value)}
            placeholder="Ví dụ: chính sách giữ bàn, khu vực gửi xe, quy định nhận món mang về…"
          />
          <p className="ai-admin-help">
            Không cần chép thực đơn, đơn hàng, bàn, thanh toán, doanh thu, kho hoặc dữ liệu
            vận hành vào đây. AI tự lấy từ database qua công cụ read-only khi cần.
          </p>
        </div>

        <div className="ai-admin-security-note">
          <strong>API key và bí mật hệ thống không được quản lý trong giao diện.</strong>
          <p>
            Khóa Gemini chỉ đọc từ biến môi trường <code>GEMINI_API_KEY</code> ở backend.
            Các trường nhạy cảm như password hash, mã xác minh/2FA/reset và QR token cũng
            bị loại trước khi dữ liệu có thể được gửi tới Gemini.
          </p>
        </div>

        <div className="ai-admin-footer">
          <small>Cập nhật gần nhất: {formatUpdatedAt(config.updatedAt)}</small>
          <button type="submit" disabled={saving}>
            {saving ? 'Đang lưu…' : 'Lưu cấu hình AI'}
          </button>
        </div>
      </form>
    </section>
  )
}

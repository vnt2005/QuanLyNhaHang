import { FormEvent, useEffect, useState } from 'react'
import {
  getAiAssistantAdminConfig,
  updateAiAssistantAdminConfig,
  type AiAssistantAdminConfig,
} from '../services/aiAssistant'

const fallbackConfig: AiAssistantAdminConfig = {
  enabled: false,
  providerConfigured: false,
  model: 'gpt-5.6-luna',
  welcomeMessage: '',
  systemPrompt: '',
  knowledgeBase: '',
  suggestedQuestions: [],
  maxOutputTokens: 500,
  updatedAt: null,
}

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
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Không lưu được cấu hình trợ lý AI.',
      )
    } finally {
      setSaving(false)
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
      <div className="ai-admin-hero">
        <div>
          <span className="eyebrow">AI CUSTOMER EXPERIENCE</span>
          <h2>Quản lý trợ lý AI</h2>
          <p>
            Kiểm soát AI xuất hiện trên website khách hàng, nội dung hướng dẫn và
            phạm vi kiến thức mà AI được phép sử dụng.
          </p>
        </div>
        <div className={`ai-admin-provider ${config.providerConfigured ? 'ready' : 'missing'}`}>
          <span aria-hidden="true" />
          <div>
            <strong>
              {config.providerConfigured ? 'OpenAI đã sẵn sàng' : 'Chưa có OpenAI API key'}
            </strong>
            <small>
              {config.providerConfigured
                ? 'API key đang được giữ an toàn ở máy chủ.'
                : 'Cấu hình OPENAI_API_KEY trên backend để bật trợ lý.'}
            </small>
          </div>
        </div>
      </div>

      {error ? <div className="ai-admin-alert error">{error}</div> : null}
      {message ? <div className="ai-admin-alert success">{message}</div> : null}

      <form className="ai-admin-form" onSubmit={handleSubmit}>
        <div className="ai-admin-card ai-admin-control-card">
          <div>
            <span className="ai-admin-label">Trạng thái</span>
            <h3>Hiển thị AI trên CustomerWeb</h3>
            <p>
              Khi tắt, nút trợ lý AI biến mất khỏi website khách hàng và endpoint
              chat từ chối yêu cầu mới.
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
              <span>OpenAI model</span>
              <input
                value={config.model}
                onChange={(event) => updateField('model', event.target.value)}
                maxLength={100}
                placeholder="gpt-5.6-luna"
                required
              />
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
              <small>Giới hạn 100–2000 token để kiểm soát độ dài và chi phí.</small>
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
            Backend luôn bổ sung các quy tắc an toàn bắt buộc. Nội dung ở đây chỉ
            mở rộng cách AI phục vụ khách, không thể tắt các lớp bảo vệ đó.
          </p>
        </div>

        <div className="ai-admin-card">
          <div className="ai-admin-section-heading">
            <div>
              <span className="ai-admin-label">Kiến thức bổ sung</span>
              <h3>Thông tin do quản trị viên cung cấp</h3>
            </div>
            <small>{config.knowledgeBase.length}/30000</small>
          </div>
          <textarea
            className="ai-admin-large-textarea"
            rows={12}
            maxLength={30000}
            value={config.knowledgeBase}
            onChange={(event) => updateField('knowledgeBase', event.target.value)}
            placeholder="Ví dụ: chính sách giữ bàn, khu vực gửi xe, món phù hợp cho nhóm đông người, quy định nhận món mang về…"
          />
          <p className="ai-admin-help">
            Thực đơn đang mở bán, giá, giờ hoạt động và khuyến mãi hiệu lực được
            backend lấy trực tiếp từ dữ liệu hiện tại; không cần chép lại vào đây.
          </p>
        </div>

        <div className="ai-admin-security-note">
          <strong>API key không được quản lý trong giao diện này.</strong>
          <p>
            Khóa OpenAI chỉ được đọc từ cấu hình máy chủ/biến môi trường
            <code> OPENAI_API_KEY</code>; CustomerWeb và trình duyệt admin không bao giờ
            nhận giá trị khóa.
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

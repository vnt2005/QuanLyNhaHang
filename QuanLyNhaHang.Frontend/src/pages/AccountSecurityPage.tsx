import { useAutoDismissMessage } from '../design-system/useAutoDismissMessage'
import { confirmAction } from '../design-system/confirmDialog'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  AuthApiError,
  getAuthSessions,
  getCurrentSession,
  logoutAllSessions,
  revokeAuthSession,
  type AuthSession,
  type CurrentSession,
  type LoginResult,
} from '../api/auth'

type AccountSecurityPageProps = {
  auth: LoginResult
  onRequireLogin: (message: string) => void
}

function getErrorMessage(exception: unknown) {
  return exception instanceof Error
    ? exception.message
    : 'Đã xảy ra lỗi không xác định.'
}

function formatDateTime(value?: string | null) {
  if (!value) return 'Chưa ghi nhận'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Không xác định'
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function getDeviceName(userAgent?: string | null) {
  if (!userAgent) return 'Thiết bị không xác định'
  const browser = userAgent.includes('Edg/')
    ? 'Microsoft Edge'
    : userAgent.includes('Firefox/')
      ? 'Firefox'
      : userAgent.includes('Chrome/')
        ? 'Google Chrome'
        : userAgent.includes('Safari/')
          ? 'Safari'
          : 'Trình duyệt khác'
  const system = userAgent.includes('Windows')
    ? 'Windows'
    : userAgent.includes('Android')
      ? 'Android'
      : userAgent.includes('iPhone') || userAgent.includes('iPad')
        ? 'iOS'
        : userAgent.includes('Mac OS')
          ? 'macOS'
          : userAgent.includes('Linux')
            ? 'Linux'
            : 'Thiết bị khác'
  return `${browser} · ${system}`
}

function sessionIcon(userAgent?: string | null) {
  if (!userAgent) return '?'
  if (userAgent.includes('Android') || userAgent.includes('iPhone')) return '▯'
  if (userAgent.includes('iPad')) return '▭'
  return '▰'
}

export default function AccountSecurityPage({
  auth,
  onRequireLogin,
}: AccountSecurityPageProps) {
  const [current, setCurrent] = useState<CurrentSession | null>(null)
  const [sessions, setSessions] = useState<AuthSession[]>([])
  const [loading, setLoading] = useState(true)
  const [action, setAction] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  useAutoDismissMessage(message, setMessage)

  const handleRequestError = useCallback((exception: unknown) => {
    if (exception instanceof AuthApiError && exception.status === 401) {
      onRequireLogin('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
      return
    }
    setError(getErrorMessage(exception))
  }, [onRequireLogin])

  const loadSecurity = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [currentResult, sessionResult] = await Promise.all([
        getCurrentSession(),
        getAuthSessions(),
      ])
      setCurrent(currentResult)
      setSessions(sessionResult)
    } catch (exception) {
      handleRequestError(exception)
    } finally {
      setLoading(false)
    }
  }, [handleRequestError])

  useEffect(() => {
    void loadSecurity()
  }, [loadSecurity])

  const sortedSessions = useMemo(() => [...sessions].sort((left, right) => {
    if (left.isCurrent !== right.isCurrent) return left.isCurrent ? -1 : 1
    if (left.isActive !== right.isActive) return left.isActive ? -1 : 1
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  }), [sessions])

  const activeSessionCount = sessions.filter(item => item.isActive).length
  const permissions = current?.permissions ?? auth.permissions ?? []
  const displayName = [
    current?.ho ?? auth.ho,
    current?.ten ?? auth.ten,
  ].filter(Boolean).join(' ') || auth.email || 'Người dùng'

  async function revokeSession(item: AuthSession) {
    if (!await confirmAction(
      `Thu hồi phiên đăng nhập trên ${getDeviceName(item.userAgent)}?`,
    )) return
    setAction(item.sessionId)
    setError('')
    setMessage('')
    try {
      setMessage(await revokeAuthSession(item.sessionId))
      await loadSecurity()
    } catch (exception) {
      handleRequestError(exception)
    } finally {
      setAction('')
    }
  }

  async function logoutEverywhere() {
    if (!await confirmAction(
      'Đăng xuất khỏi tất cả thiết bị, bao gồm thiết bị hiện tại?',
    )) return
    setAction('logout-all')
    setError('')
    try {
      const result = await logoutAllSessions()
      onRequireLogin(
        `${result.message} ${result.revokedCount} phiên đã được thu hồi.`,
      )
    } catch (exception) {
      handleRequestError(exception)
    } finally {
      setAction('')
    }
  }

  return (
    <section className="account-security-page">
      <header className="account-security-header">
        <div>
          <span>BẢO MẬT CÁ NHÂN</span>
          <h2>Tài khoản & phiên đăng nhập</h2>
          <p>
            Kiểm soát thông tin tài khoản và các thiết bị đang đăng nhập.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadSecurity()}
          disabled={loading || Boolean(action)}
        >
          {loading ? 'Đang đồng bộ…' : '↻ Làm mới'}
        </button>
      </header>

      {error && (
        <div className="account-security-alert error">
          <div>
            <strong>Không thể hoàn tất thao tác</strong>
            <span>{error}</span>
          </div>
          <button type="button" onClick={() => setError('')}>×</button>
        </div>
      )}
      {message && (
        <div className="account-security-alert success">
          <div>
            <strong>Đã cập nhật</strong>
            <span>{message}</span>
          </div>
          <button type="button" onClick={() => setMessage('')}>×</button>
        </div>
      )}

      <section className="account-security-overview">
        <article className="account-profile-card">
          <div className="account-avatar">
            {displayName.charAt(0).toLocaleUpperCase('vi')}
          </div>
          <div>
            <span>TÀI KHOẢN HIỆN TẠI</span>
            <h3>{displayName}</h3>
            <p>{current?.email ?? auth.email ?? '—'}</p>
          </div>
          <dl>
            <div>
              <dt>Vai trò</dt>
              <dd>{current?.role ?? auth.role ?? '—'}</dd>
            </div>
            <div>
              <dt>Quyền được cấp</dt>
              <dd>{permissions.length}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd className={(current?.isEmailVerified ?? auth.isEmailVerified) ? 'safe' : 'warning'}>
                {(current?.isEmailVerified ?? auth.isEmailVerified)
                  ? 'Đã xác minh'
                  : 'Chưa xác minh'}
              </dd>
            </div>
          </dl>
        </article>

        <article className="account-security-score">
          <span className="account-security-score-icon">◈</span>
          <div>
            <span>TRẠNG THÁI BẢO MẬT</span>
            <h3>Email & phiên đăng nhập</h3>
            <p>
              Theo dõi thiết bị thường xuyên và thu hồi phiên bạn không nhận ra.
            </p>
          </div>
          <strong className="safe">Đang hoạt động</strong>
        </article>

        <article className="account-session-summary">
          <span className="account-session-icon">▰</span>
          <div>
            <span>PHIÊN ĐĂNG NHẬP</span>
            <h3>{activeSessionCount} thiết bị đang hoạt động</h3>
            <p>
              Kiểm tra thường xuyên và thu hồi những thiết bị bạn không nhận ra.
            </p>
          </div>
          <button
            type="button"
            className="danger"
            onClick={() => void logoutEverywhere()}
            disabled={action === 'logout-all' || loading}
          >
            {action === 'logout-all' ? 'Đang thu hồi…' : 'Đăng xuất tất cả'}
          </button>
        </article>
      </section>

      <article className="account-sessions-card">
        <header>
          <div>
            <span>01</span>
            <div>
              <h3>Thiết bị & phiên đăng nhập</h3>
              <p>
                Lịch sử phiên gần đây của tài khoản, gồm cả phiên đã thu hồi.
              </p>
            </div>
          </div>
          <strong>{sessions.length} phiên</strong>
        </header>

        {loading
          ? <div className="account-session-empty">
            <span className="account-security-spinner"/>
            Đang tải danh sách phiên…
          </div>
          : sortedSessions.length
            ? <div className="account-session-list">
              {sortedSessions.map(item => (
                <div
                  className={!item.isActive ? 'revoked' : ''}
                  key={item.sessionId}
                >
                  <span className="account-device-icon">
                    {sessionIcon(item.userAgent)}
                  </span>
                  <div className="account-device-info">
                    <strong>
                      {getDeviceName(item.userAgent)}
                      {item.isCurrent && <em>Thiết bị hiện tại</em>}
                    </strong>
                    <span>
                      IP {item.ipAddress || 'không xác định'} · Tạo lúc{' '}
                      {formatDateTime(item.createdAt)}
                    </span>
                    <small>
                      {item.isActive
                        ? `Hoạt động gần nhất: ${formatDateTime(item.lastUsedAt)}`
                        : `Đã thu hồi: ${formatDateTime(item.revokedAt)}${
                          item.revocationReason
                            ? ` · ${item.revocationReason}`
                            : ''
                        }`}
                    </small>
                  </div>
                  <span className={`account-session-state ${
                    item.isActive ? 'active' : 'revoked'
                  }`}>
                    {item.isActive ? 'Hoạt động' : 'Đã thu hồi'}
                  </span>
                  {item.isActive && !item.isCurrent && (
                    <button
                      type="button"
                      className="danger"
                      onClick={() => void revokeSession(item)}
                      disabled={action === item.sessionId}
                    >
                      {action === item.sessionId ? 'Đang thu hồi…' : 'Thu hồi'}
                    </button>
                  )}
                </div>
              ))}
            </div>
            : <div className="account-session-empty">
              Không có dữ liệu phiên đăng nhập.
            </div>
        }
      </article>
    </section>
  )
}

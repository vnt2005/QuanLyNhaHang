import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  deleteActivityLog,
  getActivityLog,
  getActivityLogsPaginated,
  getActivityLogSummary,
  type ActivityLog,
  type ActivityLogFilters,
  type ActivityLogSummary,
} from '../api/activityLogs'

const PAGE_SIZE = 15

const emptySummary: ActivityLogSummary = {
  totalLogs: 0,
  totalSuccessLogs: 0,
  totalFailedLogs: 0,
  totalTodayLogs: 0,
  totalTodaySuccessLogs: 0,
  totalTodayFailedLogs: 0,
}

function startOfDayIso(value: string) {
  return value ? new Date(`${value}T00:00:00`).toISOString() : ''
}

function endOfDayIso(value: string) {
  return value ? new Date(`${value}T23:59:59.999`).toISOString() : ''
}

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(date)
}

function formatJson(value?: string | null) {
  if (!value) return 'Không có dữ liệu.'
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.'
}

export default function ActivityLogsPage({ role }: { role?: string }) {
  const canDelete = role?.toLowerCase() === 'admin'
  const [logs, setLogs] = useState<ActivityLog[]>([])
  const [summary, setSummary] = useState<ActivityLogSummary>(emptySummary)
  const [loading, setLoading] = useState(true)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [detail, setDetail] = useState<ActivityLog | null>(null)
  const [actionId, setActionId] = useState('')

  const [keyword, setKeyword] = useState('')
  const [moduleName, setModuleName] = useState('')
  const [action, setAction] = useState('')
  const [status, setStatus] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const filters = useMemo<ActivityLogFilters>(
    () => ({
      keyword,
      moduleName,
      action,
      status,
      fromDate: startOfDayIso(fromDate),
      toDate: endOfDayIso(toDate),
    }),
    [action, fromDate, keyword, moduleName, status, toDate],
  )

  const loadLogs = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await getActivityLogsPaginated(filters, page, PAGE_SIZE)
      setLogs(result.items)
      setTotalCount(result.totalCount)
      setTotalPages(Math.max(result.totalPages, 1))
      if (page > Math.max(result.totalPages, 1)) {
        setPage(Math.max(result.totalPages, 1))
      }
    } catch (exception) {
      setError(errorMessage(exception))
    } finally {
      setLoading(false)
    }
  }, [filters, page])

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true)
    try {
      setSummary(await getActivityLogSummary(filters))
    } catch (exception) {
      setError(errorMessage(exception))
    } finally {
      setSummaryLoading(false)
    }
  }, [filters])

  useEffect(() => {
    void loadLogs()
  }, [loadLogs])

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  async function openDetail(item: ActivityLog) {
    setActionId(item.id)
    setError('')
    try {
      setDetail(await getActivityLog(item.id))
    } catch (exception) {
      setError(errorMessage(exception))
    } finally {
      setActionId('')
    }
  }

  async function removeLog(item: ActivityLog) {
    if (!window.confirm(`Xóa vĩnh viễn nhật ký ${item.action} lúc ${formatDateTime(item.createdAt)}?`)) {
      return
    }
    setActionId(item.id)
    setError('')
    setMessage('')
    try {
      const result = await deleteActivityLog(item.id)
      setMessage(result.message ?? 'Đã xóa nhật ký hoạt động.')
      setDetail(null)
      await Promise.all([loadLogs(), loadSummary()])
    } catch (exception) {
      setError(errorMessage(exception))
    } finally {
      setActionId('')
    }
  }

  function clearFilters() {
    setKeyword('')
    setModuleName('')
    setAction('')
    setStatus('')
    setFromDate('')
    setToDate('')
    setPage(1)
  }

  return (
    <section className="activity-logs-page">
      <header className="activity-logs-heading">
        <div>
          <span className="activity-logs-kicker">KIỂM TOÁN HỆ THỐNG</span>
          <h2>Nhật ký hoạt động</h2>
          <p>Theo dõi truy vấn, thay đổi dữ liệu và các thao tác thất bại trong toàn hệ thống.</p>
        </div>
        <button type="button" className="activity-refresh" onClick={() => void Promise.all([loadLogs(), loadSummary()])}>
          ↻ Làm mới
        </button>
      </header>

      {error && <div className="activity-alert error">{error}<button onClick={() => setError('')}>×</button></div>}
      {message && <div className="activity-alert success">{message}<button onClick={() => setMessage('')}>×</button></div>}

      <section className="activity-summary-grid">
        <article><span>∑</span><div><p>Tổng nhật ký</p><strong>{summaryLoading ? '…' : summary.totalLogs}</strong><small>{totalCount} kết quả theo bộ lọc hiện tại</small></div></article>
        <article className="success"><span>✓</span><div><p>Thành công</p><strong>{summaryLoading ? '…' : summary.totalSuccessLogs}</strong><small>Hôm nay: {summary.totalTodaySuccessLogs}</small></div></article>
        <article className="failed"><span>!</span><div><p>Thất bại</p><strong>{summaryLoading ? '…' : summary.totalFailedLogs}</strong><small>Hôm nay: {summary.totalTodayFailedLogs}</small></div></article>
        <article className="today"><span>◷</span><div><p>Hoạt động hôm nay</p><strong>{summaryLoading ? '…' : summary.totalTodayLogs}</strong><small>Theo múi giờ UTC của backend</small></div></article>
      </section>

      <section className="activity-panel">
        <div className="activity-filters">
          <label className="activity-search"><span>Tìm kiếm</span><input value={keyword} onChange={event => { setKeyword(event.target.value); setPage(1) }} placeholder="Người dùng, mô tả, module, thực thể…" /></label>
          <label><span>Module</span><input value={moduleName} onChange={event => { setModuleName(event.target.value); setPage(1) }} placeholder="Orders, Payments…" /></label>
          <label><span>Hành động</span><input value={action} onChange={event => { setAction(event.target.value); setPage(1) }} placeholder="Create, Update, Get…" /></label>
          <label><span>Trạng thái</span><select value={status} onChange={event => { setStatus(event.target.value); setPage(1) }}><option value="">Tất cả</option><option value="Success">Thành công</option><option value="Failed">Thất bại</option></select></label>
          <label><span>Từ ngày</span><input type="date" value={fromDate} onChange={event => { setFromDate(event.target.value); setPage(1) }} /></label>
          <label><span>Đến ngày</span><input type="date" value={toDate} onChange={event => { setToDate(event.target.value); setPage(1) }} /></label>
          <button type="button" className="activity-clear" onClick={clearFilters}>Xóa lọc</button>
        </div>

        <div className="activity-table-wrap">
          <table className="activity-table">
            <thead><tr><th>Thời gian</th><th>Người dùng</th><th>Hành động</th><th>Module / thực thể</th><th>Mô tả</th><th>Trạng thái</th><th /></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={7} className="activity-empty">Đang tải nhật ký…</td></tr>
                : logs.length === 0 ? <tr><td colSpan={7} className="activity-empty"><strong>Không có nhật ký phù hợp</strong><span>Hãy thay đổi bộ lọc hoặc khoảng thời gian.</span></td></tr>
                  : logs.map(item => (
                    <tr key={item.id}>
                      <td><strong>{formatDateTime(item.createdAt)}</strong><small>{item.ipAddress ?? 'Không có IP'}</small></td>
                      <td><strong>{item.userName || 'System'}</strong><small>{item.userId ?? 'Không gắn tài khoản'}</small></td>
                      <td><span className="activity-action">{item.action}</span></td>
                      <td><strong>{item.moduleName}</strong><small>{item.entityName ?? '—'}{item.entityId ? ` • ${item.entityId}` : ''}</small></td>
                      <td className="activity-description">{item.description}</td>
                      <td><span className={`activity-status ${item.status === 'Success' ? 'success' : 'failed'}`}>{item.status === 'Success' ? 'Thành công' : 'Thất bại'}</span></td>
                      <td><div className="activity-row-actions"><button disabled={actionId === item.id} onClick={() => void openDetail(item)}>Chi tiết</button>{canDelete && <button className="danger" disabled={actionId === item.id} onClick={() => void removeLog(item)}>Xóa</button>}</div></td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        <footer className="activity-pagination"><span>Trang {page}/{totalPages} • {totalCount} nhật ký</span><div><button disabled={page <= 1} onClick={() => setPage(current => current - 1)}>← Trước</button><button disabled={page >= totalPages} onClick={() => setPage(current => current + 1)}>Sau →</button></div></footer>
      </section>

      {detail && <div className="activity-modal-backdrop" onMouseDown={() => setDetail(null)}><section className="activity-modal" onMouseDown={event => event.stopPropagation()}><header><div><span>{detail.moduleName}</span><h3>{detail.action} • {detail.status}</h3></div><button onClick={() => setDetail(null)}>×</button></header><div className="activity-detail-grid"><div><span>Người thực hiện</span><strong>{detail.userName || 'System'}</strong><small>{detail.userId ?? 'Không gắn tài khoản'}</small></div><div><span>Thời gian</span><strong>{formatDateTime(detail.createdAt)}</strong><small>{detail.ipAddress ?? 'Không có IP'}</small></div><div><span>Thực thể</span><strong>{detail.entityName ?? '—'}</strong><small>{detail.entityId ?? 'Không có mã thực thể'}</small></div><div><span>Trình duyệt / thiết bị</span><strong className="agent-text">{detail.userAgent ?? 'Không ghi nhận'}</strong></div></div><article className="activity-detail-description"><span>Mô tả</span><p>{detail.description}</p></article><div className="activity-json-grid"><article><span>Dữ liệu cũ</span><pre>{formatJson(detail.oldValues)}</pre></article><article><span>Dữ liệu gửi vào / dữ liệu mới</span><pre>{formatJson(detail.newValues)}</pre></article></div>{canDelete && <footer><button className="danger" onClick={() => void removeLog(detail)}>Xóa vĩnh viễn nhật ký</button></footer>}</section></div>}
    </section>
  )
}

import { useAutoDismissMessage } from '../hooks/useAutoDismissMessage'
import { confirmAction } from '../components/ConfirmDialog'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { getSelectableTables, type RestaurantTable } from '../services/areasTables'
import {
  createTableQrCode,
  deactivateTableQrCode,
  getAllTableQrCodes,
  getTableQrCodes,
  updateTableQrCode,
  type TableQrCode,
  type TableQrCodeStatus,
} from '../services/tableQrCodes'

const PAGE_SIZE = 8
const CLIENT_URL_STORAGE_KEY = 'tableQrCodeClientBaseUrl'

const statusLabels: Record<TableQrCodeStatus, string> = {
  Active: 'Đang hoạt động',
  Inactive: 'Đã vô hiệu',
  Blocked: 'Đã khóa',
}

function getDefaultClientBaseUrl() {
  const configuredUrl = import.meta.env.VITE_CUSTOMER_APP_URL as string | undefined
  if (typeof window === 'undefined') return configuredUrl ?? ''

  const isLocal = window.location.hostname === 'localhost'
    || window.location.hostname === '127.0.0.1'
  const localCustomerWebsite = isLocal
    ? `${window.location.protocol}//${window.location.hostname}:5174`
    : ''

  return localStorage.getItem(CLIENT_URL_STORAGE_KEY)
    ?? configuredUrl
    ?? localCustomerWebsite
}

function getNormalizedClientBaseUrl(value: string) {
  const trimmedValue = value.trim()
  if (!trimmedValue) throw new Error('Vui lòng nhập địa chỉ website khách hàng.')

  let url: URL
  try {
    url = new URL(trimmedValue)
  } catch {
    throw new Error('Địa chỉ website khách hàng chưa đúng định dạng URL.')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Địa chỉ website khách hàng phải bắt đầu bằng http:// hoặc https://.')
  }

  return url.toString().replace(/\/+$/, '')
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    character =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[character] ?? character,
  )
}

function safeFileName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function createQrDataUrl(value: string, width = 720) {
  return QRCode.toDataURL(value, {
    width,
    margin: 2,
    errorCorrectionLevel: 'H',
    color: {
      dark: '#102a3d',
      light: '#ffffff',
    },
  })
}

async function writeClipboard(value: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = value
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  textarea.remove()
  if (!copied) throw new Error('Trình duyệt không cho phép sao chép tự động.')
}

function QrImage({
  value,
  label,
  compact = false,
}: {
  value: string
  label: string
  compact?: boolean
}) {
  const [source, setSource] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    setSource('')
    setFailed(false)
    void createQrDataUrl(value, compact ? 260 : 640)
      .then(result => {
        if (active) setSource(result)
      })
      .catch(() => {
        if (active) setFailed(true)
      })
    return () => {
      active = false
    }
  }, [compact, value])

  return (
    <div className={`table-qr-image ${compact ? 'compact' : ''}`}>
      {source ? (
        <img src={source} alt={`Mã QR gọi món của ${label}`} />
      ) : failed ? (
        <span>Không tạo được ảnh QR</span>
      ) : (
        <span className="table-qr-image-loading">Đang tạo QR…</span>
      )}
    </div>
  )
}

type Filters = {
  keyword: string
  status: string
  activity: string
}

export default function TableQrCodesPage() {
  const [items, setItems] = useState<TableQrCode[]>([])
  const [allItems, setAllItems] = useState<TableQrCode[]>([])
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('')
  const [activity, setActivity] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [actionId, setActionId] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  useAutoDismissMessage(message, setMessage)

  const [clientBaseUrl, setClientBaseUrl] = useState(getDefaultClientBaseUrl)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedTableId, setSelectedTableId] = useState('')
  const [createNote, setCreateNote] = useState('')
  const [editing, setEditing] = useState<TableQrCode | null>(null)
  const [editStatus, setEditStatus] = useState<TableQrCodeStatus>('Active')
  const [editNote, setEditNote] = useState('')
  const [detail, setDetail] = useState<TableQrCode | null>(null)

  async function loadData(
    targetPage = page,
    filters: Filters = { keyword, status, activity },
  ) {
    setLoading(true)
    setError('')
    try {
      const [paginatedResult, allResult, tableResult] = await Promise.all([
        getTableQrCodes(
          filters.keyword,
          filters.status,
          filters.activity,
          targetPage,
          PAGE_SIZE,
        ),
        getAllTableQrCodes(),
        getSelectableTables('QrCode'),
      ])

      const resolvedTotalPages = Math.max(1, paginatedResult.totalPages || 1)
      if (targetPage > resolvedTotalPages) {
        await loadData(resolvedTotalPages, filters)
        return
      }

      setItems(paginatedResult.items ?? [])
      setAllItems(allResult ?? [])
      setTables(tableResult)
      setPage(paginatedResult.pageNumber || targetPage)
      setTotalPages(resolvedTotalPages)
      setTotalCount(paginatedResult.totalCount || 0)
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Không tải được danh sách mã QR.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData(1)
  }, [])

  const summary = useMemo(
    () => ({
      total: allItems.length,
      active: allItems.filter(item => item.status === 'Active' && item.isActive).length,
      inactive: allItems.filter(item => item.status === 'Inactive').length,
      blocked: allItems.filter(item => item.status === 'Blocked').length,
    }),
    [allItems],
  )

  const eligibleTables = useMemo(() => {
    return [...tables].sort(
      (left, right) =>
        left.areaName.localeCompare(right.areaName, 'vi') ||
        left.name.localeCompare(right.name, 'vi'),
    )
  }, [tables])

  function resetNotices() {
    setError('')
    setMessage('')
  }

  function saveClientBaseUrl() {
    resetNotices()
    try {
      const normalizedUrl = getNormalizedClientBaseUrl(clientBaseUrl)
      setClientBaseUrl(normalizedUrl)
      localStorage.setItem(CLIENT_URL_STORAGE_KEY, normalizedUrl)
      setMessage('Đã lưu địa chỉ website khách hàng trên trình duyệt này.')
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Địa chỉ ứng dụng không hợp lệ.',
      )
    }
  }

  async function openCreate() {
    resetNotices()
    try {
      const options = await getSelectableTables('QrCode')
      setTables(options)

      if (!options.length) {
        setError('Không có bàn đang hoạt động và chưa được gán mã QR.')
        return
      }

      setSelectedTableId(options[0].id)
      setCreateNote('')
      setCreateOpen(true)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không tải được danh sách bàn có thể tạo QR.')
    }
  }

  function openEdit(item: TableQrCode) {
    resetNotices()
    setDetail(null)
    setEditStatus(item.status)
    setEditNote(item.note ?? '')
    setEditing(item)
  }

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    resetNotices()
    if (!selectedTableId) {
      setError('Vui lòng chọn bàn cần tạo mã QR.')
      return
    }

    let normalizedUrl: string
    try {
      normalizedUrl = getNormalizedClientBaseUrl(clientBaseUrl)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Địa chỉ không hợp lệ.')
      return
    }

    setSaving(true)
    try {
      const result = await createTableQrCode({
        restaurantTableId: selectedTableId,
        clientBaseUrl: normalizedUrl,
        note: createNote,
      })
      localStorage.setItem(CLIENT_URL_STORAGE_KEY, normalizedUrl)
      setClientBaseUrl(normalizedUrl)
      setCreateOpen(false)
      setMessage(result.message ?? 'Tạo mã QR cho bàn thành công.')
      setDetail(result.data)
      await loadData(1)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không tạo được mã QR.')
    } finally {
      setSaving(false)
    }
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editing) return
    resetNotices()
    setSaving(true)
    try {
      const result = await updateTableQrCode(editing.id, {
        status: editStatus,
        note: editNote,
        regenerate: false,
        clientBaseUrl: null,
      })
      setEditing(null)
      setDetail(current => current?.id === result.data.id ? result.data : current)
      setMessage(result.message ?? 'Cập nhật mã QR thành công.')
      await loadData(page)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không cập nhật được mã QR.')
    } finally {
      setSaving(false)
    }
  }

  async function changeStatus(item: TableQrCode, nextStatus: TableQrCodeStatus) {
    if (
      nextStatus === 'Blocked' &&
      !await confirmAction(`Khóa mã QR của ${item.restaurantTableName}? Khách sẽ không thể gọi món.`)
    ) return

    resetNotices()
    setActionId(item.id)
    try {
      const result = await updateTableQrCode(item.id, {
        status: nextStatus,
        note: item.note ?? '',
        regenerate: false,
        clientBaseUrl: null,
      })
      setDetail(current => current?.id === result.data.id ? result.data : current)
      setMessage(
        nextStatus === 'Active'
          ? 'Đã kích hoạt lại mã QR.'
          : nextStatus === 'Blocked'
            ? 'Đã khóa mã QR.'
            : 'Đã vô hiệu hóa mã QR.',
      )
      await loadData(page)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không đổi được trạng thái mã QR.')
    } finally {
      setActionId('')
    }
  }

  async function deactivate(item: TableQrCode) {
    if (
      !await confirmAction(
        `Vô hiệu hóa mã QR của ${item.restaurantTableName}? Liên kết hiện tại sẽ ngừng hoạt động.`,
      )
    ) return

    resetNotices()
    setActionId(item.id)
    try {
      const result = await deactivateTableQrCode(item.id)
      setDetail(current => current?.id === item.id ? null : current)
      setMessage(result.message ?? 'Vô hiệu hóa mã QR thành công.')
      await loadData(page)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không vô hiệu hóa được mã QR.')
    } finally {
      setActionId('')
    }
  }

  async function regenerate(item: TableQrCode) {
    let normalizedUrl: string
    try {
      normalizedUrl = getNormalizedClientBaseUrl(clientBaseUrl)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Địa chỉ không hợp lệ.')
      return
    }

    if (
      !await confirmAction(
        `Tạo lại mã QR của ${item.restaurantTableName}? Mã cũ sẽ mất hiệu lực ngay lập tức.`,
      )
    ) return

    resetNotices()
    setActionId(item.id)
    try {
      const result = await updateTableQrCode(item.id, {
        status: 'Active',
        note: item.note ?? '',
        regenerate: true,
        clientBaseUrl: normalizedUrl,
      })
      localStorage.setItem(CLIENT_URL_STORAGE_KEY, normalizedUrl)
      setClientBaseUrl(normalizedUrl)
      setDetail(current => current?.id === result.data.id ? result.data : current)
      setMessage('Đã tạo token và ảnh QR mới. Mã cũ không còn hiệu lực.')
      await loadData(page)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không tái tạo được mã QR.')
    } finally {
      setActionId('')
    }
  }

  async function copyUrl(item: TableQrCode) {
    resetNotices()
    try {
      await writeClipboard(item.qrCodeUrl)
      setMessage(`Đã sao chép liên kết gọi món của ${item.restaurantTableName}.`)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không sao chép được liên kết.')
    }
  }

  async function downloadQr(item: TableQrCode) {
    resetNotices()
    setActionId(item.id)
    try {
      const dataUrl = await createQrDataUrl(item.qrCodeUrl, 1024)
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = `qr-${safeFileName(item.restaurantTableName) || 'ban'}.png`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setMessage(`Đã tải ảnh QR của ${item.restaurantTableName}.`)
    } catch {
      setError('Không tạo được tệp ảnh QR để tải xuống.')
    } finally {
      setActionId('')
    }
  }

  async function printQr(item: TableQrCode) {
    resetNotices()
    const printWindow = window.open('', '_blank', 'width=720,height=820')
    if (!printWindow) {
      setError('Trình duyệt đang chặn cửa sổ in. Vui lòng cho phép pop-up rồi thử lại.')
      return
    }

    setActionId(item.id)
    try {
      const dataUrl = await createQrDataUrl(item.qrCodeUrl, 900)
      printWindow.document.write(`<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <title>Mã QR ${escapeHtml(item.restaurantTableName)}</title>
  <style>
    *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:Arial,sans-serif;color:#102a3d;background:#fff}
    main{width:560px;padding:42px;text-align:center;border:2px solid #d9e5ec;border-radius:24px}
    .brand{margin:0 0 8px;color:#1685ad;font-size:14px;font-weight:800;letter-spacing:.16em;text-transform:uppercase}
    h1{margin:0 0 6px;font-size:32px}p{margin:0;color:#66788a}img{display:block;width:390px;height:390px;margin:24px auto 16px}
    .hint{font-size:16px;font-weight:700;color:#30465a}.url{margin-top:14px;font-size:11px;overflow-wrap:anywhere;color:#8493a1}
    @media print{main{border:0}}
  </style>
</head>
<body>
  <main>
    <p class="brand">GỌI MÓN TẠI BÀN</p>
    <h1>${escapeHtml(item.restaurantTableName)}</h1>
    <p>Quét mã để xem thực đơn và gọi món</p>
    <img src="${dataUrl}" alt="Mã QR">
    <p class="hint">Mở camera điện thoại và hướng vào mã QR</p>
    <p class="url">${escapeHtml(item.qrCodeUrl)}</p>
  </main>
  <script>window.addEventListener('load',()=>{window.print()})</script>
</body>
</html>`)
      printWindow.document.close()
    } catch {
      printWindow.close()
      setError('Không chuẩn bị được bản in mã QR.')
    } finally {
      setActionId('')
    }
  }

  return (
    <section className="table-qr-page">
      <div className="table-qr-toolbar">
        <div>
          <span className="table-qr-kicker">GỌI MÓN KHÔNG TIẾP XÚC</span>
          <h2>Quản lý mã QR theo bàn</h2>
          <p>Mỗi bàn có một QR riêng nhưng dùng chung thực đơn đang phục vụ của nhà hàng.</p>
        </div>
        <button
          type="button"
          className="table-qr-primary"
          onClick={() => void openCreate()}
          disabled={loading}
        >
          <span>＋</span> Tạo mã QR
        </button>
      </div>

      {error && (
        <div className="table-qr-alert error" role="alert">
          <span>!</span><p>{error}</p>
          <button type="button" onClick={() => setError('')} aria-label="Đóng thông báo lỗi">×</button>
        </div>
      )}
      {message && (
        <div className="table-qr-alert success" role="status">
          <span>✓</span><p>{message}</p>
          <button type="button" onClick={() => setMessage('')} aria-label="Đóng thông báo">×</button>
        </div>
      )}

      <section className="table-qr-url-settings">
        <div className="table-qr-url-icon" aria-hidden="true">↗</div>
        <div className="table-qr-url-copy">
          <strong>Địa chỉ trang gọi món thật</strong>
          <span>Hệ thống sẽ nối thêm /qr-order/token cho từng bàn.</span>
        </div>
        <label>
          <span className="sr-only">Địa chỉ website khách hàng</span>
          <input
            type="url"
            value={clientBaseUrl}
            onChange={event => setClientBaseUrl(event.target.value)}
            placeholder="https://order.example.com"
          />
        </label>
        <button type="button" onClick={saveClientBaseUrl}>Lưu địa chỉ</button>
      </section>

      <section className="table-qr-summary-grid">
        <article className="table-qr-summary-card total">
          <span className="table-qr-summary-icon">▦</span>
          <div><p>Tổng mã QR</p><strong>{summary.total}</strong><small>{eligibleTables.length} bàn chưa có mã</small></div>
        </article>
        <article className="table-qr-summary-card active">
          <span className="table-qr-summary-icon">✓</span>
          <div><p>Đang hoạt động</p><strong>{summary.active}</strong><small>Khách có thể gọi món</small></div>
        </article>
        <article className="table-qr-summary-card inactive">
          <span className="table-qr-summary-icon">○</span>
          <div><p>Đã vô hiệu</p><strong>{summary.inactive}</strong><small>Không nhận lượt truy cập</small></div>
        </article>
        <article className="table-qr-summary-card blocked">
          <span className="table-qr-summary-icon">!</span>
          <div><p>Đã khóa</p><strong>{summary.blocked}</strong><small>Cần kiểm tra trước khi mở</small></div>
        </article>
      </section>

      <section className="table-qr-panel">
        <div className="table-qr-panel-heading">
          <div><h3>Danh sách mã QR</h3><p>{totalCount} kết quả theo bộ lọc hiện tại</p></div>
          <span>Cập nhật trực tiếp từ hệ thống</span>
        </div>

        <form
          className="table-qr-filters"
          onSubmit={event => {
            event.preventDefault()
            void loadData(1)
          }}
        >
          <label className="table-qr-search">
            <span aria-hidden="true">⌕</span>
            <input
              value={keyword}
              onChange={event => setKeyword(event.target.value)}
              placeholder="Tìm theo bàn, token hoặc liên kết…"
            />
          </label>
          <select value={status} onChange={event => setStatus(event.target.value)}>
            <option value="">Tất cả trạng thái</option>
            <option value="Active">Đang hoạt động</option>
            <option value="Inactive">Đã vô hiệu</option>
            <option value="Blocked">Đã khóa</option>
          </select>
          <select value={activity} onChange={event => setActivity(event.target.value)}>
            <option value="">Tất cả hiệu lực</option>
            <option value="true">Còn hiệu lực</option>
            <option value="false">Hết hiệu lực</option>
          </select>
          <button className="table-qr-filter-submit" type="submit">Lọc</button>
          <button
            className="table-qr-filter-clear"
            type="button"
            onClick={() => {
              setKeyword('')
              setStatus('')
              setActivity('')
              void loadData(1, { keyword: '', status: '', activity: '' })
            }}
          >
            Xóa lọc
          </button>
        </form>

        {loading ? (
          <div className="table-qr-loading"><span /><p>Đang tải danh sách mã QR…</p></div>
        ) : items.length === 0 ? (
          <div className="table-qr-empty">
            <div className="table-qr-empty-icon">▦</div>
            <h3>Chưa có mã QR phù hợp</h3>
            <p>Thử đổi bộ lọc hoặc tạo mã QR cho một bàn chưa được gán.</p>
            {eligibleTables.length > 0 && (
              <button type="button" className="table-qr-primary" onClick={() => void openCreate()}>Tạo mã QR đầu tiên</button>
            )}
          </div>
        ) : (
          <div className="table-qr-card-grid">
            {items.map(item => (
              <article className="table-qr-card" key={item.id}>
                <header>
                  <div className="table-qr-table-name">
                    <span>QR</span>
                    <div><strong>{item.restaurantTableName}</strong><small>Tạo lúc {formatDateTime(item.createdAt)}</small></div>
                  </div>
                  <span className={`table-qr-status ${item.status.toLowerCase()}`}>{statusLabels[item.status]}</span>
                </header>
                <div className="table-qr-card-content">
                  <QrImage value={item.qrCodeUrl} label={item.restaurantTableName} compact />
                  <div className="table-qr-card-info">
                    <div><span>Liên kết gọi món</span><strong title={item.qrCodeUrl}>{item.qrCodeUrl}</strong></div>
                    <div><span>Token</span><code title={item.token}>{item.token}</code></div>
                    <p>{item.note?.trim() || 'Chưa có ghi chú cho mã QR này.'}</p>
                  </div>
                </div>
                <footer>
                  <button type="button" onClick={() => setDetail(item)}>Chi tiết</button>
                  <button type="button" onClick={() => openEdit(item)}>Chỉnh sửa</button>
                  <button
                    type="button"
                    className="table-qr-card-primary"
                    onClick={() => void downloadQr(item)}
                    disabled={actionId === item.id}
                  >
                    Tải PNG
                  </button>
                </footer>
              </article>
            ))}
          </div>
        )}

        <div className="table-qr-pagination">
          <span>Trang {page}/{totalPages}</span>
          <div>
            <button type="button" onClick={() => void loadData(page - 1)} disabled={loading || page <= 1} aria-label="Trang trước">←</button>
            <button type="button" onClick={() => void loadData(page + 1)} disabled={loading || page >= totalPages} aria-label="Trang sau">→</button>
          </div>
        </div>
      </section>

      {createOpen && (
        <div className="table-qr-modal-backdrop" onMouseDown={event => {
          if (event.target === event.currentTarget && !saving) setCreateOpen(false)
        }}>
          <section className="table-qr-modal table-qr-form-modal" role="dialog" aria-modal="true">
            <header>
              <div><span className="table-qr-kicker">MÃ QR MỚI</span><h3>Tạo mã QR cho bàn</h3><p>Mỗi bàn chỉ có một mã QR đang quản lý.</p></div>
              <button type="button" onClick={() => setCreateOpen(false)} disabled={saving} aria-label="Đóng">×</button>
            </header>
            <form onSubmit={submitCreate}>
              {error && <div className="table-qr-inline-notice error">{error}</div>}
              <label>
                Bàn <strong>*</strong>
                <select value={selectedTableId} onChange={event => setSelectedTableId(event.target.value)} required>
                  {eligibleTables.map(table => (
                    <option value={table.id} key={table.id}>{table.areaName} — {table.name} ({table.capacity} chỗ)</option>
                  ))}
                </select>
              </label>
              <label>
                Ghi chú
                <textarea value={createNote} onChange={event => setCreateNote(event.target.value)} placeholder="Ví dụ: QR đặt tại mép trái bàn…" maxLength={500} />
              </label>
              <div className="table-qr-url-preview">
                <span>Liên kết thật sẽ được tạo từ</span>
                <code>{clientBaseUrl || 'Chưa nhập địa chỉ ứng dụng'}/qr-order/••••</code>
              </div>
              <div className="table-qr-modal-actions">
                <button type="button" onClick={() => setCreateOpen(false)} disabled={saving}>Hủy</button>
                <button className="table-qr-primary" disabled={saving || !selectedTableId}>{saving ? 'Đang tạo…' : 'Tạo mã QR'}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {editing && (
        <div className="table-qr-modal-backdrop" onMouseDown={event => {
          if (event.target === event.currentTarget && !saving) setEditing(null)
        }}>
          <section className="table-qr-modal table-qr-form-modal" role="dialog" aria-modal="true">
            <header>
              <div><span className="table-qr-kicker">CẬP NHẬT MÃ QR</span><h3>{editing.restaurantTableName}</h3><p>Đổi trạng thái hoặc ghi chú mà không thay token hiện tại.</p></div>
              <button type="button" onClick={() => setEditing(null)} disabled={saving} aria-label="Đóng">×</button>
            </header>
            <form onSubmit={submitEdit}>
              {error && <div className="table-qr-inline-notice error">{error}</div>}
              <label>
                Trạng thái
                <select value={editStatus} onChange={event => setEditStatus(event.target.value as TableQrCodeStatus)}>
                  <option value="Active">Đang hoạt động</option>
                  <option value="Inactive">Đã vô hiệu</option>
                  <option value="Blocked">Đã khóa</option>
                </select>
              </label>
              <label>
                Ghi chú
                <textarea value={editNote} onChange={event => setEditNote(event.target.value)} placeholder="Thông tin vị trí đặt mã hoặc lưu ý vận hành…" maxLength={500} />
              </label>
              <div className="table-qr-modal-actions">
                <button type="button" onClick={() => setEditing(null)} disabled={saving}>Hủy</button>
                <button className="table-qr-primary" disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu thay đổi'}</button>
              </div>
            </form>
          </section>
        </div>
      )}

      {detail && (
        <div className="table-qr-modal-backdrop" onMouseDown={event => {
          if (event.target === event.currentTarget && !actionId) setDetail(null)
        }}>
          <section className="table-qr-modal table-qr-detail-modal" role="dialog" aria-modal="true">
            <header>
              <div><span className="table-qr-kicker">CHI TIẾT MÃ QR</span><h3>{detail.restaurantTableName}</h3><p>Quét bằng camera để xác nhận mã QR tại bàn.</p></div>
              <button type="button" onClick={() => setDetail(null)} disabled={Boolean(actionId)} aria-label="Đóng">×</button>
            </header>

            {(error || message) && <div className={`table-qr-inline-notice ${error ? 'error' : 'success'}`}>{error || message}</div>}
            <div className="table-qr-detail-content">
              <div className="table-qr-detail-preview">
                <QrImage value={detail.qrCodeUrl} label={detail.restaurantTableName} />
                <span className={`table-qr-status ${detail.status.toLowerCase()}`}>{statusLabels[detail.status]}</span>
              </div>
              <div className="table-qr-detail-info">
                <div className="table-qr-detail-row">
                  <span>Liên kết gọi món thật</span>
                  <strong>{detail.qrCodeUrl}</strong>
                  <button type="button" onClick={() => void copyUrl(detail)}>Sao chép</button>
                </div>
                <div className="table-qr-detail-row"><span>Token bảo mật</span><code>{detail.token}</code></div>
                <div className="table-qr-detail-meta">
                  <span>Ngày tạo <strong>{formatDateTime(detail.createdAt)}</strong></span>
                  <span>Cập nhật cuối <strong>{formatDateTime(detail.updatedAt ?? detail.createdAt)}</strong></span>
                </div>
                <div className="table-qr-detail-note"><span>Ghi chú</span><p>{detail.note?.trim() || 'Chưa có ghi chú.'}</p></div>
                <div className="table-qr-detail-tools">
                  <button type="button" onClick={() => void downloadQr(detail)} disabled={actionId === detail.id}>Tải ảnh PNG</button>
                  <button type="button" onClick={() => void printQr(detail)} disabled={actionId === detail.id}>In mã QR</button>
                  <button type="button" onClick={() => void regenerate(detail)} disabled={actionId === detail.id}>Tạo lại mã</button>
                </div>
              </div>
            </div>

            <footer className="table-qr-detail-actions">
              <button type="button" onClick={() => openEdit(detail)}>Sửa ghi chú</button>
              {detail.status === 'Active' && detail.isActive ? (
                <>
                  <button type="button" className="table-qr-warning-button" onClick={() => void changeStatus(detail, 'Blocked')} disabled={actionId === detail.id}>Khóa mã</button>
                  <button type="button" className="table-qr-danger-button" onClick={() => void deactivate(detail)} disabled={actionId === detail.id}>Vô hiệu hóa</button>
                </>
              ) : (
                <button type="button" className="table-qr-primary" onClick={() => void changeStatus(detail, 'Active')} disabled={actionId === detail.id}>Kích hoạt lại</button>
              )}
            </footer>
          </section>
        </div>
      )}
    </section>
  )
}
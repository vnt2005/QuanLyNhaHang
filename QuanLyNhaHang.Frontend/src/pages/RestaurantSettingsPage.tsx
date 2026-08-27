import { useAutoDismissMessage } from '../hooks/useAutoDismissMessage'
import { confirmAction } from '../components/ConfirmDialog'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  createRestaurantSetting,
  deactivateRestaurantSetting,
  getPaginatedRestaurantSettings,
  getRestaurantSetting,
  getRestaurantSettings,
  updateRestaurantSetting,
  type RestaurantSetting,
  type RestaurantSettingInput,
} from '../services/restaurantSettings'

const PAGE_SIZE = 8

type SettingForm = RestaurantSettingInput & {
  isActive: boolean
}

const emptyForm: SettingForm = {
  restaurantName: '',
  address: '',
  phoneNumber: '',
  email: '',
  taxCode: '',
  websiteUrl: '',
  logoUrl: '',
  defaultVatPercent: 0,
  serviceChargePercent: 0,
  currency: 'VND',
  openingTime: '08:00',
  closingTime: '22:00',
  invoiceFooter: '',
  qrOrderWelcomeMessage: '',
  isActive: true,
}

function toInputTime(value: string) {
  return value.slice(0, 5)
}

function toForm(setting: RestaurantSetting): SettingForm {
  return {
    restaurantName: setting.restaurantName,
    address: setting.address,
    phoneNumber: setting.phoneNumber,
    email: setting.email ?? '',
    taxCode: setting.taxCode ?? '',
    websiteUrl: setting.websiteUrl ?? '',
    logoUrl: setting.logoUrl ?? '',
    defaultVatPercent: setting.defaultVatPercent,
    serviceChargePercent: setting.serviceChargePercent,
    currency: setting.currency,
    openingTime: toInputTime(setting.openingTime),
    closingTime: toInputTime(setting.closingTime),
    invoiceFooter: setting.invoiceFooter ?? '',
    qrOrderWelcomeMessage: setting.qrOrderWelcomeMessage ?? '',
    isActive: setting.isActive,
  }
}

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function formatPercent(value: number) {
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value)}%`
}

function getSafeHttpUrl(value?: string | null) {
  if (!value?.trim()) return null
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null
  } catch {
    return null
  }
}

function validateHttpUrl(value: string, label: string) {
  if (!value.trim()) return ''
  return getSafeHttpUrl(value)
    ? ''
    : `${label} phải là địa chỉ hợp lệ bắt đầu bằng http:// hoặc https://.`
}

function validateForm(form: SettingForm) {
  if (!form.restaurantName.trim()) return 'Vui lòng nhập tên nhà hàng.'
  if (!form.address.trim()) return 'Vui lòng nhập địa chỉ nhà hàng.'
  if (!form.phoneNumber.trim()) return 'Vui lòng nhập số điện thoại.'
  if (!form.currency.trim()) return 'Vui lòng nhập đơn vị tiền tệ.'
  if (!form.openingTime || !form.closingTime) {
    return 'Vui lòng nhập đầy đủ giờ mở cửa và đóng cửa.'
  }
  if (
    !Number.isFinite(form.defaultVatPercent) ||
    form.defaultVatPercent < 0 ||
    form.defaultVatPercent > 100
  ) {
    return 'VAT mặc định phải nằm trong khoảng 0–100%.'
  }
  if (
    !Number.isFinite(form.serviceChargePercent) ||
    form.serviceChargePercent < 0 ||
    form.serviceChargePercent > 100
  ) {
    return 'Phí phục vụ phải nằm trong khoảng 0–100%.'
  }
  return (
    validateHttpUrl(form.websiteUrl, 'Website') ||
    validateHttpUrl(form.logoUrl, 'Đường dẫn logo')
  )
}

function SettingLogo({
  url,
  name,
  compact = false,
}: {
  url?: string | null
  name: string
  compact?: boolean
}) {
  const safeUrl = getSafeHttpUrl(url)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setFailed(false)
  }, [safeUrl])

  return (
    <div className={`restaurant-logo ${compact ? 'compact' : ''}`}>
      {safeUrl && !failed ? (
        <img src={safeUrl} alt={`Logo ${name || 'nhà hàng'}`} onError={() => setFailed(true)} />
      ) : (
        <span>{name.trim().charAt(0).toUpperCase() || 'NH'}</span>
      )}
    </div>
  )
}

export default function RestaurantSettingsPage() {
  const [items, setItems] = useState<RestaurantSetting[]>([])
  const [allItems, setAllItems] = useState<RestaurantSetting[]>([])
  const [keyword, setKeyword] = useState('')
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
  const [formError, setFormError] = useState('')
  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing] = useState<RestaurantSetting | null>(null)
  const [form, setForm] = useState<SettingForm>({ ...emptyForm })
  const [detail, setDetail] = useState<RestaurantSetting | null>(null)

  const activeSetting = useMemo(
    () => allItems.find(item => item.isActive) ?? null,
    [allItems],
  )

  async function loadData(
    targetPage = page,
    nextKeyword = keyword,
    nextActivity = activity,
  ) {
    setLoading(true)
    setError('')
    try {
      const [paginatedResult, allResult] = await Promise.all([
        getPaginatedRestaurantSettings(
          nextKeyword,
          nextActivity,
          targetPage,
          PAGE_SIZE,
        ),
        getRestaurantSettings(),
      ])
      const resolvedTotalPages = Math.max(1, paginatedResult.totalPages || 1)

      if (targetPage > resolvedTotalPages) {
        await loadData(resolvedTotalPages, nextKeyword, nextActivity)
        return
      }

      setItems(paginatedResult.items ?? [])
      setAllItems(allResult ?? [])
      setPage(paginatedResult.pageNumber || targetPage)
      setTotalPages(resolvedTotalPages)
      setTotalCount(paginatedResult.totalCount || 0)
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Không tải được cấu hình nhà hàng.',
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData(1)
  }, [])

  function resetNotices() {
    setError('')
    setMessage('')
    setFormError('')
  }

  function openCreate() {
    resetNotices()
    if (activeSetting) {
      setError(
        'Đã có một cấu hình đang hoạt động. Hãy chỉnh sửa cấu hình đó hoặc vô hiệu hóa trước khi tạo mới.',
      )
      return
    }
    setEditing(null)
    setForm({ ...emptyForm })
    setFormMode('create')
  }

  function openEdit(setting: RestaurantSetting) {
    resetNotices()
    setDetail(null)
    setEditing(setting)
    setForm(toForm(setting))
    setFormMode('edit')
  }

  function closeForm() {
    if (saving) return
    setFormMode(null)
    setEditing(null)
    setFormError('')
  }

  function updateField<K extends keyof SettingForm>(field: K, value: SettingForm[K]) {
    setForm(current => ({ ...current, [field]: value }))
  }

  async function submitFilters(event: FormEvent) {
    event.preventDefault()
    resetNotices()
    await loadData(1)
  }

  async function clearFilters() {
    setKeyword('')
    setActivity('')
    resetNotices()
    await loadData(1, '', '')
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    setMessage('')
    const validationError = validateForm(form)
    if (validationError) {
      setFormError(validationError)
      return
    }

    if (
      form.isActive &&
      activeSetting &&
      activeSetting.id !== editing?.id
    ) {
      setFormError(
        `“${activeSetting.restaurantName}” đang hoạt động. Hãy vô hiệu hóa cấu hình này trước khi kích hoạt cấu hình khác.`,
      )
      return
    }

    setSaving(true)
    try {
      const result =
        formMode === 'edit' && editing
          ? await updateRestaurantSetting(editing.id, form)
          : await createRestaurantSetting(form)
      setMessage(
        result.message ??
          (formMode === 'edit'
            ? 'Cập nhật cấu hình nhà hàng thành công.'
            : 'Tạo cấu hình nhà hàng thành công.'),
      )
      setFormMode(null)
      setEditing(null)
      await loadData(formMode === 'create' ? 1 : page)
    } catch (exception) {
      setFormError(
        exception instanceof Error
          ? exception.message
          : 'Không lưu được cấu hình nhà hàng.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function openDetail(setting: RestaurantSetting) {
    resetNotices()
    setActionId(setting.id)
    try {
      setDetail(await getRestaurantSetting(setting.id))
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Không tải được chi tiết cấu hình.',
      )
    } finally {
      setActionId('')
    }
  }

  async function activate(setting: RestaurantSetting) {
    resetNotices()
    if (activeSetting && activeSetting.id !== setting.id) {
      setError(
        `Hãy vô hiệu hóa “${activeSetting.restaurantName}” trước khi kích hoạt cấu hình khác.`,
      )
      return
    }
    if (!await confirmAction(`Kích hoạt cấu hình “${setting.restaurantName}”?`)) return

    setActionId(setting.id)
    try {
      const result = await updateRestaurantSetting(setting.id, {
        ...toForm(setting),
        isActive: true,
      })
      setMessage(result.message ?? 'Kích hoạt cấu hình nhà hàng thành công.')
      await loadData(page)
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Không kích hoạt được cấu hình nhà hàng.',
      )
    } finally {
      setActionId('')
    }
  }

  async function deactivate(setting: RestaurantSetting) {
    if (
      !await confirmAction(
        `Vô hiệu hóa cấu hình “${setting.restaurantName}”? Hệ thống sẽ không còn cấu hình nhà hàng đang hoạt động.`,
      )
    ) {
      return
    }

    resetNotices()
    setActionId(setting.id)
    try {
      const result = await deactivateRestaurantSetting(setting.id)
      setMessage(result.message ?? 'Vô hiệu hóa cấu hình nhà hàng thành công.')
      setDetail(null)
      await loadData(page)
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Không vô hiệu hóa được cấu hình nhà hàng.',
      )
    } finally {
      setActionId('')
    }
  }

  const activeWebsite = getSafeHttpUrl(activeSetting?.websiteUrl)
  const previewLogo = getSafeHttpUrl(form.logoUrl)
  const hasConflictingActiveSetting = Boolean(
    activeSetting && activeSetting.id !== editing?.id,
  )

  return (
    <section className="restaurant-settings-page">
      <div className="restaurant-settings-toolbar">
        <div>
          <span className="restaurant-settings-kicker">THIẾT LẬP VẬN HÀNH</span>
          <h2>Cấu hình nhà hàng</h2>
          <p>
            Quản lý thông tin thương hiệu, khung giờ, thuế phí và nội dung hiển thị
            cho khách hàng.
          </p>
        </div>
        <div className="restaurant-settings-toolbar-actions">
          <button
            type="button"
            className="restaurant-settings-secondary"
            disabled={loading}
            onClick={() => {
              resetNotices()
              void loadData(page)
            }}
          >
            ↻ Làm mới
          </button>
          <button
            type="button"
            className="restaurant-settings-primary"
            disabled={Boolean(activeSetting)}
            title={
              activeSetting
                ? 'Chỉ có thể tạo khi chưa có cấu hình đang hoạt động.'
                : undefined
            }
            onClick={openCreate}
          >
            + Tạo cấu hình
          </button>
        </div>
      </div>

      {message && (
        <div className="restaurant-settings-alert success">
          <span>✓</span>
          <p>{message}</p>
          <button type="button" aria-label="Đóng thông báo" onClick={() => setMessage('')}>
            ×
          </button>
        </div>
      )}
      {error && (
        <div className="restaurant-settings-alert error">
          <span>!</span>
          <p>{error}</p>
          <button type="button" aria-label="Đóng thông báo" onClick={() => setError('')}>
            ×
          </button>
        </div>
      )}

      <article className={`active-setting-card ${activeSetting ? '' : 'empty'}`}>
        {loading && allItems.length === 0 ? (
          <div className="active-setting-loading">Đang tải cấu hình đang hoạt động…</div>
        ) : activeSetting ? (
          <>
            <div className="active-setting-brand">
              <SettingLogo url={activeSetting.logoUrl} name={activeSetting.restaurantName} />
              <div>
                <span className="active-setting-status">
                  <i />
                  Đang áp dụng
                </span>
                <h3>{activeSetting.restaurantName}</h3>
                <p>{activeSetting.address}</p>
                <div className="active-setting-contact">
                  <span>☎ {activeSetting.phoneNumber}</span>
                  {activeSetting.email && <span>✉ {activeSetting.email}</span>}
                  {activeWebsite && (
                    <a href={activeWebsite} target="_blank" rel="noreferrer">
                      ↗ Website
                    </a>
                  )}
                </div>
              </div>
            </div>
            <div className="active-setting-operations">
              <div>
                <span>Giờ phục vụ</span>
                <strong>
                  {toInputTime(activeSetting.openingTime)} –{' '}
                  {toInputTime(activeSetting.closingTime)}
                </strong>
              </div>
              <div>
                <span>VAT mặc định</span>
                <strong>{formatPercent(activeSetting.defaultVatPercent)}</strong>
              </div>
              <div>
                <span>Phí phục vụ</span>
                <strong>{formatPercent(activeSetting.serviceChargePercent)}</strong>
              </div>
              <div>
                <span>Tiền tệ</span>
                <strong>{activeSetting.currency}</strong>
              </div>
            </div>
            <div className="active-setting-actions">
              <button type="button" onClick={() => void openDetail(activeSetting)}>
                Xem chi tiết
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => openEdit(activeSetting)}
              >
                Chỉnh sửa
              </button>
            </div>
          </>
        ) : (
          <div className="active-setting-empty">
            <span>⚙</span>
            <div>
              <h3>Chưa có cấu hình đang hoạt động</h3>
              <p>
                Tạo cấu hình đầu tiên để đồng bộ thông tin nhà hàng trên hóa đơn và
                trang gọi món QR.
              </p>
            </div>
            <button type="button" onClick={openCreate}>
              Tạo cấu hình đầu tiên
            </button>
          </div>
        )}
      </article>

      <div className="restaurant-settings-summary">
        <article>
          <span className="summary-icon blue">▤</span>
          <div>
            <p>Tổng cấu hình</p>
            <strong>{loading ? '—' : allItems.length}</strong>
            <small>{allItems.filter(item => !item.isActive).length} bản lưu lịch sử</small>
          </div>
        </article>
        <article>
          <span className="summary-icon green">◷</span>
          <div>
            <p>Khung giờ phục vụ</p>
            <strong>
              {activeSetting
                ? `${toInputTime(activeSetting.openingTime)} – ${toInputTime(
                    activeSetting.closingTime,
                  )}`
                : 'Chưa thiết lập'}
            </strong>
            <small>Áp dụng cho cấu hình hiện tại</small>
          </div>
        </article>
        <article>
          <span className="summary-icon amber">%</span>
          <div>
            <p>VAT mặc định</p>
            <strong>
              {activeSetting ? formatPercent(activeSetting.defaultVatPercent) : '—'}
            </strong>
            <small>Tỷ lệ cộng vào hóa đơn</small>
          </div>
        </article>
        <article>
          <span className="summary-icon violet">₫</span>
          <div>
            <p>Phí phục vụ</p>
            <strong>
              {activeSetting ? formatPercent(activeSetting.serviceChargePercent) : '—'}
            </strong>
            <small>Đơn vị {activeSetting?.currency ?? 'chưa chọn'}</small>
          </div>
        </article>
      </div>

      <article className="restaurant-settings-panel">
        <div className="restaurant-settings-panel-heading">
          <div>
            <h3>Lịch sử cấu hình</h3>
            <p>Tìm kiếm, xem lại và quản lý các cấu hình đã lưu.</p>
          </div>
          <span>{totalCount} cấu hình</span>
        </div>

        <form className="restaurant-settings-filters" onSubmit={submitFilters}>
          <label>
            <span className="sr-only">Từ khóa tìm kiếm</span>
            <input
              value={keyword}
              onChange={event => setKeyword(event.target.value)}
              placeholder="Tên, địa chỉ, điện thoại, email hoặc mã số thuế..."
            />
          </label>
          <label>
            <span className="sr-only">Trạng thái</span>
            <select value={activity} onChange={event => setActivity(event.target.value)}>
              <option value="">Tất cả trạng thái</option>
              <option value="true">Đang hoạt động</option>
              <option value="false">Đã vô hiệu</option>
            </select>
          </label>
          <button type="submit" disabled={loading}>
            Lọc dữ liệu
          </button>
          <button type="button" className="clear" disabled={loading} onClick={clearFilters}>
            Xóa lọc
          </button>
        </form>

        <div className="restaurant-settings-table-wrap">
          <table className="restaurant-settings-table">
            <thead>
              <tr>
                <th>Nhà hàng</th>
                <th>Liên hệ</th>
                <th>Giờ phục vụ</th>
                <th>Thuế & phí</th>
                <th>Cập nhật</th>
                <th>Trạng thái</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="restaurant-settings-empty-cell">
                    Đang tải dữ liệu…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="restaurant-settings-empty-cell">
                    Chưa có cấu hình phù hợp.
                  </td>
                </tr>
              ) : (
                items.map(setting => (
                  <tr key={setting.id}>
                    <td>
                      <div className="restaurant-table-brand">
                        <SettingLogo
                          compact
                          url={setting.logoUrl}
                          name={setting.restaurantName}
                        />
                        <div>
                          <strong>{setting.restaurantName}</strong>
                          <small>{setting.address}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong>{setting.phoneNumber}</strong>
                      <small>{setting.email || 'Chưa có email'}</small>
                    </td>
                    <td>
                      <strong>
                        {toInputTime(setting.openingTime)} –{' '}
                        {toInputTime(setting.closingTime)}
                      </strong>
                      <small>{setting.currency}</small>
                    </td>
                    <td>
                      <strong>VAT {formatPercent(setting.defaultVatPercent)}</strong>
                      <small>Phục vụ {formatPercent(setting.serviceChargePercent)}</small>
                    </td>
                    <td>
                      <strong>{formatDateTime(setting.updatedAt ?? setting.createdAt)}</strong>
                      <small>Tạo {formatDateTime(setting.createdAt)}</small>
                    </td>
                    <td>
                      <span
                        className={`restaurant-setting-status ${
                          setting.isActive ? 'active' : 'inactive'
                        }`}
                      >
                        {setting.isActive ? 'Đang hoạt động' : 'Đã vô hiệu'}
                      </span>
                    </td>
                    <td>
                      <div className="restaurant-setting-row-actions">
                        <button
                          type="button"
                          disabled={Boolean(actionId)}
                          onClick={() => void openDetail(setting)}
                        >
                          {actionId === setting.id ? 'Đang tải…' : 'Chi tiết'}
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(actionId)}
                          onClick={() => openEdit(setting)}
                        >
                          Sửa
                        </button>
                        {setting.isActive ? (
                          <button
                            type="button"
                            className="danger"
                            disabled={Boolean(actionId)}
                            onClick={() => void deactivate(setting)}
                          >
                            Vô hiệu
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="activate"
                            disabled={Boolean(actionId) || Boolean(activeSetting)}
                            title={
                              activeSetting
                                ? 'Vô hiệu hóa cấu hình hiện tại trước khi kích hoạt.'
                                : undefined
                            }
                            onClick={() => void activate(setting)}
                          >
                            Kích hoạt
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="restaurant-settings-pagination">
          <span>
            Trang {page}/{totalPages} • {totalCount} kết quả
          </span>
          <div>
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={() => void loadData(page - 1)}
            >
              ← Trước
            </button>
            <button
              type="button"
              disabled={loading || page >= totalPages}
              onClick={() => void loadData(page + 1)}
            >
              Sau →
            </button>
          </div>
        </div>
      </article>

      {formMode && (
        <div className="restaurant-settings-modal-backdrop">
          <section
            className="restaurant-settings-modal form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="restaurant-setting-form-title"
          >
            <header>
              <div>
                <span className="restaurant-settings-kicker">
                  {formMode === 'create' ? 'CẤU HÌNH MỚI' : 'CHỈNH SỬA CẤU HÌNH'}
                </span>
                <h3 id="restaurant-setting-form-title">
                  {formMode === 'create'
                    ? 'Thiết lập thông tin nhà hàng'
                    : editing?.restaurantName}
                </h3>
                <p>Các trường bắt buộc được đánh dấu bằng dấu *.</p>
              </div>
              <button type="button" aria-label="Đóng" disabled={saving} onClick={closeForm}>
                ×
              </button>
            </header>

            <form onSubmit={submitForm}>
              {formError && (
                <div className="restaurant-settings-alert error modal-alert">
                  <span>!</span>
                  <p>{formError}</p>
                </div>
              )}

              <div className="restaurant-settings-form-layout">
                <div className="restaurant-settings-form-fields">
                  <fieldset>
                    <legend>
                      <span>1</span>
                      Thông tin nhận diện
                    </legend>
                    <div className="restaurant-settings-form-grid">
                      <label className="wide">
                        Tên nhà hàng *
                        <input
                          required
                          maxLength={200}
                          value={form.restaurantName}
                          onChange={event =>
                            updateField('restaurantName', event.target.value)
                          }
                        />
                      </label>
                      <label>
                        Số điện thoại *
                        <input
                          required
                          maxLength={20}
                          value={form.phoneNumber}
                          onChange={event => updateField('phoneNumber', event.target.value)}
                        />
                      </label>
                      <label>
                        Email
                        <input
                          type="email"
                          maxLength={150}
                          value={form.email}
                          onChange={event => updateField('email', event.target.value)}
                        />
                      </label>
                      <label>
                        Mã số thuế
                        <input
                          maxLength={50}
                          value={form.taxCode}
                          onChange={event => updateField('taxCode', event.target.value)}
                        />
                      </label>
                      <label className="wide">
                        Địa chỉ *
                        <textarea
                          required
                          maxLength={500}
                          rows={2}
                          value={form.address}
                          onChange={event => updateField('address', event.target.value)}
                        />
                      </label>
                    </div>
                  </fieldset>

                  <fieldset>
                    <legend>
                      <span>2</span>
                      Thương hiệu trực tuyến
                    </legend>
                    <div className="restaurant-settings-form-grid">
                      <label>
                        Website
                        <input
                          type="url"
                          maxLength={300}
                          placeholder="https://nhahang.vn"
                          value={form.websiteUrl}
                          onChange={event => updateField('websiteUrl', event.target.value)}
                        />
                      </label>
                      <label>
                        Đường dẫn logo
                        <input
                          type="url"
                          maxLength={500}
                          placeholder="https://.../logo.png"
                          value={form.logoUrl}
                          onChange={event => updateField('logoUrl', event.target.value)}
                        />
                      </label>
                    </div>
                  </fieldset>

                  <fieldset>
                    <legend>
                      <span>3</span>
                      Thiết lập vận hành
                    </legend>
                    <div className="restaurant-settings-form-grid operations">
                      <label>
                        Giờ mở cửa *
                        <input
                          type="time"
                          required
                          value={form.openingTime}
                          onChange={event => updateField('openingTime', event.target.value)}
                        />
                      </label>
                      <label>
                        Giờ đóng cửa *
                        <input
                          type="time"
                          required
                          value={form.closingTime}
                          onChange={event => updateField('closingTime', event.target.value)}
                        />
                      </label>
                      <label>
                        Đơn vị tiền tệ *
                        <input
                          required
                          maxLength={20}
                          list="restaurant-currencies"
                          value={form.currency}
                          onChange={event => updateField('currency', event.target.value)}
                        />
                        <datalist id="restaurant-currencies">
                          <option value="VND" />
                          <option value="USD" />
                          <option value="EUR" />
                        </datalist>
                      </label>
                      <label>
                        VAT mặc định (%)
                        <input
                          type="number"
                          required
                          min={0}
                          max={100}
                          step="0.01"
                          value={form.defaultVatPercent}
                          onChange={event =>
                            updateField('defaultVatPercent', Number(event.target.value))
                          }
                        />
                      </label>
                      <label>
                        Phí phục vụ (%)
                        <input
                          type="number"
                          required
                          min={0}
                          max={100}
                          step="0.01"
                          value={form.serviceChargePercent}
                          onChange={event =>
                            updateField('serviceChargePercent', Number(event.target.value))
                          }
                        />
                      </label>
                    </div>
                  </fieldset>

                  <fieldset>
                    <legend>
                      <span>4</span>
                      Nội dung hiển thị
                    </legend>
                    <div className="restaurant-settings-form-grid">
                      <label className="wide">
                        Lời cuối hóa đơn
                        <textarea
                          rows={3}
                          maxLength={1000}
                          placeholder="Cảm ơn quý khách và hẹn gặp lại!"
                          value={form.invoiceFooter}
                          onChange={event =>
                            updateField('invoiceFooter', event.target.value)
                          }
                        />
                        <small>{form.invoiceFooter.length}/1000 ký tự</small>
                      </label>
                      <label className="wide">
                        Lời chào khi gọi món QR
                        <textarea
                          rows={3}
                          maxLength={1000}
                          placeholder="Chào mừng quý khách. Hãy chọn món yêu thích!"
                          value={form.qrOrderWelcomeMessage}
                          onChange={event =>
                            updateField('qrOrderWelcomeMessage', event.target.value)
                          }
                        />
                        <small>{form.qrOrderWelcomeMessage.length}/1000 ký tự</small>
                      </label>
                    </div>
                  </fieldset>

                  {formMode === 'edit' && (
                    <label
                      className={`restaurant-setting-active-toggle ${
                        hasConflictingActiveSetting ? 'disabled' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={form.isActive}
                        disabled={hasConflictingActiveSetting}
                        onChange={event => updateField('isActive', event.target.checked)}
                      />
                      <span>
                        <strong>Đặt làm cấu hình đang hoạt động</strong>
                        <small>
                          {hasConflictingActiveSetting
                            ? `“${activeSetting?.restaurantName}” hiện đang được áp dụng.`
                            : 'Chỉ một cấu hình có thể hoạt động tại một thời điểm.'}
                        </small>
                      </span>
                    </label>
                  )}
                </div>

                <aside className="restaurant-setting-preview">
                  <span className="preview-label">XEM TRƯỚC HÓA ĐƠN</span>
                  <div className="receipt-preview">
                    <SettingLogo url={previewLogo} name={form.restaurantName} compact />
                    <h4>{form.restaurantName || 'Tên nhà hàng'}</h4>
                    <p>{form.address || 'Địa chỉ nhà hàng'}</p>
                    <p>{form.phoneNumber || 'Số điện thoại'}</p>
                    {form.taxCode && <p>MST: {form.taxCode}</p>}
                    <div className="receipt-divider" />
                    <div>
                      <span>Tạm tính</span>
                      <strong>500.000 {form.currency || 'VND'}</strong>
                    </div>
                    <div>
                      <span>VAT ({formatPercent(form.defaultVatPercent)})</span>
                      <strong>
                        {new Intl.NumberFormat('vi-VN').format(
                          500000 * (form.defaultVatPercent / 100),
                        )}{' '}
                        {form.currency || 'VND'}
                      </strong>
                    </div>
                    <div>
                      <span>Phí phục vụ</span>
                      <strong>{formatPercent(form.serviceChargePercent)}</strong>
                    </div>
                    <div className="receipt-divider" />
                    <small>
                      {form.invoiceFooter || 'Lời cảm ơn sẽ hiển thị tại đây.'}
                    </small>
                  </div>
                  <div className="qr-message-preview">
                    <span>▥</span>
                    <div>
                      <strong>Lời chào gọi món QR</strong>
                      <p>
                        {form.qrOrderWelcomeMessage ||
                          'Nội dung chào mừng khách sẽ hiển thị tại đây.'}
                      </p>
                    </div>
                  </div>
                </aside>
              </div>

              <footer>
                <button
                  type="button"
                  className="restaurant-settings-secondary"
                  disabled={saving}
                  onClick={closeForm}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="restaurant-settings-primary"
                  disabled={saving}
                >
                  {saving
                    ? 'Đang lưu…'
                    : formMode === 'create'
                      ? 'Tạo và kích hoạt'
                      : 'Lưu thay đổi'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {detail && (
        <div className="restaurant-settings-modal-backdrop">
          <section
            className="restaurant-settings-modal detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="restaurant-setting-detail-title"
          >
            <header>
              <div>
                <span className="restaurant-settings-kicker">CHI TIẾT CẤU HÌNH</span>
                <h3 id="restaurant-setting-detail-title">{detail.restaurantName}</h3>
                <p>Tạo lúc {formatDateTime(detail.createdAt)}</p>
              </div>
              <button type="button" aria-label="Đóng" onClick={() => setDetail(null)}>
                ×
              </button>
            </header>

            <div className="restaurant-setting-detail-hero">
              <SettingLogo url={detail.logoUrl} name={detail.restaurantName} />
              <div>
                <span
                  className={`restaurant-setting-status ${
                    detail.isActive ? 'active' : 'inactive'
                  }`}
                >
                  {detail.isActive ? 'Đang hoạt động' : 'Đã vô hiệu'}
                </span>
                <h4>{detail.restaurantName}</h4>
                <p>{detail.address}</p>
              </div>
            </div>

            <div className="restaurant-setting-detail-grid">
              <div>
                <span>Số điện thoại</span>
                <strong>{detail.phoneNumber}</strong>
              </div>
              <div>
                <span>Email</span>
                <strong>{detail.email || 'Chưa thiết lập'}</strong>
              </div>
              <div>
                <span>Mã số thuế</span>
                <strong>{detail.taxCode || 'Chưa thiết lập'}</strong>
              </div>
              <div>
                <span>Website</span>
                {getSafeHttpUrl(detail.websiteUrl) ? (
                  <a href={getSafeHttpUrl(detail.websiteUrl) ?? '#'} target="_blank" rel="noreferrer">
                    Mở website ↗
                  </a>
                ) : (
                  <strong>Chưa thiết lập</strong>
                )}
              </div>
              <div>
                <span>Giờ phục vụ</span>
                <strong>
                  {toInputTime(detail.openingTime)} – {toInputTime(detail.closingTime)}
                </strong>
              </div>
              <div>
                <span>Tiền tệ</span>
                <strong>{detail.currency}</strong>
              </div>
              <div>
                <span>VAT mặc định</span>
                <strong>{formatPercent(detail.defaultVatPercent)}</strong>
              </div>
              <div>
                <span>Phí phục vụ</span>
                <strong>{formatPercent(detail.serviceChargePercent)}</strong>
              </div>
            </div>

            <div className="restaurant-setting-copy-grid">
              <article>
                <span>LỜI CUỐI HÓA ĐƠN</span>
                <p>{detail.invoiceFooter || 'Chưa thiết lập nội dung.'}</p>
              </article>
              <article>
                <span>LỜI CHÀO GỌI MÓN QR</span>
                <p>{detail.qrOrderWelcomeMessage || 'Chưa thiết lập nội dung.'}</p>
              </article>
            </div>

            <footer>
              {detail.isActive ? (
                <button
                  type="button"
                  className="restaurant-settings-danger"
                  disabled={Boolean(actionId)}
                  onClick={() => void deactivate(detail)}
                >
                  Vô hiệu hóa
                </button>
              ) : (
                <button
                  type="button"
                  className="restaurant-settings-secondary"
                  disabled={Boolean(actionId) || Boolean(activeSetting)}
                  onClick={() => void activate(detail)}
                >
                  Kích hoạt
                </button>
              )}
              <div>
                <button
                  type="button"
                  className="restaurant-settings-secondary"
                  onClick={() => setDetail(null)}
                >
                  Đóng
                </button>
                <button
                  type="button"
                  className="restaurant-settings-primary"
                  onClick={() => openEdit(detail)}
                >
                  Chỉnh sửa
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}
    </section>
  )
}

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { getEmployees, type Employee } from '../services/employees'
import {
  createEmployeeShift,
  createShift,
  deleteEmployeeShift,
  deleteShift,
  getEmployeeShifts,
  getShiftList,
  getShifts,
  updateEmployeeShift,
  updateShift,
  type EmployeeShift,
  type EmployeeShiftForm,
  type Shift,
  type ShiftForm,
} from '../services/shifts'
import { confirmAction } from '../components/ConfirmDialog'
import { useAutoDismissMessage } from '../hooks/useAutoDismissMessage'

const PAGE_SIZE = 10

const emptyShift = (): ShiftForm => ({
  shiftCode: '',
  shiftName: '',
  startTime: '08:00',
  endTime: '17:00',
  description: '',
  isActive: true,
})

const emptyAssignment = (): EmployeeShiftForm => ({
  employeeId: '',
  shiftId: '',
  workDate: new Date().toISOString().slice(0, 10),
  note: '',
  isActive: true,
})

function ChevronIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
}

function PlusIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
}

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg>
}

function CheckIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12 2.2 2.2 4.8-5" /></svg>
}

function ClockIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.25 2" /></svg>
}

function CalendarIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5.5" width="16" height="14" rx="2" /><path d="M8 3v5M16 3v5M4 10h16" /></svg>
}

function EditIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.2-1 10.6-10.6a2 2 0 0 0-2.8-2.8L5.4 16.2 4 20Z" /><path d="m14.5 7.1 2.8 2.8" /></svg>
}

function TrashIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></svg>
}

function CloseIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg>
}

function ArrowLeftIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
}

function ArrowRightIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
}

function getError(error: unknown) {
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.'
}

function employeeName(employee: Employee) {
  return [employee.ho, employee.ten].filter(Boolean).join(' ') || employee.employeeCode
}

function assignmentName(item: EmployeeShift) {
  return [item.employeeHo, item.employeeTen].filter(Boolean).join(' ') || item.employeeCode
}

function formatTime(value: string) {
  return value.slice(0, 5)
}

function formatWorkDate(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('vi-VN')
}

export default function ShiftsSchedulingPage() {
  const [tab, setTab] = useState<'shifts' | 'assignments'>('shifts')
  const [shifts, setShifts] = useState<Shift[]>([])
  const [shiftOptions, setShiftOptions] = useState<Shift[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [assignments, setAssignments] = useState<EmployeeShift[]>([])
  const [keyword, setKeyword] = useState('')
  const [workDate, setWorkDate] = useState('')
  const [employeeFilter, setEmployeeFilter] = useState('')
  const [shiftFilter, setShiftFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  useAutoDismissMessage(message, setMessage)
  const [modal, setModal] = useState<'shift' | 'assignment' | null>(null)
  const [shiftForm, setShiftForm] = useState<ShiftForm>(emptyShift)
  const [assignmentForm, setAssignmentForm] = useState<EmployeeShiftForm>(emptyAssignment)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const activeShiftOptions = useMemo(
    () => shiftOptions.filter((item) => item.isActive),
    [shiftOptions],
  )
  const activeEmployees = useMemo(
    () => employees.filter((item) => item.isActive),
    [employees],
  )

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (tab === 'shifts') {
        const result = await getShifts(keyword, page, PAGE_SIZE)
        setShifts(result.items)
        setTotalPages(result.totalPages)
        setTotalCount(result.totalCount)
      } else {
        const result = await getEmployeeShifts(
          keyword,
          workDate,
          employeeFilter,
          shiftFilter,
          page,
          PAGE_SIZE,
        )
        setAssignments(result.items)
        setTotalPages(result.totalPages)
        setTotalCount(result.totalCount)
      }
    } catch (exception) {
      setError(getError(exception))
    } finally {
      setLoading(false)
    }
  }, [employeeFilter, keyword, page, shiftFilter, tab, workDate])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void Promise.all([getShiftList(), getEmployees('', 1, 200)])
      .then(([shiftResult, employeeResult]) => {
        setShiftOptions(Array.isArray(shiftResult) ? shiftResult : [])
        setEmployees(Array.isArray(employeeResult.items) ? employeeResult.items : [])
      })
      .catch((exception) => setError(getError(exception)))
  }, [])

  useEffect(() => {
    if (!modal) return

    const previousOverflow = document.body.style.overflow
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) setModal(null)
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [modal, saving])

  function switchTab(next: 'shifts' | 'assignments') {
    setTab(next)
    setKeyword('')
    setWorkDate('')
    setEmployeeFilter('')
    setShiftFilter('')
    setPage(1)
    setError('')
    setMessage('')
  }

  function openCreateShift() {
    setShiftForm(emptyShift())
    setFormError('')
    setModal('shift')
  }

  function openEditShift(item: Shift) {
    setShiftForm({
      id: item.id,
      shiftCode: item.shiftCode,
      shiftName: item.shiftName,
      startTime: item.startTime,
      endTime: item.endTime,
      description: item.description ?? '',
      isActive: item.isActive,
    })
    setFormError('')
    setModal('shift')
  }

  function openCreateAssignment() {
    setAssignmentForm({
      ...emptyAssignment(),
      employeeId: activeEmployees[0]?.id ?? '',
      shiftId: activeShiftOptions[0]?.id ?? '',
    })
    setFormError('')
    setModal('assignment')
  }

  function openEditAssignment(item: EmployeeShift) {
    setAssignmentForm({
      id: item.id,
      employeeId: item.employeeId,
      shiftId: item.shiftId,
      workDate: item.workDate.slice(0, 10),
      note: item.note ?? '',
      isActive: item.isActive,
    })
    setFormError('')
    setModal('assignment')
  }

  async function submitShift(event: FormEvent) {
    event.preventDefault()
    setFormError('')
    if (!shiftForm.shiftCode.trim() || !shiftForm.shiftName.trim()) {
      return setFormError('Vui lòng nhập mã ca và tên ca.')
    }
    if (!shiftForm.startTime || !shiftForm.endTime || shiftForm.startTime >= shiftForm.endTime) {
      return setFormError('Giờ bắt đầu phải nhỏ hơn giờ kết thúc.')
    }
    setSaving(true)
    try {
      const result = shiftForm.id
        ? await updateShift(shiftForm)
        : await createShift(shiftForm)
      setMessage(result.message ?? 'Đã lưu ca làm việc.')
      setModal(null)
      setShiftOptions(await getShiftList())
      await load()
    } catch (exception) {
      setFormError(getError(exception))
    } finally {
      setSaving(false)
    }
  }

  async function submitAssignment(event: FormEvent) {
    event.preventDefault()
    setFormError('')
    if (!assignmentForm.employeeId || !assignmentForm.shiftId || !assignmentForm.workDate) {
      return setFormError('Vui lòng chọn nhân viên, ca và ngày làm việc.')
    }
    setSaving(true)
    try {
      const result = assignmentForm.id
        ? await updateEmployeeShift(assignmentForm)
        : await createEmployeeShift(assignmentForm)
      setMessage(result.message ?? 'Đã lưu phân công ca.')
      setModal(null)
      await load()
    } catch (exception) {
      setFormError(getError(exception))
    } finally {
      setSaving(false)
    }
  }

  async function removeShift(item: Shift) {
    if (!(await confirmAction(`Xóa ca ${item.shiftCode} - ${item.shiftName}?`))) return
    try {
      const result = await deleteShift(item.id)
      setMessage(result.message ?? 'Đã xóa ca.')
      setShiftOptions(await getShiftList())
      await load()
    } catch (exception) {
      setError(getError(exception))
    }
  }

  async function removeAssignment(item: EmployeeShift) {
    if (
      !(await confirmAction(
        `Xóa phân công ${assignmentName(item)} - ${item.shiftName} ngày ${item.workDate.slice(0, 10)}?`,
      ))
    ) return
    try {
      const result = await deleteEmployeeShift(item.id)
      setMessage(result.message ?? 'Đã xóa phân công.')
      await load()
    } catch (exception) {
      setError(getError(exception))
    }
  }

  const isAssignmentsTab = tab === 'assignments'

  return (
    <section
      className={`scheduling-page ${isAssignmentsTab ? 'assignments-view' : 'shifts-view'}`}
      aria-labelledby="scheduling-page-title"
    >
      <header className="scheduling-command-bar">
        <div className="scheduling-breadcrumb">
          <span>Nhân sự</span>
          <ChevronIcon />
          <h2 id="scheduling-page-title">
            {isAssignmentsTab ? 'Phân ca nhân viên' : 'Ca làm việc'}
          </h2>
        </div>
        <button
          type="button"
          className="scheduling-primary-button"
          onClick={isAssignmentsTab ? openCreateAssignment : openCreateShift}
          disabled={isAssignmentsTab && (!activeEmployees.length || !activeShiftOptions.length)}
        >
          <PlusIcon />
          <span>{isAssignmentsTab ? 'Phân ca' : 'Tạo ca làm'}</span>
        </button>
      </header>

      <nav className="scheduling-tabs" aria-label="Chuyển màn hình ca làm việc">
        <button
          type="button"
          className={tab === 'shifts' ? 'active' : ''}
          aria-current={tab === 'shifts' ? 'page' : undefined}
          onClick={() => switchTab('shifts')}
        >
          Ca làm việc
        </button>
        <button
          type="button"
          className={tab === 'assignments' ? 'active' : ''}
          aria-current={tab === 'assignments' ? 'page' : undefined}
          onClick={() => switchTab('assignments')}
        >
          Phân ca nhân viên
        </button>
      </nav>

      {error && (
        <div className="scheduling-alert error" role="alert">
          <span>{error}</span>
          <button type="button" aria-label="Đóng thông báo lỗi" onClick={() => setError('')}>
            <CloseIcon />
          </button>
        </div>
      )}
      {message && (
        <div className="scheduling-alert success" role="status">
          <span>{message}</span>
          <button type="button" aria-label="Đóng thông báo" onClick={() => setMessage('')}>
            <CloseIcon />
          </button>
        </div>
      )}

      {isAssignmentsTab ? (
        <section className="scheduling-filter-band" aria-label="Bộ lọc phân ca">
          <label>
            <span>Lọc theo nhân viên</span>
            <select
              aria-label="Lọc phân ca theo nhân viên"
              value={employeeFilter}
              onChange={(event) => {
                setEmployeeFilter(event.target.value)
                setPage(1)
              }}
            >
              <option value="">Tất cả nhân viên</option>
              {activeEmployees.map((item) => (
                <option key={item.id} value={item.id}>{employeeName(item)}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Lọc theo ca làm</span>
            <select
              aria-label="Lọc phân ca theo ca làm"
              value={shiftFilter}
              onChange={(event) => {
                setShiftFilter(event.target.value)
                setPage(1)
              }}
            >
              <option value="">Tất cả ca làm</option>
              {activeShiftOptions.map((item) => (
                <option key={item.id} value={item.id}>{item.shiftCode} - {item.shiftName}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Lọc theo ngày làm</span>
            <input
              type="date"
              aria-label="Lọc phân ca theo ngày làm"
              value={workDate}
              onChange={(event) => {
                setWorkDate(event.target.value)
                setPage(1)
              }}
            />
          </label>
        </section>
      ) : (
        <aside className="scheduling-guide-band">
          <span>Quy tắc thời gian</span>
          <p><CheckIcon /> Giờ bắt đầu phải trước giờ kết thúc và mã ca không được trùng.</p>
        </aside>
      )}

      <div className="scheduling-search-row">
        <label className="scheduling-search-box">
          <SearchIcon />
          <span className="sr-only">Tìm kiếm</span>
          <input
            placeholder={isAssignmentsTab ? 'Tìm nhân viên hoặc ca làm…' : 'Tìm mã ca hoặc tên ca làm…'}
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value)
              setPage(1)
            }}
          />
          {keyword ? (
            <button
              type="button"
              className="scheduling-clear-search"
              aria-label="Xóa từ khóa tìm kiếm"
              onClick={() => {
                setKeyword('')
                setPage(1)
              }}
            >
              <CloseIcon />
            </button>
          ) : null}
        </label>
        <span className="scheduling-result-count">
          Tìm thấy <strong>{totalCount}</strong> bản ghi
        </span>
      </div>

      <section className="scheduling-panel" aria-label={isAssignmentsTab ? 'Danh sách phân ca' : 'Danh sách ca làm việc'}>
        <div className="scheduling-table-wrap">
          <table>
            <thead>
              {isAssignmentsTab ? (
                <tr>
                  <th>Mã số</th>
                  <th>Nhân viên trực</th>
                  <th>Ca trực &amp; giờ</th>
                  <th>Ngày làm việc</th>
                  <th>Ghi chú phân công</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              ) : (
                <tr>
                  <th>Mã ca</th>
                  <th>Tên ca trực</th>
                  <th>Khung giờ làm việc</th>
                  <th>Mô tả</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              )}
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={isAssignmentsTab ? 7 : 6} className="empty">Đang tải dữ liệu…</td></tr>
              ) : isAssignmentsTab ? (
                assignments.length ? assignments.map((item) => (
                  <tr key={item.id}>
                    <td><strong>{item.employeeCode}</strong></td>
                    <td>
                      <div className="scheduling-employee-cell">
                        <span aria-hidden="true">{assignmentName(item).charAt(0).toLocaleUpperCase('vi')}</span>
                        <div><strong>{assignmentName(item)}</strong><small>MSNV: {item.employeeCode}</small></div>
                      </div>
                    </td>
                    <td>
                      <div className="scheduling-shift-cell">
                        <ClockIcon />
                        <div><strong>{item.shiftName}</strong><small>{item.shiftCode} · {formatTime(item.startTime)}–{formatTime(item.endTime)}</small></div>
                      </div>
                    </td>
                    <td><span className="scheduling-date"><CalendarIcon />{formatWorkDate(item.workDate)}</span></td>
                    <td>{item.note || 'Không ghi chú'}</td>
                    <td><span className={`state ${item.isActive ? 'active' : 'inactive'}`}>{item.isActive ? 'Có hiệu lực' : 'Ngưng hiệu lực'}</span></td>
                    <td>
                      <div className="row-actions">
                        <button type="button" aria-label={`Sửa phân ca của ${assignmentName(item)}`} title="Sửa" onClick={() => openEditAssignment(item)}><EditIcon /></button>
                        <button type="button" className="danger" aria-label={`Xóa phân ca của ${assignmentName(item)}`} title="Xóa" onClick={() => void removeAssignment(item)}><TrashIcon /></button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={7} className="empty">Chưa có phân công phù hợp.</td></tr>
                )
              ) : shifts.length ? shifts.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.shiftCode}</strong></td>
                  <td><strong>{item.shiftName}</strong></td>
                  <td><span className="scheduling-time"><ClockIcon />{formatTime(item.startTime)} – {formatTime(item.endTime)}</span></td>
                  <td>{item.description || 'Không có mô tả'}</td>
                  <td><span className={`state ${item.isActive ? 'active' : 'inactive'}`}>{item.isActive ? 'Đang hoạt động' : 'Ngưng hoạt động'}</span></td>
                  <td>
                    <div className="row-actions">
                      <button type="button" aria-label={`Sửa ca ${item.shiftName}`} title="Sửa" onClick={() => openEditShift(item)}><EditIcon /></button>
                      <button type="button" className="danger" aria-label={`Xóa ca ${item.shiftName}`} title="Xóa" onClick={() => void removeShift(item)}><TrashIcon /></button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={6} className="empty">Chưa có ca làm việc.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <footer className="scheduling-pagination">
          <span>Trang <strong>{page}</strong>/{totalPages} · {totalCount} kết quả</span>
          <div>
            <button type="button" aria-label="Trang trước" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}><ArrowLeftIcon /><span>Trước</span></button>
            <button type="button" aria-label="Trang sau" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}><span>Sau</span><ArrowRightIcon /></button>
          </div>
        </footer>
      </section>

      {modal === 'shift' && (
        <div className="scheduling-backdrop" onMouseDown={() => { if (!saving) setModal(null) }}>
          <form className="scheduling-modal" onSubmit={submitShift} onMouseDown={(event) => event.stopPropagation()} aria-labelledby="shift-modal-title">
            <header>
              <h3 id="shift-modal-title">{shiftForm.id ? 'Cập nhật ca làm việc' : 'Thêm ca làm việc mới'}</h3>
              <button type="button" aria-label="Đóng cửa sổ" disabled={saving} onClick={() => setModal(null)}><CloseIcon /></button>
            </header>
            <div className="modal-grid">
              <label><span>Mã ca <em>*</em></span><input required placeholder="Ví dụ: MORNING" value={shiftForm.shiftCode} onChange={(event) => setShiftForm({ ...shiftForm, shiftCode: event.target.value })} /></label>
              <label><span>Tên ca làm <em>*</em></span><input required placeholder="Ví dụ: Ca sáng" value={shiftForm.shiftName} onChange={(event) => setShiftForm({ ...shiftForm, shiftName: event.target.value })} /></label>
              <label><span>Giờ bắt đầu <em>*</em></span><input required type="time" value={shiftForm.startTime} onChange={(event) => setShiftForm({ ...shiftForm, startTime: event.target.value })} /></label>
              <label><span>Giờ kết thúc <em>*</em></span><input required type="time" value={shiftForm.endTime} onChange={(event) => setShiftForm({ ...shiftForm, endTime: event.target.value })} /></label>
              <label className="wide"><span>Mô tả nhiệm vụ</span><textarea rows={3} placeholder="Ghi chú phạm vi hoặc lưu ý của ca làm…" value={shiftForm.description} onChange={(event) => setShiftForm({ ...shiftForm, description: event.target.value })} /></label>
              {shiftForm.id ? (
                <fieldset className="scheduling-status-field wide">
                  <legend>Trạng thái ca làm</legend>
                  <div>
                    <button type="button" className={shiftForm.isActive ? 'active' : ''} aria-pressed={shiftForm.isActive} onClick={() => setShiftForm({ ...shiftForm, isActive: true })}>Hoạt động</button>
                    <button type="button" className={!shiftForm.isActive ? 'active inactive' : ''} aria-pressed={!shiftForm.isActive} onClick={() => setShiftForm({ ...shiftForm, isActive: false })}>Tạm ngưng</button>
                  </div>
                </fieldset>
              ) : null}
            </div>
            {formError && <div className="form-error" role="alert">{formError}</div>}
            <footer>
              <button type="button" className="secondary" disabled={saving} onClick={() => setModal(null)}>Hủy bỏ</button>
              <button disabled={saving}>{saving ? 'Đang lưu…' : shiftForm.id ? 'Lưu thay đổi' : 'Thêm ca làm'}</button>
            </footer>
          </form>
        </div>
      )}

      {modal === 'assignment' && (
        <div className="scheduling-backdrop" onMouseDown={() => { if (!saving) setModal(null) }}>
          <form className="scheduling-modal" onSubmit={submitAssignment} onMouseDown={(event) => event.stopPropagation()} aria-labelledby="assignment-modal-title">
            <header>
              <h3 id="assignment-modal-title">{assignmentForm.id ? 'Cập nhật phân công ca' : 'Tạo phân công ca làm việc'}</h3>
              <button type="button" aria-label="Đóng cửa sổ" disabled={saving} onClick={() => setModal(null)}><CloseIcon /></button>
            </header>
            <div className="modal-grid">
              <label><span>Nhân viên trực <em>*</em></span><select required value={assignmentForm.employeeId} onChange={(event) => setAssignmentForm({ ...assignmentForm, employeeId: event.target.value })}><option value="">Chọn nhân viên</option>{activeEmployees.map((item) => <option key={item.id} value={item.id}>{item.employeeCode} - {employeeName(item)}</option>)}</select></label>
              <label><span>Ca làm việc <em>*</em></span><select required value={assignmentForm.shiftId} onChange={(event) => setAssignmentForm({ ...assignmentForm, shiftId: event.target.value })}><option value="">Chọn ca</option>{activeShiftOptions.map((item) => <option key={item.id} value={item.id}>{item.shiftCode} - {item.shiftName} ({formatTime(item.startTime)}–{formatTime(item.endTime)})</option>)}</select></label>
              <label><span>Ngày làm <em>*</em></span><input required type="date" value={assignmentForm.workDate} onChange={(event) => setAssignmentForm({ ...assignmentForm, workDate: event.target.value })} /></label>
              {assignmentForm.id ? (
                <fieldset className="scheduling-status-field">
                  <legend>Trạng thái phân công</legend>
                  <div>
                    <button type="button" className={assignmentForm.isActive ? 'active' : ''} aria-pressed={assignmentForm.isActive} onClick={() => setAssignmentForm({ ...assignmentForm, isActive: true })}>Có hiệu lực</button>
                    <button type="button" className={!assignmentForm.isActive ? 'active inactive' : ''} aria-pressed={!assignmentForm.isActive} onClick={() => setAssignmentForm({ ...assignmentForm, isActive: false })}>Tạm ngưng</button>
                  </div>
                </fieldset>
              ) : null}
              <label className="wide"><span>Ghi chú phân công</span><textarea rows={3} placeholder="Ghi chú nhiệm vụ hoặc lưu ý trong ca…" value={assignmentForm.note} onChange={(event) => setAssignmentForm({ ...assignmentForm, note: event.target.value })} /></label>
            </div>
            {formError && <div className="form-error" role="alert">{formError}</div>}
            <footer>
              <button type="button" className="secondary" disabled={saving} onClick={() => setModal(null)}>Hủy bỏ</button>
              <button disabled={saving}>{saving ? 'Đang lưu…' : assignmentForm.id ? 'Lưu thay đổi' : 'Lưu phân công'}</button>
            </footer>
          </form>
        </div>
      )}
    </section>
  )
}

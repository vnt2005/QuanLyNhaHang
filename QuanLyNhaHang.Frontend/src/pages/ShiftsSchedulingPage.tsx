import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { getEmployees, type Employee } from '../api/employees'
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
} from '../api/shifts'

const PAGE_SIZE = 10

const emptyShift = (): ShiftForm => ({
  shiftCode: '', shiftName: '', startTime: '08:00', endTime: '17:00', description: '', isActive: true,
})

const emptyAssignment = (): EmployeeShiftForm => ({
  employeeId: '', shiftId: '', workDate: new Date().toISOString().slice(0, 10), note: '', isActive: true,
})

function getError(error: unknown) {
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.'
}

function employeeName(employee: Employee) {
  return [employee.ho, employee.ten].filter(Boolean).join(' ') || employee.employeeCode
}

function assignmentName(item: EmployeeShift) {
  return [item.employeeHo, item.employeeTen].filter(Boolean).join(' ') || item.employeeCode
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
  const [modal, setModal] = useState<'shift' | 'assignment' | null>(null)
  const [shiftForm, setShiftForm] = useState<ShiftForm>(emptyShift)
  const [assignmentForm, setAssignmentForm] = useState<EmployeeShiftForm>(emptyAssignment)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const activeShiftOptions = useMemo(() => shiftOptions.filter(item => item.isActive), [shiftOptions])
  const activeEmployees = useMemo(() => employees.filter(item => item.isActive), [employees])

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
        const result = await getEmployeeShifts(keyword, workDate, employeeFilter, shiftFilter, page, PAGE_SIZE)
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

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    void Promise.all([getShiftList(), getEmployees('', 1, 200)])
      .then(([shiftResult, employeeResult]) => {
        setShiftOptions(Array.isArray(shiftResult) ? shiftResult : [])
        setEmployees(Array.isArray(employeeResult.items) ? employeeResult.items : [])
      })
      .catch(exception => setError(getError(exception)))
  }, [])

  function switchTab(next: 'shifts' | 'assignments') {
    setTab(next); setKeyword(''); setWorkDate(''); setEmployeeFilter(''); setShiftFilter(''); setPage(1); setError(''); setMessage('')
  }

  function openCreateShift() {
    setShiftForm(emptyShift()); setFormError(''); setModal('shift')
  }

  function openEditShift(item: Shift) {
    setShiftForm({ id: item.id, shiftCode: item.shiftCode, shiftName: item.shiftName, startTime: item.startTime, endTime: item.endTime, description: item.description ?? '', isActive: item.isActive })
    setFormError(''); setModal('shift')
  }

  function openCreateAssignment() {
    setAssignmentForm({ ...emptyAssignment(), employeeId: activeEmployees[0]?.id ?? '', shiftId: activeShiftOptions[0]?.id ?? '' })
    setFormError(''); setModal('assignment')
  }

  function openEditAssignment(item: EmployeeShift) {
    setAssignmentForm({ id: item.id, employeeId: item.employeeId, shiftId: item.shiftId, workDate: item.workDate.slice(0, 10), note: item.note ?? '', isActive: item.isActive })
    setFormError(''); setModal('assignment')
  }

  async function submitShift(event: FormEvent) {
    event.preventDefault(); setFormError('')
    if (!shiftForm.shiftCode.trim() || !shiftForm.shiftName.trim()) return setFormError('Vui lòng nhập mã ca và tên ca.')
    if (!shiftForm.startTime || !shiftForm.endTime || shiftForm.startTime >= shiftForm.endTime) return setFormError('Giờ bắt đầu phải nhỏ hơn giờ kết thúc.')
    setSaving(true)
    try {
      const result = shiftForm.id ? await updateShift(shiftForm) : await createShift(shiftForm)
      setMessage(result.message ?? 'Đã lưu ca làm việc.'); setModal(null)
      setShiftOptions(await getShiftList()); await load()
    } catch (exception) { setFormError(getError(exception)) } finally { setSaving(false) }
  }

  async function submitAssignment(event: FormEvent) {
    event.preventDefault(); setFormError('')
    if (!assignmentForm.employeeId || !assignmentForm.shiftId || !assignmentForm.workDate) return setFormError('Vui lòng chọn nhân viên, ca và ngày làm việc.')
    setSaving(true)
    try {
      const result = assignmentForm.id ? await updateEmployeeShift(assignmentForm) : await createEmployeeShift(assignmentForm)
      setMessage(result.message ?? 'Đã lưu phân công ca.'); setModal(null); await load()
    } catch (exception) { setFormError(getError(exception)) } finally { setSaving(false) }
  }

  async function removeShift(item: Shift) {
    if (!confirm(`Xóa ca ${item.shiftCode} - ${item.shiftName}?`)) return
    try { const result = await deleteShift(item.id); setMessage(result.message ?? 'Đã xóa ca.'); setShiftOptions(await getShiftList()); await load() }
    catch (exception) { setError(getError(exception)) }
  }

  async function removeAssignment(item: EmployeeShift) {
    if (!confirm(`Xóa phân công ${assignmentName(item)} - ${item.shiftName} ngày ${item.workDate.slice(0, 10)}?`)) return
    try { const result = await deleteEmployeeShift(item.id); setMessage(result.message ?? 'Đã xóa phân công.'); await load() }
    catch (exception) { setError(getError(exception)) }
  }

  return <section className="scheduling-page">
    <header className="scheduling-header">
      <div><span>NHÂN SỰ</span><h2>Ca làm việc &amp; Phân ca</h2><p>Quản lý khung giờ vận hành và lịch làm việc của nhân viên.</p></div>
      <button onClick={tab === 'shifts' ? openCreateShift : openCreateAssignment} disabled={tab === 'assignments' && (!activeEmployees.length || !activeShiftOptions.length)}>
        + {tab === 'shifts' ? 'Tạo ca' : 'Phân ca'}
      </button>
    </header>

    <div className="scheduling-tabs"><button className={tab === 'shifts' ? 'active' : ''} onClick={() => switchTab('shifts')}>Ca làm việc</button><button className={tab === 'assignments' ? 'active' : ''} onClick={() => switchTab('assignments')}>Phân ca nhân viên</button></div>
    {error && <div className="scheduling-alert error">{error}<button onClick={() => setError('')}>×</button></div>}
    {message && <div className="scheduling-alert success">{message}<button onClick={() => setMessage('')}>×</button></div>}

    <section className="scheduling-panel">
      <div className="scheduling-filters">
        <input placeholder={tab === 'shifts' ? 'Tìm mã ca hoặc tên ca…' : 'Tìm nhân viên hoặc ca…'} value={keyword} onChange={event => { setKeyword(event.target.value); setPage(1) }}/>
        {tab === 'assignments' && <>
          <input type="date" value={workDate} onChange={event => { setWorkDate(event.target.value); setPage(1) }}/>
          <select value={employeeFilter} onChange={event => { setEmployeeFilter(event.target.value); setPage(1) }}><option value="">Tất cả nhân viên</option>{activeEmployees.map(item => <option key={item.id} value={item.id}>{employeeName(item)}</option>)}</select>
          <select value={shiftFilter} onChange={event => { setShiftFilter(event.target.value); setPage(1) }}><option value="">Tất cả ca</option>{activeShiftOptions.map(item => <option key={item.id} value={item.id}>{item.shiftCode} - {item.shiftName}</option>)}</select>
        </>}
      </div>

      <div className="scheduling-table-wrap"><table><thead>{tab === 'shifts'
        ? <tr><th>Mã ca</th><th>Tên ca</th><th>Khung giờ</th><th>Mô tả</th><th>Trạng thái</th><th>Thao tác</th></tr>
        : <tr><th>Nhân viên</th><th>Ca làm việc</th><th>Ngày làm</th><th>Ghi chú</th><th>Trạng thái</th><th>Thao tác</th></tr>}</thead>
        <tbody>{loading ? <tr><td colSpan={6} className="empty">Đang tải dữ liệu…</td></tr> : tab === 'shifts'
          ? shifts.length ? shifts.map(item => <tr key={item.id}><td><strong>{item.shiftCode}</strong></td><td>{item.shiftName}</td><td>{item.startTime} – {item.endTime}</td><td>{item.description ?? '—'}</td><td><span className={`state ${item.isActive ? 'active' : 'inactive'}`}>{item.isActive ? 'Đang hoạt động' : 'Ngưng hoạt động'}</span></td><td><div className="row-actions"><button onClick={() => openEditShift(item)}>Sửa</button><button className="danger" onClick={() => void removeShift(item)}>Xóa</button></div></td></tr>) : <tr><td colSpan={6} className="empty">Chưa có ca làm việc.</td></tr>
          : assignments.length ? assignments.map(item => <tr key={item.id}><td><strong>{assignmentName(item)}</strong><small>{item.employeeCode}</small></td><td><strong>{item.shiftName}</strong><small>{item.shiftCode} • {item.startTime}–{item.endTime}</small></td><td>{new Date(item.workDate).toLocaleDateString('vi-VN')}</td><td>{item.note ?? '—'}</td><td><span className={`state ${item.isActive ? 'active' : 'inactive'}`}>{item.isActive ? 'Có hiệu lực' : 'Ngưng hiệu lực'}</span></td><td><div className="row-actions"><button onClick={() => openEditAssignment(item)}>Sửa</button><button className="danger" onClick={() => void removeAssignment(item)}>Xóa</button></div></td></tr>) : <tr><td colSpan={6} className="empty">Chưa có phân công phù hợp.</td></tr>}
        </tbody></table></div>
      <footer className="scheduling-pagination"><span>Trang {page}/{totalPages} • {totalCount} kết quả</span><div><button disabled={page <= 1} onClick={() => setPage(page - 1)}>← Trước</button><button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Sau →</button></div></footer>
    </section>

    {modal === 'shift' && <div className="scheduling-backdrop"><form className="scheduling-modal" onSubmit={submitShift}><header><div><span>CA LÀM VIỆC</span><h3>{shiftForm.id ? 'Cập nhật ca' : 'Tạo ca mới'}</h3></div><button type="button" onClick={() => setModal(null)}>×</button></header><div className="modal-grid"><label>Mã ca<input value={shiftForm.shiftCode} onChange={event => setShiftForm({...shiftForm, shiftCode:event.target.value})}/></label><label>Tên ca<input value={shiftForm.shiftName} onChange={event => setShiftForm({...shiftForm, shiftName:event.target.value})}/></label><label>Giờ bắt đầu<input type="time" value={shiftForm.startTime} onChange={event => setShiftForm({...shiftForm, startTime:event.target.value})}/></label><label>Giờ kết thúc<input type="time" value={shiftForm.endTime} onChange={event => setShiftForm({...shiftForm, endTime:event.target.value})}/></label><label className="wide">Mô tả<textarea rows={3} value={shiftForm.description} onChange={event => setShiftForm({...shiftForm, description:event.target.value})}/></label>{shiftForm.id && <label className="checkbox"><input type="checkbox" checked={shiftForm.isActive} onChange={event => setShiftForm({...shiftForm,isActive:event.target.checked})}/> Đang hoạt động</label>}</div>{formError && <div className="form-error">{formError}</div>}<footer><button type="button" className="secondary" onClick={() => setModal(null)}>Đóng</button><button disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu ca'}</button></footer></form></div>}

    {modal === 'assignment' && <div className="scheduling-backdrop"><form className="scheduling-modal" onSubmit={submitAssignment}><header><div><span>PHÂN CA</span><h3>{assignmentForm.id ? 'Cập nhật phân công' : 'Phân công nhân viên'}</h3></div><button type="button" onClick={() => setModal(null)}>×</button></header><div className="modal-grid"><label>Nhân viên<select value={assignmentForm.employeeId} onChange={event => setAssignmentForm({...assignmentForm,employeeId:event.target.value})}><option value="">Chọn nhân viên</option>{activeEmployees.map(item => <option key={item.id} value={item.id}>{item.employeeCode} - {employeeName(item)}</option>)}</select></label><label>Ca làm việc<select value={assignmentForm.shiftId} onChange={event => setAssignmentForm({...assignmentForm,shiftId:event.target.value})}><option value="">Chọn ca</option>{activeShiftOptions.map(item => <option key={item.id} value={item.id}>{item.shiftCode} - {item.shiftName} ({item.startTime}–{item.endTime})</option>)}</select></label><label>Ngày làm<input type="date" value={assignmentForm.workDate} onChange={event => setAssignmentForm({...assignmentForm,workDate:event.target.value})}/></label><label className="wide">Ghi chú<textarea rows={3} value={assignmentForm.note} onChange={event => setAssignmentForm({...assignmentForm,note:event.target.value})}/></label>{assignmentForm.id && <label className="checkbox"><input type="checkbox" checked={assignmentForm.isActive} onChange={event => setAssignmentForm({...assignmentForm,isActive:event.target.checked})}/> Có hiệu lực</label>}</div>{formError && <div className="form-error">{formError}</div>}<footer><button type="button" className="secondary" onClick={() => setModal(null)}>Đóng</button><button disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu phân công'}</button></footer></form></div>}
  </section>
}

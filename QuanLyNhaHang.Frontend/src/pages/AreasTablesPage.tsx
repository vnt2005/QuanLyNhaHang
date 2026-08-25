import { useAutoDismissMessage } from '../design-system/useAutoDismissMessage'
import { confirmAction } from '../design-system/confirmDialog'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  changeTableStatus,
  createArea,
  createTable,
  deleteArea,
  deleteTable,
  getAreaList,
  getAreas,
  getTables,
  updateArea,
  updateTable,
  type Area,
  type AreaForm,
  type RestaurantTable,
  type RestaurantTableForm,
  type TableStatus,
} from '../api/areasTables'

const emptyArea: AreaForm = { name: '', description: '' }
const emptyTable: RestaurantTableForm = { areaId: '', name: '', capacity: 4, note: '' }
const statuses: { value: TableStatus; label: string }[] = [
  { value: 'Available', label: 'Trống' },
  { value: 'Occupied', label: 'Đang dùng' },
  { value: 'Reserved', label: 'Đã đặt' },
  { value: 'Cleaning', label: 'Đang dọn' },
]

export default function AreasTablesPage() {
  const [tab, setTab] = useState<'areas' | 'tables'>('tables')
  const [areas, setAreas] = useState<Area[]>([])
  const [areaItems, setAreaItems] = useState<Area[]>([])
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [keyword, setKeyword] = useState('')
  const [areaFilter, setAreaFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  useAutoDismissMessage(message, setMessage)
  const [areaForm, setAreaForm] = useState<AreaForm | null>(null)
  const [tableForm, setTableForm] = useState<RestaurantTableForm | null>(null)
  const [saving, setSaving] = useState(false)

  const tableSummary = useMemo(() => ({
    total: tables.length,
    available: tables.filter(x => x.status === 'Available').length,
    occupied: tables.filter(x => x.status === 'Occupied').length,
    reserved: tables.filter(x => x.status === 'Reserved').length,
  }), [tables])

  async function loadAreas(search = keyword, targetPage = 1) {
    setLoading(true); setError('')
    try {
      const [list, paged] = await Promise.all([getAreaList(), getAreas(search, targetPage)])
      setAreas(list.filter(x => x.isActive))
      setAreaItems(paged.items ?? [])
      setPage(paged.pageNumber || targetPage)
      setTotalPages(Math.max(paged.totalPages || 1, 1))
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không tải được khu vực.')
    } finally { setLoading(false) }
  }

  async function loadTables(search = keyword, targetPage = 1) {
    setLoading(true); setError('')
    try {
      const [list, paged] = await Promise.all([getAreaList(), getTables(search, areaFilter, statusFilter, targetPage)])
      setAreas(list.filter(x => x.isActive))
      setTables(paged.items ?? [])
      setPage(paged.pageNumber || targetPage)
      setTotalPages(Math.max(paged.totalPages || 1, 1))
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không tải được danh sách bàn.')
    } finally { setLoading(false) }
  }

  useEffect(() => { void (tab === 'areas' ? loadAreas('', 1) : loadTables('', 1)) }, [tab])

  async function submitArea(event: FormEvent) {
    event.preventDefault(); if (!areaForm) return
    setSaving(true); setError(''); setMessage('')
    try {
      const result = areaForm.id ? await updateArea(areaForm) : await createArea(areaForm)
      setMessage(result.message ?? 'Đã lưu khu vực.')
      setAreaForm(null)
      await loadAreas(keyword, areaForm.id ? page : 1)
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'Không lưu được khu vực.') }
    finally { setSaving(false) }
  }

  async function submitTable(event: FormEvent) {
    event.preventDefault(); if (!tableForm) return
    setSaving(true); setError(''); setMessage('')
    try {
      const result = tableForm.id ? await updateTable(tableForm) : await createTable(tableForm)
      setMessage(result.message ?? 'Đã lưu bàn.')
      setTableForm(null)
      await loadTables(keyword, tableForm.id ? page : 1)
    } catch (exception) { setError(exception instanceof Error ? exception.message : 'Không lưu được bàn.') }
    finally { setSaving(false) }
  }

  async function removeArea(area: Area) {
    if (!await confirmAction(`Xóa khu vực ${area.name}?`)) return
    try { const result = await deleteArea(area.id); setMessage(result.message ?? 'Đã xóa khu vực.'); await loadAreas(keyword, page) }
    catch (exception) { setError(exception instanceof Error ? exception.message : 'Không thể xóa khu vực.') }
  }

  async function removeTable(table: RestaurantTable) {
    if (!await confirmAction(`Xóa bàn ${table.name}?`)) return
    try { const result = await deleteTable(table.id); setMessage(result.message ?? 'Đã xóa bàn.'); await loadTables(keyword, page) }
    catch (exception) { setError(exception instanceof Error ? exception.message : 'Không thể xóa bàn.') }
  }

  async function setStatus(table: RestaurantTable, status: TableStatus) {
    try { const result = await changeTableStatus(table.id, status); setMessage(result.message ?? 'Đã cập nhật trạng thái.'); await loadTables(keyword, page) }
    catch (exception) { setError(exception instanceof Error ? exception.message : 'Không đổi được trạng thái.') }
  }

  return <section className="areas-tables-page">
    <div className="page-toolbar space-page-heading">
      <div>
        <span className="space-kicker">Vận hành nhà hàng</span>
        <h2>Không gian phục vụ</h2>
        <p>Quản lý khu vực, sức chứa và trạng thái bàn theo thời gian thực.</p>
      </div>
      <button className="primary-button space-primary" onClick={() => tab === 'areas' ? setAreaForm(emptyArea) : setTableForm({...emptyTable, areaId: areas[0]?.id ?? ''})}>
        <span aria-hidden="true">＋</span> Thêm {tab === 'areas' ? 'khu vực' : 'bàn'}
      </button>
    </div>

    <div className="management-tabs" role="tablist" aria-label="Quản lý khu vực và bàn">
      <button className={tab === 'tables' ? 'active' : ''} onClick={() => { setTab('tables'); setKeyword(''); setPage(1) }}>Bàn</button>
      <button className={tab === 'areas' ? 'active' : ''} onClick={() => { setTab('areas'); setKeyword(''); setPage(1) }}>Khu vực</button>
    </div>

    {message && <div className="inline-alert success">{message}</div>}
    {error && <div className="inline-alert error">{error}</div>}

    {tab === 'tables' ? <>
      <div className="table-kpis">
        <article className="total"><span className="kpi-icon" aria-hidden="true">▦</span><div><small>Tổng bàn trang này</small><strong>{tableSummary.total}</strong></div></article>
        <article className="available"><span className="kpi-icon" aria-hidden="true">♧</span><div><small>Bàn trống</small><strong>{tableSummary.available}</strong></div></article>
        <article className="occupied"><span className="kpi-icon" aria-hidden="true">♙</span><div><small>Đang sử dụng</small><strong>{tableSummary.occupied}</strong></div></article>
        <article className="reserved"><span className="kpi-icon" aria-hidden="true">✓</span><div><small>Đã đặt</small><strong>{tableSummary.reserved}</strong></div></article>
      </div>

      <form className="space-filters" onSubmit={e => { e.preventDefault(); void loadTables(keyword, 1) }}>
        <div className="space-search-control"><span aria-hidden="true">⌕</span><input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Tìm tên bàn, ghi chú..."/></div>
        <select value={areaFilter} onChange={e => setAreaFilter(e.target.value)}><option value="">Tất cả khu vực</option>{areas.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="">Tất cả trạng thái</option>{statuses.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}</select>
        <button className="space-search-button">Tìm kiếm</button>
      </form>

      <div className="table-card-grid">
        {loading ? <div className="empty-state-card">Đang tải dữ liệu...</div> : tables.length === 0 ? <div className="empty-state-card">Chưa có bàn phù hợp.</div> : tables.map(table => <article className={`restaurant-table-card status-${table.status.toLowerCase()}`} key={table.id}>
          <div className="table-card-head">
            <div><span className="table-icon" aria-hidden="true">▦</span><div><h3>{table.name}</h3><p>{table.areaName}</p></div></div>
            <span className={`table-status-chip ${table.status.toLowerCase()}`}>{statuses.find(x => x.value === table.status)?.label ?? table.status}</span>
          </div>
          <div className="table-meta"><span><i aria-hidden="true">♙</i>{table.capacity} chỗ</span><span><i aria-hidden="true">▤</i>{table.note || 'Không có ghi chú'}</span></div>
          <label className="status-field">Đổi trạng thái<select value={table.status} onChange={e => void setStatus(table, e.target.value as TableStatus)}>{statuses.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}</select></label>
          <div className="card-actions"><button onClick={() => setTableForm({id:table.id, areaId:table.areaId, name:table.name, capacity:table.capacity, note:table.note ?? ''})}>Sửa</button><button className="danger" onClick={() => void removeTable(table)}>Xóa</button></div>
        </article>)}
      </div>
    </> : <>
      <form className="space-filters area-filters" onSubmit={e => { e.preventDefault(); void loadAreas(keyword, 1) }}>
        <div className="space-search-control"><span aria-hidden="true">⌕</span><input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Tìm tên hoặc mô tả khu vực..."/></div>
        <button className="space-search-button">Tìm kiếm</button>
      </form>
      <div className="area-grid">
        {loading ? <div className="empty-state-card">Đang tải dữ liệu...</div> : areaItems.length === 0 ? <div className="empty-state-card">Chưa có khu vực phù hợp.</div> : areaItems.map(area => <article className="area-card" key={area.id}>
          <div className="area-card-main"><span className="area-icon" aria-hidden="true">▦</span><div><h3>{area.name}</h3><p>{area.description || 'Chưa có mô tả'}</p></div></div>
          <span className={`area-status-chip ${area.isActive ? 'active' : 'inactive'}`}>{area.isActive ? 'Hoạt động' : 'Ngừng hoạt động'}</span>
          <div className="card-actions"><button onClick={() => setAreaForm({id:area.id,name:area.name,description:area.description ?? ''})}><span aria-hidden="true">✎</span> Sửa</button><button className="danger" onClick={() => void removeArea(area)}><span aria-hidden="true">♲</span> Xóa</button></div>
        </article>)}
      </div>
    </>}

    <div className="pagination space-pagination"><span>Trang {page}/{totalPages}</span><div><button disabled={page <= 1} onClick={() => void (tab === 'areas' ? loadAreas(keyword, page - 1) : loadTables(keyword, page - 1))}>Trước</button><button disabled={page >= totalPages} onClick={() => void (tab === 'areas' ? loadAreas(keyword, page + 1) : loadTables(keyword, page + 1))}>Sau</button></div></div>

    {areaForm && <div className="modal-backdrop areas-tables-backdrop" onMouseDown={() => !saving && setAreaForm(null)}>
      <div className="employee-modal compact-modal areas-tables-modal area-form-modal" onMouseDown={e => e.stopPropagation()}>
        <div className="modal-heading"><div><span className="modal-kicker">Khu vực phục vụ</span><h2>{areaForm.id ? 'Cập nhật khu vực' : 'Thêm khu vực'}</h2></div><button type="button" onClick={() => setAreaForm(null)}>×</button></div>
        <form className="employee-form space-modal-form" onSubmit={submitArea}>
          <label className="wide-field">Tên khu vực <em>*</em><input required value={areaForm.name} placeholder="Ví dụ: Tầng 1, Sân vườn, Phòng VIP 1..." onChange={e => setAreaForm({...areaForm,name:e.target.value})}/></label>
          <label className="wide-field">Mô tả<textarea value={areaForm.description} placeholder="Nhập mô tả vị trí hoặc lưu ý phục vụ..." onChange={e => setAreaForm({...areaForm,description:e.target.value})}/></label>
          <div className="modal-actions"><button type="button" onClick={() => setAreaForm(null)}>Hủy</button><button className="primary-button" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu khu vực'}</button></div>
        </form>
      </div>
    </div>}

    {tableForm && <div className="modal-backdrop areas-tables-backdrop" onMouseDown={() => !saving && setTableForm(null)}>
      <div className="employee-modal compact-modal areas-tables-modal table-form-modal" onMouseDown={e => e.stopPropagation()}>
        <div className="modal-heading"><div><span className="modal-kicker">Bàn phục vụ</span><h2>{tableForm.id ? 'Cập nhật bàn' : 'Thêm bàn'}</h2></div><button type="button" onClick={() => setTableForm(null)}>×</button></div>
        <form className="employee-form space-modal-form table-modal-form" onSubmit={submitTable}>
          <label>Khu vực<select required value={tableForm.areaId} onChange={e => setTableForm({...tableForm,areaId:e.target.value})}><option value="">Chọn khu vực</option>{areas.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          <label>Tên bàn<input required value={tableForm.name} placeholder="Nhập tên bàn" onChange={e => setTableForm({...tableForm,name:e.target.value})}/></label>
          <label>Sức chứa<input type="number" min="1" required value={tableForm.capacity} onChange={e => setTableForm({...tableForm,capacity:Number(e.target.value)})}/></label>
          <label className="wide-field">Ghi chú <small>(không bắt buộc)</small><textarea value={tableForm.note} placeholder="Nhập ghi chú cho bàn (ví dụ: vị trí gần cửa sổ, ưu tiên khách VIP...)" onChange={e => setTableForm({...tableForm,note:e.target.value})}/></label>
          <div className="modal-actions"><button type="button" onClick={() => setTableForm(null)}>Hủy</button><button className="primary-button" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu bàn'}</button></div>
        </form>
      </div>
    </div>}
  </section>
}

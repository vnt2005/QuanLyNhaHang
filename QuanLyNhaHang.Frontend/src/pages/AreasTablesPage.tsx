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
    if (!confirm(`Xóa khu vực ${area.name}?`)) return
    try { const result = await deleteArea(area.id); setMessage(result.message ?? 'Đã xóa khu vực.'); await loadAreas(keyword, page) }
    catch (exception) { setError(exception instanceof Error ? exception.message : 'Không thể xóa khu vực.') }
  }

  async function removeTable(table: RestaurantTable) {
    if (!confirm(`Xóa bàn ${table.name}?`)) return
    try { const result = await deleteTable(table.id); setMessage(result.message ?? 'Đã xóa bàn.'); await loadTables(keyword, page) }
    catch (exception) { setError(exception instanceof Error ? exception.message : 'Không thể xóa bàn.') }
  }

  async function setStatus(table: RestaurantTable, status: TableStatus) {
    try { const result = await changeTableStatus(table.id, status); setMessage(result.message ?? 'Đã cập nhật trạng thái.'); await loadTables(keyword, page) }
    catch (exception) { setError(exception instanceof Error ? exception.message : 'Không đổi được trạng thái.') }
  }

  return <section className="areas-tables-page">
    <div className="page-toolbar">
      <div><h2>Không gian phục vụ</h2><p>Quản lý khu vực, sức chứa và trạng thái bàn theo thời gian thực.</p></div>
      <button className="primary-button" onClick={() => tab === 'areas' ? setAreaForm(emptyArea) : setTableForm({...emptyTable, areaId: areas[0]?.id ?? ''})}>+ Thêm {tab === 'areas' ? 'khu vực' : 'bàn'}</button>
    </div>

    <div className="management-tabs"><button className={tab === 'tables' ? 'active' : ''} onClick={() => { setTab('tables'); setKeyword(''); setPage(1) }}>Bàn</button><button className={tab === 'areas' ? 'active' : ''} onClick={() => { setTab('areas'); setKeyword(''); setPage(1) }}>Khu vực</button></div>
    {message && <div className="inline-alert success">{message}</div>}{error && <div className="inline-alert error">{error}</div>}

    {tab === 'tables' ? <>
      <div className="table-kpis"><article><span>Tổng bàn trang này</span><strong>{tableSummary.total}</strong></article><article><span>Bàn trống</span><strong>{tableSummary.available}</strong></article><article><span>Đang sử dụng</span><strong>{tableSummary.occupied}</strong></article><article><span>Đã đặt</span><strong>{tableSummary.reserved}</strong></article></div>
      <form className="space-filters" onSubmit={e => { e.preventDefault(); void loadTables(keyword, 1) }}><input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Tìm tên bàn, ghi chú..."/><select value={areaFilter} onChange={e => setAreaFilter(e.target.value)}><option value="">Tất cả khu vực</option>{areas.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="">Tất cả trạng thái</option>{statuses.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}</select><button>Tìm kiếm</button></form>
      <div className="table-card-grid">{loading ? <div className="empty-state-card">Đang tải dữ liệu...</div> : tables.length === 0 ? <div className="empty-state-card">Chưa có bàn phù hợp.</div> : tables.map(table => <article className={`restaurant-table-card status-${table.status.toLowerCase()}`} key={table.id}><div className="table-card-head"><div><span className="table-icon">▦</span><div><h3>{table.name}</h3><p>{table.areaName}</p></div></div><span className="status-badge active">{statuses.find(x => x.value === table.status)?.label ?? table.status}</span></div><div className="table-meta"><span>{table.capacity} chỗ</span><span>{table.note || 'Không có ghi chú'}</span></div><label>Đổi trạng thái<select value={table.status} onChange={e => void setStatus(table, e.target.value as TableStatus)}>{statuses.map(x => <option key={x.value} value={x.value}>{x.label}</option>)}</select></label><div className="card-actions"><button onClick={() => setTableForm({id:table.id, areaId:table.areaId, name:table.name, capacity:table.capacity, note:table.note ?? ''})}>Sửa</button><button className="danger" onClick={() => void removeTable(table)}>Xóa</button></div></article>)}</div>
    </> : <>
      <form className="space-filters" onSubmit={e => { e.preventDefault(); void loadAreas(keyword, 1) }}><input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="Tìm tên hoặc mô tả khu vực..."/><button>Tìm kiếm</button></form>
      <div className="area-grid">{loading ? <div className="empty-state-card">Đang tải dữ liệu...</div> : areaItems.map(area => <article className="area-card" key={area.id}><div><span>▦</span><div><h3>{area.name}</h3><p>{area.description || 'Chưa có mô tả'}</p></div></div><span className={`status-badge ${area.isActive ? 'active' : 'inactive'}`}>{area.isActive ? 'Hoạt động' : 'Ngừng hoạt động'}</span><div className="card-actions"><button onClick={() => setAreaForm({id:area.id,name:area.name,description:area.description ?? ''})}>Sửa</button><button className="danger" onClick={() => void removeArea(area)}>Xóa</button></div></article>)}</div>
    </>}

    <div className="pagination"><span>Trang {page}/{totalPages}</span><div><button disabled={page <= 1} onClick={() => void (tab === 'areas' ? loadAreas(keyword, page - 1) : loadTables(keyword, page - 1))}>Trước</button><button disabled={page >= totalPages} onClick={() => void (tab === 'areas' ? loadAreas(keyword, page + 1) : loadTables(keyword, page + 1))}>Sau</button></div></div>

    {areaForm && <div className="modal-backdrop" onMouseDown={() => !saving && setAreaForm(null)}><div className="employee-modal compact-modal" onMouseDown={e => e.stopPropagation()}><div className="modal-heading"><div><h2>{areaForm.id ? 'Cập nhật khu vực' : 'Thêm khu vực'}</h2></div><button onClick={() => setAreaForm(null)}>×</button></div><form className="employee-form" onSubmit={submitArea}><label className="wide-field">Tên khu vực<input required value={areaForm.name} onChange={e => setAreaForm({...areaForm,name:e.target.value})}/></label><label className="wide-field">Mô tả<textarea value={areaForm.description} onChange={e => setAreaForm({...areaForm,description:e.target.value})}/></label><div className="modal-actions"><button type="button" onClick={() => setAreaForm(null)}>Hủy</button><button className="primary-button" disabled={saving}>Lưu khu vực</button></div></form></div></div>}

    {tableForm && <div className="modal-backdrop" onMouseDown={() => !saving && setTableForm(null)}><div className="employee-modal compact-modal" onMouseDown={e => e.stopPropagation()}><div className="modal-heading"><div><h2>{tableForm.id ? 'Cập nhật bàn' : 'Thêm bàn'}</h2></div><button onClick={() => setTableForm(null)}>×</button></div><form className="employee-form" onSubmit={submitTable}><label>Khu vực<select required value={tableForm.areaId} onChange={e => setTableForm({...tableForm,areaId:e.target.value})}><option value="">Chọn khu vực</option>{areas.map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Tên bàn<input required value={tableForm.name} onChange={e => setTableForm({...tableForm,name:e.target.value})}/></label><label>Sức chứa<input type="number" min="1" required value={tableForm.capacity} onChange={e => setTableForm({...tableForm,capacity:Number(e.target.value)})}/></label><label className="wide-field">Ghi chú<textarea value={tableForm.note} onChange={e => setTableForm({...tableForm,note:e.target.value})}/></label><div className="modal-actions"><button type="button" onClick={() => setTableForm(null)}>Hủy</button><button className="primary-button" disabled={saving}>Lưu bàn</button></div></form></div></div>}
  </section>
}

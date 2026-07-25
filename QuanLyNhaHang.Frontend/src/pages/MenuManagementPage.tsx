import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  changeMenuItemAvailability,
  createMenuCategory,
  createMenuItem,
  deleteMenuCategory,
  deleteMenuItem,
  getMenuCategories,
  getMenuCategoryList,
  getMenuItems,
  updateMenuCategory,
  updateMenuItem,
  type MenuCategory,
  type MenuCategoryForm,
  type MenuItem,
  type MenuItemForm,
} from '../api/menu'

const emptyCategory: MenuCategoryForm = { name: '', description: '', displayOrder: 0 }
const emptyItem: MenuItemForm = { menuCategoryId: '', name: '', description: '', price: 0, imageUrl: '' }

export default function MenuManagementPage() {
  const [tab, setTab] = useState<'items' | 'categories'>('items')
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [categoryItems, setCategoryItems] = useState<MenuCategory[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [keyword, setKeyword] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [availabilityFilter, setAvailabilityFilter] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [categoryForm, setCategoryForm] = useState<MenuCategoryForm | null>(null)
  const [itemForm, setItemForm] = useState<MenuItemForm | null>(null)

  const summary = useMemo(() => ({
    total: items.length,
    available: items.filter(item => item.isAvailable).length,
    unavailable: items.filter(item => !item.isAvailable).length,
    categories: categories.length,
  }), [items, categories])

  async function loadCategories(search = keyword, targetPage = 1) {
    setLoading(true); setError('')
    try {
      const [list, paged] = await Promise.all([
        getMenuCategoryList(),
        getMenuCategories(search, undefined, targetPage, 12),
      ])
      setCategories(list.filter(category => category.isActive))
      setCategoryItems(paged.items ?? [])
      setPage(paged.pageNumber || targetPage)
      setTotalPages(Math.max(paged.totalPages || 1, 1))
      setTotalCount(paged.totalCount || 0)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không tải được danh mục món.')
    } finally { setLoading(false) }
  }

  async function loadItems(search = keyword, targetPage = 1) {
    setLoading(true); setError('')
    try {
      const availability = availabilityFilter === '' ? undefined : availabilityFilter === 'true'
      const [list, paged] = await Promise.all([
        getMenuCategoryList(),
        getMenuItems(search, categoryFilter, availability, undefined, targetPage, 12),
      ])
      setCategories(list.filter(category => category.isActive))
      setItems(paged.items ?? [])
      setPage(paged.pageNumber || targetPage)
      setTotalPages(Math.max(paged.totalPages || 1, 1))
      setTotalCount(paged.totalCount || 0)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không tải được danh sách món ăn.')
    } finally { setLoading(false) }
  }

  useEffect(() => {
    setKeyword(''); setPage(1); setMessage(''); setError('')
    void (tab === 'items' ? loadItems('', 1) : loadCategories('', 1))
  }, [tab])

  function openCreateCategory() {
    setCategoryForm({ ...emptyCategory, displayOrder: categories.length + 1 })
    setError(''); setMessage('')
  }

  function openEditCategory(category: MenuCategory) {
    setCategoryForm({
      id: category.id,
      name: category.name,
      description: category.description ?? '',
      displayOrder: category.displayOrder,
    })
    setError(''); setMessage('')
  }

  function openCreateItem() {
    setItemForm({ ...emptyItem, menuCategoryId: categories[0]?.id ?? '' })
    setError(''); setMessage('')
  }

  function openEditItem(item: MenuItem) {
    setItemForm({
      id: item.id,
      menuCategoryId: item.menuCategoryId,
      name: item.name,
      description: item.description ?? '',
      price: item.price,
      imageUrl: item.imageUrl ?? '',
    })
    setError(''); setMessage('')
  }

  async function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!categoryForm) return
    setSaving(true); setError(''); setMessage('')
    try {
      const result = categoryForm.id
        ? await updateMenuCategory(categoryForm)
        : await createMenuCategory(categoryForm)
      setMessage(result.message ?? 'Đã lưu danh mục món.')
      setCategoryForm(null)
      await loadCategories(keyword, categoryForm.id ? page : 1)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không lưu được danh mục món.')
    } finally { setSaving(false) }
  }

  async function submitItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!itemForm) return
    setSaving(true); setError(''); setMessage('')
    try {
      const result = itemForm.id ? await updateMenuItem(itemForm) : await createMenuItem(itemForm)
      setMessage(result.message ?? 'Đã lưu món ăn.')
      setItemForm(null)
      await loadItems(keyword, itemForm.id ? page : 1)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không lưu được món ăn.')
    } finally { setSaving(false) }
  }

  async function removeCategory(category: MenuCategory) {
    if (!confirm(`Xóa danh mục ${category.name}?`)) return
    setError(''); setMessage('')
    try {
      const result = await deleteMenuCategory(category.id)
      setMessage(result.message ?? 'Đã xóa danh mục món.')
      await loadCategories(keyword, page)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không thể xóa danh mục món.')
    }
  }

  async function removeItem(item: MenuItem) {
    if (!confirm(`Xóa món ${item.name}?`)) return
    setError(''); setMessage('')
    try {
      const result = await deleteMenuItem(item.id)
      setMessage(result.message ?? 'Đã xóa món ăn.')
      await loadItems(keyword, page)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không thể xóa món ăn.')
    }
  }

  async function toggleAvailability(item: MenuItem) {
    setError(''); setMessage('')
    try {
      const result = await changeMenuItemAvailability(item.id, !item.isAvailable)
      setMessage(result.message ?? 'Đã cập nhật trạng thái món.')
      await loadItems(keyword, page)
    } catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Không thể cập nhật trạng thái món.')
    }
  }

  return <section className="menu-page">
    <div className="page-toolbar">
      <div><h2>Quản lý thực đơn</h2><p>Quản lý danh mục, giá bán, hình ảnh và trạng thái phục vụ của món ăn.</p></div>
      <button className="primary-button" onClick={tab === 'items' ? openCreateItem : openCreateCategory}>
        + {tab === 'items' ? 'Thêm món ăn' : 'Thêm danh mục'}
      </button>
    </div>

    <div className="access-tabs">
      <button className={tab === 'items' ? 'active' : ''} onClick={() => setTab('items')}>Món ăn</button>
      <button className={tab === 'categories' ? 'active' : ''} onClick={() => setTab('categories')}>Danh mục</button>
    </div>

    {message && <div className="inline-alert success">{message}</div>}
    {error && <div className="inline-alert error">{error}</div>}

    {tab === 'items' ? <>
      <div className="menu-summary">
        <article><span>Tổng món</span><strong>{totalCount}</strong></article>
        <article><span>Đang bán trên trang</span><strong>{summary.available}</strong></article>
        <article><span>Hết món trên trang</span><strong>{summary.unavailable}</strong></article>
        <article><span>Danh mục hoạt động</span><strong>{summary.categories}</strong></article>
      </div>

      <form className="menu-filters" onSubmit={event => { event.preventDefault(); void loadItems(keyword, 1) }}>
        <input value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="Tìm tên hoặc mô tả món..." />
        <select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}>
          <option value="">Tất cả danh mục</option>
          {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
        <select value={availabilityFilter} onChange={event => setAvailabilityFilter(event.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="true">Đang bán</option>
          <option value="false">Hết món</option>
        </select>
        <button type="submit">Lọc</button>
      </form>

      <div className="menu-item-grid">
        {loading ? <div className="menu-empty">Đang tải thực đơn...</div> : items.length === 0 ? <div className="menu-empty">Chưa có món ăn phù hợp.</div> : items.map(item => <article className="menu-item-card" key={item.id}>
          <div className="menu-image-wrap">
            {item.imageUrl ? <img src={item.imageUrl} alt={item.name} onError={event => { event.currentTarget.style.display = 'none' }} /> : <div className="menu-image-placeholder">🍽</div>}
            <span className={`status-badge ${item.isAvailable ? 'active' : 'inactive'}`}>{item.isAvailable ? 'Đang bán' : 'Hết món'}</span>
          </div>
          <div className="menu-item-body">
            <small>{item.menuCategoryName}</small>
            <h3>{item.name}</h3>
            <p>{item.description || 'Chưa có mô tả cho món ăn này.'}</p>
            <strong className="menu-price">{item.price.toLocaleString('vi-VN')} ₫</strong>
            <div className="menu-card-actions">
              <button onClick={() => openEditItem(item)}>Sửa</button>
              <button onClick={() => void toggleAvailability(item)}>{item.isAvailable ? 'Đánh dấu hết' : 'Mở bán lại'}</button>
              <button className="danger" onClick={() => void removeItem(item)}>Xóa</button>
            </div>
          </div>
        </article>)}
      </div>
    </> : <>
      <form className="menu-filters category-filter" onSubmit={event => { event.preventDefault(); void loadCategories(keyword, 1) }}>
        <input value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="Tìm danh mục món..." />
        <button type="submit">Tìm kiếm</button>
      </form>
      <div className="category-grid">
        {loading ? <div className="menu-empty">Đang tải danh mục...</div> : categoryItems.length === 0 ? <div className="menu-empty">Chưa có danh mục phù hợp.</div> : categoryItems.map(category => <article className="category-card" key={category.id}>
          <div className="category-order">{category.displayOrder}</div>
          <div><h3>{category.name}</h3><p>{category.description || 'Chưa có mô tả.'}</p></div>
          <span className={`status-badge ${category.isActive ? 'active' : 'inactive'}`}>{category.isActive ? 'Hoạt động' : 'Ngừng hoạt động'}</span>
          <div className="menu-card-actions"><button onClick={() => openEditCategory(category)}>Sửa</button><button className="danger" onClick={() => void removeCategory(category)}>Xóa</button></div>
        </article>)}
      </div>
    </>}

    <div className="pagination"><span>Trang {page}/{totalPages}</span><div><button disabled={page <= 1} onClick={() => void (tab === 'items' ? loadItems(keyword, page - 1) : loadCategories(keyword, page - 1))}>Trước</button><button disabled={page >= totalPages} onClick={() => void (tab === 'items' ? loadItems(keyword, page + 1) : loadCategories(keyword, page + 1))}>Sau</button></div></div>

    {itemForm && <div className="modal-backdrop" onMouseDown={() => !saving && setItemForm(null)}><div className="employee-modal menu-modal" onMouseDown={event => event.stopPropagation()}>
      <div className="modal-heading"><div><h2>{itemForm.id ? 'Cập nhật món ăn' : 'Thêm món ăn'}</h2><p>Nhập thông tin món và ảnh đại diện bằng URL.</p></div><button onClick={() => setItemForm(null)}>×</button></div>
      <form className="employee-form" onSubmit={submitItem}>
        <label>Danh mục<select required value={itemForm.menuCategoryId} onChange={event => setItemForm({...itemForm, menuCategoryId:event.target.value})}><option value="">Chọn danh mục</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
        <label>Tên món<input required value={itemForm.name} onChange={event => setItemForm({...itemForm, name:event.target.value})}/></label>
        <label>Giá bán<input type="number" min="0" required value={itemForm.price} onChange={event => setItemForm({...itemForm, price:Number(event.target.value)})}/></label>
        <label>URL hình ảnh<input value={itemForm.imageUrl} onChange={event => setItemForm({...itemForm, imageUrl:event.target.value})} placeholder="https://..."/></label>
        <label className="wide-field">Mô tả<textarea rows={4} value={itemForm.description} onChange={event => setItemForm({...itemForm, description:event.target.value})}/></label>
        <div className="modal-actions"><button type="button" onClick={() => setItemForm(null)}>Hủy</button><button className="primary-button" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu món ăn'}</button></div>
      </form>
    </div></div>}

    {categoryForm && <div className="modal-backdrop" onMouseDown={() => !saving && setCategoryForm(null)}><div className="employee-modal menu-modal" onMouseDown={event => event.stopPropagation()}>
      <div className="modal-heading"><div><h2>{categoryForm.id ? 'Cập nhật danh mục' : 'Thêm danh mục'}</h2><p>Thứ tự hiển thị nhỏ hơn sẽ được ưu tiên trước.</p></div><button onClick={() => setCategoryForm(null)}>×</button></div>
      <form className="employee-form" onSubmit={submitCategory}>
        <label>Tên danh mục<input required value={categoryForm.name} onChange={event => setCategoryForm({...categoryForm, name:event.target.value})}/></label>
        <label>Thứ tự hiển thị<input type="number" min="0" required value={categoryForm.displayOrder} onChange={event => setCategoryForm({...categoryForm, displayOrder:Number(event.target.value)})}/></label>
        <label className="wide-field">Mô tả<textarea rows={4} value={categoryForm.description} onChange={event => setCategoryForm({...categoryForm, description:event.target.value})}/></label>
        <div className="modal-actions"><button type="button" onClick={() => setCategoryForm(null)}>Hủy</button><button className="primary-button" disabled={saving}>{saving ? 'Đang lưu...' : 'Lưu danh mục'}</button></div>
      </form>
    </div></div>}
  </section>
}

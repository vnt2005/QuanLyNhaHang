import { ArrowRight, ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { CustomerSiteBootstrap } from '../services/customerSite'
import heroImage from '../assets/hero-vietnamese-table.webp'
import { navigate } from '../utils/navigation'

const pageSize = 10

type AvailabilityFilter = 'all' | 'available' | 'unavailable'
type SortOption = 'default' | 'name' | 'price-asc' | 'price-desc'

function currency(value: number, code: string) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: code || 'VND', maximumFractionDigits: 0 }).format(value)
}

export default function MenuPage({ data }: { data: CustomerSiteBootstrap }) {
  const [keyword, setKeyword] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [availability, setAvailability] = useState<AvailabilityFilter>('all')
  const [sort, setSort] = useState<SortOption>('default')
  const [page, setPage] = useState(1)
  const deferredKeyword = useDeferredValue(keyword.trim().toLocaleLowerCase('vi'))

  const categoryIdsWithItems = useMemo(() => new Set(data.menuItems.map(item => item.menuCategoryId)), [data.menuItems])
  const categories = useMemo(() => data.menuCategories.filter(category => categoryIdsWithItems.has(category.id)), [categoryIdsWithItems, data.menuCategories])
  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>()
    data.menuItems.forEach(item => counts.set(item.menuCategoryId, (counts.get(item.menuCategoryId) || 0) + 1))
    return counts
  }, [data.menuItems])

  const items = useMemo(() => {
    const filtered = data.menuItems.filter(item => {
      const matchesCategory = categoryId === 'all' || item.menuCategoryId === categoryId
      const matchesAvailability = availability === 'all' || (availability === 'available' ? item.isAvailable : !item.isAvailable)
      const matchesKeyword = !deferredKeyword
        || item.name.toLocaleLowerCase('vi').includes(deferredKeyword)
        || item.description?.toLocaleLowerCase('vi').includes(deferredKeyword)
      return matchesCategory && matchesAvailability && matchesKeyword
    })
    if (sort === 'name') return [...filtered].sort((left, right) => left.name.localeCompare(right.name, 'vi'))
    if (sort === 'price-asc') return [...filtered].sort((left, right) => left.price - right.price)
    if (sort === 'price-desc') return [...filtered].sort((left, right) => right.price - left.price)
    return filtered
  }, [availability, categoryId, data.menuItems, deferredKeyword, sort])

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const visibleItems = useMemo(() => items.slice((currentPage - 1) * pageSize, currentPage * pageSize), [currentPage, items])

  function changeCategory(value: string) { setCategoryId(value); setPage(1) }
  function changeAvailability(value: AvailabilityFilter) { setAvailability(value); setPage(1) }

  return (
    <main className="sera-menu">
      <header className="sera-menu-head">
        <div>
          <p className="sera-kicker">Thực đơn</p>
          <h1 className="sera-display">Chọn món theo khẩu vị của bạn.</h1>
          <p className="sera-copy">Tìm theo tên, lọc theo danh mục và tình trạng phục vụ. Mỗi món mở ra trang riêng để bạn xem kỹ rồi thêm vào giỏ mang về.</p>
        </div>
        <div className="sera-menu-tools">
          <label className="sera-search">
            <Search aria-hidden="true" />
            <Input value={keyword} onChange={event => { setKeyword(event.target.value); setPage(1) }} placeholder="Tìm tên món..." autoComplete="off" />
          </label>
          <Button variant="outline" onClick={() => navigate('/takeaway')}>Mở giỏ mang về <ArrowRight /></Button>
        </div>
      </header>

      <section className="sera-menu-layout">
        <aside className="sera-filter" aria-label="Bộ lọc thực đơn">
          <div className="sera-filter-group">
            <span>Danh mục</span>
            <button className={`sera-filter-button ${categoryId === 'all' ? 'active' : ''}`} type="button" onClick={() => changeCategory('all')}><b>Tất cả món</b><small>{data.menuItems.length}</small></button>
            {categories.map(category => (
              <button key={category.id} className={`sera-filter-button ${categoryId === category.id ? 'active' : ''}`} type="button" onClick={() => changeCategory(category.id)}>
                <b>{category.name}</b><small>{categoryCounts.get(category.id) || 0}</small>
              </button>
            ))}
          </div>

          <div className="sera-filter-group">
            <span>Tình trạng</span>
            {([
              ['all', 'Tất cả'],
              ['available', 'Còn món'],
              ['unavailable', 'Tạm hết'],
            ] as const).map(([value, label]) => (
              <button key={value} className={`sera-filter-button ${availability === value ? 'active' : ''}`} type="button" onClick={() => changeAvailability(value)}><b>{label}</b></button>
            ))}
          </div>

          <label className="sera-sort">
            <span>Sắp xếp</span>
            <select value={sort} onChange={event => { setSort(event.target.value as SortOption); setPage(1) }}>
              <option value="default">Mặc định</option>
              <option value="name">Tên A – Z</option>
              <option value="price-asc">Giá thấp → cao</option>
              <option value="price-desc">Giá cao → thấp</option>
            </select>
          </label>
        </aside>

        <div>
          <div className="sera-menu-results-head">
            <span><strong>{items.length}</strong> món phù hợp</span>
            <button className="sera-link" type="button" onClick={() => navigate('/reservation')}>Đặt bàn trước</button>
          </div>

          {visibleItems.length ? (
            <div className="sera-menu-list">
              {visibleItems.map(item => (
                <article className="sera-menu-item" key={item.id}>
                  <button className="sera-menu-item-media" type="button" onClick={() => navigate(`/menu/${encodeURIComponent(item.id)}`)} aria-label={`Xem ${item.name}`}>
                    <img src={item.imageUrl || heroImage} alt={item.name} />
                  </button>
                  <div className="sera-menu-item-copy">
                    <small>{item.menuCategoryName} · {item.isAvailable ? 'Còn món' : 'Tạm hết'}</small>
                    <h2>{item.name}</h2>
                    <p>{item.description || 'Món ăn được chế biến tươi mới trong ngày.'}</p>
                  </div>
                  <div className="sera-menu-item-side">
                    <strong>{currency(item.price, data.restaurant?.currency || 'VND')}</strong>
                    <Button size="sm" variant="outline" onClick={() => navigate(`/menu/${encodeURIComponent(item.id)}`)}>Xem món <ArrowRight /></Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="sera-empty"><div><h2>Không có món phù hợp.</h2><p>Đổi từ khóa hoặc bộ lọc để xem lại thực đơn.</p><Button variant="outline" onClick={() => { setKeyword(''); setCategoryId('all'); setAvailability('all'); setSort('default'); setPage(1) }}>Xóa bộ lọc</Button></div></div>
          )}

          {pageCount > 1 ? (
            <nav className="sera-menu-pagination" aria-label="Phân trang thực đơn">
              <Button variant="outline" size="icon" disabled={currentPage === 1} onClick={() => setPage(value => Math.max(1, value - 1))}><ChevronLeft /></Button>
              <span>Trang <strong>{currentPage}</strong> / {pageCount}</span>
              <Button variant="outline" size="icon" disabled={currentPage === pageCount} onClick={() => setPage(value => Math.min(pageCount, value + 1))}><ChevronRight /></Button>
            </nav>
          ) : null}
        </div>
      </section>
    </main>
  )
}

import { ArrowRight, ChevronLeft, ChevronRight, Search, SlidersHorizontal, Utensils } from 'lucide-react'
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
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: code || 'VND',
    maximumFractionDigits: 0,
  }).format(value)
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
      const matchesKeyword = !deferredKeyword || item.name.toLocaleLowerCase('vi').includes(deferredKeyword) || item.description?.toLocaleLowerCase('vi').includes(deferredKeyword)
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
    <main className="bistro-menu-v2">
      <section className="bistro-menu-v2-intro">
        <span className="bistro-v2-eyebrow"><Utensils /> Thực đơn hôm nay</span>
        <div>
          <h1>Chọn món theo cách bạn muốn.</h1>
          <p>Tìm nhanh, lọc theo danh mục và xem món theo dạng danh sách để dễ so sánh giá, mô tả và tình trạng phục vụ.</p>
        </div>
        <Button onClick={() => navigate('/takeaway')}>Mở giỏ mang về <ArrowRight /></Button>
      </section>

      <section className="bistro-menu-v2-layout">
        <aside className="bistro-menu-v2-sidebar">
          <div className="bistro-menu-v2-search">
            <Search />
            <Input value={keyword} onChange={event => { setKeyword(event.target.value); setPage(1) }} placeholder="Tìm tên món..." />
          </div>

          <div className="bistro-menu-v2-filter-group">
            <span>Danh mục</span>
            <button className={categoryId === 'all' ? 'active' : ''} type="button" onClick={() => changeCategory('all')}><b>Tất cả món</b><small>{data.menuItems.length}</small></button>
            {categories.map(category => (
              <button key={category.id} className={categoryId === category.id ? 'active' : ''} type="button" onClick={() => changeCategory(category.id)}>
                <b>{category.name}</b><small>{categoryCounts.get(category.id) || 0}</small>
              </button>
            ))}
          </div>

          <div className="bistro-menu-v2-filter-group">
            <span><SlidersHorizontal /> Tình trạng</span>
            {([
              ['all', 'Tất cả'],
              ['available', 'Còn món'],
              ['unavailable', 'Tạm hết'],
            ] as const).map(([value, label]) => (
              <button key={value} className={availability === value ? 'active' : ''} type="button" onClick={() => changeAvailability(value)}><b>{label}</b></button>
            ))}
          </div>

          <label className="bistro-menu-v2-sort">
            <span>Sắp xếp</span>
            <select value={sort} onChange={event => { setSort(event.target.value as SortOption); setPage(1) }}>
              <option value="default">Mặc định</option>
              <option value="name">Tên A – Z</option>
              <option value="price-asc">Giá thấp → cao</option>
              <option value="price-desc">Giá cao → thấp</option>
            </select>
          </label>
        </aside>

        <div className="bistro-menu-v2-results">
          <div className="bistro-menu-v2-results-head">
            <div><strong>{items.length}</strong><span>món phù hợp</span></div>
            <Button variant="ghost" onClick={() => navigate('/reservation')}>Đặt bàn trước</Button>
          </div>

          {visibleItems.length ? (
            <div className="bistro-menu-v2-list">
              {visibleItems.map((item, index) => (
                <article key={item.id} className="bistro-menu-v2-item">
                  <button className="bistro-menu-v2-item-media" type="button" onClick={() => navigate(`/menu/${encodeURIComponent(item.id)}`)}>
                    <img src={item.imageUrl || heroImage} className={!item.imageUrl ? `fallback-crop crop-${index % 3 + 1}` : ''} alt={item.name} />
                  </button>
                  <div className="bistro-menu-v2-item-copy">
                    <div className="bistro-menu-v2-item-meta"><span>{item.menuCategoryName}</span><small className={item.isAvailable ? 'available' : 'unavailable'}>{item.isAvailable ? 'Còn món' : 'Tạm hết'}</small></div>
                    <h2>{item.name}</h2>
                    <p>{item.description || 'Món ăn được chế biến tươi mới trong ngày.'}</p>
                    <div><strong>{currency(item.price, data.restaurant?.currency || 'VND')}</strong><Button size="sm" variant="outline" onClick={() => navigate(`/menu/${encodeURIComponent(item.id)}`)}>Xem món <ArrowRight /></Button></div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="bistro-menu-v2-empty"><Utensils /><h2>Không có món phù hợp</h2><p>Đổi từ khóa hoặc bộ lọc để xem lại thực đơn.</p></div>
          )}

          {pageCount > 1 ? (
            <nav className="bistro-menu-v2-pagination" aria-label="Phân trang thực đơn">
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

import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  QrCode,
  Search,
  SlidersHorizontal,
  Utensils,
} from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import type { CustomerSiteBootstrap } from '../services/customerSite'
import heroImage from '../assets/hero-vietnamese-table.webp'
import { navigate } from '../utils/navigation'

const pageSize = 12

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

  const categoryIdsWithItems = useMemo(
    () => new Set(data.menuItems.map(item => item.menuCategoryId)),
    [data.menuItems],
  )

  const categories = useMemo(
    () => data.menuCategories.filter(category => categoryIdsWithItems.has(category.id)),
    [categoryIdsWithItems, data.menuCategories],
  )

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>()
    data.menuItems.forEach(item => counts.set(item.menuCategoryId, (counts.get(item.menuCategoryId) || 0) + 1))
    return counts
  }, [data.menuItems])

  const items = useMemo(() => {
    const filtered = data.menuItems.filter(item => {
      const matchesCategory = categoryId === 'all' || item.menuCategoryId === categoryId
      const matchesAvailability = availability === 'all'
        || (availability === 'available' ? item.isAvailable : !item.isAvailable)
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
  const visibleItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return items.slice(start, start + pageSize)
  }, [currentPage, items])

  function selectCategory(nextCategoryId: string) {
    setCategoryId(nextCategoryId)
    setPage(1)
  }

  function updateKeyword(nextKeyword: string) {
    setKeyword(nextKeyword)
    setPage(1)
  }

  function selectAvailability(nextAvailability: AvailabilityFilter) {
    setAvailability(nextAvailability)
    setPage(1)
  }

  function selectSort(nextSort: SortOption) {
    setSort(nextSort)
    setPage(1)
  }

  return (
    <main className="menu-page page-section">
      <section className="menu-catalog-column">
        <header className="menu-heading-layout">
          <span className="menu-premium-kicker">THỰC ĐƠN NHÀ HÀNG</span>
          <h1>Tinh hoa món Việt hôm nay</h1>
          <p>Tất cả món ăn bên dưới đều lấy trực tiếp từ thực đơn nhà hàng đang phục vụ. Tìm nhanh theo tên món hoặc chọn danh mục phù hợp với bạn.</p>

          <label className="menu-search">
            <Search aria-hidden="true" />
            <span className="sr-only">Tìm món ăn</span>
            <input
              value={keyword}
              onChange={event => updateKeyword(event.target.value)}
              placeholder="Tìm theo tên món hoặc mô tả..."
            />
          </label>

          <div className="category-tabs" role="tablist" aria-label="Danh mục món ăn">
            <button
              type="button"
              role="tab"
              aria-selected={categoryId === 'all'}
              className={categoryId === 'all' ? 'active' : ''}
              onClick={() => selectCategory('all')}
            >
              <Utensils aria-hidden="true" />
              <span>Tất cả món</span>
              <small>{data.menuItems.length}</small>
            </button>
            {categories.map(category => (
              <button
                key={category.id}
                type="button"
                role="tab"
                aria-selected={categoryId === category.id}
                title={category.name}
                className={categoryId === category.id ? 'active' : ''}
                onClick={() => selectCategory(category.id)}
              >
                <Utensils aria-hidden="true" />
                <span>{category.name}</span>
                <small>{categoryCounts.get(category.id) || 0}</small>
              </button>
            ))}
          </div>
        </header>

        <div className="menu-filter-bar">
          <div className="menu-filter-label"><SlidersHorizontal aria-hidden="true" /><span>Bộ lọc</span></div>
          <div className="menu-availability-filter" aria-label="Lọc theo tình trạng món">
            <button type="button" className={availability === 'all' ? 'active' : ''} onClick={() => selectAvailability('all')}>Tất cả</button>
            <button type="button" className={availability === 'available' ? 'active' : ''} onClick={() => selectAvailability('available')}>Còn món</button>
            <button type="button" className={availability === 'unavailable' ? 'active' : ''} onClick={() => selectAvailability('unavailable')}>Tạm hết</button>
          </div>
          <label className="menu-sort-field">
            <span>Sắp xếp</span>
            <select value={sort} onChange={event => selectSort(event.target.value as SortOption)}>
              <option value="default">Mặc định</option>
              <option value="name">Tên A – Z</option>
              <option value="price-asc">Giá thấp → cao</option>
              <option value="price-desc">Giá cao → thấp</option>
            </select>
          </label>
        </div>

        <div className="qr-context-notice">
          <QrCode aria-hidden="true" />
          <p><strong>Bạn đang xem thực đơn chung.</strong><span>Để gọi món tại bàn, hãy quét mã QR đặt trên bàn. Đơn mang về không cần QR.</span></p>
          <button className="primary-button compact" type="button" onClick={() => navigate('/reservation')}><CalendarDays /> Đặt bàn</button>
        </div>

        {items.length ? (
          <>
            <div className="menu-result-count" aria-live="polite">Hiển thị <strong>{items.length}</strong> món phù hợp</div>
            <div className="menu-grid" aria-live="polite">
              {visibleItems.map((item, index) => (
                <button
                  type="button"
                  className="menu-card menu-card-button"
                  key={item.id}
                  onClick={() => navigate(`/menu/${encodeURIComponent(item.id)}`)}
                  aria-label={`Xem chi tiết ${item.name}`}
                >
                  <div className="menu-card-media">
                    {item.imageUrl
                      ? <img src={item.imageUrl} alt={item.name} />
                      : <img className={`fallback-crop crop-${index % 3 + 1}`} src={heroImage} alt={item.name} />}
                    <span className={item.isAvailable ? 'menu-card-availability available' : 'menu-card-availability unavailable'}>{item.isAvailable ? 'Còn món' : 'Tạm hết'}</span>
                  </div>
                  <div className="menu-card-body">
                    <span title={item.menuCategoryName}>{item.menuCategoryName}</span>
                    <h2 title={item.name}>{item.name}</h2>
                    <p>{item.description || 'Món ăn được chế biến tươi mới trong ngày.'}</p>
                    <div className="menu-card-price-row"><strong>{currency(item.price, data.restaurant?.currency || 'VND')}</strong><small>Xem chi tiết <ChevronRight aria-hidden="true" /></small></div>
                  </div>
                </button>
              ))}
            </div>

            {pageCount > 1 ? (
              <nav className="menu-pagination" aria-label="Phân trang thực đơn">
                <button type="button" disabled={currentPage === 1} onClick={() => setPage(value => Math.max(1, value - 1))} aria-label="Trang trước"><ChevronLeft /></button>
                <span>Trang <strong>{currentPage}</strong> / {pageCount}</span>
                <button type="button" disabled={currentPage === pageCount} onClick={() => setPage(value => Math.min(pageCount, value + 1))} aria-label="Trang sau"><ChevronRight /></button>
              </nav>
            ) : null}
          </>
        ) : (
          <div className="menu-empty"><Utensils /><h2>Chưa tìm thấy món phù hợp</h2><p>Thử đổi từ khóa, danh mục hoặc bộ lọc tình trạng món.</p></div>
        )}
      </section>
    </main>
  )
}

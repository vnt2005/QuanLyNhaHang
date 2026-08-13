import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  QrCode,
  Search,
  Utensils,
} from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import type { CustomerSiteBootstrap } from '../api/customerSite'
import heroImage from '../assets/hero-vietnamese-table.webp'
import menuShowcaseImage from '../assets/menu-showcase-vietnamese.webp'
import { navigate } from '../navigation'

const pageSize = 8

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
  const items = useMemo(() => data.menuItems.filter(item => {
    const matchesCategory = categoryId === 'all' || item.menuCategoryId === categoryId
    const matchesKeyword = !deferredKeyword
      || item.name.toLocaleLowerCase('vi').includes(deferredKeyword)
      || item.description?.toLocaleLowerCase('vi').includes(deferredKeyword)
    return matchesCategory && matchesKeyword
  }), [categoryId, data.menuItems, deferredKeyword])
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

  return (
    <main className="menu-page page-section">
      <div className="menu-desktop-layout">
        <section className="menu-catalog-column">
          <header className="menu-heading-layout">
            <h1>Thực đơn hôm nay</h1>
            <p>Tinh hoa ẩm thực Việt được chế biến từ nguyên liệu tươi ngon mỗi ngày. Mời bạn khám phá và chọn món yêu thích.</p>
            <label className="menu-search">
              <Search aria-hidden="true" />
              <span className="sr-only">Tìm món ăn</span>
              <input
                value={keyword}
                onChange={event => updateKeyword(event.target.value)}
                placeholder="Tìm món bạn thích"
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
                Tất cả
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
                  {category.name}
                </button>
              ))}
            </div>
          </header>

          <div className="qr-context-notice">
            <QrCode aria-hidden="true" />
            <p><strong>Bạn đang xem thực đơn chung.</strong><span>Để gọi món tại bàn, hãy quét mã QR đặt trên bàn. Bạn không cần mở trang quản trị.</span></p>
            <button className="primary-button compact" type="button" onClick={() => navigate('/reservation')}><CalendarDays /> Đặt bàn</button>
          </div>

          {items.length ? (
            <>
              <div className="menu-grid" aria-live="polite">
                {visibleItems.map((item, index) => (
                  <article className="menu-card" key={item.id}>
                    <div className="menu-card-media">
                      {item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : <img className={`fallback-crop crop-${index % 3 + 1}`} src={heroImage} alt={item.name} />}
                    </div>
                    <div className="menu-card-body">
                      <span title={item.menuCategoryName}>{item.menuCategoryName}</span>
                      <h2 title={item.name}>{item.name}</h2>
                      <p>{item.description || 'Món ăn được chế biến tươi mới trong ngày.'}</p>
                      <div><strong>{currency(item.price, data.restaurant?.currency || 'VND')}</strong><small className={item.isAvailable ? 'available' : 'unavailable'}>{item.isAvailable ? 'Còn món' : 'Hết món'}</small></div>
                    </div>
                  </article>
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
            <div className="menu-empty"><Utensils /><h2>Chưa tìm thấy món phù hợp</h2><p>Thử đổi từ khóa hoặc chọn danh mục khác.</p></div>
          )}
        </section>

        <aside className="menu-showcase" aria-label="Tinh hoa món Việt">
          <img src={menuShowcaseImage} alt="Phở bò, cá kho và rau xào Việt Nam" />
        </aside>
      </div>
    </main>
  )
}

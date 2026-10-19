import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Search,
  ShoppingBag,
  UtensilsCrossed,
} from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { CustomerSiteBootstrap, PublicMenuItem } from '../services/customerSite'
import {
  getMenuCategoryDescription,
  getMenuItemDescription,
  getMenuItemImageUrl,
} from '../utils/menuCatalog'
import { navigate } from '../utils/navigation'
import { addTakeawayItem } from '../utils/takeawayCart'

const pageSize = 10

type AvailabilityFilter = 'all' | 'available' | 'unavailable'
type SortOption = 'default' | 'name' | 'price-asc' | 'price-desc'

const menuFontStyle = { fontFamily: "'Noto Sans Variable', system-ui, sans-serif" }

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
  const [addedDishId, setAddedDishId] = useState<string | null>(null)
  const deferredKeyword = useDeferredValue(keyword.trim().toLocaleLowerCase('vi'))
  const currencyCode = data.restaurant?.currency || 'VND'

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
    data.menuItems.forEach(item =>
      counts.set(item.menuCategoryId, (counts.get(item.menuCategoryId) || 0) + 1),
    )
    return counts
  }, [data.menuItems])

  const selectedCategory = useMemo(
    () => categories.find(category => category.id === categoryId) ?? null,
    [categories, categoryId],
  )
  const selectedCategoryDescription = getMenuCategoryDescription(selectedCategory)

  const items = useMemo(() => {
    const filtered = data.menuItems.filter(item => {
      const matchesCategory = categoryId === 'all' || item.menuCategoryId === categoryId
      const matchesAvailability =
        availability === 'all' ||
        (availability === 'available' ? item.isAvailable : !item.isAvailable)
      const description = getMenuItemDescription(item) || ''
      const matchesKeyword =
        !deferredKeyword ||
        item.name.toLocaleLowerCase('vi').includes(deferredKeyword) ||
        description.toLocaleLowerCase('vi').includes(deferredKeyword) ||
        item.menuCategoryName.toLocaleLowerCase('vi').includes(deferredKeyword)

      return matchesCategory && matchesAvailability && matchesKeyword
    })

    if (sort === 'name') {
      return [...filtered].sort((left, right) =>
        left.name.localeCompare(right.name, 'vi'),
      )
    }
    if (sort === 'price-asc') {
      return [...filtered].sort((left, right) => left.price - right.price)
    }
    if (sort === 'price-desc') {
      return [...filtered].sort((left, right) => right.price - left.price)
    }
    return filtered
  }, [availability, categoryId, data.menuItems, deferredKeyword, sort])

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const visibleItems = useMemo(
    () => items.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [currentPage, items],
  )

  function changeCategory(value: string) {
    setCategoryId(value)
    setPage(1)
  }

  function changeAvailability(value: AvailabilityFilter) {
    setAvailability(value)
    setPage(1)
  }

  function handleQuickAdd(item: PublicMenuItem) {
    if (!item.isAvailable) return
    addTakeawayItem(item.id, 1)
    setAddedDishId(item.id)
    window.setTimeout(() => {
      setAddedDishId(current => (current === item.id ? null : current))
    }, 1800)
  }

  function resetAllFilters() {
    setKeyword('')
    setCategoryId('all')
    setAvailability('all')
    setSort('default')
    setPage(1)
  }

  return (
    <main className="sera-menu" style={menuFontStyle}>
      <header className="sera-menu-head">
        <div>
          <p className="sera-kicker">Thực đơn</p>
          <h1 className="sera-display">Chọn món cho bữa ăn sắp tới.</h1>
          <p className="sera-copy">
            Tra cứu các danh mục và món ăn hiện có tại nhà hàng, xem mô tả chi tiết hoặc thêm
            món vào giỏ đặt mang về.
          </p>
        </div>
        <div className="sera-menu-tools">
          <label className="sera-search">
            <Search aria-hidden="true" />
            <Input
              value={keyword}
              onChange={event => {
                setKeyword(event.target.value)
                setPage(1)
              }}
              placeholder="Tìm tên món, mô tả hoặc danh mục..."
              autoComplete="off"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate('/takeaway')}>
              <ShoppingBag /> Mở giỏ mang về <ArrowRight />
            </Button>
            <Button variant="ghost" onClick={() => navigate('/reservation')}>
              Đặt bàn trước
            </Button>
          </div>
        </div>
      </header>

      <section className="sera-menu-layout">
        <aside className="sera-filter" aria-label="Bộ lọc thực đơn">
          <div className="sera-filter-group">
            <span>Danh mục</span>
            <button
              className={`sera-filter-button ${categoryId === 'all' ? 'active' : ''}`}
              type="button"
              onClick={() => changeCategory('all')}
            >
              <b>Tất cả món</b>
              <small>{data.menuItems.length}</small>
            </button>
            {categories.map(category => {
              const catDesc = getMenuCategoryDescription(category)
              return (
                <button
                  key={category.id}
                  className={`sera-filter-button ${categoryId === category.id ? 'active' : ''}`}
                  type="button"
                  onClick={() => changeCategory(category.id)}
                  title={catDesc || category.name}
                >
                  <b>{category.name}</b>
                  <small>{categoryCounts.get(category.id) || 0}</small>
                </button>
              )
            })}
          </div>

          <div className="sera-filter-group">
            <span>Tình trạng</span>
            {(
              [
                ['all', 'Tất cả'],
                ['available', 'Còn món'],
                ['unavailable', 'Tạm hết'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                className={`sera-filter-button ${availability === value ? 'active' : ''}`}
                type="button"
                onClick={() => changeAvailability(value)}
              >
                <b>{label}</b>
              </button>
            ))}
          </div>

          <label className="sera-sort">
            <span>Sắp xếp</span>
            <select
              value={sort}
              onChange={event => {
                setSort(event.target.value as SortOption)
                setPage(1)
              }}
            >
              <option value="default">Mặc định</option>
              <option value="name">Tên A – Z</option>
              <option value="price-asc">Giá thấp → cao</option>
              <option value="price-desc">Giá cao → thấp</option>
            </select>
          </label>
        </aside>

        <div>
          <div className="sera-menu-results-head">
            <div>
              <span>
                <strong>{items.length}</strong> món phù hợp
                {selectedCategory ? ` trong danh mục ${selectedCategory.name}` : ''}
              </span>
              {selectedCategoryDescription ? (
                <p className="mt-1 text-xs text-muted-foreground">{selectedCategoryDescription}</p>
              ) : null}
            </div>
            <button className="sera-link" type="button" onClick={() => navigate('/reservation')}>
              Đặt bàn trước
            </button>
          </div>

          {visibleItems.length ? (
            <div className="sera-menu-list">
              {visibleItems.map(item => {
                const isJustAdded = addedDishId === item.id
                const imageUrl = getMenuItemImageUrl(item)
                const description = getMenuItemDescription(item)
                return (
                  <article className="sera-menu-item" key={item.id}>
                    <button
                      className="sera-menu-item-media"
                      type="button"
                      onClick={() => navigate(`/menu/${encodeURIComponent(item.id)}`)}
                      aria-label={`Xem ${item.name}`}
                    >
                      {imageUrl ? (
                        <img src={imageUrl} alt={item.name} />
                      ) : (
                        <span
                          className="sera-dish-media-placeholder is-card"
                          aria-label="Chưa có ảnh món ăn"
                        >
                          <UtensilsCrossed aria-hidden="true" />
                          <small>Chưa có ảnh</small>
                        </span>
                      )}
                    </button>

                    <div className="sera-menu-item-copy">
                      <small>
                        {item.menuCategoryName} · {item.isAvailable ? 'Còn món' : 'Tạm hết'}
                      </small>
                      <h2>
                        <button
                          type="button"
                          className="sera-menu-item-title-btn"
                          onClick={() => navigate(`/menu/${encodeURIComponent(item.id)}`)}
                        >
                          {item.name}
                        </button>
                      </h2>
                      {description ? (
                        <p>{description}</p>
                      ) : (
                        <p className="text-muted-foreground">Chưa có mô tả cho món ăn này.</p>
                      )}
                    </div>

                    <div className="sera-menu-item-side">
                      <strong>{currency(item.price, currencyCode)}</strong>
                      <div className="sera-menu-item-actions">
                        {item.isAvailable ? (
                          <Button
                            size="sm"
                            variant={isJustAdded ? 'default' : 'secondary'}
                            onClick={() => handleQuickAdd(item)}
                          >
                            {isJustAdded ? (
                              <>
                                <Check /> Đã thêm
                              </>
                            ) : (
                              <>
                                <ShoppingBag /> Thêm giỏ
                              </>
                            )}
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/menu/${encodeURIComponent(item.id)}`)}
                        >
                          Xem món <ArrowRight />
                        </Button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <div className="sera-empty">
              <div>
                <h2>Không có món phù hợp.</h2>
                <p>Đổi từ khóa hoặc bộ lọc để xem lại thực đơn.</p>
                <Button variant="outline" onClick={resetAllFilters}>
                  Xóa bộ lọc
                </Button>
              </div>
            </div>
          )}

          {pageCount > 1 ? (
            <nav className="sera-menu-pagination" aria-label="Phân trang thực đơn">
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage === 1}
                onClick={() => setPage(value => Math.max(1, value - 1))}
              >
                <ChevronLeft />
              </Button>
              <span>
                Trang <strong>{currentPage}</strong> / {pageCount}
              </span>
              <Button
                variant="outline"
                size="icon"
                disabled={currentPage === pageCount}
                onClick={() => setPage(value => Math.min(pageCount, value + 1))}
              >
                <ChevronRight />
              </Button>
            </nav>
          ) : null}
        </div>
      </section>
    </main>
  )
}

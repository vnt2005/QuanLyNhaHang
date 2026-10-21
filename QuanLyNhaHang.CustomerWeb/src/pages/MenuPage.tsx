import {
  AlertTriangle,
  ArrowRight,
  Award,
  Check,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Flame,
  Leaf,
  Search,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
  Users,
} from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { CustomerSiteBootstrap, PublicMenuItem } from '../services/customerSite'
import {
  ALLERGEN_CATALOG,
  type AllergenId,
  type DishBadgeId,
  getCuratedDescription,
  getDishBadges,
  getDishNutritionalProfile,
  getDishRatingSummary,
  getFallbackDishImage,
  getFallbackImagePosition,
} from '../utils/menuCatalog'
import { navigate } from '../utils/navigation'
import { addTakeawayItem } from '../utils/takeawayCart'

const pageSize = 10

type AvailabilityFilter = 'all' | 'available' | 'unavailable'
type SortOption = 'default' | 'rating-desc' | 'name' | 'price-asc' | 'price-desc'
type SpecialTagFilter = 'all' | DishBadgeId | 'high-protein' | 'gluten-free'

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
  const [specialTag, setSpecialTag] = useState<SpecialTagFilter>('all')
  const [excludedAllergens, setExcludedAllergens] = useState<AllergenId[]>([])
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

  const enrichedItems = useMemo(
    () =>
      data.menuItems.map((item, index) => ({
        item,
        index,
        badges: getDishBadges(item, index),
        profile: getDishNutritionalProfile(item),
        description: getCuratedDescription(item),
        ratingSummary: getDishRatingSummary(item, index),
      })),
    [data.menuItems],
  )

  const items = useMemo(() => {
    const filtered = enrichedItems.filter(({ item, badges, profile, description }) => {
      const matchesCategory = categoryId === 'all' || item.menuCategoryId === categoryId
      const matchesAvailability =
        availability === 'all' ||
        (availability === 'available' ? item.isAvailable : !item.isAvailable)
      const matchesKeyword =
        !deferredKeyword ||
        item.name.toLocaleLowerCase('vi').includes(deferredKeyword) ||
        description.toLocaleLowerCase('vi').includes(deferredKeyword) ||
        profile.ingredients.some(ing => ing.toLocaleLowerCase('vi').includes(deferredKeyword))

      let matchesSpecialTag = true
      if (specialTag !== 'all') {
        if (specialTag === 'high-protein' || specialTag === 'gluten-free') {
          matchesSpecialTag = profile.dietaryTags.some(tag => tag.id === specialTag)
        } else {
          matchesSpecialTag = badges.some(badge => badge.id === specialTag)
        }
      }

      const safeFromAllergens =
        excludedAllergens.length === 0 ||
        !profile.allergens.some(allergen => excludedAllergens.includes(allergen.id))

      return (
        matchesCategory &&
        matchesAvailability &&
        matchesKeyword &&
        matchesSpecialTag &&
        safeFromAllergens
      )
    })

    if (sort === 'rating-desc') {
      return [...filtered].sort(
        (left, right) =>
          right.ratingSummary.rating - left.ratingSummary.rating ||
          right.ratingSummary.orderCount - left.ratingSummary.orderCount,
      )
    }
    if (sort === 'name') {
      return [...filtered].sort((left, right) =>
        left.item.name.localeCompare(right.item.name, 'vi'),
      )
    }
    if (sort === 'price-asc') {
      return [...filtered].sort((left, right) => left.item.price - right.item.price)
    }
    if (sort === 'price-desc') {
      return [...filtered].sort((left, right) => right.item.price - left.item.price)
    }
    return filtered
  }, [availability, categoryId, deferredKeyword, enrichedItems, excludedAllergens, sort, specialTag])

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

  function toggleAllergenExclusion(id: AllergenId) {
    setExcludedAllergens(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id],
    )
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
    setSpecialTag('all')
    setExcludedAllergens([])
    setSort('default')
    setPage(1)
  }

  return (
    <main className="sera-menu" style={menuFontStyle}>
      <header className="sera-menu-head">
        <div>
          <p className="sera-kicker">Thực đơn nhà hàng & Mang về</p>
          <h1 className="sera-display">Chọn món theo khẩu vị & chế độ ăn của bạn.</h1>
          <p className="sera-copy">
            Mỗi món ăn đều minh bạch thành phần nguyên liệu, nhãn cảnh báo dị ứng (hải sản, đậu
            phộng, gluten, bơ sữa) và cho phép tùy chỉnh mức độ cay, kích cỡ khẩu phần hoặc gọi
            thêm món ăn kèm.
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
              placeholder="Tìm tên món hoặc nguyên liệu (cá hồi, bò, nấm...)"
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

      {/* Thanh lọc nhanh theo Nhãn món & Chế độ ăn */}
      <div className="sera-menu-dietary-bar" aria-label="Lọc nhanh theo nhãn ẩm thực và chế độ ăn">
        <div className="sera-tag-filter-bar">
          {(
            [
              ['all', 'Tất cả khẩu vị'],
              ['bestseller', 'Bán chạy nhất'],
              ['chef', 'Đầu bếp khuyên dùng'],
              ['spicy', 'Món cay đậm vị'],
              ['vegetarian', 'Món chay / Thực vật'],
              ['high-protein', 'Giàu đạm tự nhiên'],
              ['gluten-free', 'Không chứa Gluten'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`sera-tag-filter-btn ${specialTag === id ? 'active' : ''}`}
              onClick={() => {
                setSpecialTag(id)
                setPage(1)
              }}
            >
              {id === 'bestseller' ? <Award /> : null}
              {id === 'chef' ? <ChefHat /> : null}
              {id === 'spicy' ? <Flame /> : null}
              {id === 'vegetarian' ? <Leaf /> : null}
              {id === 'high-protein' ? <Sparkles /> : null}
              {id === 'gluten-free' ? <ShieldCheck /> : null}
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <section className="sera-menu-layout">
        <aside className="sera-filter" aria-label="Bộ lọc thực đơn">
          <div className="sera-filter-group">
            <span>Danh mục món</span>
            <button
              className={`sera-filter-button ${categoryId === 'all' ? 'active' : ''}`}
              type="button"
              onClick={() => changeCategory('all')}
            >
              <b>Tất cả món</b>
              <small>{data.menuItems.length}</small>
            </button>
            {categories.map(category => (
              <button
                key={category.id}
                className={`sera-filter-button ${categoryId === category.id ? 'active' : ''}`}
                type="button"
                onClick={() => changeCategory(category.id)}
              >
                <b>{category.name}</b>
                <small>{categoryCounts.get(category.id) || 0}</small>
              </button>
            ))}
          </div>

          <div className="sera-filter-group">
            <span>Loại trừ dị ứng</span>
            <p className="sera-filter-hint">
              Ẩn các món có chứa thành phần bạn bị dị ứng:
            </p>
            <div className="sera-allergen-filter-list">
              {(Object.keys(ALLERGEN_CATALOG) as AllergenId[]).map(allergenId => {
                const meta = ALLERGEN_CATALOG[allergenId]
                const active = excludedAllergens.includes(allergenId)
                return (
                  <button
                    key={allergenId}
                    type="button"
                    className={`sera-allergen-filter-chip ${active ? 'active' : ''}`}
                    onClick={() => toggleAllergenExclusion(allergenId)}
                  >
                    <span>Không {meta.shortLabel}</span>
                    {active ? <Check className="size-3.5" /> : null}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="sera-filter-group">
            <span>Tình trạng phục vụ</span>
            {(
              [
                ['all', 'Tất cả'],
                ['available', 'Đang mở bán'],
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
              <option value="default">Đề xuất của nhà hàng</option>
              <option value="rating-desc">Đánh giá cao & Gọi nhiều nhất</option>
              <option value="name">Tên món A – Z</option>
              <option value="price-asc">Giá thấp → cao</option>
              <option value="price-desc">Giá cao → thấp</option>
            </select>
          </label>
        </aside>

        <div>
          <div className="sera-menu-results-head">
            <span>
              Hiển thị <strong>{items.length}</strong> món phù hợp
              {excludedAllergens.length > 0
                ? ` · Đã lọc bỏ ${excludedAllergens.map(id => ALLERGEN_CATALOG[id].shortLabel).join(', ')}`
                : ''}
            </span>
            {(specialTag !== 'all' ||
              excludedAllergens.length > 0 ||
              categoryId !== 'all' ||
              keyword.trim() !== '') ? (
              <button className="sera-link" type="button" onClick={resetAllFilters}>
                Đặt lại bộ lọc
              </button>
            ) : (
              <button className="sera-link" type="button" onClick={() => navigate('/reservation')}>
                Đặt bàn trước
              </button>
            )}
          </div>

          {visibleItems.length ? (
            <div className="sera-menu-list">
              {visibleItems.map(({ item, index, badges, profile, description, ratingSummary }) => (
                <article className="sera-menu-item" key={item.id}>
                  <button
                    className="sera-menu-item-media"
                    type="button"
                    onClick={() => navigate(`/menu/${encodeURIComponent(item.id)}`)}
                    aria-label={`Xem ${item.name}`}
                  >
                    <img
                      src={getFallbackDishImage(item, index)}
                      style={{ objectPosition: getFallbackImagePosition(item, index) }}
                      alt={item.name}
                    />
                  </button>

                  <div className="sera-menu-item-copy">
                    <div className="sera-dish-badges-inline">
                      <small>
                        {item.menuCategoryName} · {item.isAvailable ? 'Còn món' : 'Tạm hết'}
                      </small>
                      {badges.map(badge => (
                        <span
                          key={badge.id}
                          className={`sera-dish-badge sera-dish-badge--${badge.tone} sera-dish-badge--sm`}
                        >
                          {badge.label}
                        </span>
                      ))}
                    </div>

                    <h2>
                      <button
                        type="button"
                        className="sera-menu-title-btn"
                        onClick={() => navigate(`/menu/${encodeURIComponent(item.id)}`)}
                      >
                        {item.name}
                      </button>
                    </h2>

                    <div className="sera-dish-rating-row">
                      <span className="sera-dish-rating-stars">
                        <Star aria-hidden="true" />
                        <strong>{ratingSummary.rating.toFixed(1)}</strong>/5
                      </span>
                      <span className="sera-dish-rating-sep">·</span>
                      <span>{ratingSummary.reviewCount} đánh giá</span>
                      <span className="sera-dish-rating-sep">·</span>
                      <span className="sera-dish-order-count">{ratingSummary.orderCountLabel}</span>
                    </div>

                    <p>{description}</p>

                    {/* Hàng thông tin khẩu phần, chế độ ăn & cảnh báo dị ứng */}
                    <div className="sera-menu-item-meta">
                      <span className="sera-menu-meta-pill">
                        <Users /> {profile.servingSize}
                      </span>
                      <span className="sera-menu-meta-pill">
                        <Clock3 /> {profile.prepTime}
                      </span>
                      <span className="sera-menu-meta-pill">
                        <SlidersHorizontal /> Tùy chọn khẩu vị · Độ cay
                      </span>
                    </div>

                    <div className="sera-menu-item-tags">
                      {profile.dietaryTags.map(tag => (
                        <span key={tag.id} className="sera-dietary-chip">
                          <Leaf /> {tag.label}
                        </span>
                      ))}
                      {profile.allergens.length > 0 ? (
                        <span
                          className="sera-allergen-chip"
                          title={profile.allergens.map(a => `${a.label}: ${a.detail}`).join(' | ')}
                        >
                          <AlertTriangle /> Lưu ý dị ứng:{' '}
                          {profile.allergens.map(a => a.shortLabel).join(', ')}
                        </span>
                      ) : (
                        <span className="sera-allergen-chip sera-allergen-chip--safe">
                          <ShieldCheck /> Lành tính · Không chứa dị ứng phổ biến
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="sera-menu-item-side">
                    <div className="text-right">
                      <strong>{currency(item.price, currencyCode)}</strong>
                      <small className="sera-menu-price-hint">Đơn giá niêm yết</small>
                    </div>
                    <div className="sera-menu-item-actions">
                      <Button
                        size="sm"
                        variant={addedDishId === item.id ? 'default' : 'secondary'}
                        disabled={!item.isAvailable}
                        onClick={() => handleQuickAdd(item)}
                      >
                        {addedDishId === item.id ? <Check /> : <ShoppingBag />}
                        {addedDishId === item.id ? 'Đã thêm' : '+ Thêm nhanh'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/menu/${encodeURIComponent(item.id)}`)}
                      >
                        Tùy chọn món <ArrowRight />
                      </Button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="sera-empty">
              <div>
                <h2>Không có món phù hợp với bộ lọc hiện tại.</h2>
                <p>Hãy thử bỏ bớt bộ lọc dị ứng hoặc đổi từ khóa tìm kiếm để xem thêm thực đơn.</p>
                <Button variant="outline" onClick={resetAllFilters}>
                  Xóa toàn bộ bộ lọc
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

import {
  ArrowRight,
  CalendarDays,
  Clock3,
  ImageOff,
  MapPin,
  ShoppingBag,
  Users,
  UtensilsCrossed,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { CustomerSiteBootstrap, PublicMenuItem } from '../services/customerSite'
import {
  clearUnsupportedMenuStorage,
  getMenuCategoryDescription,
  getMenuItemDescription,
  getMenuItemImageUrl,
} from '../utils/menuCatalog'
import { navigate } from '../utils/navigation'
import { addTakeawayItem } from '../utils/takeawayCart'

const homeFontStyle = { fontFamily: "'Noto Sans Variable', system-ui, sans-serif" }

function currency(value: number, code = 'VND') {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: code || 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

export default function HomePage({ data }: { data: CustomerSiteBootstrap }) {
  const restaurant = data.restaurant
  const availableItems = useMemo(
    () => data.menuItems.filter(item => item.isAvailable),
    [data.menuItems],
  )
  const featured = useMemo(() => availableItems.slice(0, 5), [availableItems])
  const [activeIndex, setActiveIndex] = useState(0)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all')
  const [addedItemMessage, setAddedItemMessage] = useState<string>('')

  useEffect(() => {
    clearUnsupportedMenuStorage()
  }, [])

  useEffect(() => {
    if (featured.length <= 1) return
    const timer = window.setInterval(
      () => setActiveIndex(current => (current + 1) % featured.length),
      5200,
    )
    return () => window.clearInterval(timer)
  }, [featured.length])

  const active = featured[activeIndex] ?? featured[0]
  const activeImageUrl = getMenuItemImageUrl(active)
  const activeDescription = getMenuItemDescription(active)

  const categoriesWithItems = useMemo(() => {
    const countByCategory = new Map<string, number>()
    availableItems.forEach(item => {
      countByCategory.set(
        item.menuCategoryId,
        (countByCategory.get(item.menuCategoryId) || 0) + 1,
      )
    })
    return data.menuCategories
      .filter(category => (countByCategory.get(category.id) || 0) > 0)
      .map(category => ({
        category,
        count: countByCategory.get(category.id) || 0,
        description: getMenuCategoryDescription(category),
      }))
  }, [availableItems, data.menuCategories])

  const visibleMenuItems = useMemo(() => {
    if (selectedCategoryId === 'all') return availableItems
    return availableItems.filter(item => item.menuCategoryId === selectedCategoryId)
  }, [availableItems, selectedCategoryId])

  const selectedCategoryEntry = useMemo(
    () => categoriesWithItems.find(entry => entry.category.id === selectedCategoryId) ?? null,
    [categoriesWithItems, selectedCategoryId],
  )

  const areaGroups = useMemo(() => {
    const map = new Map<
      string,
      {
        areaName: string
        tableCount: number
        maxCapacity: number
        tableNames: string[]
      }
    >()
    data.reservationTables.forEach(table => {
      const current = map.get(table.areaName) || {
        areaName: table.areaName,
        tableCount: 0,
        maxCapacity: 0,
        tableNames: [],
      }
      current.tableCount += 1
      current.maxCapacity = Math.max(current.maxCapacity, table.capacity)
      current.tableNames.push(table.name)
      map.set(table.areaName, current)
    })
    return Array.from(map.values())
  }, [data.reservationTables])

  const welcome =
    restaurant?.welcomeMessage?.trim() ||
    'Thông tin thực đơn, đặt bàn và đặt món mang về trực tiếp từ nhà hàng.'

  function handleQuickTakeaway(item: PublicMenuItem) {
    const cart = addTakeawayItem(item.id, 1)
    const count = cart[item.id] || 1
    setAddedItemMessage(`Đã thêm ${item.name} vào giỏ mang về (${count} phần).`)
    window.setTimeout(() => {
      setAddedItemMessage('')
    }, 3200)
  }

  return (
    <main className="sera-home" style={homeFontStyle}>
      <section className="sera-home-hero">
        <div className="sera-home-hero-copy">
          <p className="sera-kicker">
            {restaurant?.restaurantName || 'Nhà hàng'}{' '}
            {restaurant?.address ? `· ${restaurant.address}` : ''}
          </p>
          <h1 className="sera-display" style={homeFontStyle}>
            Thực đơn phục vụ tại bàn & đặt mang về.
          </h1>
          <p className="sera-copy">{welcome}</p>
          <div className="sera-home-actions">
            <Button size="lg" onClick={() => navigate('/menu')}>
              Xem thực đơn <ArrowRight aria-hidden="true" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/reservation')}>
              <CalendarDays aria-hidden="true" /> Đặt bàn
            </Button>
            <Button size="lg" variant="ghost" onClick={() => navigate('/takeaway')}>
              <ShoppingBag aria-hidden="true" /> Đặt mang về
            </Button>
          </div>

          <div className="sera-home-facts">
            {restaurant?.openingTime && restaurant?.closingTime ? (
              <div className="sera-home-fact">
                <Clock3 aria-hidden="true" />
                <span>
                  {restaurant.openingTime} – {restaurant.closingTime}
                </span>
              </div>
            ) : null}
            {restaurant?.address ? (
              <div className="sera-home-fact">
                <MapPin aria-hidden="true" />
                <span>{restaurant.address}</span>
              </div>
            ) : null}
          </div>

          {featured.length > 1 ? (
            <div className="sera-home-hero-rail" aria-label="Chọn nhanh món đang mở bán">
              <span className="sera-home-hero-rail-label">Món đang phục vụ</span>
              <div className="sera-home-hero-rail-buttons">
                {featured.map((item, idx) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`sera-home-hero-pill ${idx === activeIndex ? 'active' : ''}`}
                    onClick={() => setActiveIndex(idx)}
                    aria-pressed={idx === activeIndex}
                  >
                    <span>{item.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="sera-home-visual">
          {active ? (
            activeImageUrl ? (
              <img
                className="sera-home-visual-image"
                key={active.id}
                src={activeImageUrl}
                alt={active.name}
              />
            ) : (
              <div
                className="sera-dish-media-placeholder is-hero"
                key={active.id}
                role="img"
                aria-label={`${active.name} - Chưa có ảnh món ăn`}
              >
                <div className="sera-dish-media-placeholder-inner">
                  <span className="sera-dish-media-placeholder-icon">
                    <UtensilsCrossed aria-hidden="true" />
                  </span>
                  <small className="sera-kicker">{active.menuCategoryName}</small>
                  <strong className="sera-dish-media-placeholder-title" style={homeFontStyle}>
                    {active.name}
                  </strong>
                  {activeDescription ? (
                    <p className="sera-dish-media-placeholder-desc">{activeDescription}</p>
                  ) : null}
                  <span className="sera-dish-media-placeholder-note">
                    <ImageOff aria-hidden="true" /> Chưa có ảnh minh họa
                  </span>
                </div>
              </div>
            )
          ) : (
            <div className="sera-dish-media-placeholder is-hero">
              <div className="sera-dish-media-placeholder-inner">
                <span className="sera-dish-media-placeholder-icon">
                  <UtensilsCrossed aria-hidden="true" />
                </span>
                <strong className="sera-dish-media-placeholder-title" style={homeFontStyle}>
                  Thực đơn đang cập nhật
                </strong>
              </div>
            </div>
          )}

          {active ? (
            <div className="sera-home-visual-caption" key={`caption-${active.id}`}>
              <div>
                <small>{active.menuCategoryName}</small>
                <strong style={homeFontStyle}>{active.name}</strong>
              </div>
              <b>{currency(active.price, restaurant?.currency)}</b>
            </div>
          ) : null}
        </div>
      </section>

      {categoriesWithItems.length > 0 ? (
        <section className="sera-home-categories" aria-labelledby="home-categories-heading">
          <div className="sera-section-head">
            <div>
              <p className="sera-kicker">Danh mục thực đơn</p>
              <h2 id="home-categories-heading" style={homeFontStyle}>
                Phân nhóm món ăn đang phục vụ.
              </h2>
            </div>
            <button className="sera-link" type="button" onClick={() => navigate('/menu')}>
              Mở trang thực đơn <ArrowRight size={14} />
            </button>
          </div>

          <div className="sera-home-category-grid">
            {categoriesWithItems.map(({ category, count, description }) => {
              const isSelected = selectedCategoryId === category.id
              return (
                <button
                  key={category.id}
                  type="button"
                  className={`sera-home-category-card ${isSelected ? 'active' : ''}`}
                  onClick={() =>
                    setSelectedCategoryId(current =>
                      current === category.id ? 'all' : category.id,
                    )
                  }
                >
                  <div className="sera-home-category-card-top">
                    <strong style={homeFontStyle}>{category.name}</strong>
                    <span className="sera-home-category-count">{count} món</span>
                  </div>
                  {description ? <p>{description}</p> : null}
                </button>
              )
            })}
          </div>
        </section>
      ) : null}

      <section className="sera-home-featured" aria-labelledby="home-featured-heading">
        <div className="sera-section-head">
          <div>
            <p className="sera-kicker">Thực đơn đang phục vụ</p>
            <h2 id="home-featured-heading" style={homeFontStyle}>
              {selectedCategoryEntry
                ? `${selectedCategoryEntry.category.name} (${visibleMenuItems.length} món)`
                : 'Tất cả món đang mở bán.'}
            </h2>
            {selectedCategoryEntry?.description ? (
              <p className="sera-copy mt-2">{selectedCategoryEntry.description}</p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {selectedCategoryId !== 'all' ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedCategoryId('all')}
              >
                Xem tất cả danh mục
              </Button>
            ) : null}
            <button className="sera-link" type="button" onClick={() => navigate('/menu')}>
              Xem thực đơn <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {addedItemMessage ? (
          <div className="sera-home-toast" role="status">
            <span>{addedItemMessage}</span>
            <button type="button" onClick={() => navigate('/takeaway')}>
              Mở giỏ mang về <ArrowRight size={13} />
            </button>
          </div>
        ) : null}

        {visibleMenuItems.length ? (
          <div className="sera-dish-list">
            {visibleMenuItems.map(item => {
              const imageUrl = getMenuItemImageUrl(item)
              const description = getMenuItemDescription(item)
              return (
                <div key={item.id} className="sera-dish-row-wrap">
                  <button
                    type="button"
                    className="sera-dish-row"
                    onClick={() => navigate(`/menu/${encodeURIComponent(item.id)}`)}
                    style={{
                      width: '100%',
                      borderLeft: 0,
                      borderRight: 0,
                      background: 'transparent',
                      padding: 0,
                      textAlign: 'left',
                      cursor: 'pointer',
                      ...homeFontStyle,
                    }}
                  >
                    <span className="sera-dish-row-media">
                      {imageUrl ? (
                        <img src={imageUrl} alt={item.name} />
                      ) : (
                        <span
                          className="sera-dish-media-placeholder is-thumb"
                          aria-label="Chưa có ảnh món ăn"
                        >
                          <UtensilsCrossed aria-hidden="true" />
                          <small>Chưa có ảnh</small>
                        </span>
                      )}
                    </span>
                    <span className="sera-dish-row-body">
                      <h3 style={homeFontStyle}>{item.name}</h3>
                      {description ? <p>{description}</p> : null}
                    </span>
                    <span className="sera-dish-row-meta">{item.menuCategoryName}</span>
                    <span className="sera-dish-row-price">
                      {currency(item.price, restaurant?.currency)}
                    </span>
                  </button>
                  <div className="sera-dish-row-quick">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleQuickTakeaway(item)}
                      aria-label={`Thêm ${item.name} vào giỏ mang về`}
                    >
                      <ShoppingBag aria-hidden="true" /> Mang về
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="sera-empty">
            <div>
              <h2 style={homeFontStyle}>Thực đơn đang được cập nhật.</h2>
              <p>Nhà hàng chưa có món đang mở bán để hiển thị.</p>
            </div>
          </div>
        )}
      </section>

      {areaGroups.length > 0 ? (
        <section className="sera-home-reservation" aria-labelledby="home-reservation-heading">
          <div className="sera-home-reservation-card">
            <div className="sera-home-reservation-copy">
              <p className="sera-kicker">Khu vực & bàn phục vụ</p>
              <h2 id="home-reservation-heading" style={homeFontStyle}>
                Đặt bàn trực tuyến theo khu vực hiện có.
              </h2>
              <p className="sera-copy">
                Hệ thống hiện có {data.reservationTables.length} bàn hoạt động tại{' '}
                {areaGroups.length} khu vực. Chọn khu vực phù hợp và gửi yêu cầu đặt bàn để nhà
                hàng xác nhận.
              </p>

              <div className="sera-home-area-pills">
                {areaGroups.map(area => (
                  <button
                    key={area.areaName}
                    type="button"
                    className="sera-home-area-pill"
                    onClick={() =>
                      navigate(`/reservation?area=${encodeURIComponent(area.areaName)}`)
                    }
                  >
                    <strong>{area.areaName}</strong>
                    <span>
                      <Users size={12} aria-hidden="true" /> {area.tableCount} bàn ({area.tableNames.join(', ')}) · Tối đa{' '}
                      {area.maxCapacity} khách/bàn
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="sera-home-reservation-actions">
              <Button size="lg" onClick={() => navigate('/reservation')}>
                <CalendarDays aria-hidden="true" /> Đặt bàn ngay
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/takeaway')}>
                <ShoppingBag aria-hidden="true" /> Đặt món mang về
              </Button>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  )
}

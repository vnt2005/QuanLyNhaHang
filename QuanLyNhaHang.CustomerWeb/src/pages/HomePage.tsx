import { ArrowRight, CalendarDays, Clock3, MapPin } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { CustomerSiteBootstrap } from '../services/customerSite'
import heroImage from '../assets/hero-vietnamese-table.webp'
import { navigate } from '../utils/navigation'

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
  const availableItems = useMemo(() => data.menuItems.filter(item => item.isAvailable), [data.menuItems])
  const featured = useMemo(() => availableItems.slice(0, 5), [availableItems])
  const [activeIndex, setActiveIndex] = useState(0)
  const active = featured[activeIndex] ?? featured[0]

  useEffect(() => {
    if (featured.length <= 1) return
    const timer = window.setInterval(() => setActiveIndex(current => (current + 1) % featured.length), 5200)
    return () => window.clearInterval(timer)
  }, [featured.length])

  const welcome = restaurant?.welcomeMessage
    || 'Món Việt được chuẩn bị mỗi ngày bằng nguyên liệu tươi, hương vị quen thuộc và cách phục vụ gọn gàng, hiện đại.'

  return (
    <main className="sera-home" style={homeFontStyle}>
      <section className="sera-home-hero">
        <div className="sera-home-hero-copy">
          <p className="sera-kicker">Ẩm thực Việt tại Nha Trang</p>
          <h1 className="sera-display" style={homeFontStyle}>Món Việt quen thuộc, được phục vụ theo cách nhẹ nhàng hơn.</h1>
          <p className="sera-copy">{welcome}</p>
          <div className="sera-home-actions">
            <Button size="lg" onClick={() => navigate('/menu')}>Xem thực đơn <ArrowRight /></Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/reservation')}><CalendarDays /> Đặt bàn</Button>
          </div>
          <div className="sera-home-facts">
            <div className="sera-home-fact"><Clock3 /><span>{restaurant ? `${restaurant.openingTime} – ${restaurant.closingTime}` : 'Giờ mở cửa đang cập nhật'}</span></div>
            <div className="sera-home-fact"><MapPin /><span>{restaurant?.address || 'Nha Trang'}</span></div>
          </div>
        </div>

        <div className="sera-home-visual">
          <img className="sera-home-visual-image" key={active?.id || 'fallback'} src={active?.imageUrl || heroImage} alt={active?.name || 'Món ăn nổi bật'} />
          <div className="sera-home-visual-caption" key={`caption-${active?.id || 'fallback'}`}>
            <span><small>{active?.menuCategoryName || 'Món hôm nay'}</small><strong style={homeFontStyle}>{active?.name || 'Thực đơn đang phục vụ'}</strong></span>
            <b>{active ? currency(active.price, restaurant?.currency) : ''}</b>
          </div>
        </div>
      </section>

      <section className="sera-home-featured">
        <div className="sera-section-head">
          <div>
            <p className="sera-kicker">Thực đơn đang phục vụ</p>
            <h2 style={homeFontStyle}>Tất cả món đang mở bán.</h2>
          </div>
          <button className="sera-link" type="button" onClick={() => navigate('/menu')}>Xem thực đơn <ArrowRight size={14} /></button>
        </div>

        {availableItems.length ? (
          <div className="sera-dish-list">
            {availableItems.map(item => (
              <button
                key={item.id}
                type="button"
                className="sera-dish-row"
                onClick={() => navigate(`/menu/${encodeURIComponent(item.id)}`)}
                style={{ width: '100%', borderLeft: 0, borderRight: 0, background: 'transparent', padding: 0, textAlign: 'left', cursor: 'pointer', ...homeFontStyle }}
              >
                <span className="sera-dish-row-media"><img src={item.imageUrl || heroImage} alt="" /></span>
                <span><h3 style={homeFontStyle}>{item.name}</h3><p>{item.description || 'Món ăn được chuẩn bị tươi mới trong ngày.'}</p></span>
                <span className="sera-dish-row-meta">{item.menuCategoryName}</span>
                <span className="sera-dish-row-price">{currency(item.price, restaurant?.currency)}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="sera-empty"><div><h2 style={homeFontStyle}>Thực đơn đang được cập nhật.</h2><p>Nhà hàng chưa có món đang mở bán để hiển thị.</p></div></div>
        )}
      </section>
    </main>
  )
}

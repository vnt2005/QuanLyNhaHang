import { CalendarDays, Search, Utensils } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'
import type { CustomerSiteBootstrap } from '../api/customerSite'
import heroImage from '../assets/hero-vietnamese-table.webp'
import { navigate } from '../navigation'

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
  const deferredKeyword = useDeferredValue(keyword.trim().toLocaleLowerCase('vi'))
  const items = useMemo(() => data.menuItems.filter(item => {
    const matchesCategory = categoryId === 'all' || item.menuCategoryId === categoryId
    const matchesKeyword = !deferredKeyword
      || item.name.toLocaleLowerCase('vi').includes(deferredKeyword)
      || item.description?.toLocaleLowerCase('vi').includes(deferredKeyword)
    return matchesCategory && matchesKeyword
  }), [categoryId, data.menuItems, deferredKeyword])

  return (
    <main className="menu-page page-section">
      <div className="menu-heading-layout">
        <div>
          <h1>Thực đơn hôm nay</h1>
          <p>Tinh hoa ẩm thực Việt được chế biến từ nguyên liệu tươi ngon mỗi ngày. Mời bạn khám phá và chọn món yêu thích.</p>
          <label className="menu-search"><Search aria-hidden="true" /><input value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="Tìm món bạn thích" /></label>
          <div className="category-tabs" role="tablist" aria-label="Danh mục món ăn">
            <button type="button" className={categoryId === 'all' ? 'active' : ''} onClick={() => setCategoryId('all')}>Tất cả</button>
            {data.menuCategories.map(category => (
              <button key={category.id} type="button" className={categoryId === category.id ? 'active' : ''} onClick={() => setCategoryId(category.id)}>{category.name}</button>
            ))}
          </div>
        </div>
        <img className="menu-heading-image" src={heroImage} alt="Món ăn Việt trong thực đơn" />
      </div>

      <div className="qr-context-notice">
        <Utensils aria-hidden="true" />
        <p><strong>Bạn đang xem thực đơn chung.</strong><span>Để gọi món tại bàn, hãy quét mã QR đặt trên bàn. Bạn không cần mở trang quản trị.</span></p>
        <button className="primary-button compact" type="button" onClick={() => navigate('/reservation')}><CalendarDays /> Đặt bàn</button>
      </div>

      {items.length ? (
        <div className="menu-grid">
          {items.map((item, index) => (
            <article className="menu-card" key={item.id}>
              <div className="menu-card-media">
                {item.imageUrl ? <img src={item.imageUrl} alt={item.name} /> : <img className={`fallback-crop crop-${index % 3 + 1}`} src={heroImage} alt={item.name} />}
              </div>
              <div className="menu-card-body">
                <span>{item.menuCategoryName}</span>
                <h2>{item.name}</h2>
                <p>{item.description || 'Món ăn được chế biến tươi mới trong ngày.'}</p>
                <div><strong>{currency(item.price, data.restaurant?.currency || 'VND')}</strong><small className={item.isAvailable ? 'available' : 'unavailable'}>{item.isAvailable ? 'Còn món' : 'Hết món'}</small></div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="menu-empty"><Utensils /><h2>Chưa tìm thấy món phù hợp</h2><p>Thử đổi từ khóa hoặc chọn danh mục khác.</p></div>
      )}
    </main>
  )
}

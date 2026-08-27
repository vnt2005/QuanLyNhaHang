import { ChevronLeft, Minus, Plus, ShoppingBag } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { CustomerSiteBootstrap } from '../services/customerSite'
import heroImage from '../assets/hero-vietnamese-table.webp'
import { navigate } from '../utils/navigation'
import {
  addTakeawayItem,
  MAX_TAKEAWAY_ITEM_QUANTITY,
  readTakeawayCart,
} from '../utils/takeawayCart'

function money(value: number, currency = 'VND') {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: currency || 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

export default function MenuItemDetailPage({
  data,
  menuItemId,
}: {
  data: CustomerSiteBootstrap
  menuItemId: string
}) {
  const item = useMemo(
    () => data.menuItems.find(menuItem => menuItem.id === menuItemId) ?? null,
    [data.menuItems, menuItemId],
  )
  const [quantity, setQuantity] = useState(1)
  const [message, setMessage] = useState('')

  if (!item) {
    return (
      <main className="menu-item-detail-page page-section">
        <section className="menu-item-detail-missing">
          <h1>Không tìm thấy món</h1>
          <p>Món này có thể đã ngừng phục vụ hoặc đường dẫn không còn hợp lệ.</p>
          <button className="secondary-button" type="button" onClick={() => navigate('/menu')}>Quay lại thực đơn</button>
        </section>
      </main>
    )
  }

  function addToCart() {
    const before = readTakeawayCart()[item!.id] || 0
    const cart = addTakeawayItem(item!.id, quantity)
    const after = cart[item!.id] || 0
    const added = Math.max(0, after - before)

    if (added <= 0) {
      setMessage(`Mỗi món chỉ được tối đa ${MAX_TAKEAWAY_ITEM_QUANTITY} phần trong một đơn.`)
      return
    }

    setMessage(
      after >= MAX_TAKEAWAY_ITEM_QUANTITY
        ? `Giỏ hiện có ${after} phần ${item!.name}, đã đạt giới hạn ${MAX_TAKEAWAY_ITEM_QUANTITY} phần/món.`
        : `Đã thêm ${added} phần ${item!.name} vào giỏ mang về.`,
    )
  }

  return (
    <main className="menu-item-detail-page page-section">
      <button className="text-link back-link" type="button" onClick={() => navigate('/menu')}><ChevronLeft /> Quay lại thực đơn</button>
      <section className="menu-item-detail-card">
        <div className="menu-item-detail-image">
          <img src={item.imageUrl || heroImage} className={item.imageUrl ? '' : 'fallback-crop crop-2'} alt={item.name} />
          <span>{item.menuCategoryName}</span>
        </div>
        <div className="menu-item-detail-copy">
          <span className="page-kicker">CHI TIẾT MÓN</span>
          <h1>{item.name}</h1>
          <p>{item.description || 'Món ăn được chuẩn bị tươi mới trong ngày theo tiêu chuẩn của nhà hàng.'}</p>
          <strong className="menu-item-detail-price">{money(item.price, data.restaurant?.currency)}</strong>
          <div className="menu-item-detail-order">
            <div className="menu-item-detail-quantity">
              <button type="button" aria-label="Giảm số lượng" disabled={quantity <= 1} onClick={() => setQuantity(value => Math.max(1, value - 1))}><Minus /></button>
              <span>{quantity}</span>
              <button type="button" aria-label="Tăng số lượng" disabled={quantity >= MAX_TAKEAWAY_ITEM_QUANTITY} onClick={() => setQuantity(value => Math.min(MAX_TAKEAWAY_ITEM_QUANTITY, value + 1))}><Plus /></button>
            </div>
            <button className="primary-button" type="button" onClick={addToCart}><ShoppingBag /> Thêm vào giỏ mang về</button>
          </div>
          <small className="menu-item-detail-limit">Tối đa {MAX_TAKEAWAY_ITEM_QUANTITY} phần cho mỗi món trong một đơn.</small>
          {message ? <div className="form-notice success">{message}</div> : null}
        </div>
      </section>
    </main>
  )
}

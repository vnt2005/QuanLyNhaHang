import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ImageOff,
  Minus,
  Plus,
  QrCode,
  ShoppingBag,
  UtensilsCrossed,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { CustomerSiteBootstrap } from '../services/customerSite'
import {
  clearUnsupportedMenuStorage,
  getMenuCategoryDescription,
  getMenuItemDescription,
  getMenuItemImageUrl,
} from '../utils/menuCatalog'
import { navigate } from '../utils/navigation'
import {
  addTakeawayItem,
  MAX_TAKEAWAY_ITEM_NOTE_LENGTH,
  MAX_TAKEAWAY_ITEM_QUANTITY,
  readTakeawayItemNotes,
  setTakeawayItemNote,
} from '../utils/takeawayCart'

const detailFontStyle = { fontFamily: "'Noto Sans Variable', system-ui, sans-serif" }

function currency(value: number, code: string) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: code || 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

export default function MenuItemDetailPage({
  data,
  itemId,
}: {
  data: CustomerSiteBootstrap
  itemId: string
}) {
  const item = data.menuItems.find(menuItem => menuItem.id === itemId)
  const category = data.menuCategories.find(cat => cat.id === item?.menuCategoryId)
  const currencyCode = data.restaurant?.currency || 'VND'

  const [quantity, setQuantity] = useState(1)
  const [itemNote, setItemNote] = useState(() => readTakeawayItemNotes()[itemId] || '')
  const [message, setMessage] = useState('')

  useEffect(() => {
    clearUnsupportedMenuStorage()
    setQuantity(1)
    setItemNote(readTakeawayItemNotes()[itemId] || '')
    setMessage('')
  }, [itemId])

  if (!item) {
    return (
      <main className="sera-detail" style={detailFontStyle}>
        <Button className="sera-detail-back" variant="ghost" onClick={() => navigate('/menu')}>
          <ChevronLeft /> Quay lại thực đơn
        </Button>
        <div className="sera-empty">
          <div>
            <h2>Không tìm thấy món ăn.</h2>
            <p>Món này có thể đã ngừng phục vụ hoặc đường dẫn không còn hợp lệ.</p>
            <Button onClick={() => navigate('/menu')}>Xem thực đơn</Button>
          </div>
        </div>
      </main>
    )
  }

  const imageUrl = getMenuItemImageUrl(item)
  const description = getMenuItemDescription(item)
  const categoryDescription = getMenuCategoryDescription(category)
  const lineTotalPrice = item.price * quantity

  function addToTakeaway(goToCart: boolean) {
    const trimmedNote = itemNote.trim()
    setTakeawayItemNote(item!.id, trimmedNote)
    const cart = addTakeawayItem(item!.id, quantity, trimmedNote || null)
    const quantityInCart = cart[item!.id] || 0
    setMessage(`Giỏ mang về hiện có ${quantityInCart} phần ${item!.name}.`)
    if (goToCart) navigate('/takeaway')
  }

  return (
    <main className="sera-detail" style={detailFontStyle}>
      <Button className="sera-detail-back" variant="ghost" onClick={() => navigate('/menu')}>
        <ChevronLeft /> Thực đơn
      </Button>

      <section className="sera-detail-grid">
        <div className="sera-detail-media">
          {imageUrl ? (
            <img src={imageUrl} alt={item.name} />
          ) : (
            <div
              className="sera-dish-media-placeholder is-detail"
              role="img"
              aria-label={`${item.name} - Chưa có ảnh món ăn`}
            >
              <div className="sera-dish-media-placeholder-inner">
                <span className="sera-dish-media-placeholder-icon">
                  <UtensilsCrossed aria-hidden="true" />
                </span>
                <small className="sera-kicker">{item.menuCategoryName}</small>
                <strong className="sera-dish-media-placeholder-title">{item.name}</strong>
                <span className="sera-dish-media-placeholder-note">
                  <ImageOff aria-hidden="true" /> Chưa có ảnh minh họa cho món ăn này
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="sera-detail-copy">
          <div className="flex items-center justify-between gap-4">
            <p className="sera-kicker">{item.menuCategoryName}</p>
            <Badge variant={item.isAvailable ? 'secondary' : 'destructive'}>
              {item.isAvailable ? 'Còn món' : 'Tạm hết'}
            </Badge>
          </div>

          <h1>{item.name}</h1>
          {description ? (
            <p>{description}</p>
          ) : (
            <p className="text-muted-foreground">Chưa có mô tả cho món ăn này.</p>
          )}
          {categoryDescription ? (
            <p className="text-xs text-muted-foreground">
              Danh mục {item.menuCategoryName}: {categoryDescription}
            </p>
          ) : null}

          <strong className="sera-detail-price">{currency(item.price, currencyCode)}</strong>

          {item.isAvailable ? (
            <div className="sera-detail-order">
              <div className="sera-detail-order-head">
                <div>
                  <p className="sera-kicker">Mang về</p>
                  <h2>Chọn số lượng</h2>
                </div>
                <div className="sera-qty">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity(value => Math.max(1, value - 1))}
                    aria-label="Giảm số lượng"
                  >
                    <Minus />
                  </Button>
                  <strong>{quantity}</strong>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={quantity >= MAX_TAKEAWAY_ITEM_QUANTITY}
                    onClick={() =>
                      setQuantity(value => Math.min(MAX_TAKEAWAY_ITEM_QUANTITY, value + 1))
                    }
                    aria-label="Tăng số lượng"
                  >
                    <Plus />
                  </Button>
                </div>
              </div>

              <label className="sera-field mt-4">
                <span>Ghi chú cho món này (không bắt buộc)</span>
                <Textarea
                  value={itemNote}
                  onChange={event =>
                    setItemNote(event.target.value.slice(0, MAX_TAKEAWAY_ITEM_NOTE_LENGTH))
                  }
                  maxLength={MAX_TAKEAWAY_ITEM_NOTE_LENGTH}
                  placeholder="Nhập ghi chú gửi bếp cho món ăn này..."
                />
                <small className="text-right text-muted-foreground">
                  {itemNote.length}/{MAX_TAKEAWAY_ITEM_NOTE_LENGTH}
                </small>
              </label>

              <p className="sera-detail-note">
                Tối đa {MAX_TAKEAWAY_ITEM_QUANTITY} phần cho món này · Thành tiền{' '}
                {currency(lineTotalPrice, currencyCode)}
              </p>

              <div className="sera-detail-actions">
                <Button variant="outline" onClick={() => addToTakeaway(false)}>
                  <ShoppingBag /> Thêm vào giỏ
                </Button>
                <Button onClick={() => addToTakeaway(true)}>
                  Đặt mang về <ArrowRight />
                </Button>
              </div>

              {message ? (
                <p className="sera-detail-note">
                  {message}{' '}
                  <button
                    className="sera-link"
                    type="button"
                    onClick={() => navigate('/takeaway')}
                  >
                    Xem giỏ
                  </button>
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="sera-detail-secondary">
            <div>
              <QrCode />
              <span>Ăn tại quán? Quét QR trên bàn để gọi món đúng bàn.</span>
            </div>
            <Button variant="ghost" onClick={() => navigate('/reservation')}>
              <CalendarDays /> Đặt bàn
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}

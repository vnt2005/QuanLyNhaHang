import {
  AlertTriangle,
  ArrowRight,
  Award,
  CalendarDays,
  Check,
  ChefHat,
  ChevronLeft,
  Clock3,
  Flame,
  Info,
  Leaf,
  MessageSquarePlus,
  Minus,
  Plus,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  ThumbsUp,
  Users,
  UtensilsCrossed,
} from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { CustomerSiteBootstrap, PublicMenuItem } from '../services/customerSite'
import {
  addUserDishReview,
  type DishSizeOption,
  type DishSpiceOption,
  getCuratedDescription,
  getDishBadges,
  getDishModifierSchema,
  getDishNutritionalProfile,
  getDishPairings,
  getDishRatingSummary,
  getFallbackDishImage,
  getFallbackImagePosition,
} from '../utils/menuCatalog'
import { navigate } from '../utils/navigation'
import {
  addTakeawayItem,
  getTakeawayItemCustomization,
  MAX_TAKEAWAY_ITEM_QUANTITY,
  type TakeawayItemCustomization,
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
  const itemIndex = useMemo(
    () => data.menuItems.findIndex(menuItem => menuItem.id === itemId),
    [data.menuItems, itemId],
  )
  const item = itemIndex >= 0 ? data.menuItems[itemIndex] : undefined
  const currencyCode = data.restaurant?.currency || 'VND'

  const modifierSchema = useMemo(
    () => (item ? getDishModifierSchema(item) : null),
    [item],
  )
  const nutritionalProfile = useMemo(
    () => (item ? getDishNutritionalProfile(item) : null),
    [item],
  )
  const dishBadges = useMemo(
    () => (item ? getDishBadges(item, Math.max(0, itemIndex)) : []),
    [item, itemIndex],
  )
  const pairings = useMemo(
    () => (item ? getDishPairings(item, data.menuItems) : []),
    [data.menuItems, item],
  )

  const [quantity, setQuantity] = useState(1)
  const [selectedSizeId, setSelectedSizeId] = useState<DishSizeOption['id']>('small')
  const [selectedSpiceId, setSelectedSpiceId] = useState<DishSpiceOption['id']>('mild')
  const [selectedPrepIds, setSelectedPrepIds] = useState<string[]>([])
  const [selectedToppingIds, setSelectedToppingIds] = useState<string[]>([])
  const [customNote, setCustomNote] = useState('')
  const [message, setMessage] = useState('')
  const [addedPairingId, setAddedPairingId] = useState<string | null>(null)
  const [comboAdded, setComboAdded] = useState(false)
  const [reviewRefreshTick, setReviewRefreshTick] = useState(0)
  const [reviewerName, setReviewerName] = useState('')
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewDiningType, setReviewDiningType] = useState<'Thực khách tại quán' | 'Đơn mang về'>(
    'Thực khách tại quán',
  )
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSubmittedNotice, setReviewSubmittedNotice] = useState('')
  const [likedReviewIds, setLikedReviewIds] = useState<string[]>([])

  const ratingSummary = useMemo(
    () => (item ? getDishRatingSummary(item, Math.max(0, itemIndex)) : null),
    [item, itemIndex, reviewRefreshTick],
  )

  useEffect(() => {
    if (!item || !modifierSchema) return
    const saved = getTakeawayItemCustomization(item.id)
    if (saved) {
      const validSize = modifierSchema.sizes.some(s => s.id === saved.sizeId)
        ? (saved.sizeId as DishSizeOption['id'])
        : modifierSchema.defaultSizeId
      const validSpice = modifierSchema.spiceLevels.some(s => s.id === saved.spiceId)
        ? (saved.spiceId as DishSpiceOption['id'])
        : modifierSchema.defaultSpiceId
      setSelectedSizeId(validSize)
      setSelectedSpiceId(validSpice)
      setSelectedPrepIds(
        modifierSchema.prepOptions
          .filter(opt => saved.prepLabels.includes(opt.label))
          .map(opt => opt.id),
      )
      setSelectedToppingIds(
        modifierSchema.toppings
          .filter(top => saved.toppingLabels.includes(top.label))
          .map(top => top.id),
      )
      setCustomNote(saved.customNote || '')
    } else {
      setSelectedSizeId(modifierSchema.defaultSizeId)
      setSelectedSpiceId(modifierSchema.defaultSpiceId)
      setSelectedPrepIds([])
      setSelectedToppingIds([])
      setCustomNote('')
    }
    setQuantity(1)
    setMessage('')
    setComboAdded(false)
    setReviewSubmittedNotice('')
  }, [item, modifierSchema])

  if (!item || !modifierSchema || !nutritionalProfile || !ratingSummary) {
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

  const activeSize =
    modifierSchema.sizes.find(s => s.id === selectedSizeId) || modifierSchema.sizes[0]
  const activeSpice =
    modifierSchema.spiceLevels.find(s => s.id === selectedSpiceId) ||
    modifierSchema.spiceLevels[0]
  const activePreps = modifierSchema.prepOptions.filter(opt =>
    selectedPrepIds.includes(opt.id),
  )
  const activeToppings = modifierSchema.toppings.filter(top =>
    selectedToppingIds.includes(top.id),
  )

  const toppingsPrice = activeToppings.reduce((sum, top) => sum + top.price, 0)
  const extraUnitPrice = activeSize.priceDelta + toppingsPrice
  const effectiveUnitPrice = item.price + extraUnitPrice
  const totalEstimatedPrice = effectiveUnitPrice * quantity

  const customizationSummaryParts = [
    `Cỡ: ${activeSize.label}`,
    `Độ cay: ${activeSpice.label}`,
    ...(activePreps.length > 0
      ? [`Yêu cầu: ${activePreps.map(p => p.label).join(', ')}`]
      : []),
    ...(activeToppings.length > 0
      ? [`Topping thêm: ${activeToppings.map(t => t.label).join(', ')}`]
      : []),
    ...(customNote.trim() ? [`Ghi chú: ${customNote.trim()}`] : []),
  ]
  const customizationSummaryText = customizationSummaryParts.join(' · ')

  function togglePrepOption(id: string) {
    setSelectedPrepIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id],
    )
  }

  function toggleToppingOption(id: string) {
    setSelectedToppingIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id],
    )
  }

  function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault()
    if (!item || !reviewComment.trim()) return

    addUserDishReview(item.id, {
      author: reviewerName.trim() || 'Thực khách Sera',
      rating: reviewRating,
      diningType: reviewDiningType,
      orderedVariant: `${activeSize.label} · ${activeSpice.label}`,
      comment: reviewComment.trim(),
    })
    setReviewComment('')
    setReviewSubmittedNotice(
      'Cảm ơn bạn! Đánh giá của bạn đã được ghi nhận và hiển thị ngay bên dưới.',
    )
  }

  function toggleHelpfulReview(reviewId: string) {
    setLikedReviewIds(prev =>
      prev.includes(reviewId) ? prev.filter(id => id !== reviewId) : [...prev, reviewId],
    )
  }

  function buildCustomizationPayload(): TakeawayItemCustomization {
    return {
      sizeId: activeSize.id,
      sizeLabel: activeSize.label,
      sizePriceDelta: activeSize.priceDelta,
      spiceId: activeSpice.id,
      spiceLabel: activeSpice.label,
      prepLabels: activePreps.map(p => p.label),
      toppingLabels: activeToppings.map(t => t.label),
      toppingsPrice,
      customNote: customNote.trim(),
      extraUnitPrice,
      summaryText: customizationSummaryText,
    }
  }

  function addToTakeaway(goToCart: boolean) {
    const customization = buildCustomizationPayload()
    const cart = addTakeawayItem(item!.id, quantity, customization)
    const quantityInCart = cart[item!.id] || 0
    setMessage(
      `Đã lưu tùy chọn (${activeSize.label}, ${activeSpice.label}) · Giỏ mang về hiện có ${quantityInCart} phần ${item!.name}.`,
    )
    if (goToCart) navigate('/takeaway')
  }

  function handleAddPairingDish(pairingItem: PublicMenuItem) {
    if (!pairingItem.isAvailable) return
    addTakeawayItem(pairingItem.id, 1)
    setAddedPairingId(pairingItem.id)
    window.setTimeout(() => {
      setAddedPairingId(current => (current === pairingItem.id ? null : current))
    }, 1800)
  }

  function handleAddFullCombo() {
    const customization = buildCustomizationPayload()
    addTakeawayItem(item!.id, quantity, customization)
    pairings.slice(0, 2).forEach(rec => {
      if (rec.item.isAvailable) {
        addTakeawayItem(rec.item.id, 1)
      }
    })
    setComboAdded(true)
    setMessage(
      `Đã thêm trọn bộ Combo (${item!.name} + ${pairings
        .slice(0, 2)
        .map(p => p.item.name)
        .join(' + ')}) vào giỏ mang về!`,
    )
  }

  const comboPairings = pairings.slice(0, 2)
  const comboTotal =
    effectiveUnitPrice + comboPairings.reduce((sum, rec) => sum + rec.item.price, 0)
  const allergySafeModeActive = selectedPrepIds.includes('allergy-clean')

  return (
    <main className="sera-detail" style={detailFontStyle}>
      <div className="sera-detail-topbar">
        <Button className="sera-detail-back" variant="ghost" onClick={() => navigate('/menu')}>
          <ChevronLeft /> Quay lại thực đơn
        </Button>
        <div className="sera-detail-breadcrumbs">
          <span>Thực đơn</span>
          <span>/</span>
          <span>{item.menuCategoryName}</span>
          <span>/</span>
          <strong>{item.name}</strong>
        </div>
      </div>

      <section className="sera-detail-grid">
        {/* Cột trái: Hình ảnh món ăn + Thành phần & Cảnh báo dị ứng */}
        <div className="sera-detail-left-col">
          <div className="sera-detail-media">
            <img
              src={getFallbackDishImage(item, Math.max(0, itemIndex))}
              style={{ objectPosition: getFallbackImagePosition(item, Math.max(0, itemIndex)) }}
              alt={item.name}
            />
            <div className="sera-detail-media-badges">
              {dishBadges.map(badge => (
                <span
                  key={badge.id}
                  className={`sera-dish-badge sera-dish-badge--${badge.tone}`}
                >
                  {badge.id === 'bestseller' ? <Award /> : null}
                  {badge.id === 'chef' ? <ChefHat /> : null}
                  {badge.id === 'new' ? <Sparkles /> : null}
                  {badge.id === 'spicy' ? <Flame /> : null}
                  {badge.id === 'vegetarian' ? <Leaf /> : null}
                  {badge.label}
                </span>
              ))}
            </div>
          </div>

          {/* Khối Thành phần, Dinh dưỡng & Cảnh báo dị ứng */}
          <div className="sera-detail-nutrition-card">
            <div className="sera-detail-nutrition-head">
              <div>
                <p className="sera-kicker">Minh bạch nguyên liệu & An toàn thực phẩm</p>
                <h2>Thành phần & Nhãn cảnh báo dị ứng</h2>
              </div>
              <span className="sera-nutrition-cal">{nutritionalProfile.calories}</span>
            </div>

            <div className="sera-detail-quick-facts">
              <div>
                <small>Khẩu phần tiêu chuẩn</small>
                <strong>
                  <Users /> {nutritionalProfile.servingSize}
                </strong>
              </div>
              <div>
                <small>Thời gian bếp chuẩn bị</small>
                <strong>
                  <Clock3 /> {nutritionalProfile.prepTime}
                </strong>
              </div>
              <div>
                <small>Cam kết độ tươi</small>
                <strong>
                  <UtensilsCrossed /> Chế biến trong ngày
                </strong>
              </div>
            </div>

            {/* Nhãn chế độ ăn (Dietary tags) */}
            <div className="sera-nutrition-block">
              <h3>Nhãn chế độ ăn (Dietary Tags)</h3>
              <div className="sera-dietary-tag-grid">
                {nutritionalProfile.dietaryTags.map(tag => (
                  <div key={tag.id} className="sera-dietary-tag-card">
                    <div className="sera-dietary-tag-title">
                      <Leaf />
                      <strong>{tag.label}</strong>
                    </div>
                    <p>{tag.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Nhãn cảnh báo dị ứng (Allergens) */}
            <div className="sera-nutrition-block">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3>Cảnh báo dị ứng (Allergens)</h3>
                <button
                  type="button"
                  className={`sera-allergy-safe-toggle ${allergySafeModeActive ? 'active' : ''}`}
                  onClick={() => togglePrepOption('allergy-clean')}
                >
                  <ShieldCheck />
                  {allergySafeModeActive
                    ? 'Đã bật: Dụng cụ chế biến riêng'
                    : 'Yêu cầu dụng cụ chế biến riêng'}
                </button>
              </div>

              {nutritionalProfile.allergens.length > 0 ? (
                <div className="sera-allergen-warning-list">
                  {nutritionalProfile.allergens.map(allergen => (
                    <div
                      key={allergen.id}
                      className={`sera-allergen-warning-item sera-allergen-warning-item--${allergen.severity}`}
                    >
                      <AlertTriangle />
                      <div>
                        <strong>Chứa {allergen.label}</strong>
                        <p>{allergen.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="sera-allergen-safe-banner">
                  <ShieldCheck />
                  <div>
                    <strong>An toàn với các nhóm dị ứng phổ biến</strong>
                    <p>
                      Món ăn không chứa hải sản giáp xác, đậu phộng, gluten lúa mì hay chế phẩm từ
                      sữa.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Thành phần nguyên liệu chính */}
            <div className="sera-nutrition-block">
              <h3>Nguyên liệu chính trong món</h3>
              <ul className="sera-ingredient-list">
                {nutritionalProfile.ingredients.map(ingredient => (
                  <li key={ingredient}>
                    <Check /> <span>{ingredient}</span>
                  </li>
                ))}
              </ul>
              <p className="sera-origin-note">
                <Info /> {nutritionalProfile.originNote}
              </p>
            </div>
          </div>
        </div>

        {/* Cột phải: Thông tin món + Bộ Tùy chọn (Modifiers / Size / Độ cay / Topping) */}
        <div className="sera-detail-copy">
          <div className="flex items-center justify-between gap-4">
            <p className="sera-kicker">{item.menuCategoryName}</p>
            <Badge variant={item.isAvailable ? 'secondary' : 'destructive'}>
              {item.isAvailable ? 'Đang phục vụ' : 'Tạm hết món'}
            </Badge>
          </div>

          <h1>{item.name}</h1>

          <div className="sera-detail-rating-bar" aria-label="Xếp hạng và lượt gọi món ăn">
            <div className="sera-detail-rating-score">
              <span className="sera-detail-stars" aria-hidden="true">
                ★★★★★
              </span>
              <strong>{ratingSummary.rating.toFixed(1)}</strong>
              <span className="sera-detail-rating-max">/5</span>
            </div>
            <span className="sera-rating-dot">·</span>
            <button
              type="button"
              className="sera-detail-rating-link"
              onClick={() =>
                document
                  .getElementById('dish-reviews-section')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              {ratingSummary.reviewCount} đánh giá thực tế
            </button>
            <span className="sera-rating-dot">·</span>
            <span className="sera-detail-order-stat">
              🔥 <strong>{ratingSummary.orderCountLabel}</strong>
            </span>
            <span className="sera-detail-satisfaction-pill">
              👍 {ratingSummary.satisfactionLabel}
            </span>
          </div>

          <p>{getCuratedDescription(item)}</p>

          <div className="sera-detail-price-row">
            <div>
              <small className="sera-price-caption">Đơn giá theo tùy chọn hiện tại</small>
              <strong className="sera-detail-price">
                {currency(effectiveUnitPrice, currencyCode)}
              </strong>
            </div>
            {extraUnitPrice > 0 ? (
              <span className="sera-price-delta-badge">
                Giá gốc {currency(item.price, currencyCode)} + Tùy chọn{' '}
                {currency(extraUnitPrice, currencyCode)}
              </span>
            ) : (
              <span className="sera-price-delta-badge">Cỡ tiêu chuẩn · Không phụ thu</span>
            )}
          </div>

          {item.isAvailable ? (
            <div className="sera-detail-order">
              {/* 1. Chọn Size / Khẩu phần */}
              <div className="sera-modifier-section">
                <div className="sera-modifier-head">
                  <div>
                    <span className="sera-modifier-step">01 · Khẩu phần</span>
                    <h3>Chọn kích cỡ món (Size)</h3>
                  </div>
                  <span className="sera-modifier-req">Bắt buộc · Chọn 1</span>
                </div>
                <div className="sera-size-grid" role="radiogroup" aria-label="Chọn kích cỡ món">
                  {modifierSchema.sizes.map(size => {
                    const active = size.id === selectedSizeId
                    return (
                      <button
                        key={size.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        className={`sera-size-card ${active ? 'active' : ''}`}
                        onClick={() => setSelectedSizeId(size.id)}
                      >
                        <div className="sera-size-card-top">
                          <strong>{size.label}</strong>
                          <span className="sera-size-price">
                            {size.priceDelta === 0
                              ? 'Tiêu chuẩn'
                              : `+${currency(size.priceDelta, currencyCode)}`}
                          </span>
                        </div>
                        <small>{size.servingHint}</small>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 2. Chọn Mức độ cay */}
              <div className="sera-modifier-section">
                <div className="sera-modifier-head">
                  <div>
                    <span className="sera-modifier-step">02 · Khẩu vị</span>
                    <h3>Mức độ cay</h3>
                  </div>
                  <span className="sera-modifier-req">Bắt buộc · Chọn 1</span>
                </div>
                <div className="sera-spice-grid" role="radiogroup" aria-label="Chọn mức độ cay">
                  {modifierSchema.spiceLevels.map(spice => {
                    const active = spice.id === selectedSpiceId
                    return (
                      <button
                        key={spice.id}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        className={`sera-spice-pill ${active ? 'active' : ''}`}
                        onClick={() => setSelectedSpiceId(spice.id)}
                      >
                        <Flame className={`sera-spice-icon sera-spice-icon--${spice.id}`} />
                        <span>{spice.label}</span>
                      </button>
                    )
                  })}
                </div>
                <p className="sera-modifier-subnote">{activeSpice.description}</p>
              </div>

              {/* 3. Yêu cầu chế biến riêng */}
              <div className="sera-modifier-section">
                <div className="sera-modifier-head">
                  <div>
                    <span className="sera-modifier-step">03 · Yêu cầu chế biến</span>
                    <h3>Tùy chỉnh gia vị & Dị ứng</h3>
                  </div>
                  <span className="sera-modifier-opt">Miễn phí · Chọn nhiều</span>
                </div>
                <div className="sera-prep-chip-grid">
                  {modifierSchema.prepOptions.map(prep => {
                    const active = selectedPrepIds.includes(prep.id)
                    return (
                      <button
                        key={prep.id}
                        type="button"
                        className={`sera-prep-chip ${active ? 'active' : ''}`}
                        onClick={() => togglePrepOption(prep.id)}
                      >
                        {active ? <Check /> : <Plus />}
                        <span>{prep.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 4. Gọi thêm Topping / Món phụ đi kèm */}
              <div className="sera-modifier-section">
                <div className="sera-modifier-head">
                  <div>
                    <span className="sera-modifier-step">04 · Topping & Ăn kèm</span>
                    <h3>Gọi thêm cho tròn vị</h3>
                  </div>
                  <span className="sera-modifier-opt">Tùy chọn · Cộng thêm vào phần ăn</span>
                </div>
                <div className="sera-topping-list">
                  {modifierSchema.toppings.map(topping => {
                    const active = selectedToppingIds.includes(topping.id)
                    return (
                      <button
                        key={topping.id}
                        type="button"
                        className={`sera-topping-row ${active ? 'active' : ''}`}
                        onClick={() => toggleToppingOption(topping.id)}
                      >
                        <div className="sera-topping-left">
                          <span className="sera-topping-check">
                            {active ? <Check /> : <Plus />}
                          </span>
                          <div>
                            <strong>{topping.label}</strong>
                            {topping.tag ? (
                              <span className="sera-topping-tag">{topping.tag}</span>
                            ) : null}
                          </div>
                        </div>
                        <span className="sera-topping-price">
                          +{currency(topping.price, currencyCode)}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 5. Ghi chú riêng cho bếp */}
              <div className="sera-modifier-section">
                <label className="sera-field">
                  <span>05 · Ghi chú riêng cho bếp (Tùy chọn)</span>
                  <Input
                    maxLength={160}
                    value={customNote}
                    onChange={event => setCustomNote(event.target.value)}
                    placeholder="Ví dụ: Cắt miếng nhỏ cho bé, để riêng hành phi, không bỏ tiêu..."
                  />
                </label>
              </div>

              {/* Số lượng & Tóm tắt tùy chọn */}
              <div className="sera-detail-order-head">
                <div>
                  <p className="sera-kicker">Số lượng mang về</p>
                  <h2>Chọn số phần</h2>
                </div>
                <div className="sera-qty">
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity(value => Math.max(1, value - 1))}
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
                  >
                    <Plus />
                  </Button>
                </div>
              </div>

              <div className="sera-customization-summary-box">
                <div className="sera-customization-summary-line">
                  <span>Tóm tắt tùy chọn của bạn:</span>
                  <strong>{customizationSummaryText}</strong>
                </div>
                <div className="sera-customization-total-line">
                  <span>
                    Tạm tính ({quantity} phần · tối đa {MAX_TAKEAWAY_ITEM_QUANTITY} phần/món)
                  </span>
                  <strong>{currency(totalEstimatedPrice, currencyCode)}</strong>
                </div>
              </div>

              <div className="sera-detail-actions">
                <Button variant="outline" size="lg" onClick={() => addToTakeaway(false)}>
                  <ShoppingBag /> Lưu tùy chọn & Thêm vào giỏ
                </Button>
                <Button size="lg" onClick={() => addToTakeaway(true)}>
                  Đặt mang về ngay ({currency(totalEstimatedPrice, currencyCode)}) <ArrowRight />
                </Button>
              </div>

              {message ? (
                <p className="sera-detail-note sera-detail-note--highlight">
                  <Check /> {message}{' '}
                  <button
                    className="sera-link"
                    type="button"
                    onClick={() => navigate('/takeaway')}
                  >
                    Mở giỏ mang về
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

      {/* Khối Cross-sell / Pairing Recommendation: "Thường được gọi cùng với..." */}
      {pairings.length > 0 ? (
        <section
          className="sera-detail-pairings"
          aria-labelledby="pairing-heading"
        >
          <div className="sera-detail-pairings-head">
            <div>
              <p className="sera-kicker">Gợi ý kết hợp từ Bếp trưởng · Cross-sell & Pairing</p>
              <h2 id="pairing-heading" className="sera-title">
                Thường được gọi cùng với {item.name}.
              </h2>
            </div>
            <p className="sera-copy">
              Được thiết kế để cân bằng hương vị (chua thanh – béo ngậy – mát lành) và giúp bữa ăn
              của bạn đầy đặn như một bàn tiệc hoàn chỉnh tại nhà hàng.
            </p>
          </div>

          <div className="sera-pairing-grid">
            {pairings.map((rec, idx) => (
              <article key={rec.item.id} className="sera-pairing-card">
                <div className="sera-pairing-media">
                  <img
                    src={getFallbackDishImage(rec.item, idx + 1)}
                    style={{ objectPosition: getFallbackImagePosition(rec.item, idx + 1) }}
                    alt={rec.item.name}
                  />
                  <span className="sera-pairing-role-badge">{rec.pairingRole}</span>
                  <span className="sera-pairing-pop-badge">{rec.popularityNote}</span>
                </div>

                <div className="sera-pairing-body">
                  <div className="sera-pairing-title-row">
                    <div>
                      <small>{rec.item.menuCategoryName}</small>
                      <h3>{rec.item.name}</h3>
                    </div>
                    <strong>{currency(rec.item.price, currencyCode)}</strong>
                  </div>

                  <p className="sera-pairing-reason">
                    <Sparkles /> <span>{rec.pairingReason}</span>
                  </p>

                  <div className="sera-pairing-actions">
                    <Button
                      size="sm"
                      variant={addedPairingId === rec.item.id ? 'secondary' : 'default'}
                      disabled={!rec.item.isAvailable}
                      onClick={() => handleAddPairingDish(rec.item)}
                    >
                      {addedPairingId === rec.item.id ? <Check /> : <Plus />}
                      {addedPairingId === rec.item.id
                        ? 'Đã thêm món kèm'
                        : 'Gọi kèm món này'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/menu/${encodeURIComponent(rec.item.id)}`)}
                    >
                      Xem chi tiết <ArrowRight />
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Thanh Gợi ý Combo Trọn Vị 1 chạm */}
          {comboPairings.length >= 2 && item.isAvailable ? (
            <div className="sera-pairing-bundle-bar">
              <div className="sera-pairing-bundle-info">
                <span className="sera-bundle-kicker">
                  <Sparkles /> Gợi ý Bữa ăn Trọn vị (1 Món đang xem + 2 Món ăn kèm)
                </span>
                <h3>
                  {item.name} + {comboPairings.map(p => p.item.name).join(' + ')}
                </h3>
                <p>
                  Thêm cùng lúc cả món chính đã lưu tùy chọn ({activeSize.label},{' '}
                  {activeSpice.label}) và 2 món ăn kèm hợp vị chỉ với 1 chạm.
                </p>
              </div>
              <div className="sera-pairing-bundle-cta">
                <div>
                  <small>Tổng trọn bộ 3 món</small>
                  <strong>{currency(comboTotal, currencyCode)}</strong>
                </div>
                <Button size="lg" onClick={handleAddFullCombo}>
                  {comboAdded ? <Check /> : <ShoppingBag />}
                  {comboAdded ? 'Đã thêm trọn bộ vào giỏ' : 'Thêm trọn bộ vào giỏ'}
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Khối Đánh giá & Nhận xét thực tế cho từng món (Dish Social Proof & Reviews) */}
      <section
        id="dish-reviews-section"
        className="sera-detail-reviews"
        aria-label="Đánh giá và nhận xét từ thực khách"
      >
        <div className="sera-detail-reviews-head">
          <div>
            <p className="sera-kicker">Bằng chứng xã hội · Đánh giá xác thực</p>
            <h2>Nhận xét thực tế về món {item.name}</h2>
          </div>
          <span className="sera-detail-reviews-verified-badge">
            ✓ 100% Đánh giá từ khách đã gọi món tại bàn & đặt mang về
          </span>
        </div>

        <div className="sera-detail-reviews-layout">
          {/* Cột trái: Tổng quan điểm sao + Biểu đồ phân bổ + Form gửi đánh giá */}
          <aside className="sera-detail-reviews-sidebar">
            <div className="sera-rating-overview-box">
              <div className="sera-rating-big-score">
                <strong>{ratingSummary.rating.toFixed(1)}</strong>
                <div>
                  <div className="sera-detail-stars" aria-hidden="true">
                    ★★★★★
                  </div>
                  <span>
                    Dựa trên <strong>{ratingSummary.reviewCount}</strong> đánh giá &{' '}
                    <strong>{ratingSummary.orderCountLabel}</strong>
                  </span>
                </div>
              </div>

              <div className="sera-rating-bars">
                {ratingSummary.breakdown.map(row => (
                  <div key={row.stars} className="sera-rating-bar-row">
                    <span className="sera-rating-bar-label">{row.stars} ★</span>
                    <div className="sera-rating-bar-track">
                      <div
                        className="sera-rating-bar-fill"
                        style={{ width: `${row.percent}%` }}
                      />
                    </div>
                    <span className="sera-rating-bar-pct">{row.percent}%</span>
                  </div>
                ))}
              </div>
            </div>

            <form className="sera-review-form" onSubmit={handleSubmitReview}>
              <div className="sera-review-form-head">
                <MessageSquarePlus className="size-4" />
                <h3>Chia sẻ trải nghiệm của bạn về món này</h3>
              </div>

              <div className="sera-review-form-row">
                <label htmlFor="reviewer-name-input">Tên hiển thị</label>
                <Input
                  id="reviewer-name-input"
                  value={reviewerName}
                  onChange={e => setReviewerName(e.target.value)}
                  placeholder="Nhập tên của bạn (VD: Minh Anh)"
                />
              </div>

              <div className="sera-review-form-split">
                <div className="sera-review-form-row">
                  <label>Mức xếp hạng</label>
                  <div className="sera-star-picker" role="radiogroup" aria-label="Chọn số sao">
                    {[5, 4, 3, 2, 1].map(star => (
                      <button
                        key={star}
                        type="button"
                        className={`sera-star-pick-btn ${reviewRating === star ? 'is-active' : ''}`}
                        onClick={() => setReviewRating(star)}
                      >
                        {star} ★
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sera-review-form-row">
                  <label htmlFor="review-dining-type">Hình thức dùng bữa</label>
                  <select
                    id="review-dining-type"
                    className="sera-review-select"
                    value={reviewDiningType}
                    onChange={e =>
                      setReviewDiningType(
                        e.target.value as 'Thực khách tại quán' | 'Đơn mang về',
                      )
                    }
                  >
                    <option value="Thực khách tại quán">Dùng tại bàn (Thực khách tại quán)</option>
                    <option value="Đơn mang về">Đặt mang về (Đơn mang về)</option>
                  </select>
                </div>
              </div>

              <div className="sera-review-form-row">
                <label htmlFor="review-comment-input">Cảm nhận về hương vị & phục vụ</label>
                <Textarea
                  id="review-comment-input"
                  rows={3}
                  value={reviewComment}
                  onChange={e => setReviewComment(e.target.value)}
                  placeholder={`Món ${item.name} có hợp khẩu vị của bạn không? Hãy chia sẻ cảm nhận...`}
                  required
                />
              </div>

              <Button type="submit" className="w-full">
                <Star className="size-4" /> Gửi đánh giá món ăn
              </Button>

              {reviewSubmittedNotice ? (
                <p className="sera-review-submitted-msg">{reviewSubmittedNotice}</p>
              ) : null}
            </form>
          </aside>

          {/* Cột phải: Danh sách bình luận thực tế của khách hàng */}
          <div className="sera-detail-reviews-list">
            {ratingSummary.reviews.map(rev => {
              const isLiked = likedReviewIds.includes(rev.id)
              return (
                <article key={rev.id} className="sera-dish-review-card">
                  <div className="sera-dish-review-top">
                    <div className="sera-dish-reviewer">
                      <span className="sera-dish-reviewer-avatar">
                        {rev.author.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <strong>{rev.author}</strong>
                        <small>
                          {rev.roleLabel} · {rev.platform}
                        </small>
                      </div>
                    </div>
                    <div className="sera-dish-review-meta">
                      <span className="sera-dish-review-stars" aria-label={`${rev.rating} trên 5 sao`}>
                        {'★'.repeat(rev.rating)}
                        {'☆'.repeat(Math.max(0, 5 - rev.rating))}
                      </span>
                      <time>{rev.dateLabel}</time>
                    </div>
                  </div>

                  {rev.orderedVariant ? (
                    <div className="sera-dish-review-ordered">
                      <span>Tùy chọn đã gọi:</span> <strong>{rev.orderedVariant}</strong>
                    </div>
                  ) : null}

                  <p className="sera-dish-review-comment">{rev.comment}</p>

                  <div className="sera-dish-review-footer">
                    <span className="sera-verified-order-pill">✓ Đã xác thực đơn hàng</span>
                    <button
                      type="button"
                      className={`sera-helpful-btn ${isLiked ? 'is-liked' : ''}`}
                      onClick={() => toggleHelpfulReview(rev.id)}
                    >
                      <ThumbsUp className="size-3.5" /> Hữu ích ({rev.helpfulCount + (isLiked ? 1 : 0)})
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </section>
    </main>
  )
}

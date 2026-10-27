import {
  ArrowRight,
  Award,
  CalendarDays,
  Check,
  ChefHat,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Flame,
  Heart,
  Leaf,
  MapPin,
  Pause,
  Play,
  Quote,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Tag,
  Users,
  UtensilsCrossed,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { CustomerSiteBootstrap, PublicMenuItem } from '../services/customerSite'
import heroImage from '../assets/hero-vietnamese-table.webp'
import menuShowcaseImage from '../assets/menu-showcase-vietnamese.webp'
import reservationDiningImage from '../assets/reservation-dining-room.webp'
import {
  getDishRatingSummary,
  RESTAURANT_TESTIMONIALS,
  SOCIAL_PROOF_PLATFORMS,
} from '../utils/menuCatalog'
import { navigate } from '../utils/navigation'
import { addTakeawayItem } from '../utils/takeawayCart'

const homeFontStyle = { fontFamily: "'Noto Sans Variable', system-ui, sans-serif" }

export type DishBadgeId = 'bestseller' | 'chef' | 'new' | 'spicy' | 'vegetarian'

type DishBadgeMeta = {
  id: DishBadgeId
  label: string
  tone: 'bestseller' | 'chef' | 'new' | 'spicy' | 'vegetarian'
}

const DISH_BADGE_CATALOG: Record<DishBadgeId, DishBadgeMeta> = {
  bestseller: { id: 'bestseller', label: 'Bán chạy', tone: 'bestseller' },
  chef: { id: 'chef', label: 'Đầu bếp khuyên dùng', tone: 'chef' },
  new: { id: 'new', label: 'Món mới', tone: 'new' },
  spicy: { id: 'spicy', label: 'Cay', tone: 'spicy' },
  vegetarian: { id: 'vegetarian', label: 'Món chay', tone: 'vegetarian' },
}

type PromoCampaign = {
  id: string
  code: string
  badge: string
  discountHighlight: string
  title: string
  subtitle: string
  schedule: string
  conditions: string
  perks: string[]
  ctaLabel: string
  ctaPath: string
  secondaryLabel: string
  secondaryPath: string
  image: string
  imagePosition: string
}

const PROMO_CAMPAIGNS: PromoCampaign[] = [
  {
    id: 'early-bird-20',
    code: 'VNT18H',
    badge: 'Khung giờ vàng · Đặt bàn sớm',
    discountHighlight: 'Giảm 20%',
    title: 'Ưu đãi giảm 20% đặt bàn trước 18h',
    subtitle:
      'Dành cho thực khách đặt chỗ trước khung giờ cao điểm buổi tối. Bàn được chuẩn bị sẵn tại khu vực yêu thích cùng món khai vị chào bàn.',
    schedule: '16:30 – 18:00 · Thứ 2 đến Thứ 6',
    conditions: 'Áp dụng cho bàn đặt trước tối thiểu 60 phút từ 2 khách trở lên',
    perks: [
      'Giảm 20% trên tổng thực đơn món chính & lẩu',
      'Ưu tiên chọn bàn cửa sổ hoặc sân vườn thoáng mát',
      'Tặng kèm trà thảo mộc chào đón cho từng thực khách',
    ],
    ctaLabel: 'Đặt bàn nhận ưu đãi',
    ctaPath: '/reservation',
    secondaryLabel: 'Xem thực đơn',
    secondaryPath: '/menu',
    image: reservationDiningImage,
    imagePosition: 'center 42%',
  },
  {
    id: 'family-weekend-set',
    code: 'GIADINH',
    badge: 'Thực đơn sum vầy · Cuối tuần',
    discountHighlight: 'Tiết kiệm 15%',
    title: 'Set Menu gia đình cuối tuần',
    subtitle:
      'Trọn vẹn mâm cơm Việt ấm cúng cho 4–6 thành viên với 5 món tuyển chọn: từ khai vị giòn rụm, gỏi thanh mát đến nồi lẩu nóng hổi và tráng miệng.',
    schedule: 'Cả ngày Thứ 7 & Chủ Nhật · 07:00 – 23:00',
    conditions: 'Thiết kế cân bằng dinh dưỡng cho gia đình có cả người lớn tuổi và trẻ nhỏ',
    perks: [
      'Đầy đủ 5 món: Khai vị, Gỏi, Món chính, Lẩu & Tráng miệng',
      'Tùy chỉnh độ cay và khẩu vị riêng theo yêu cầu gia đình',
      'Miễn phí trang trí bàn nhẹ nhàng cho dịp sinh nhật, kỷ niệm',
    ],
    ctaLabel: 'Đặt bàn gia đình',
    ctaPath: '/reservation',
    secondaryLabel: 'Khám phá món ăn',
    secondaryPath: '/menu',
    image: heroImage,
    imagePosition: 'center center',
  },
  {
    id: 'office-lunch-combo',
    code: 'COMBOTRUA',
    badge: 'Bữa trưa nhanh gọn · Tại quán & Mang về',
    discountHighlight: 'Combo Trưa',
    title: 'Combo trưa văn phòng chuẩn vị',
    subtitle:
      'Giải pháp bữa trưa chỉn chu, đủ chất cho ngày làm việc bận rộn: món mặn đậm đà kèm canh chua nóng, cơm trắng dẻo thơm và trái cây tráng miệng.',
    schedule: '11:00 – 14:00 · Thứ 2 đến Thứ 7',
    conditions: 'Cam kết lên món trong 15 phút tại bàn hoặc đóng gói giữ nhiệt mang về',
    perks: [
      'Đóng gói hộp giấy giữ nhiệt sạch sẽ, tách riêng nước xốt',
      'Đặt trước giờ nhận trên website, ghé lấy ngay không cần chờ',
      'Ưu đãi thêm khi đặt chung theo nhóm văn phòng từ 4 phần',
    ],
    ctaLabel: 'Đặt mang về ngay',
    ctaPath: '/takeaway',
    secondaryLabel: 'Xem thực đơn trưa',
    secondaryPath: '/menu',
    image: menuShowcaseImage,
    imagePosition: 'center 35%',
  },
]

type DiningSpaceItem = {
  id: string
  category: 'family' | 'romance' | 'vip' | 'company'
  categoryLabel: string
  title: string
  capacityLabel: string
  atmosphere: string
  description: string
  highlights: string[]
  image: string
  imagePosition: string
  areaKeyword: string
}

const DINING_SPACES: DiningSpaceItem[] = [
  {
    id: 'space-family',
    category: 'family',
    categoryLabel: 'Tiệc gia đình',
    title: 'Sảnh chính Indochine ấm cúng',
    capacityLabel: '4 – 10 khách / bàn',
    atmosphere: 'Ánh sáng vàng dịu · Bàn gỗ rộng · Gốm mộc truyền thống',
    description:
      'Không gian sảnh tầng 1 với trần gỗ thoáng cao, đèn lồng mây đan thủ công và khoảng cách giữa các bàn rộng rãi, mang lại sự thoải mái cho bữa cơm gia đình nhiều thế hệ.',
    highlights: [
      'Bàn gỗ nguyên tấm rộng rãi cho mâm cơm nhiều món và nồi lẩu',
      'Lối đi thông thoáng, thuận tiện cho người lớn tuổi và trẻ nhỏ',
      'Gần khu vực bếp mở, cảm nhận trọn vẹn hương thơm món mới ra lò',
    ],
    image: reservationDiningImage,
    imagePosition: 'center 60%',
    areaKeyword: 'Tầng 1',
  },
  {
    id: 'space-romance',
    category: 'romance',
    categoryLabel: 'Hẹn hò lãng mạn',
    title: 'Góc sân vườn & Cửa sổ lá xanh',
    capacityLabel: '2 – 4 khách / bàn',
    atmosphere: 'Mảng xanh nhiệt đới · Gió biển tự nhiên · Riêng tư, nhẹ nhàng',
    description:
      'Những bàn đôi nép mình bên khung cửa chớp gỗ và hàng chuối cảnh xanh mát. Ban ngày tràn ngập nắng nhẹ Nha Trang, buổi tối tĩnh lặng dưới ánh đèn vàng ấm.',
    highlights: [
      'Vị trí góc khuất yên tĩnh, lý tưởng cho buổi hẹn hò hoặc trò chuyện sâu',
      'Góc chụp ảnh check-in mang đậm chất Indochine đương đại',
      'Hỗ trợ chuẩn bị bàn hoa hoặc lời chúc riêng khi đặt bàn trước',
    ],
    image: heroImage,
    imagePosition: 'left center',
    areaKeyword: 'Sân Vườn',
  },
  {
    id: 'space-vip',
    category: 'vip',
    categoryLabel: 'Phòng VIP',
    title: 'Không gian VIP tiếp khách & Kỷ niệm',
    capacityLabel: '4 – 12 khách / phòng',
    atmosphere: 'Khép kín yên tĩnh · Phục vụ riêng · Thực đơn thiết kế riêng',
    description:
      'Khu vực bàn VIP tách biệt hoàn toàn với tiếng ồn bên ngoài, đảm bảo sự kín đáo cho các buổi gặp gỡ đối tác quan trọng hoặc tiệc sinh nhật thân mật.',
    highlights: [
      'Không gian riêng tư, điều chỉnh ánh sáng và nhiệt độ theo ý muốn',
      'Nhân viên phục vụ chuyên trách xuyên suốt bữa ăn',
      'Có thể đặt trước món đặc sản theo yêu cầu riêng của chủ tiệc',
    ],
    image: reservationDiningImage,
    imagePosition: 'center 18%',
    areaKeyword: 'VIP',
  },
  {
    id: 'space-company',
    category: 'company',
    categoryLabel: 'Tiệc công ty',
    title: 'Không gian tầng lầu cho nhóm & Liên hoan',
    capacityLabel: '10 – 24 khách / khu vực',
    atmosphere: 'Ghép bàn linh hoạt · Lên món đồng loạt · Hóa đơn rõ ràng',
    description:
      'Tầng 2 và Tầng 3 sở hữu mặt bằng thoáng đãng, dễ dàng bố trí bàn dài cho tiệc liên hoan phòng ban, họp mặt bạn bè hoặc đoàn khách du lịch tại Nha Trang.',
    highlights: [
      'Sắp xếp sơ đồ bàn linh hoạt theo đúng số lượng thành viên đoàn',
      'Nhận đặt món trước để bếp lên món đồng loạt, không phải chờ đợi',
      'Hỗ trợ thanh toán trực tuyến nhanh gọn và áp mã khuyến mãi nhóm',
    ],
    image: menuShowcaseImage,
    imagePosition: 'center 70%',
    areaKeyword: 'Tầng 2',
  },
]

const STORY_PILLARS = [
  {
    title: 'Nguyên liệu bản địa tuyển chọn lúc 05:30 sáng',
    description:
      'Hải sản được nhập trực tiếp từ thuyền về bến Nha Trang mỗi sớm; rau sống, thảo mộc và nấm tươi lấy từ các nhà vườn địa phương trong ngày để giữ trọn độ giòn ngọt.',
    metric: '100% tươi trong ngày',
  },
  {
    title: 'Nước dùng ninh chậm & Xốt làm thủ công',
    description:
      'Mỗi nồi nước lẩu và súp đều được ninh từ xương ống và củ quả tươi suốt 8 giờ. Nước mắm trộn gỏi, đồ chua và hành phi đều do bếp tự tay chuẩn bị mới theo từng ca.',
    metric: '8 giờ ninh tự nhiên',
  },
  {
    title: 'Triết lý ẩm thực Việt nhẹ nhàng, tinh gọn',
    description:
      'Chúng tôi giữ nguyên cốt cách đậm đà của món Việt truyền thống nhưng tiết chế dầu mỡ, trình bày gọn gàng trên gốm mộc ấm nóng để thực khách thưởng thức trọn vẹn bằng cả thị giác lẫn vị giác.',
    metric: 'Chuẩn vị truyền thống',
  },
]

function currency(value: number, code = 'VND') {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: code || 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

function getFallbackDishImage(item: PublicMenuItem, index: number) {
  if (item.imageUrl) return item.imageUrl
  const pool = [heroImage, menuShowcaseImage, reservationDiningImage]
  const nameLower = item.name.toLocaleLowerCase('vi')
  if (nameLower.includes('cá') || nameLower.includes('canh') || nameLower.includes('lẩu')) {
    return menuShowcaseImage
  }
  if (nameLower.includes('gỏi') || nameLower.includes('chả')) {
    return heroImage
  }
  return pool[index % pool.length]
}

function getFallbackImagePosition(item: PublicMenuItem, index: number) {
  if (item.imageUrl) return 'center center'
  const nameLower = item.name.toLocaleLowerCase('vi')
  if (nameLower.includes('cá') || nameLower.includes('kho')) return '22% 78%'
  if (nameLower.includes('lẩu') || nameLower.includes('súp')) return '55% 22%'
  if (nameLower.includes('chả') || nameLower.includes('gỏi')) return '72% 40%'
  if (nameLower.includes('canh') || nameLower.includes('nho')) return '78% 75%'
  const positions = ['center center', '55% 25%', '25% 75%', '75% 65%']
  return positions[index % positions.length]
}

function getDishBadges(item: PublicMenuItem, index: number): DishBadgeMeta[] {
  const nameLower = item.name.toLocaleLowerCase('vi')
  const categoryLower = item.menuCategoryName.toLocaleLowerCase('vi')
  const badges: DishBadgeMeta[] = []

  if (
    nameLower.includes('lẩu bò') ||
    nameLower.includes('cá hồi') ||
    nameLower.includes('gỏi gà') ||
    nameLower.includes('chả giò') ||
    index === 0 ||
    index === 1
  ) {
    badges.push(DISH_BADGE_CATALOG.bestseller)
  }

  if (
    nameLower.includes('cá hồi') ||
    nameLower.includes('súp') ||
    nameLower.includes('canh chua') ||
    nameLower.includes('vi cá') ||
    index === 0 ||
    index === 3
  ) {
    badges.push(DISH_BADGE_CATALOG.chef)
  }

  if (
    nameLower.includes('lẩu') ||
    nameLower.includes('canh chua') ||
    nameLower.includes('gỏi')
  ) {
    badges.push(DISH_BADGE_CATALOG.spicy)
  }

  if (
    nameLower.includes('nho') ||
    nameLower.includes('rau') ||
    nameLower.includes('nấm') ||
     nameLower.includes('chay') ||
    categoryLower.includes('tráng miệng')
  ) {
    badges.push(DISH_BADGE_CATALOG.vegetarian)
  }

  if (
    nameLower.includes('lẩu dê') ||
    nameLower.includes('chả giò') ||
    nameLower.includes('nho') ||
    index === 2
  ) {
    badges.push(DISH_BADGE_CATALOG.new)
  }

  if (badges.length === 0) {
    badges.push(index % 2 === 0 ? DISH_BADGE_CATALOG.bestseller : DISH_BADGE_CATALOG.chef)
  }

  return badges.slice(0, 3)
}

function getCuratedDescription(item: PublicMenuItem) {
  if (item.description && item.description.trim().length > 0) {
    return item.description
  }
  const nameLower = item.name.toLocaleLowerCase('vi')
  if (nameLower.includes('cá hồi')) {
    return 'Phi lê cá hồi tươi áp chảo lửa vừa, giữ trọn vị béo mềm tự nhiên, dùng kèm xốt thảo mộc và rau mùa theo ngày.'
  }
  if (nameLower.includes('chả giò')) {
    return 'Cuốn thủ công giòn rụm với nhân tôm thịt, nấm mèo và miến dong, chấm cùng nước mắm chua ngọt pha tỏi ớt tươi.'
  }
  if (nameLower.includes('gỏi gà')) {
    return 'Thịt gà thả vườn xé phay trộn cùng bắp cải giòn, rau răm, hành tím phi thơm và nước xốt chanh tắc thanh dịu.'
  }
  if (nameLower.includes('lẩu bò')) {
    return 'Nước dùng xương bò ninh chậm 8 giờ dậy hương sả, quế hồi, phục vụ kèm thịt bò tươi thái lát và rổ rau xanh tại bàn.'
  }
  if (nameLower.includes('lẩu dê')) {
    return 'Thịt dê tươi hầm mềm cùng thảo mộc ôn ấm, vị ngọt hậu đậm đà, thích hợp cho bữa tối quây quần bên gia đình.'
  }
  if (nameLower.includes('súp')) {
    return 'Súp nóng nấu sánh mịn từ nước dùng gà và nguyên liệu tươi trong ngày, mở đầu bữa ăn nhẹ nhàng và ấm bụng.'
  }
  if (nameLower.includes('canh chua')) {
    return 'Vị chua thanh tự nhiên từ me chín kết hợp bạc hà, đậu bắp, cà chua và thơm, điểm thêm ngò gai thơm nồng.'
  }
  if (nameLower.includes('vi cá')) {
    return 'Món phụ bổ dưỡng chế biến công phu với nước dùng trong vắt, ngọt thanh, giữ trọn kết cấu mềm mượt đặc trưng.'
  }
  if (nameLower.includes('nho')) {
    return 'Trái cây tươi tuyển chọn trong ngày, ướp lạnh vừa đủ để khép lại bữa ăn bằng vị ngọt mát tự nhiên.'
  }
  return 'Món ăn được bếp chuẩn bị tươi mới trong ngày từ nguyên liệu tuyển chọn tại Nha Trang.'
}

function BadgeIcon({ id }: { id: DishBadgeId }) {
  if (id === 'bestseller') return <Flame aria-hidden="true" />
  if (id === 'chef') return <Award aria-hidden="true" />
  if (id === 'new') return <Sparkles aria-hidden="true" />
  if (id === 'spicy') return <Flame aria-hidden="true" />
  return <Leaf aria-hidden="true" />
}

export default function HomePage({ data }: { data: CustomerSiteBootstrap }) {
  const restaurant = data.restaurant
  const availableItems = useMemo(
    () => data.menuItems.filter(item => item.isAvailable),
    [data.menuItems],
  )
  const featured = useMemo(() => availableItems.slice(0, 5), [availableItems])
  const [activeIndex, setActiveIndex] = useState(0)
  const [promoIndex, setPromoIndex] = useState(0)
  const [promoPaused, setPromoPaused] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [activeBadgeFilter, setActiveBadgeFilter] = useState<'all' | DishBadgeId>('all')
  const [activeSpaceId, setActiveSpaceId] = useState<string>(DINING_SPACES[0].id)
  const [reviewPlatformFilter, setReviewPlatformFilter] = useState<string>('all')
  const [addedItemMessage, setAddedItemMessage] = useState<string>('')

  const active = featured[activeIndex] ?? featured[0]
  const activePromo = PROMO_CAMPAIGNS[promoIndex] ?? PROMO_CAMPAIGNS[0]
  const activeSpace = useMemo(
    () => DINING_SPACES.find(space => space.id === activeSpaceId) ?? DINING_SPACES[0],
    [activeSpaceId],
  )

  useEffect(() => {
    if (featured.length <= 1) return
    const timer = window.setInterval(
      () => setActiveIndex(current => (current + 1) % featured.length),
      5200,
    )
    return () => window.clearInterval(timer)
  }, [featured.length])

  useEffect(() => {
    if (promoPaused || PROMO_CAMPAIGNS.length <= 1) return
    const timer = window.setInterval(
      () => setPromoIndex(current => (current + 1) % PROMO_CAMPAIGNS.length),
      6800,
    )
    return () => window.clearInterval(timer)
  }, [promoPaused])

  const enrichedItems = useMemo(
    () =>
      availableItems.map((item, index) => ({
        item,
        index,
        badges: getDishBadges(item, index),
        description: getCuratedDescription(item),
        image: getFallbackDishImage(item, index),
        imagePosition: getFallbackImagePosition(item, index),
        ratingSummary: getDishRatingSummary(item, index),
      })),
    [availableItems],
  )

  const signatureShowcase = useMemo(() => {
    const prioritized = enrichedItems.filter(entry =>
      entry.badges.some(badge => badge.id === 'bestseller' || badge.id === 'chef'),
    )
    return (prioritized.length ? prioritized : enrichedItems).slice(0, 4)
  }, [enrichedItems])

  const filteredMenuItems = useMemo(() => {
    if (activeBadgeFilter === 'all') return enrichedItems
    return enrichedItems.filter(entry =>
      entry.badges.some(badge => badge.id === activeBadgeFilter),
    )
  }, [activeBadgeFilter, enrichedItems])

  const filteredTestimonials = useMemo(() => {
    if (reviewPlatformFilter === 'all') return RESTAURANT_TESTIMONIALS
    return RESTAURANT_TESTIMONIALS.filter(t => t.platform === reviewPlatformFilter)
  }, [reviewPlatformFilter])

  const areaStats = useMemo(() => {
    const map = new Map<string, { count: number; maxCapacity: number }>()
    data.reservationTables.forEach(table => {
      const existing = map.get(table.areaName) || { count: 0, maxCapacity: 0 }
      map.set(table.areaName, {
        count: existing.count + 1,
        maxCapacity: Math.max(existing.maxCapacity, table.capacity),
      })
    })
    return Array.from(map.entries()).map(([areaName, info]) => ({
      areaName,
      count: info.count,
      maxCapacity: info.maxCapacity,
    }))
  }, [data.reservationTables])

  function handleCopyPromoCode(code: string) {
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(code)
    }
    setCopiedCode(code)
    window.setTimeout(() => {
      setCopiedCode(current => (current === code ? null : current))
    }, 2400)
  }

  function handleQuickTakeaway(item: PublicMenuItem) {
    const cart = addTakeawayItem(item.id, 1)
    const count = cart[item.id] || 1
    setAddedItemMessage(`Đã thêm ${item.name} vào giỏ mang về (${count} phần).`)
    window.setTimeout(() => {
      setAddedItemMessage('')
    }, 3200)
  }

  const activeHeroBadges = active ? getDishBadges(active, activeIndex) : []

  return (
    <main className="sera-home" style={homeFontStyle}>
      {/* HERO SECTION */}
      <section className="sera-home-hero">
        <div className="sera-home-hero-copy">
          <p className="sera-kicker">Ẩm thực Việt tại Nha Trang</p>
          <h1 className="sera-display" style={homeFontStyle}>
            Chào mừng bạn đến với {restaurant?.restaurantName || 'VNT'}, nơi lưu giữ trọn vẹn tinh hoa phong vị Việt.
          </h1>
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
            <div className="sera-home-fact">
              <Clock3 aria-hidden="true" />
              <span>
                {restaurant
                  ? `${restaurant.openingTime} – ${restaurant.closingTime}`
                  : 'Giờ mở cửa đang cập nhật'}
              </span>
            </div>
            <div className="sera-home-fact">
              <MapPin aria-hidden="true" />
              <span>{restaurant?.address || 'Nha Trang'}</span>
            </div>
          </div>

          {featured.length > 1 ? (
            <div className="sera-home-hero-rail" aria-label="Chọn nhanh món tiêu điểm">
              <span className="sera-home-hero-rail-label">Tiêu điểm hôm nay</span>
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
          <img
            className="sera-home-visual-image"
            key={active?.id || 'fallback'}
            src={active ? getFallbackDishImage(active, activeIndex) : heroImage}
            style={{
              objectPosition: active
                ? getFallbackImagePosition(active, activeIndex)
                : 'center center',
            }}
            alt={active?.name || 'Món ăn nổi bật'}
          />
          <div
            className="sera-home-visual-caption"
            key={`caption-${active?.id || 'fallback'}`}
          >
            <div>
              <div className="sera-home-visual-badges">
                <small>{active?.menuCategoryName || 'Món hôm nay'}</small>
                {activeHeroBadges.slice(0, 2).map(badge => (
                  <span key={badge.id} className={`sera-culinary-badge is-${badge.tone}`}>
                    <BadgeIcon id={badge.id} />
                    {badge.label}
                  </span>
                ))}
              </div>
              <strong style={homeFontStyle}>
                {active?.name || 'Thực đơn đang phục vụ'}
              </strong>
            </div>
            <b>{active ? currency(active.price, restaurant?.currency) : ''}</b>
          </div>
        </div>
      </section>

      {/* 1. PROMOTIONS & SEASONAL BANNERS SLIDER */}
      <section className="sera-home-promos" aria-labelledby="home-promos-heading">
        <div className="sera-section-head">
          <div>
            <p className="sera-kicker">Khuyến mãi & Ưu đãi đặc biệt</p>
            <h2 id="home-promos-heading" style={homeFontStyle}>
              Ưu đãi theo khung giờ & Thực đơn nhóm.
            </h2>
          </div>
          <div className="sera-promo-controls" aria-label="Điều khiển trình chiếu ưu đãi">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setPromoPaused(current => !current)}
              aria-label={promoPaused ? 'Tiếp tục tự động chuyển banner' : 'Tạm dừng tự động chuyển banner'}
              title={promoPaused ? 'Tiếp tục trình chiếu' : 'Tạm dừng trình chiếu'}
            >
              {promoPaused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() =>
                setPromoIndex(
                  current => (current - 1 + PROMO_CAMPAIGNS.length) % PROMO_CAMPAIGNS.length,
                )
              }
              aria-label="Ưu đãi trước"
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() =>
                setPromoIndex(current => (current + 1) % PROMO_CAMPAIGNS.length)
              }
              aria-label="Ưu đãi tiếp theo"
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </div>

        <div className="sera-promo-spotlight">
          <div className="sera-promo-spotlight-media">
            <img
              src={activePromo.image}
              alt={activePromo.title}
              style={{ objectPosition: activePromo.imagePosition }}
            />
            <div className="sera-promo-discount-stamp">
              <span>Ưu đãi nổi bật</span>
              <strong>{activePromo.discountHighlight}</strong>
            </div>
          </div>

          <div className="sera-promo-spotlight-body">
            <div className="sera-promo-meta-row">
              <Badge variant="secondary">
                <Tag aria-hidden="true" /> {activePromo.badge}
              </Badge>
              <span className="sera-promo-schedule">
                <Clock3 aria-hidden="true" /> {activePromo.schedule}
              </span>
            </div>

            <h3 style={homeFontStyle}>{activePromo.title}</h3>
            <p className="sera-copy">{activePromo.subtitle}</p>

            <ul className="sera-promo-perks">
              {activePromo.perks.map(perk => (
                <li key={perk}>
                  <Check aria-hidden="true" />
                  <span>{perk}</span>
                </li>
              ))}
            </ul>

            <div className="sera-promo-code-bar">
              <div>
                <small>Mã ưu đãi khi đặt đơn / ghi chú đặt bàn</small>
                <strong>{activePromo.code}</strong>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleCopyPromoCode(activePromo.code)}
              >
                {copiedCode === activePromo.code ? (
                  <>
                    <Check aria-hidden="true" /> Đã sao chép mã
                  </>
                ) : (
                  <>
                    <Copy aria-hidden="true" /> Sao chép mã {activePromo.code}
                  </>
                )}
              </Button>
            </div>

            <div className="sera-promo-actions">
              <Button size="lg" onClick={() => navigate(activePromo.ctaPath)}>
                {activePromo.ctaLabel} <ArrowRight aria-hidden="true" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate(activePromo.secondaryPath)}
              >
                {activePromo.secondaryLabel}
              </Button>
            </div>
            <p className="sera-promo-footnote">{activePromo.conditions}</p>
          </div>
        </div>

        <div className="sera-promo-rail" role="tablist" aria-label="Danh sách chương trình ưu đãi">
          {PROMO_CAMPAIGNS.map((campaign, index) => {
            const isSelected = index === promoIndex
            return (
              <button
                key={campaign.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`sera-promo-card ${isSelected ? 'active' : ''}`}
                onClick={() => {
                  setPromoIndex(index)
                  setPromoPaused(true)
                }}
              >
                <div className="sera-promo-card-top">
                  <span className="sera-promo-card-tag">{campaign.discountHighlight}</span>
                  <small>{campaign.code}</small>
                </div>
                <strong style={homeFontStyle}>{campaign.title}</strong>
                <p>{campaign.schedule}</p>
              </button>
            )
          })}
        </div>
      </section>

      {/* 2. CHEF'S SIGNATURE & BEST SELLERS SHOWCASE */}
      <section className="sera-home-signatures" aria-labelledby="home-signatures-heading">
        <div className="sera-section-head">
          <div>
            <p className="sera-kicker">Món ăn đặc trưng & Bán chạy nhất</p>
            <h2 id="home-signatures-heading" style={homeFontStyle}>
              Món ngon đỉnh chóp được thực khách gọi nhiều nhất.
            </h2>
          </div>
          <button
            className="sera-link"
            type="button"
            onClick={() => navigate('/menu')}
          >
            Khám phá toàn bộ thực đơn <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>

        {addedItemMessage ? (
          <div className="sera-home-cart-notice" role="status" aria-live="polite">
            <span>{addedItemMessage}</span>
            <button
              type="button"
              className="sera-link"
              onClick={() => navigate('/takeaway')}
            >
              Mở giỏ mang về <ArrowRight size={13} aria-hidden="true" />
            </button>
          </div>
        ) : null}

        {signatureShowcase.length ? (
          <div className="sera-signature-grid">
            {signatureShowcase.map(({ item, badges, description, image, imagePosition, ratingSummary }, idx) => (
              <article
                key={item.id}
                className={`sera-signature-card ${idx === 0 ? 'is-spotlight' : ''}`}
              >
                <button
                  type="button"
                  className="sera-signature-media"
                  onClick={() => navigate(`/menu/${encodeURIComponent(item.id)}`)}
                  aria-label={`Xem chi tiết món ${item.name}`}
                >
                  <img
                    src={image}
                    alt={item.name}
                    style={{ objectPosition: imagePosition }}
                  />
                  <span className="sera-signature-rank">
                    {idx === 0 ? 'Signature №1' : `Top ${idx + 1}`}
                  </span>
                </button>

                <div className="sera-signature-body">
                  <div className="sera-badge-row">
                    <span className="sera-signature-category">{item.menuCategoryName}</span>
                    {badges.map(badge => (
                      <span
                        key={badge.id}
                        className={`sera-culinary-badge is-${badge.tone}`}
                      >
                        <BadgeIcon id={badge.id} />
                        {badge.label}
                      </span>
                    ))}
                  </div>

                  <div className="sera-signature-title-row">
                    <h3 style={homeFontStyle}>
                      <button
                        type="button"
                        onClick={() => navigate(`/menu/${encodeURIComponent(item.id)}`)}
                      >
                        {item.name}
                      </button>
                    </h3>
                    <strong className="sera-signature-price">
                      {currency(item.price, restaurant?.currency)}
                    </strong>
                  </div>

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

                  <p className="sera-signature-desc">{description}</p>

                  <div className="sera-signature-actions">
                    <Button
                      size="sm"
                      onClick={() => handleQuickTakeaway(item)}
                    >
                      <ShoppingBag aria-hidden="true" /> Thêm mang về
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(`/menu/${encodeURIComponent(item.id)}`)}
                    >
                      Chi tiết món <ArrowRight aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>

      {/* FULL MENU LIST WITH CULINARY BADGES & TAG FILTERS */}
      <section className="sera-home-featured" aria-labelledby="home-featured-heading">
        <div className="sera-section-head">
          <div>
            <p className="sera-kicker">Thực đơn đang phục vụ</p>
            <h2 id="home-featured-heading" style={homeFontStyle}>
              Tất cả món đang mở bán.
            </h2>
          </div>
          <button
            className="sera-link"
            type="button"
            onClick={() => navigate('/menu')}
          >
            Xem thực đơn <ArrowRight size={14} aria-hidden="true" />
          </button>
        </div>

        <div className="sera-home-badge-filters" role="group" aria-label="Lọc nhanh theo nhãn món ăn">
          <button
            type="button"
            className={`sera-badge-filter-btn ${activeBadgeFilter === 'all' ? 'active' : ''}`}
            onClick={() => setActiveBadgeFilter('all')}
            aria-pressed={activeBadgeFilter === 'all'}
          >
            Tất cả ({enrichedItems.length})
          </button>
          {(Object.values(DISH_BADGE_CATALOG) as DishBadgeMeta[]).map(badge => {
            const count = enrichedItems.filter(entry =>
              entry.badges.some(b => b.id === badge.id),
            ).length
            if (count === 0) return null
            return (
              <button
                key={badge.id}
                type="button"
                className={`sera-badge-filter-btn ${activeBadgeFilter === badge.id ? 'active' : ''}`}
                onClick={() => setActiveBadgeFilter(badge.id)}
                aria-pressed={activeBadgeFilter === badge.id}
              >
                <BadgeIcon id={badge.id} />
                <span>{badge.label}</span>
                <small>{count}</small>
              </button>
            )
          })}
        </div>

        {filteredMenuItems.length ? (
          <div className="sera-dish-list">
            {filteredMenuItems.map(({ item, badges, description, image, imagePosition, ratingSummary }) => (
              <button
                key={item.id}
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
                  <img
                    src={image}
                    alt=""
                    style={{ objectPosition: imagePosition }}
                  />
                </span>
                <span>
                  <span className="sera-dish-row-heading">
                    <h3 style={homeFontStyle}>{item.name}</h3>
                    <span className="sera-badge-row">
                      {badges.map(badge => (
                        <span
                          key={badge.id}
                          className={`sera-culinary-badge is-${badge.tone}`}
                        >
                          <BadgeIcon id={badge.id} />
                          {badge.label}
                        </span>
                      ))}
                    </span>
                  </span>
                  <span className="sera-dish-rating-row sera-dish-rating-row--compact">
                    <span className="sera-dish-rating-stars">
                      <Star aria-hidden="true" />
                      <strong>{ratingSummary.rating.toFixed(1)}</strong>/5
                    </span>
                    <span className="sera-dish-rating-sep">·</span>
                    <span>{ratingSummary.reviewCount} đánh giá</span>
                    <span className="sera-dish-rating-sep">·</span>
                    <span className="sera-dish-order-count">{ratingSummary.orderCountLabel}</span>
                  </span>
                  <p>{description}</p>
                </span>
                <span className="sera-dish-row-meta">{item.menuCategoryName}</span>
                <span className="sera-dish-row-price">
                  {currency(item.price, restaurant?.currency)}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="sera-empty">
            <div>
              <h2 style={homeFontStyle}>Thực đơn đang được cập nhật.</h2>
              <p>Nhà hàng chưa có món đang mở bán thuộc nhóm nhãn này.</p>
              {activeBadgeFilter !== 'all' ? (
                <Button variant="outline" onClick={() => setActiveBadgeFilter('all')}>
                  Xem tất cả món đang bán
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </section>

      {/* 3. DINING SPACE & AMBIANCE GALLERY */}
      <section className="sera-home-gallery" aria-labelledby="home-gallery-heading">
        <div className="sera-section-head">
          <div>
            <p className="sera-kicker">Không gian & Trải nghiệm thưởng thức</p>
            <h2 id="home-gallery-heading" style={homeFontStyle}>
              Mỗi cuộc gặp gỡ đều có một góc bàn vừa vặn.
            </h2>
          </div>
          <Button variant="outline" onClick={() => navigate('/reservation')}>
            <CalendarDays aria-hidden="true" /> Chọn bàn trực tuyến
          </Button>
        </div>

        <div className="sera-gallery-tabs" role="tablist" aria-label="Chọn loại không gian nhà hàng">
          {DINING_SPACES.map(space => {
            const selected = space.id === activeSpace.id
            return (
              <button
                key={space.id}
                type="button"
                role="tab"
                aria-selected={selected}
                className={`sera-gallery-tab ${selected ? 'active' : ''}`}
                onClick={() => setActiveSpaceId(space.id)}
              >
                <span className="sera-gallery-tab-kicker">{space.categoryLabel}</span>
                <strong style={homeFontStyle}>{space.title}</strong>
                <small>{space.capacityLabel}</small>
              </button>
            )
          })}
        </div>

        <div className="sera-gallery-showcase">
          <div className="sera-gallery-main-visual">
            <img
              src={activeSpace.image}
              alt={activeSpace.title}
              style={{ objectPosition: activeSpace.imagePosition }}
            />
            <div className="sera-gallery-visual-overlay">
              <span>{activeSpace.categoryLabel}</span>
              <strong>{activeSpace.atmosphere}</strong>
            </div>
          </div>

          <div className="sera-gallery-detail">
            <div className="sera-gallery-detail-head">
              <Badge variant="secondary">
                <Users aria-hidden="true" /> {activeSpace.capacityLabel}
              </Badge>
              <span className="sera-gallery-area-tag">
                <MapPin aria-hidden="true" /> Khu vực gợi ý: {activeSpace.areaKeyword}
              </span>
            </div>

            <h3 style={homeFontStyle}>{activeSpace.title}</h3>
            <p className="sera-copy">{activeSpace.description}</p>

            <ul className="sera-gallery-highlights">
              {activeSpace.highlights.map(point => (
                <li key={point}>
                  <Check aria-hidden="true" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            {areaStats.length > 0 ? (
              <div className="sera-gallery-live-areas">
                <span className="sera-gallery-live-label">
                  Khu vực bàn đang mở đặt chỗ trực tuyến:
                </span>
                <div className="sera-gallery-live-chips">
                  {areaStats.map(area => (
                    <span key={area.areaName} className="sera-gallery-area-chip">
                      <strong>{area.areaName}</strong> · {area.count} bàn
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="sera-gallery-actions">
              <Button size="lg" onClick={() => navigate('/reservation')}>
                Đặt bàn không gian này <ArrowRight aria-hidden="true" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/menu')}>
                Xem thực đơn đặt trước
              </Button>
            </div>
          </div>
        </div>

        <div className="sera-gallery-mosaic" aria-label="Album hình ảnh không gian và bàn tiệc">
          {DINING_SPACES.map(space => (
            <button
              key={`mosaic-${space.id}`}
              type="button"
              className={`sera-gallery-mosaic-item ${space.id === activeSpace.id ? 'active' : ''}`}
              onClick={() => setActiveSpaceId(space.id)}
            >
              <img
                src={space.image}
                alt={space.title}
                style={{ objectPosition: space.imagePosition }}
              />
              <div className="sera-gallery-mosaic-caption">
                <small>{space.categoryLabel}</small>
                <strong>{space.title}</strong>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 4. BRAND STORY, INGREDIENTS & CHEF PHILOSOPHY */}
      <section className="sera-home-story" aria-labelledby="home-story-heading">
        <div className="sera-story-visual-column">
          <div className="sera-story-primary-photo">
            <img
              src={menuShowcaseImage}
              alt="Mâm cơm Việt truyền thống với nguyên liệu tươi sạch mỗi ngày"
            />
          </div>
          <div className="sera-story-chef-card">
            <div className="sera-story-chef-header">
              <span className="sera-story-chef-icon">
                <ChefHat aria-hidden="true" />
              </span>
              <div>
                <small>Bếp trưởng điều hành</small>
                <strong style={homeFontStyle}>Nguyễn Minh Hòa</strong>
                <span>16 năm kinh nghiệm ẩm thực Việt truyền thống</span>
              </div>
            </div>
            <blockquote>
              “Món Việt ngon nhất khi giữ được sự thành thật của nguyên liệu: cá phải tươi từ biển sớm, nước dùng phải ngọt từ xương ninh chậm, và mâm cơm dọn ra phải luôn ấm nóng như ở nhà.”
            </blockquote>
          </div>
        </div>

        <div className="sera-story-copy-column">
          <p className="sera-kicker">Câu chuyện thương hiệu & Triết lý ẩm thực</p>
          <h2 id="home-story-heading" style={homeFontStyle}>
            Giữ trọn hồn vị bếp Việt từ nguồn nguyên liệu tươi bản địa.
          </h2>
          <p className="sera-copy">
            Khởi nguồn tại Nha Trang, {restaurant?.restaurantName || 'VNT Vietnamese Dining'} ra đời từ mong muốn mang những món ăn thân thuộc của gia đình Việt vào một không gian thưởng thức điềm tĩnh, chỉn chu hơn. Chúng tôi không biến tấu cầu kỳ làm mất đi vị gốc, mà tập trung vào độ tươi của hải sản địa phương, sự cân bằng của thảo mộc và quy trình chế biến sạch sẽ mỗi ngày.
          </p>

          <div className="sera-story-pillars">
            {STORY_PILLARS.map(pillar => (
              <article key={pillar.title} className="sera-story-pillar">
                <div className="sera-story-pillar-head">
                  <h3 style={homeFontStyle}>{pillar.title}</h3>
                  <span className="sera-story-pillar-metric">{pillar.metric}</span>
                </div>
                <p>{pillar.description}</p>
              </article>
            ))}
          </div>

          <div className="sera-story-footer-cta">
            <div className="sera-story-promise">
              <UtensilsCrossed aria-hidden="true" />
              <span>
                Phục vụ tại bàn qua mã QR, đặt chỗ trước hoặc đóng gói mang về mỗi ngày từ{' '}
                <strong>
                  {restaurant
                    ? `${restaurant.openingTime} – ${restaurant.closingTime}`
                    : '07:00 – 23:00'}
                </strong>
                .
              </span>
            </div>
            <div className="sera-home-actions">
              <Button size="lg" onClick={() => navigate('/reservation')}>
                <Heart aria-hidden="true" /> Đặt bàn trải nghiệm
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/menu')}>
                Xem thực đơn hôm nay <ArrowRight aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 5. SOCIAL PROOF, GOOGLE MAPS / TRIPADVISOR RATINGS & CUSTOMER TESTIMONIALS */}
      <section className="sera-home-reviews" aria-labelledby="home-reviews-heading">
        <div className="sera-section-head">
          <div>
            <p className="sera-kicker">Bằng chứng xã hội & Đánh giá thực tế</p>
            <h2 id="home-reviews-heading" style={homeFontStyle}>
              Được yêu mến bởi thực khách địa phương & du khách tại Nha Trang.
            </h2>
          </div>
          <Button variant="outline" onClick={() => navigate('/reservation')}>
            <CalendarDays aria-hidden="true" /> Đặt bàn trải nghiệm ngay
          </Button>
        </div>

        {/* Scorecard 3 nền tảng uy tín */}
        <div className="sera-reviews-scorecard" aria-label="Điểm đánh giá trên các nền tảng">
          {SOCIAL_PROOF_PLATFORMS.map(platform => (
            <article key={platform.id} className="sera-scorecard-item">
              <div className="sera-scorecard-top">
                <span className="sera-scorecard-platform">{platform.platformName}</span>
                <span className="sera-scorecard-badge">
                  <ShieldCheck aria-hidden="true" /> {platform.badgeLabel}
                </span>
              </div>
              <div className="sera-scorecard-rating">
                <strong style={homeFontStyle}>{platform.score}</strong>
                <div className="sera-scorecard-stars" aria-hidden="true">
                  <Star />
                  <Star />
                  <Star />
                  <Star />
                  <Star />
                </div>
                <small>{platform.reviewCountLabel}</small>
              </div>
              <p>{platform.highlight}</p>
            </article>
          ))}
        </div>

        {/* Bộ lọc nguồn đánh giá */}
        <div className="sera-home-badge-filters" role="group" aria-label="Lọc đánh giá theo nguồn">
          {(
            [
              ['all', 'Tất cả đánh giá nổi bật'],
              ['Google Maps', 'Google Maps (4.9★)'],
              ['Tripadvisor', 'Tripadvisor (4.8★)'],
              ['Thực khách tại quán', 'Đặt bàn & Phòng VIP'],
              ['Đơn mang về', 'Khách đặt mang về'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={`sera-badge-filter-btn ${reviewPlatformFilter === value ? 'active' : ''}`}
              onClick={() => setReviewPlatformFilter(value)}
              aria-pressed={reviewPlatformFilter === value}
            >
              <Star aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Lưới bình luận & hình ảnh trải nghiệm thực tế */}
        <div className="sera-testimonials-grid">
          {filteredTestimonials.map(testi => (
            <article key={testi.id} className="sera-testimonial-card">
              <div className="sera-testimonial-media">
                <img
                  src={testi.photo}
                  alt={testi.photoCaption}
                  style={{ objectPosition: testi.photoPosition }}
                />
                <span className="sera-testimonial-platform-pill">
                  <ShieldCheck aria-hidden="true" /> {testi.verifiedLabel}
                </span>
                <div className="sera-testimonial-photo-caption">
                  <span>{testi.photoCaption}</span>
                </div>
              </div>

              <div className="sera-testimonial-body">
                <div className="sera-testimonial-meta">
                  <div className="sera-testimonial-stars" aria-label={`Đánh giá ${testi.rating} trên 5 sao`}>
                    {Array.from({ length: testi.rating }).map((_, i) => (
                      <Star key={i} aria-hidden="true" />
                    ))}
                    <strong>{testi.rating}.0 / 5</strong>
                  </div>
                  <small>{testi.dateLabel}</small>
                </div>

                <span className="sera-testimonial-context">{testi.visitContext}</span>

                <blockquote className="sera-testimonial-quote">
                  <Quote className="sera-quote-icon" aria-hidden="true" />
                  <p>“{testi.quote}”</p>
                </blockquote>

                <div className="sera-testimonial-dishes">
                  <small>Món thực khách đã gọi:</small>
                  <div className="sera-testimonial-dish-chips">
                    {testi.orderedDishes.map(dishName => {
                      const matched = data.menuItems.find(
                        m => m.name.toLocaleLowerCase('vi') === dishName.toLocaleLowerCase('vi'),
                      )
                      return matched ? (
                        <button
                          key={dishName}
                          type="button"
                          className="sera-testimonial-dish-chip is-clickable"
                          onClick={() => navigate(`/menu/${encodeURIComponent(matched.id)}`)}
                        >
                          <UtensilsCrossed aria-hidden="true" /> {dishName}
                        </button>
                      ) : (
                        <span key={dishName} className="sera-testimonial-dish-chip">
                          <UtensilsCrossed aria-hidden="true" /> {dishName}
                        </span>
                      )
                    })}
                  </div>
                </div>

                <div className="sera-testimonial-author">
                  <div className="sera-testimonial-avatar" aria-hidden="true">
                    {testi.author.charAt(0)}
                  </div>
                  <div>
                    <strong>{testi.author}</strong>
                    <small>{testi.authorRole}</small>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

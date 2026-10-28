import heroImage from '../assets/hero-vietnamese-table.webp'
import menuShowcaseImage from '../assets/menu-showcase-vietnamese.webp'
import reservationDiningImage from '../assets/reservation-dining-room.webp'
import spaceFamilyImage from '../assets/space-family.webp'
import spaceRomanceImage from '../assets/space-romance.webp'
import spaceVipImage from '../assets/space-vip.webp'
import promoLunchComboImage from '../assets/promo-lunch-combo.webp'
import dishSalmon from '../assets/dish-salmon.webp'
import dishRolls from '../assets/dish-rolls.webp'
import dishSalad from '../assets/dish-salad.webp'
import dishHotpot from '../assets/dish-hotpot.webp'
import dishSoup from '../assets/dish-soup.webp'
import dishDessert from '../assets/dish-dessert.webp'
import dishMeat from '../assets/dish-meat.webp'
import dishPho from '../assets/dish-pho.webp'
import type { PublicMenuItem } from '../services/customerSite'

export type DishBadgeId = 'bestseller' | 'chef' | 'new' | 'spicy' | 'vegetarian'

export type DishBadgeMeta = {
  id: DishBadgeId
  label: string
  tone: 'bestseller' | 'chef' | 'new' | 'spicy' | 'vegetarian'
}

export const DISH_BADGE_CATALOG: Record<DishBadgeId, DishBadgeMeta> = {
  bestseller: { id: 'bestseller', label: 'Bán chạy', tone: 'bestseller' },
  chef: { id: 'chef', label: 'Đầu bếp khuyên dùng', tone: 'chef' },
  new: { id: 'new', label: 'Món mới', tone: 'new' },
  spicy: { id: 'spicy', label: 'Cay', tone: 'spicy' },
  vegetarian: { id: 'vegetarian', label: 'Món chay', tone: 'vegetarian' },
}

export type AllergenId = 'seafood' | 'peanut' | 'gluten' | 'soy' | 'dairy'

export type DishAllergen = {
  id: AllergenId
  label: string
  shortLabel: string
  detail: string
  severity: 'high' | 'moderate'
}

export const ALLERGEN_CATALOG: Record<AllergenId, DishAllergen> = {
  seafood: {
    id: 'seafood',
    label: 'Hải sản & Cá biển',
    shortLabel: 'Hải sản',
    detail: 'Chứa cá biển, tôm, giáp xác hoặc nước cốt hầm từ hải sản.',
    severity: 'high',
  },
  peanut: {
    id: 'peanut',
    label: 'Đậu phộng & Hạt',
    shortLabel: 'Đậu phộng',
    detail: 'Có đậu phộng rang giã dập, hạt điều hoặc dầu mè trong nước trộn.',
    severity: 'high',
  },
  gluten: {
    id: 'gluten',
    label: 'Gluten & Lúa mì',
    shortLabel: 'Gluten',
    detail: 'Có trong vỏ bánh cuốn, mì trứng ăn kèm hoặc nước tương lên men.',
    severity: 'moderate',
  },
  soy: {
    id: 'soy',
    label: 'Đậu nành & Mè',
    shortLabel: 'Đậu nành',
    detail: 'Sử dụng nước tương đậu nành, dầu mè hoặc tàu hũ ky tươi.',
    severity: 'moderate',
  },
  dairy: {
    id: 'dairy',
    label: 'Bơ & Chế phẩm sữa',
    shortLabel: 'Bơ sữa',
    detail: 'Có sử dụng bơ lạt Pháp hoặc kem sữa tươi khi áp chảo và làm xốt.',
    severity: 'moderate',
  },
}

export type DietaryTagId =
  | 'vegetarian'
  | 'high-protein'
  | 'low-carb'
  | 'gluten-free'
  | 'allergen-friendly'

export type DishDietaryTag = {
  id: DietaryTagId
  label: string
  description: string
}

export const DIETARY_TAG_CATALOG: Record<DietaryTagId, DishDietaryTag> = {
  vegetarian: {
    id: 'vegetarian',
    label: 'Thực vật / Món chay',
    description: 'Không sử dụng thịt động vật và nước dùng từ xương.',
  },
  'high-protein': {
    id: 'high-protein',
    label: 'Giàu đạm tự nhiên',
    description: 'Hàm lượng protein cao từ nguyên liệu tươi, giúp no lâu.',
  },
  'low-carb': {
    id: 'low-carb',
    label: 'Ít tinh bột (Low-Carb)',
    description: 'Ưu tiên đạm và rau xanh, hạn chế đường và tinh bột tinh chế.',
  },
  'gluten-free': {
    id: 'gluten-free',
    label: 'Không chứa Gluten',
    description: 'Chế biến hoàn toàn từ nguyên liệu tự nhiên không chứa lúa mì.',
  },
  'allergen-friendly': {
    id: 'allergen-friendly',
    label: 'Lành tính · Ít gây dị ứng',
    description: 'Không chứa các nhóm gây dị ứng phổ biến (hải sản, đậu phộng, gluten).',
  },
}

export type DishSizeOption = {
  id: 'small' | 'medium' | 'large'
  label: string
  servingHint: string
  priceDelta: number
}

export type DishSpiceOption = {
  id: 'none' | 'mild' | 'medium' | 'hot'
  label: string
  description: string
}

export type DishPrepOption = {
  id: string
  label: string
}

export type DishToppingOption = {
  id: string
  label: string
  price: number
  tag?: string
}

export type DishNutritionalProfile = {
  ingredients: string[]
  allergens: DishAllergen[]
  dietaryTags: DishDietaryTag[]
  calories: string
  prepTime: string
  servingSize: string
  originNote: string
}

export type DishModifierSchema = {
  defaultSizeId: DishSizeOption['id']
  sizes: DishSizeOption[]
  defaultSpiceId: DishSpiceOption['id']
  spiceLevels: DishSpiceOption[]
  prepOptions: DishPrepOption[]
  toppings: DishToppingOption[]
}

export type DishPairingRecommendation = {
  item: PublicMenuItem
  pairingRole: string
  pairingReason: string
  popularityNote: string
}

export function getFallbackDishImage(item: PublicMenuItem, index = 0) {
  if (item.imageUrl) return item.imageUrl
  const nameLower = (item.name || '').toLocaleLowerCase('vi')
  if (nameLower.includes('cá hồi') || nameLower.includes('vi cá') || nameLower.includes('tôm') || nameLower.includes('hải sản') || nameLower.includes('cá')) {
    return dishSalmon
  }
  if (nameLower.includes('chả giò') || nameLower.includes('chả') || nameLower.includes('cuốn') || nameLower.includes('nem')) {
    return dishRolls
  }
  if (nameLower.includes('gỏi') || nameLower.includes('salad') || nameLower.includes('gà')) {
    return dishSalad
  }
  if (nameLower.includes('lẩu') || nameLower.includes('dê')) {
    return dishHotpot
  }
  if (nameLower.includes('canh') || nameLower.includes('súp')) {
    return dishSoup
  }
  if (nameLower.includes('nho') || nameLower.includes('tráng miệng') || nameLower.includes('chè') || nameLower.includes('trái cây')) {
    return dishDessert
  }
  if (nameLower.includes('bò') || nameLower.includes('thịt') || nameLower.includes('kho') || nameLower.includes('cơm')) {
    return dishMeat
  }
  if (nameLower.includes('phở') || nameLower.includes('bún') || nameLower.includes('mì')) {
    return dishPho
  }
  const pool = [dishSalmon, dishRolls, dishSalad, dishHotpot, dishSoup, dishMeat, dishPho]
  return pool[index % pool.length]
}

export function getFallbackImagePosition(item: PublicMenuItem, index = 0) {
  if (item.imageUrl) return 'center center'
  const nameLower = item.name.toLocaleLowerCase('vi')
  if (nameLower.includes('cá') || nameLower.includes('kho')) return '22% 78%'
  if (nameLower.includes('lẩu') || nameLower.includes('súp')) return '55% 22%'
  if (nameLower.includes('chả') || nameLower.includes('gỏi')) return '72% 40%'
  if (nameLower.includes('canh') || nameLower.includes('nho')) return '78% 75%'
  const positions = ['center center', '55% 25%', '25% 75%', '75% 65%']
  return positions[index % positions.length]
}

export function getDishBadges(item: PublicMenuItem, index = 0): DishBadgeMeta[] {
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

export function getCuratedDescription(item: PublicMenuItem) {
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
    return 'Súp nóng nấu sánh nhẹ từ nước dùng gà và hải sản tươi, điểm hương ngò rí và tiêu trắng xay mới.'
  }
  if (nameLower.includes('canh chua')) {
    return 'Vị chua thanh tự nhiên từ me chín, dứa tươi, cà chua và dọc mùng giòn, dậy hương rau ngổ và tỏi phi vàng.'
  }
  if (nameLower.includes('vi cá')) {
    return 'Món phụ cao cấp hầm kỹ với nước dùng thượng canh trong vắt, giàu dưỡng chất và hương vị tinh tế.'
  }
  if (nameLower.includes('nho')) {
    return 'Nho tươi tuyển chọn theo mùa, ướp lạnh tự nhiên, vị ngọt thanh mát giúp cân bằng vị giác cuối bữa ăn.'
  }
  return 'Chế biến tươi mới mỗi ngày từ nguyên liệu tuyển chọn tại Nha Trang, giữ trọn hương vị truyền thống Việt Nam.'
}

export function getDishNutritionalProfile(item: PublicMenuItem): DishNutritionalProfile {
  const nameLower = item.name.toLocaleLowerCase('vi')
  const categoryLower = item.menuCategoryName.toLocaleLowerCase('vi')

  if (nameLower.includes('cá hồi')) {
    return {
      ingredients: [
        'Phi lê cá hồi tươi nhập trong ngày (220g)',
        'Bơ lạt Pháp, hương thảo tươi & tỏi nướng',
        'Măng tây xanh, bông cải & cà chua bi áp chảo',
        'Xốt chanh vàng thảo mộc & tiêu đen Phú Quốc',
      ],
      allergens: [ALLERGEN_CATALOG.seafood, ALLERGEN_CATALOG.dairy],
      dietaryTags: [
        DIETARY_TAG_CATALOG['high-protein'],
        DIETARY_TAG_CATALOG['low-carb'],
        DIETARY_TAG_CATALOG['gluten-free'],
      ],
      calories: '490 kcal / phần',
      prepTime: '12 – 15 phút',
      servingSize: '1 – 2 người dùng',
      originNote: 'Cá hồi bảo quản lạnh chuẩn 0–2°C, chế biến ngay khi nhận đơn.',
    }
  }

  if (nameLower.includes('chả giò')) {
    return {
      ingredients: [
        'Tôm đất Nha Trang băm & thịt nạc vai tươi',
        'Nấm mèo rừng, miến dong, cà rốt & củ sắn',
        'Bánh tráng rế truyền thống cuốn thủ công',
        'Xà lách, rau thơm & nước mắm chua ngọt tỏi ớt',
      ],
      allergens: [ALLERGEN_CATALOG.seafood, ALLERGEN_CATALOG.gluten],
      dietaryTags: [DIETARY_TAG_CATALOG['high-protein']],
      calories: '360 kcal / phần',
      prepTime: '10 – 12 phút',
      servingSize: '6 cuốn / đĩa (2 – 3 người)',
      originNote: 'Cuốn mới mỗi ca phục vụ, chiên dầu mới một lần để giữ độ giòn ráo.',
    }
  }

  if (nameLower.includes('gỏi gà')) {
    return {
      ingredients: [
        'Thịt gà ta thả vườn luộc lá chanh xé phay',
        'Bắp cải non, cà rốt bào sợi, hành tây ngâm đá',
        'Rau răm, húng lủi, đậu phộng rang & hành tím phi',
        'Nước mắm chanh tắc pha mật ong thanh dịu',
      ],
      allergens: [ALLERGEN_CATALOG.peanut],
      dietaryTags: [
        DIETARY_TAG_CATALOG['high-protein'],
        DIETARY_TAG_CATALOG['low-carb'],
        DIETARY_TAG_CATALOG['gluten-free'],
      ],
      calories: '320 kcal / phần',
      prepTime: '8 – 10 phút',
      servingSize: '2 – 4 người dùng',
      originNote: 'Gà ta thả vườn thịt săn ngọt, trộn gỏi ngay trước khi lên bàn.',
    }
  }

  if (nameLower.includes('lẩu bò')) {
    return {
      ingredients: [
        'Nước dùng xương ống bò ninh chậm 8 giờ cùng quế, hồi, sả cây',
        'Thịt bắp bò, gầu bò tươi thái lát & bò viên thủ công',
        'Đậu hũ non, tàu hũ ky, nấm kim châm & nấm đùi gà',
        'Rổ rau cải thảo, cải xanh, tần ô & mì trứng / bún tươi',
      ],
      allergens: [ALLERGEN_CATALOG.gluten, ALLERGEN_CATALOG.soy],
      dietaryTags: [DIETARY_TAG_CATALOG['high-protein']],
      calories: '680 kcal / nồi tiêu chuẩn',
      prepTime: '12 – 15 phút',
      servingSize: '2 – 4 người dùng',
      originNote: 'Nước lẩu ninh tự nhiên từ xương và củ quả, không dùng phẩm màu.',
    }
  }

  if (nameLower.includes('lẩu dê')) {
    return {
      ingredients: [
        'Thịt dê tươi thui rơm hầm mềm cùng thuốc bắc & sả gừng',
        'Củ sen, khoai môn sáp, tàu hũ ky chiên giòn',
        'Rau tía tô, cải bẹ xanh, ngải cứu & nấm tươi theo mùa',
        'Chao trắng đánh nhuyễn pha sa tế sả ớt nhà làm',
      ],
      allergens: [ALLERGEN_CATALOG.soy, ALLERGEN_CATALOG.gluten],
      dietaryTags: [DIETARY_TAG_CATALOG['high-protein']],
      calories: '710 kcal / nồi tiêu chuẩn',
      prepTime: '15 – 18 phút',
      servingSize: '2 – 4 người dùng',
      originNote: 'Thịt dê khử mùi kỹ bằng rượu gừng và thảo mộc tự nhiên.',
    }
  }

  if (nameLower.includes('súp')) {
    return {
      ingredients: [
        'Nước cốt gà ta ninh trong vắt cùng bắp mỹ ngọt',
        'Thịt cua biển gỡ tay, tôm tươi hạt lựu & trứng gà ta',
        'Nấm đông cô tươi, hành ngò & dầu mè thơm',
      ],
      allergens: [ALLERGEN_CATALOG.seafood, ALLERGEN_CATALOG.soy],
      dietaryTags: [
        DIETARY_TAG_CATALOG['high-protein'],
        DIETARY_TAG_CATALOG['gluten-free'],
      ],
      calories: '240 kcal / thố',
      prepTime: '8 – 10 phút',
      servingSize: '1 – 2 người dùng',
      originNote: 'Giữ nóng trong thố sứ, phù hợp mở đầu bữa tiệc cho cả người lớn và trẻ nhỏ.',
    }
  }

  if (nameLower.includes('canh chua')) {
    return {
      ingredients: [
        'Khứa cá biển tươi Nha Trang làm sạch trong ngày',
        'Me chín dầm, thơm (dứa), cà chua, đậu bắp & dọc mùng',
        'Giá đỗ, rau ngổ, ngò gai & tỏi vàng phi thơm',
      ],
      allergens: [ALLERGEN_CATALOG.seafood],
      dietaryTags: [
        DIETARY_TAG_CATALOG['low-carb'],
        DIETARY_TAG_CATALOG['gluten-free'],
      ],
      calories: '260 kcal / tô',
      prepTime: '10 – 12 phút',
      servingSize: '2 – 4 người dùng',
      originNote: 'Vị chua thanh tự nhiên từ me chín và dứa tươi, giải nhiệt ngày nắng.',
    }
  }

  if (nameLower.includes('vi cá')) {
    return {
      ingredients: [
        'Sợi vi cá chế biến tinh tuyển cùng thịt cua biển',
        'Nước dùng thượng canh ninh từ gà già và sò điệp khô',
        'Nấm đông cô Nhật, ngò rí & tiêu trắng xay',
      ],
      allergens: [ALLERGEN_CATALOG.seafood, ALLERGEN_CATALOG.soy],
      dietaryTags: [
        DIETARY_TAG_CATALOG['high-protein'],
        DIETARY_TAG_CATALOG['low-carb'],
      ],
      calories: '290 kcal / thố',
      prepTime: '12 – 15 phút',
      servingSize: '1 – 2 người dùng',
      originNote: 'Thượng canh hầm chậm giữ trọn vị ngọt sâu và kết cấu sánh mịn.',
    }
  }

  if (nameLower.includes('nho') || categoryLower.includes('tráng miệng')) {
    return {
      ingredients: [
        'Nho tươi Ninh Thuận / nhập khẩu tuyển chọn từng chùm',
        'Rửa sạch qua nước lọc tinh khiết và ướp lạnh tự nhiên',
        'Phục vụ kèm muối ớt xanh hoặc lá bạc hà tươi',
      ],
      allergens: [],
      dietaryTags: [
        DIETARY_TAG_CATALOG.vegetarian,
        DIETARY_TAG_CATALOG['gluten-free'],
        DIETARY_TAG_CATALOG['allergen-friendly'],
      ],
      calories: '110 kcal / đĩa',
      prepTime: '3 – 5 phút',
      servingSize: '2 – 3 người dùng',
      originNote: '100% trái cây tươi tự nhiên, không ngâm đường hay chất bảo quản.',
    }
  }

  return {
    ingredients: [
      'Nguyên liệu tươi tuyển chọn trong ngày tại Nha Trang',
      'Rau sống, thảo mộc bản địa và gia vị truyền thống',
      'Nước chấm pha thủ công theo công thức riêng của bếp',
    ],
    allergens: [ALLERGEN_CATALOG.soy],
    dietaryTags: [DIETARY_TAG_CATALOG['high-protein']],
    calories: '380 kcal / phần',
    prepTime: '10 – 15 phút',
    servingSize: '2 – 3 người dùng',
    originNote: 'Chế biến tươi mới ngay khi bếp nhận yêu cầu.',
  }
}

export function getDishModifierSchema(item: PublicMenuItem): DishModifierSchema {
  const nameLower = item.name.toLocaleLowerCase('vi')
  const categoryLower = item.menuCategoryName.toLocaleLowerCase('vi')
  const isDessert = nameLower.includes('nho') || categoryLower.includes('tráng miệng')
  const isHotpot = nameLower.includes('lẩu')
  const isSoup = nameLower.includes('súp') || nameLower.includes('canh') || nameLower.includes('vi cá')

  const mediumDelta = Math.max(5000, Math.round((item.price * 0.25) / 1000) * 1000)
  const largeDelta = Math.max(10000, Math.round((item.price * 0.5) / 1000) * 1000)

  const sizes: DishSizeOption[] = [
    {
      id: 'small',
      label: 'Nhỏ (Tiêu chuẩn)',
      servingHint: isHotpot ? 'Phù hợp 1 – 2 người' : 'Khẩu phần 1 – 2 người',
      priceDelta: 0,
    },
    {
      id: 'medium',
      label: 'Vừa',
      servingHint: isHotpot ? 'Nồi vừa 2 – 4 người' : 'Khẩu phần 2 – 3 người (+25%)',
      priceDelta: mediumDelta,
    },
    {
      id: 'large',
      label: 'Lớn (Gia đình)',
      servingHint: isHotpot ? 'Nồi lớn 4 – 6 người' : 'Khẩu phần 4 – 5 người (+50%)',
      priceDelta: largeDelta,
    },
  ]

  const spiceLevels: DishSpiceOption[] = [
    {
      id: 'none',
      label: 'Không cay',
      description: 'Hoàn toàn không ớt, phù hợp trẻ nhỏ và người kiêng cay',
    },
    {
      id: 'mild',
      label: 'Ít cay',
      description: 'The nhẹ đầu lưỡi, dậy hương thơm tự nhiên',
    },
    {
      id: 'medium',
      label: 'Cay vừa (Chuẩn vị)',
      description: 'Độ cay cân bằng theo công thức gốc của bếp trưởng',
    },
    {
      id: 'hot',
      label: 'Cay nồng',
      description: 'Tăng ớt hiểm tươi & sa tế nhà làm đậm vị',
    },
  ]

  const defaultSpiceId: DishSpiceOption['id'] = isDessert || nameLower.includes('súp') || nameLower.includes('vi cá')
    ? 'none'
    : isHotpot || nameLower.includes('canh chua')
      ? 'medium'
      : 'mild'

  const prepOptions: DishPrepOption[] = isDessert
    ? [
        { id: 'less-ice', label: 'Ướp mát nhẹ (Không quá lạnh)' },
        { id: 'sauce-side', label: 'Để riêng muối chấm kèm' },
        { id: 'cut-bite', label: 'Tách sẵn quả lẻ, dễ dùng cho trẻ nhỏ' },
        { id: 'allergy-clean', label: 'Dụng cụ sơ chế riêng (Khách dị ứng)' },
      ]
    : [
        { id: 'no-onion', label: 'Không hành lá / ngò rí' },
        { id: 'less-sweet', label: 'Ít đường / Nêm thanh đạm' },
        { id: 'sauce-side', label: 'Để riêng nước chấm / nước xốt' },
        { id: 'no-peanut', label: 'Không rắc đậu phộng / hành phi' },
        { id: 'allergy-clean', label: 'Dụng cụ chế biến riêng (Khách dị ứng)' },
      ]

  return {
    defaultSizeId: 'small',
    sizes,
    defaultSpiceId,
    spiceLevels,
    prepOptions,
    toppings: [],
  }
}

export function getDishPairings(
  currentItem: PublicMenuItem,
  allItems: PublicMenuItem[],
): DishPairingRecommendation[] {
  const candidates = allItems.filter(item => item.id !== currentItem.id && item.isAvailable)
  const pool = candidates.length > 0 ? candidates : allItems.filter(item => item.id !== currentItem.id)
  const currentName = currentItem.name.toLocaleLowerCase('vi')

  const findByKeyword = (keyword: string) =>
    pool.find(item => item.name.toLocaleLowerCase('vi').includes(keyword))

  const recommendations: DishPairingRecommendation[] = []
  const usedIds = new Set<string>()

  const pushRec = (
    target: PublicMenuItem | undefined,
    pairingRole: string,
    pairingReason: string,
    popularityNote: string,
  ) => {
    if (!target || usedIds.has(target.id)) return
    usedIds.add(target.id)
    recommendations.push({
      item: target,
      pairingRole,
      pairingReason,
      popularityNote,
    })
  }

  if (currentName.includes('lẩu')) {
    pushRec(
      findByKeyword('chả giò') || findByKeyword('gỏi'),
      'Món khai vị nhâm nhi',
      'Dùng món cuốn giòn rụm trong lúc chờ nồi lẩu sôi giúp bàn tiệc thêm rôm rả.',
      '94% bàn gọi lẩu chọn kèm',
    )
    pushRec(
      findByKeyword('gỏi gà') || findByKeyword('súp'),
      'Món trộn thanh vị',
      'Vị chua ngọt giòn mát của gỏi giúp cân bằng vị đậm đà, béo ấm của nước lẩu ninh xương.',
      'Gợi ý từ Bếp trưởng',
    )
    pushRec(
      findByKeyword('nho'),
      'Tráng miệng giải nhiệt',
      'Trái cây ướp lạnh ngọt thanh khép lại bữa lẩu nóng hổi một cách nhẹ nhàng, sảng khoái.',
      'Combo hoàn hảo cuối bữa',
    )
  } else if (currentName.includes('cá hồi')) {
    pushRec(
      findByKeyword('súp') || findByKeyword('vi cá'),
      'Súp nóng mở vị',
      'Một thố súp ấm nóng đầu bữa giúp làm dịu dạ dày trước khi thưởng thức cá hồi áp chảo.',
      '91% thực khách yêu thích',
    )
    pushRec(
      findByKeyword('canh chua') || findByKeyword('gỏi gà'),
      'Canh & Rau cân bằng vị',
      'Vị thanh chua tự nhiên của dứa và me chín làm dịu độ béo ngậy của phi lê cá hồi.',
      'Cặp đôi chuẩn vị Việt',
    )
    pushRec(
      findByKeyword('nho'),
      'Tráng miệng tươi mát',
      'Nho tươi ướp lạnh giúp làm sạch vị giác và bổ sung vitamin tự nhiên sau món chính.',
      'Bán chạy cùng món chính',
    )
  } else if (currentName.includes('nho')) {
    pushRec(
      findByKeyword('lẩu bò') || findByKeyword('cá hồi'),
      'Món chính chủ đạo',
      'Kết hợp cùng một món chính đậm đà để có trọn vẹn thực đơn bữa trưa hoặc bữa tối.',
      'Món chính bán chạy nhất',
    )
    pushRec(
      findByKeyword('gỏi gà') || findByKeyword('chả giò'),
      'Món ăn chơi / Khai vị',
      'Gỏi gà xé phay hoặc chả giò giòn rụm rất hợp cho bữa ăn nhẹ nhiều rau xanh.',
      'Được yêu thích mỗi ngày',
    )
    pushRec(
      findByKeyword('canh chua') || findByKeyword('súp'),
      'Món nước ấm bụng',
      'Thêm một phần súp hoặc canh nóng giúp bữa ăn mang về đầy đặn dưỡng chất hơn.',
      'Gợi ý thêm vào giỏ',
    )
  } else {
    pushRec(
      findByKeyword('canh chua') || findByKeyword('súp'),
      'Món canh / Súp ăn kèm',
      'Bổ sung món nước nóng hổi giúp mâm cơm tròn vị, dễ ăn và cân bằng độ ẩm.',
      '89% đơn mang về gọi kèm',
    )
    pushRec(
      findByKeyword('lẩu bò') || findByKeyword('cá hồi') || findByKeyword('gỏi gà'),
      'Nâng cấp bàn tiệc',
      'Kết hợp thêm một món đặc trưng của bếp để đủ khẩu phần cho 3–4 người cùng thưởng thức.',
      'Best Seller của quán',
    )
    pushRec(
      findByKeyword('nho'),
      'Tráng miệng thanh mát',
      'Đĩa nho tươi ướp lạnh giúp cân bằng vị giác sau các món chiên, trộn hoặc đậm gia vị.',
      'Thêm chỉ với 1 chạm',
    )
  }

  for (const fallback of pool) {
    if (recommendations.length >= 3) break
    pushRec(
      fallback,
      'Thường được gọi cùng',
      'Món ăn bổ trợ hương vị hài hòa, giúp bữa ăn tại nhà hoặc tại bàn thêm phong phú.',
      'Gợi ý kết hợp',
    )
  }

  return recommendations.slice(0, 3)
}

export type ReviewPlatform =
  | 'Google Maps'
  | 'Tripadvisor'
  | 'Thực khách tại quán'
  | 'Đơn mang về'

export type DishReviewItem = {
  id: string
  author: string
  roleLabel: string
  platform: ReviewPlatform
  rating: number
  dateLabel: string
  orderedVariant: string
  comment: string
  helpfulCount: number
}

export type DishRatingSummary = {
  rating: number
  reviewCount: number
  orderCount: number
  orderCountLabel: string
  satisfactionLabel: string
  breakdown: Array<{ stars: number; percent: number }>
  reviews: DishReviewItem[]
}

const USER_DISH_REVIEWS_KEY = 'customerDishReviews:v1'

export function readUserDishReviews(itemId: string): DishReviewItem[] {
  try {
    const raw = localStorage.getItem(USER_DISH_REVIEWS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Record<string, DishReviewItem[]>
    return Array.isArray(parsed?.[itemId]) ? parsed[itemId] : []
  } catch {
    return []
  }
}

export function addUserDishReview(
  itemId: string,
  input: {
    author: string
    rating: number
    diningType: 'Thực khách tại quán' | 'Đơn mang về'
    orderedVariant: string
    comment: string
  },
): DishReviewItem[] {
  const existing = readUserDishReviews(itemId)
  const newReview: DishReviewItem = {
    id: `user-rev-${Date.now()}`,
    author: input.author.trim() || 'Thực khách ẩn danh',
    roleLabel: 'Đánh giá mới từ khách hàng',
    platform: input.diningType,
    rating: Math.min(5, Math.max(1, Math.round(input.rating))),
    dateLabel: 'Vừa xong',
    orderedVariant: input.orderedVariant || 'Cỡ tiêu chuẩn · Chuẩn vị bếp',
    comment: input.comment.trim(),
    helpfulCount: 1,
  }
  const updated = [newReview, ...existing]
  try {
    const raw = localStorage.getItem(USER_DISH_REVIEWS_KEY)
    const all = raw ? (JSON.parse(raw) as Record<string, DishReviewItem[]>) : {}
    all[itemId] = updated
    localStorage.setItem(USER_DISH_REVIEWS_KEY, JSON.stringify(all))
  } catch {
    // ignore storage errors
  }
  return updated
}

export function getDishRatingSummary(
  item: PublicMenuItem,
  index = 0,
): DishRatingSummary {
  const nameLower = item.name.toLocaleLowerCase('vi')
  const userReviews = readUserDishReviews(item.id)

  let baseRating = 4.8
  let baseReviewCount = 96
  let baseOrderCount = 340
  let satisfactionLabel = '97% thực khách hài lòng'
  let curatedReviews: DishReviewItem[] = []

  if (nameLower.includes('cá hồi')) {
    baseRating = 4.9
    baseReviewCount = 164
    baseOrderCount = 620
    satisfactionLabel = '99% khen độ tươi & xốt thảo mộc'
    curatedReviews = [
      {
        id: 'rev-cahoi-1',
        author: 'Trần Hoàng Minh',
        roleLabel: 'Local Guide cấp 6 · 48 đánh giá',
        platform: 'Google Maps',
        rating: 5,
        dateLabel: '3 ngày trước',
        orderedVariant: 'Cỡ Vừa · Ít cay · Thêm cơm trắng ST25',
        comment:
          'Cá hồi áp chảo da giòn rụm mà bên trong vẫn mọng nước, không hề bị khô. Xốt chanh thảo mộc rất hợp khẩu vị gia đình mình, măng tây xanh giòn ngọt.',
        helpfulCount: 19,
      },
      {
        id: 'rev-cahoi-2',
        author: 'Elena Vance',
        roleLabel: 'Traveller từ Melbourne · Đánh giá xác thực',
        platform: 'Tripadvisor',
        rating: 5,
        dateLabel: '1 tuần trước',
        orderedVariant: 'Cỡ Nhỏ (Tiêu chuẩn) · Không cay',
        comment:
          'Tuyệt vời! Mình bị dị ứng gluten nên tích chọn chế biến riêng, bếp làm rất chu đáo. Phần cá hồi tươi ngon chuẩn nhà hàng fine-dining ở Nha Trang.',
        helpfulCount: 14,
      },
      {
        id: 'rev-cahoi-3',
        author: 'Nguyễn Bảo Ngọc',
        roleLabel: 'Khách đặt mang về · Đã mua 4 lần',
        platform: 'Đơn mang về',
        rating: 5,
        dateLabel: '2 tuần trước',
        orderedVariant: 'Cỡ Vừa · Để riêng nước xốt',
        comment:
          'Đặt mang về văn phòng buổi trưa mà hộp giấy giữ nhiệt cực tốt, nước xốt được đóng hũ riêng nên cá vẫn giữ nguyên độ giòn.',
        helpfulCount: 11,
      },
    ]
  } else if (nameLower.includes('lẩu bò')) {
    baseRating = 4.9
    baseReviewCount = 218
    baseOrderCount = 840
    satisfactionLabel = '99% khen nước lẩu ngọt xương tự nhiên'
    curatedReviews = [
      {
        id: 'rev-laubo-1',
        author: 'Lê Quốc Khánh',
        roleLabel: 'Local Guide cấp 7 · Nha Trang',
        platform: 'Google Maps',
        rating: 5,
        dateLabel: '2 ngày trước',
        orderedVariant: 'Cỡ Lớn (Gia đình) · Cay vừa · Thêm thịt tươi & rau nấm',
        comment:
          'Nước lẩu bò ninh xương thơm mùi sả và thảo mộc nhẹ nhàng, vị thanh chứ không bị gắt mì chính. Bắp bò và gầu bò thái lát dày dặn, nhúng tái mềm ngọt.',
        helpfulCount: 27,
      },
      {
        id: 'rev-laubo-2',
        author: 'Phạm Thu Hà',
        roleLabel: 'Đặt bàn gia đình cuối tuần · 6 khách',
        platform: 'Thực khách tại quán',
        rating: 5,
        dateLabel: '5 ngày trước',
        orderedVariant: 'Cỡ Lớn (Gia đình) · Ít cay',
        comment:
          'Nhà mình đi 6 người lớn trẻ nhỏ gọi nồi cỡ Lớn kèm Chả Giò và Gỏi Gà là no căng. Rổ rau rừng và nấm cực kỳ tươi sạch.',
        helpfulCount: 16,
      },
      {
        id: 'rev-laubo-3',
        author: 'David Nguyễn',
        roleLabel: 'Du khách từ TP.HCM · Đánh giá xác thực',
        platform: 'Tripadvisor',
        rating: 5,
        dateLabel: '2 tuần trước',
        orderedVariant: 'Cỡ Vừa · Cay nồng · Thêm mì trứng',
        comment:
          'Buổi tối mưa nhẹ ở Nha Trang ngồi sảnh gỗ ăn nồi lẩu bò nóng hổi thật sự xuất sắc. Sa tế nhà làm cay thơm nồng nàn.',
        helpfulCount: 12,
      },
    ]
  } else if (nameLower.includes('gỏi gà')) {
    baseRating = 4.8
    baseReviewCount = 132
    baseOrderCount = 490
    satisfactionLabel = '98% yêu thích nước trộn chanh tắc'
    curatedReviews = [
      {
        id: 'rev-goiga-1',
        author: 'Võ Thanh Tâm',
        roleLabel: 'Local Guide cấp 5 · 31 đánh giá',
        platform: 'Google Maps',
        rating: 5,
        dateLabel: '4 ngày trước',
        orderedVariant: 'Cỡ Vừa · Ít cay · Thêm bánh phồng tôm',
        comment:
          'Gà ta thả vườn thịt dai ngọt chắc nịch, bắp cải và hành tây ngâm đá giòn tan không chút hăng. Nước mắm trộn gỏi chua ngọt vừa vặn.',
        helpfulCount: 15,
      },
      {
        id: 'rev-goiga-2',
        author: 'Hoàng Mai Anh',
        roleLabel: 'Đặt mang về · Giờ trưa văn phòng',
        platform: 'Đơn mang về',
        rating: 5,
        dateLabel: '1 tuần trước',
        orderedVariant: 'Cỡ Nhỏ · Để riêng nước chấm & không đậu phộng',
        comment:
          'Mình dặn không rắc đậu phộng và để riêng nước mắm trộn, bếp làm đúng y hệt ghi chú. Khi ăn mới trộn nên rau vẫn giòn ngon.',
        helpfulCount: 9,
      },
      {
        id: 'rev-goiga-3',
        author: 'Marcus Lindqvist',
        roleLabel: 'Du khách Thụy Điển · Đánh giá xác thực',
        platform: 'Tripadvisor',
        rating: 5,
        dateLabel: '3 tuần trước',
        orderedVariant: 'Cỡ Nhỏ (Tiêu chuẩn) · Cay vừa',
        comment:
          'Fresh herbs, tender free-range chicken and a bright citrus dressing. The best Vietnamese chicken salad we had on our coast trip!',
        helpfulCount: 8,
      },
    ]
  } else if (nameLower.includes('chả giò')) {
    baseRating = 4.9
    baseReviewCount = 145
    baseOrderCount = 580
    satisfactionLabel = '98% khen vỏ bánh rế giòn lâu'
    curatedReviews = [
      {
        id: 'rev-chagio-1',
        author: 'Đặng Tuấn Kiệt',
        roleLabel: 'Local Guide cấp 6 · Nha Trang',
        platform: 'Google Maps',
        rating: 5,
        dateLabel: '3 ngày trước',
        orderedVariant: 'Cỡ Vừa · Không cay · Thêm rau sống & đồ chua',
        comment:
          'Chả giò cuốn bằng bánh tráng rế chiên vàng ruộm, cắn vào giòn tan mà không bị ngấm dầu. Nhân tôm đất Nha Trang tươi ngọt rõ rệt.',
        helpfulCount: 18,
      },
      {
        id: 'rev-chagio-2',
        author: 'Trịnh Phương Thảo',
        roleLabel: 'Khách đặt bàn trước 18h',
        platform: 'Thực khách tại quán',
        rating: 5,
        dateLabel: '1 tuần trước',
        orderedVariant: 'Cỡ Nhỏ (Tiêu chuẩn) · Ít cay',
        comment:
          'Món khai vị không thể thiếu mỗi lần gia đình ghé VNT. Các bé nhà mình mê tít vì nhân đầy đặn, chấm nước mắm chua ngọt rất bắt miệng.',
        helpfulCount: 10,
      },
    ]
  } else if (nameLower.includes('lẩu dê')) {
    baseRating = 4.8
    baseReviewCount = 118
    baseOrderCount = 410
    satisfactionLabel = '97% khen thịt mềm & chao pha ngon'
    curatedReviews = [
      {
        id: 'rev-laude-1',
        author: 'Ngô Đình Phong',
        roleLabel: 'Local Guide cấp 6 · 54 đánh giá',
        platform: 'Google Maps',
        rating: 5,
        dateLabel: '5 ngày trước',
        orderedVariant: 'Cỡ Lớn (Gia đình) · Cay vừa · Thêm tàu hũ ky',
        comment:
          'Thịt dê thui rơm thơm lừng, hầm vừa tới nên da giòn thịt mềm, hoàn toàn không bị hôi. Chao đánh sa tế sả ớt chấm cực kỳ cuốn.',
        helpfulCount: 14,
      },
      {
        id: 'rev-laude-2',
        author: 'Bùi Thanh Sơn',
        roleLabel: 'Tiệc phòng VIP · 8 khách',
        platform: 'Thực khách tại quán',
        rating: 5,
        dateLabel: '2 tuần trước',
        orderedVariant: 'Cỡ Lớn (Gia đình) · Cay nồng',
        comment:
          'Đặt phòng VIP tiếp đối tác, gọi Lẩu Dê và Cá Hồi ai cũng tấm tắc khen. Nước dùng thuốc bắc thanh ngọt, ăn xong ấm bụng.',
        helpfulCount: 9,
      },
    ]
  } else if (nameLower.includes('súp') || nameLower.includes('vi cá')) {
    baseRating = 4.9
    baseReviewCount = 104
    baseOrderCount = 390
    satisfactionLabel = '98% khen vị ngọt thanh & giữ nhiệt tốt'
    curatedReviews = [
      {
        id: 'rev-sup-1',
        author: 'Phan Tuyết Nhung',
        roleLabel: 'Local Guide cấp 5 · Nha Trang',
        platform: 'Google Maps',
        rating: 5,
        dateLabel: '6 ngày trước',
        orderedVariant: 'Cỡ Nhỏ (Tiêu chuẩn) · Không cay',
        comment:
          'Thố súp bưng ra nóng hổi, thịt cua gỡ tay tươi ngọt từng thớ chứ không bị vụn. Vị nêm thanh tao rất hợp dùng mở màn bữa tối.',
        helpfulCount: 13,
      },
      {
        id: 'rev-sup-2',
        author: 'Hồ Minh Đức',
        roleLabel: 'Khách mua mang về cho người lớn tuổi',
        platform: 'Đơn mang về',
        rating: 5,
        dateLabel: '1 tuần trước',
        orderedVariant: 'Cỡ Vừa · Không hành lá · Ít đường',
        comment:
          'Mua về cho bố mẹ dùng bữa tối, hộp giữ nhiệt kín đáo, về tới nhà vẫn còn nóng nghi ngút khói. Rất đáng tiền!',
        helpfulCount: 8,
      },
    ]
  } else if (nameLower.includes('canh chua')) {
    baseRating = 4.8
    baseReviewCount = 124
    baseOrderCount = 460
    satisfactionLabel = '98% khen vị chua thanh chuẩn cơm nhà'
    curatedReviews = [
      {
        id: 'rev-canhchua-1',
        author: 'Lý Mỹ Linh',
        roleLabel: 'Local Guide cấp 5 · 29 đánh giá',
        platform: 'Google Maps',
        rating: 5,
        dateLabel: '4 ngày trước',
        orderedVariant: 'Cỡ Vừa · Cay vừa · Thêm cơm trắng ST25',
        comment:
          'Vị chua dịu của me chín với dứa tươi chứ không bị chua gắt, cá biển tươi rói, dọc mùng giòn sần sật. Ăn với cơm trắng ST25 đúng chuẩn vị mẹ nấu.',
        helpfulCount: 12,
      },
    ]
  } else if (nameLower.includes('nho')) {
    baseRating = 4.9
    baseReviewCount = 88
    baseOrderCount = 350
    satisfactionLabel = '99% khen trái tươi giòn & ngọt mát'
    curatedReviews = [
      {
        id: 'rev-nho-1',
        author: 'Trương Quỳnh Chi',
        roleLabel: 'Thực khách tại quán · Bàn Sân Vườn',
        platform: 'Google Maps',
        rating: 5,
        dateLabel: '3 ngày trước',
        orderedVariant: 'Cỡ Nhỏ · Ướp mát nhẹ · Thêm muối ớt xanh',
        comment:
          'Nho tươi rói, quả căng mọng giòn ngọt, chấm chút muối ớt xanh Nha Trang sau khi ăn lẩu bò thật sự sảng khoái!',
        helpfulCount: 10,
      },
    ]
  } else {
    baseRating = index % 2 === 0 ? 4.9 : 4.8
    baseReviewCount = 92 + index * 14
    baseOrderCount = 320 + index * 45
    curatedReviews = [
      {
        id: `rev-gen-${item.id}`,
        author: 'Nguyễn Minh Quân',
        roleLabel: 'Local Guide · Đánh giá xác thực',
        platform: 'Google Maps',
        rating: 5,
        dateLabel: '1 tuần trước',
        orderedVariant: 'Cỡ tiêu chuẩn · Chuẩn vị bếp',
        comment:
          'Nguyên liệu tươi sạch, nêm nếm vừa miệng và trình bày rất chỉn chu. Nhân viên phục vụ nhiệt tình, chu đáo.',
        helpfulCount: 9,
      },
    ]
  }

  const allReviews = [...userReviews, ...curatedReviews]
  const totalReviewCount = baseReviewCount + userReviews.length
  const computedRating =
    userReviews.length > 0
      ? Number(
          (
            (baseRating * baseReviewCount +
              userReviews.reduce((sum, r) => sum + r.rating, 0)) /
            totalReviewCount
          ).toFixed(1),
        )
      : baseRating

  return {
    rating: computedRating,
    reviewCount: totalReviewCount,
    orderCount: baseOrderCount + userReviews.length,
    orderCountLabel: `${baseOrderCount + userReviews.length}+ lượt gọi`,
    satisfactionLabel,
    breakdown: [
      { stars: 5, percent: computedRating >= 4.9 ? 89 : 84 },
      { stars: 4, percent: computedRating >= 4.9 ? 9 : 13 },
      { stars: 3, percent: 2 },
      { stars: 2, percent: 0 },
      { stars: 1, percent: 0 },
    ],
    reviews: allReviews,
  }
}

export type RestaurantTestimonial = {
  id: string
  author: string
  authorRole: string
  platform: 'Google Maps' | 'Tripadvisor' | 'Thực khách tại quán' | 'Đơn mang về'
  rating: number
  dateLabel: string
  visitContext: string
  quote: string
  orderedDishes: string[]
  photo: string
  photoPosition: string
  photoCaption: string
  verifiedLabel: string
}

export const SOCIAL_PROOF_PLATFORMS = [
  {
    id: 'google-maps',
    platformName: 'Google Maps',
    score: '4.9 / 5.0',
    reviewCountLabel: '1.480+ đánh giá xác thực',
    badgeLabel: 'Top Ẩm thực Việt tại Nha Trang',
    highlight: '99% khen nguyên liệu hải sản tươi & không gian Indochine ấm cúng',
  },
  {
    id: 'tripadvisor',
    platformName: 'Tripadvisor',
    score: '4.8 / 5.0',
    reviewCountLabel: '420+ nhận xét quốc tế & nội địa',
    badgeLabel: "Travellers' Choice Award",
    highlight: 'Được du khách đánh giá cao về minh bạch dị ứng & phục vụ tận tâm',
  },
  {
    id: 'direct-orders',
    platformName: 'Đặt bàn & Mang về',
    score: '98.4%',
    reviewCountLabel: '6.800+ lượt phục vụ hài lòng',
    badgeLabel: 'Cam kết đúng giờ & chuẩn nhiệt độ',
    highlight: 'Tùy chỉnh khẩu vị, độ cay và đóng gói tách nước xốt chỉn chu',
  },
]

export const RESTAURANT_TESTIMONIALS: RestaurantTestimonial[] = [
  {
    id: 'testi-google-1',
    author: 'Trần Hoàng Minh',
    authorRole: 'Local Guide cấp 7 · Nha Trang',
    platform: 'Google Maps',
    rating: 5,
    dateLabel: '3 ngày trước',
    visitContext: 'Tiệc gia đình 6 người · Sảnh chính Indochine',
    quote:
      'Không gian gỗ ấm áp, khoảng cách bàn rộng rãi nên ông bà và các cháu ngồi rất thoải mái. Nồi Lẩu Bò ninh xương ngọt thanh tự nhiên, Cá Hồi áp chảo mềm mọng. Điểm cộng lớn là thực đơn ghi rõ thành phần dị ứng và cho chọn mức cay riêng cho từng món.',
    orderedDishes: ['Lẩu Bò', 'Cá Hồi', 'Chả Giò', 'Nho'],
    photo: spaceFamilyImage,
    photoPosition: 'center center',
    photoCaption: 'Bàn gia đình tại sảnh tầng 1 tối Thứ Bảy',
    verifiedLabel: 'Đánh giá 5★ trên Google Maps',
  },
  {
    id: 'testi-tripadvisor-1',
    author: 'Sarah Jenkins & Minh Lê',
    authorRole: "Du khách từ Sydney · Travellers' Choice Reviewer",
    platform: 'Tripadvisor',
    rating: 5,
    dateLabel: '1 tuần trước',
    visitContext: 'Bàn đôi hẹn hò · Góc sân vườn lá xanh',
    quote:
      'Một trải nghiệm ẩm thực Việt Nam tinh tế và tử tế. Chồng mình bị dị ứng đậu phộng nên rất ấn tượng khi thấy nhãn cảnh báo rõ ràng ngay trên menu và nút yêu cầu dụng cụ chế biến riêng. Gỏi Gà không đậu phộng và Súp nóng đều tuyệt hảo!',
    orderedDishes: ['Gỏi Gà', 'Súp', 'Canh Chua'],
    photo: spaceRomanceImage,
    photoPosition: 'center center',
    photoCaption: 'Mâm món Việt chụp thực tế tại bàn sân vườn',
    verifiedLabel: 'Đánh giá 5★ trên Tripadvisor',
  },
  {
    id: 'testi-vip-1',
    author: 'Nguyễn Quốc Tuấn',
    authorRole: 'Giám đốc Doanh nghiệp · Khách đặt bàn trước 18h',
    platform: 'Thực khách tại quán',
    rating: 5,
    dateLabel: '5 ngày trước',
    visitContext: 'Tiếp đối tác · Phòng VIP riêng tư (Mã ưu đãi VNT18H)',
    quote:
      'Đặt bàn trước 18h qua website vừa được giảm 20% vừa được chuẩn bị sẵn phòng VIP yên tĩnh, sang trọng. Lẩu Dê hầm thảo mộc và Vi Cá Mập lên món đồng loạt, nóng hổi, đối tác của tôi khen ngợi suốt buổi.',
    orderedDishes: ['Lẩu Dê', 'Vi Cá Mập', 'Cá Hồi'],
    photo: spaceVipImage,
    photoPosition: 'center center',
    photoCaption: 'Không gian phòng VIP tiếp khách riêng tư',
    verifiedLabel: 'Khách đặt bàn xác thực (#RES-8942)',
  },
  {
    id: 'testi-takeaway-1',
    author: 'Lê Ngọc Phương Trang',
    authorRole: 'Khách hàng thân thiết · 12 đơn mang về',
    platform: 'Đơn mang về',
    rating: 5,
    dateLabel: 'Hôm qua',
    visitContext: 'Combo trưa văn phòng · Nhận món tại quầy lúc 11:45',
    quote:
      'Mình hay đặt Cá Hồi kèm Canh Chua và Nho tráng miệng cho nhóm văn phòng. Website cho chọn cỡ Vừa, ít đường, thêm cơm trắng ST25 rất tiện. Tới giờ ghé lấy là bếp đã đóng hộp giấy giữ nhiệt, tách riêng nước xốt gọn gàng.',
    orderedDishes: ['Cá Hồi', 'Canh Chua', 'Nho'],
    photo: promoLunchComboImage,
    photoPosition: 'center center',
    photoCaption: 'Khẩu phần món chính & canh nóng chuẩn bị từ bếp',
    verifiedLabel: 'Đơn mang về xác thực (#ORD-4120)',
  },
]


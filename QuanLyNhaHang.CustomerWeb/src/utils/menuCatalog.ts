import heroImage from '../assets/hero-vietnamese-table.webp'
import menuShowcaseImage from '../assets/menu-showcase-vietnamese.webp'
import reservationDiningImage from '../assets/reservation-dining-room.webp'
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

  let toppings: DishToppingOption[] = []

  if (isHotpot) {
    toppings = [
      { id: 'extra-meat', label: 'Thêm đĩa thịt tươi thái lát', price: 35000, tag: 'Gọi nhiều' },
      { id: 'extra-veggies', label: 'Thêm rổ rau xanh & nấm tổng hợp', price: 20000, tag: 'Tươi sạch' },
      { id: 'extra-noodles', label: 'Thêm bún tươi / mì trứng vắt', price: 10000 },
      { id: 'extra-tofu', label: 'Thêm đậu hũ non & tàu hũ ky giòn', price: 15000 },
      { id: 'extra-sauce', label: 'Thêm chén nước chấm đặc biệt của bếp', price: 5000 },
    ]
  } else if (isSoup) {
    toppings = [
      { id: 'extra-rice', label: 'Thêm cơm trắng gạo ST25 dẻo thơm', price: 10000, tag: 'Ăn kèm' },
      { id: 'extra-noodles', label: 'Thêm phần bún tươi trắng', price: 10000 },
      { id: 'extra-herbs', label: 'Thêm rau thơm, ngò gai & ớt tươi cắt lát', price: 5000 },
      { id: 'extra-sauce', label: 'Thêm nước mắm nhĩ Nha Trang nguyên chất', price: 5000 },
    ]
  } else if (isDessert) {
    toppings = [
      { id: 'extra-salt', label: 'Thêm muối ớt xanh Nha Trang chấm kèm', price: 5000, tag: 'Đặc sản' },
      { id: 'extra-yogurt', label: 'Thêm hũ sữa chua Hy Lạp & mật ong rừng', price: 15000 },
      { id: 'extra-icepack', label: 'Đóng kèm túi đá gel giữ lạnh mang về', price: 5000 },
    ]
  } else {
    toppings = [
      { id: 'extra-rice', label: 'Thêm phần cơm trắng gạo ST25 nóng hổi', price: 10000, tag: 'Bán chạy' },
      { id: 'extra-veggies', label: 'Thêm đĩa rau sống, xà lách & đồ chua', price: 15000 },
      { id: 'extra-cracker', label: 'Thêm bánh phồng tôm / bánh tráng giòn', price: 10000 },
      { id: 'extra-sauce', label: 'Thêm chén nước chấm / xốt thảo mộc đặc biệt', price: 8000 },
    ]
  }

  return {
    defaultSizeId: 'small',
    sizes,
    defaultSpiceId,
    spiceLevels,
    prepOptions,
    toppings,
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

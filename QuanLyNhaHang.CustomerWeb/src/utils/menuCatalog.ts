import heroImage from '../assets/hero-vietnamese-table.webp'
import menuShowcaseImage from '../assets/menu-showcase-vietnamese.webp'
import reservationDiningImage from '../assets/reservation-dining-room.webp'
import type { PublicMenuItem } from '../services/customerSite'

export function getFallbackDishImage(item: PublicMenuItem, index = 0): string {
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

export function getFallbackImagePosition(item: PublicMenuItem, index = 0): string {
  if (item.imageUrl) return 'center center'
  const nameLower = item.name.toLocaleLowerCase('vi')
  if (nameLower.includes('cá') || nameLower.includes('kho')) return '22% 78%'
  if (nameLower.includes('lẩu') || nameLower.includes('súp')) return '55% 22%'
  if (nameLower.includes('chả') || nameLower.includes('gỏi')) return '72% 40%'
  if (nameLower.includes('canh') || nameLower.includes('nho')) return '78% 75%'
  const positions = ['center center', '55% 25%', '25% 75%', '75% 65%']
  return positions[index % positions.length]
}

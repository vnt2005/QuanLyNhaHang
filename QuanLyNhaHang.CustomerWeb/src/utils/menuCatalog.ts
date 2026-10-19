import type { PublicMenuCategory, PublicMenuItem } from '../services/customerSite'

const LEGACY_STORAGE_KEYS = [
  'customerDishReviews:v1',
  'customerDeliveryPrefs:v1',
  'customerTakeawayItemPrefs:v1',
]

export function clearUnsupportedMenuStorage() {
  for (const key of LEGACY_STORAGE_KEYS) {
    try {
      localStorage.removeItem(key)
    } catch {
      // ignore storage errors
    }
    try {
      sessionStorage.removeItem(key)
    } catch {
      // ignore storage errors
    }
  }
}

export function getMenuItemDescription(
  item: Pick<PublicMenuItem, 'description'> | null | undefined,
): string | null {
  const value = item?.description?.trim()
  return value ? value : null
}

export function getMenuCategoryDescription(
  category: Pick<PublicMenuCategory, 'description'> | null | undefined,
): string | null {
  const value = category?.description?.trim()
  return value ? value : null
}

export function getMenuItemImageUrl(
  item: Pick<PublicMenuItem, 'imageUrl'> | null | undefined,
): string | null {
  const value = item?.imageUrl?.trim()
  return value ? value : null
}

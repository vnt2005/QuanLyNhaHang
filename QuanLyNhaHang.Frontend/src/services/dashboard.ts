const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7134'

export type DashboardOverview = {
  todayRevenue: number
  todayOrders: number
  todayInvoices: number
  todayPayments: number
  todayDiscountAmount: number
  todayVatAmount: number
  pendingOrders: number
  cookingOrders: number
  servedOrders: number
  completedOrders: number
  cancelledOrders: number
  availableTables: number
  occupiedTables: number
  reservedTables: number
  cleaningTables: number
  pendingKitchenItems: number
  cookingKitchenItems: number
  readyKitchenItems: number
  servedKitchenItems: number
  todayReservations: number
  pendingReservations: number
  confirmedReservations: number
  lowStockIngredients: number
  todayActivityLogs: number
  todayFailedActivityLogs: number
}

export type DashboardRevenuePoint = {
  date: string
  dateText: string
  revenue: number
  orderCount: number
  invoiceCount: number
}

export type DashboardTopSellingItem = {
  menuItemId: string
  menuItemName: string
  quantitySold: number
  totalRevenue: number
}

export type DashboardLowStockIngredient = {
  ingredientId: string
  ingredientCode: string
  ingredientName: string
  unit: string
  currentStock: number
  minimumStock: number
  missingQuantity: number
}

export type DashboardData = {
  overview: DashboardOverview
  revenueChart: DashboardRevenuePoint[]
  topSellingItems: DashboardTopSellingItem[]
  lowStockIngredients: DashboardLowStockIngredient[]
}

export type DashboardParams = {
  fromDate: string
  toDate: string
  top?: number
  signal?: AbortSignal
}

const emptyOverview: DashboardOverview = {
  todayRevenue: 0,
  todayOrders: 0,
  todayInvoices: 0,
  todayPayments: 0,
  todayDiscountAmount: 0,
  todayVatAmount: 0,
  pendingOrders: 0,
  cookingOrders: 0,
  servedOrders: 0,
  completedOrders: 0,
  cancelledOrders: 0,
  availableTables: 0,
  occupiedTables: 0,
  reservedTables: 0,
  cleaningTables: 0,
  pendingKitchenItems: 0,
  cookingKitchenItems: 0,
  readyKitchenItems: 0,
  servedKitchenItems: 0,
  todayReservations: 0,
  pendingReservations: 0,
  confirmedReservations: 0,
  lowStockIngredients: 0,
  todayActivityLogs: 0,
  todayFailedActivityLogs: 0,
}

function numberValue(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? value as Record<string, unknown>
    : {}
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function getErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === 'object') {
    const value = body as {
      message?: string
      title?: string
      errors?: Record<string, string[]>
    }
    if (value.message) return value.message
    if (value.errors) {
      return Object.values(value.errors).flat().find(Boolean)
        ?? 'Dữ liệu không hợp lệ.'
    }
    if (value.title) return value.title
  }
  if (status === 401) {
    return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  }
  if (status === 403) {
    return 'Tài khoản của bạn không có quyền xem Tổng quan.'
  }
  return 'Không thể tải dữ liệu Tổng quan.'
}

function normalizeOverview(value: unknown): DashboardOverview {
  const source = objectValue(value)
  return Object.keys(emptyOverview).reduce((result, key) => {
    const field = key as keyof DashboardOverview
    result[field] = numberValue(source[field])
    return result
  }, { ...emptyOverview })
}

function normalizeDashboard(value: unknown): DashboardData {
  const source = objectValue(value)
  return {
    overview: normalizeOverview(source.overview),
    revenueChart: arrayValue(source.revenueChart).map(item => {
      const point = objectValue(item)
      return {
        date: stringValue(point.date),
        dateText: stringValue(point.dateText),
        revenue: numberValue(point.revenue),
        orderCount: numberValue(point.orderCount),
        invoiceCount: numberValue(point.invoiceCount),
      }
    }),
    topSellingItems: arrayValue(source.topSellingItems).map(item => {
      const product = objectValue(item)
      return {
        menuItemId: stringValue(product.menuItemId),
        menuItemName: stringValue(product.menuItemName),
        quantitySold: numberValue(product.quantitySold),
        totalRevenue: numberValue(product.totalRevenue),
      }
    }),
    lowStockIngredients: arrayValue(source.lowStockIngredients).map(item => {
      const ingredient = objectValue(item)
      return {
        ingredientId: stringValue(ingredient.ingredientId),
        ingredientCode: stringValue(ingredient.ingredientCode),
        ingredientName: stringValue(ingredient.ingredientName),
        unit: stringValue(ingredient.unit),
        currentStock: numberValue(ingredient.currentStock),
        minimumStock: numberValue(ingredient.minimumStock),
        missingQuantity: numberValue(ingredient.missingQuantity),
      }
    }),
  }
}

export async function getDashboard({
  fromDate,
  toDate,
  top = 5,
  signal,
}: DashboardParams): Promise<DashboardData> {
  const params = new URLSearchParams({
    fromDate,
    toDate,
    top: String(top),
  })
  const token = sessionStorage.getItem('accessToken')
  const response = await fetch(`${API_BASE_URL}/api/Dashboard?${params}`, {
    signal,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(getErrorMessage(body, response.status))
  return normalizeDashboard(body)
}

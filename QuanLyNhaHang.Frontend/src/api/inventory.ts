const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7134'

export type InventoryTransactionType = 'Import' | 'Export' | 'Adjustment'
export type InventoryTransactionStatus = 'Completed' | 'Cancelled'

export type IngredientCategory = {
  id: string
  name: string
  description?: string | null
  isActive: boolean
  createdAt: string
  updatedAt?: string | null
}

export type Ingredient = {
  id: string
  ingredientCategoryId: string
  ingredientCategoryName: string
  ingredientCode: string
  name: string
  unit: string
  currentStock: number
  minimumStock: number
  costPrice: number
  stockValue: number
  isLowStock: boolean
  note?: string | null
  isActive: boolean
  createdAt: string
  updatedAt?: string | null
}

export type LowStockIngredient = {
  id: string
  ingredientCode: string
  name: string
  ingredientCategoryName: string
  unit: string
  currentStock: number
  minimumStock: number
  missingQuantity: number
  note?: string | null
}

export type InventoryTransaction = {
  id: string
  transactionCode: string
  ingredientId: string
  ingredientCode: string
  ingredientName: string
  ingredientUnit: string
  transactionType: InventoryTransactionType
  quantity: number
  unitPrice: number
  totalAmount: number
  stockBefore: number
  stockAfter: number
  status: InventoryTransactionStatus
  note?: string | null
  transactionDate: string
  createdAt: string
  cancelledAt?: string | null
}

export type PaginatedIngredients = {
  items: Ingredient[]
  pageNumber: number
  totalPages: number
  totalCount: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export type PaginatedIngredientCategories = {
  items: IngredientCategory[]
  pageNumber: number
  totalPages: number
  totalCount: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export type PaginatedInventoryTransactions = {
  items: InventoryTransaction[]
  pageNumber: number
  totalPages: number
  totalCount: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export type IngredientInput = {
  ingredientCategoryId: string
  ingredientCode: string
  name: string
  unit: string
  currentStock: number
  minimumStock: number
  costPrice: number
  note: string
}

export type UpdateIngredientInput = Omit<
  IngredientInput,
  'ingredientCode' | 'currentStock'
> & {
  isActive: boolean
}

export type IngredientCategoryInput = {
  name: string
  description: string
}

export type UpdateIngredientCategoryInput = IngredientCategoryInput & {
  isActive: boolean
}

type EntityResponse<T> = {
  success: boolean
  message: string
  data: T
}

type ApiMessage = {
  success?: boolean
  message?: string
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
      return Object.values(value.errors).flat().find(Boolean) ?? 'Dữ liệu không hợp lệ.'
    }
    if (value.title) return value.title
  }
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
  if (status === 403) return 'Tài khoản của bạn không có quyền thực hiện thao tác này.'
  return 'Yêu cầu không thành công.'
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = sessionStorage.getItem('accessToken')
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(getErrorMessage(body, response.status))
  return body as T
}

export function getIngredientCategories(isActive = '') {
  const params = new URLSearchParams()
  if (isActive) params.set('isActive', isActive)
  const query = params.size ? `?${params}` : ''
  return request<IngredientCategory[]>(`/api/ingredient-categories${query}`)
}

export function getIngredientCategoriesPaginated(
  keyword = '',
  isActive = '',
  pageNumber = 1,
  pageSize = 10,
) {
  const params = new URLSearchParams({
    pageNumber: String(pageNumber),
    pageSize: String(pageSize),
  })
  if (keyword.trim()) params.set('keyword', keyword.trim())
  if (isActive) params.set('isActive', isActive)
  return request<PaginatedIngredientCategories>(
    `/api/ingredient-categories/paginated?${params}`,
  )
}

export function getIngredientCategory(id: string) {
  return request<IngredientCategory>(`/api/ingredient-categories/${id}`)
}

export function createIngredientCategory(input: IngredientCategoryInput) {
  return request<EntityResponse<IngredientCategory>>('/api/ingredient-categories', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name.trim(),
      description: input.description.trim() || null,
    }),
  })
}

export function updateIngredientCategory(
  id: string,
  input: UpdateIngredientCategoryInput,
) {
  return request<EntityResponse<IngredientCategory>>(
    `/api/ingredient-categories/${id}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        id,
        name: input.name.trim(),
        description: input.description.trim() || null,
        isActive: input.isActive,
      }),
    },
  )
}

export function deactivateIngredientCategory(id: string) {
  return request<ApiMessage>(`/api/ingredient-categories/${id}`, {
    method: 'DELETE',
  })
}

export function getIngredients(
  ingredientCategoryId = '',
  isActive = '',
  isLowStock = '',
) {
  const params = new URLSearchParams()
  if (ingredientCategoryId) {
    params.set('ingredientCategoryId', ingredientCategoryId)
  }
  if (isActive) params.set('isActive', isActive)
  if (isLowStock) params.set('isLowStock', isLowStock)
  const query = params.size ? `?${params}` : ''
  return request<Ingredient[]>(`/api/ingredients${query}`)
}

export function getLowStockIngredients() {
  return request<LowStockIngredient[]>('/api/ingredients/low-stock')
}

export function getIngredientsPaginated(
  keyword = '',
  ingredientCategoryId = '',
  isActive = '',
  isLowStock = '',
  pageNumber = 1,
  pageSize = 10,
) {
  const params = new URLSearchParams({
    pageNumber: String(pageNumber),
    pageSize: String(pageSize),
  })
  if (keyword.trim()) params.set('keyword', keyword.trim())
  if (ingredientCategoryId) {
    params.set('ingredientCategoryId', ingredientCategoryId)
  }
  if (isActive) params.set('isActive', isActive)
  if (isLowStock) params.set('isLowStock', isLowStock)
  return request<PaginatedIngredients>(`/api/ingredients/paginated?${params}`)
}

export function getIngredient(id: string) {
  return request<Ingredient>(`/api/ingredients/${id}`)
}

export function createIngredient(input: IngredientInput) {
  return request<EntityResponse<Ingredient>>('/api/ingredients', {
    method: 'POST',
    body: JSON.stringify({
      ...input,
      ingredientCode: input.ingredientCode.trim().toUpperCase(),
      name: input.name.trim(),
      unit: input.unit.trim(),
      note: input.note.trim() || null,
    }),
  })
}

export function updateIngredient(id: string, input: UpdateIngredientInput) {
  return request<EntityResponse<Ingredient>>(`/api/ingredients/${id}`, {
    method: 'PUT',
    body: JSON.stringify({
      id,
      ...input,
      name: input.name.trim(),
      unit: input.unit.trim(),
      note: input.note.trim() || null,
    }),
  })
}

export function deactivateIngredient(id: string) {
  return request<ApiMessage>(`/api/ingredients/${id}`, { method: 'DELETE' })
}

export function getInventoryTransactions(
  ingredientId = '',
  transactionType = '',
  status = '',
  fromDate = '',
  toDate = '',
) {
  const params = new URLSearchParams()
  if (ingredientId) params.set('ingredientId', ingredientId)
  if (transactionType) params.set('transactionType', transactionType)
  if (status) params.set('status', status)
  if (fromDate) params.set('fromDate', fromDate)
  if (toDate) params.set('toDate', toDate)
  const query = params.size ? `?${params}` : ''
  return request<InventoryTransaction[]>(`/api/inventory-transactions${query}`)
}

export function getInventoryTransactionsPaginated(
  keyword = '',
  ingredientId = '',
  transactionType = '',
  status = '',
  fromDate = '',
  toDate = '',
  pageNumber = 1,
  pageSize = 10,
) {
  const params = new URLSearchParams({
    pageNumber: String(pageNumber),
    pageSize: String(pageSize),
  })
  if (keyword.trim()) params.set('keyword', keyword.trim())
  if (ingredientId) params.set('ingredientId', ingredientId)
  if (transactionType) params.set('transactionType', transactionType)
  if (status) params.set('status', status)
  if (fromDate) params.set('fromDate', fromDate)
  if (toDate) params.set('toDate', toDate)
  return request<PaginatedInventoryTransactions>(
    `/api/inventory-transactions/paginated?${params}`,
  )
}

export function getInventoryTransaction(id: string) {
  return request<InventoryTransaction>(`/api/inventory-transactions/${id}`)
}

export function importInventory(
  ingredientId: string,
  quantity: number,
  unitPrice: number,
  note: string,
) {
  return request<EntityResponse<InventoryTransaction>>(
    '/api/inventory-transactions/import',
    {
      method: 'POST',
      body: JSON.stringify({
        ingredientId,
        quantity,
        unitPrice,
        note: note.trim() || null,
      }),
    },
  )
}

export function exportInventory(
  ingredientId: string,
  quantity: number,
  note: string,
) {
  return request<EntityResponse<InventoryTransaction>>(
    '/api/inventory-transactions/export',
    {
      method: 'POST',
      body: JSON.stringify({
        ingredientId,
        quantity,
        note: note.trim() || null,
      }),
    },
  )
}

export function adjustInventory(
  ingredientId: string,
  newStock: number,
  unitPrice: number,
  note: string,
) {
  return request<EntityResponse<InventoryTransaction>>(
    '/api/inventory-transactions/adjust',
    {
      method: 'POST',
      body: JSON.stringify({
        ingredientId,
        newStock,
        unitPrice,
        note: note.trim() || null,
      }),
    },
  )
}

export function cancelInventoryTransaction(id: string) {
  return request<ApiMessage>(`/api/inventory-transactions/${id}`, {
    method: 'DELETE',
  })
}

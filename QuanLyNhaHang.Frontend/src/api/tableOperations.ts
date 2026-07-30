const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://localhost:7134'

export type TableOperationType = 'Transfer' | 'Merge' | 'Split'
export type TableOperationStatus = 'Completed' | 'Cancelled'

export type TableOperationDetail = {
  id: string
  tableOperationId: string
  fromOrderId?: string | null
  toOrderId?: string | null
  orderItemId?: string | null
  menuItemId?: string | null
  menuItemName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  note?: string | null
  createdAt: string
}

export type TableOperation = {
  id: string
  operationCode: string
  operationType: TableOperationType
  sourceTableId: string
  sourceTableName: string
  targetTableId?: string | null
  targetTableName?: string | null
  sourceOrderId?: string | null
  targetOrderId?: string | null
  status: TableOperationStatus
  note?: string | null
  createdAt: string
  completedAt?: string | null
  updatedAt?: string | null
  details: TableOperationDetail[]
}

export type PaginatedTableOperations = {
  items: TableOperation[]
  pageNumber: number
  totalPages: number
  totalCount: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

type OperationEnvelope = {
  success: boolean
  message?: string
  data: TableOperation
}

type ApiProblem = {
  message?: string
  title?: string
  detail?: string
  errors?: Record<string, string[]>
}

function getErrorMessage(body: unknown): string {
  if (!body || typeof body !== 'object') return 'Yêu cầu không thành công.'
  const value = body as ApiProblem
  if (value.message) return value.message
  if (value.detail) return value.detail
  if (value.errors) {
    const first = Object.values(value.errors).flat().find(Boolean)
    if (first) return first
  }
  return value.title ?? 'Yêu cầu không thành công.'
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
  if (!response.ok) throw new Error(getErrorMessage(body))
  return body as T
}

export async function getTableOperations(
  keyword = '',
  operationType = '',
  status = '',
  pageNumber = 1,
  pageSize = 10,
) {
  const params = new URLSearchParams({
    pageNumber: String(pageNumber),
    pageSize: String(pageSize),
  })
  if (keyword.trim()) params.set('keyword', keyword.trim())
  if (operationType) params.set('operationType', operationType)
  if (status) params.set('status', status)

  const result = await request<Partial<PaginatedTableOperations>>(
    `/api/table-operations/paginated?${params}`,
  )
  const items = Array.isArray(result.items) ? result.items : []

  return {
    items,
    pageNumber: Math.max(1, Number(result.pageNumber) || pageNumber),
    totalPages: Math.max(1, Number(result.totalPages) || 1),
    totalCount: Math.max(0, Number(result.totalCount) || items.length),
    hasPreviousPage: Boolean(result.hasPreviousPage),
    hasNextPage: Boolean(result.hasNextPage),
  } satisfies PaginatedTableOperations
}

export function transferTable(sourceOrderId: string, targetTableId: string, note: string) {
  return request<OperationEnvelope>('/api/table-operations/transfer', {
    method: 'POST',
    body: JSON.stringify({
      sourceOrderId,
      targetTableId,
      note: note.trim() || null,
    }),
  })
}

export function mergeTables(sourceOrderId: string, targetOrderId: string, note: string) {
  return request<OperationEnvelope>('/api/table-operations/merge', {
    method: 'POST',
    body: JSON.stringify({
      sourceOrderId,
      targetOrderId,
      note: note.trim() || null,
    }),
  })
}

export function splitTable(
  sourceOrderId: string,
  targetTableId: string,
  items: { orderItemId: string; quantity: number }[],
  targetOrderNote: string,
  note: string,
) {
  return request<OperationEnvelope>('/api/table-operations/split', {
    method: 'POST',
    body: JSON.stringify({
      sourceOrderId,
      targetTableId,
      targetOrderNote: targetOrderNote.trim() || null,
      note: note.trim() || null,
      items,
    }),
  })
}

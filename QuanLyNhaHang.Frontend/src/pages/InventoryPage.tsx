import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  adjustInventory,
  cancelInventoryTransaction,
  createIngredient,
  createIngredientCategory,
  deactivateIngredient,
  deactivateIngredientCategory,
  exportInventory,
  getIngredient,
  getIngredientCategories,
  getIngredientCategoriesPaginated,
  getIngredients,
  getIngredientsPaginated,
  getInventoryTransaction,
  getInventoryTransactionsPaginated,
  getLowStockIngredients,
  importInventory,
  updateIngredient,
  updateIngredientCategory,
  type Ingredient,
  type IngredientCategory,
  type InventoryTransaction,
  type InventoryTransactionType,
  type LowStockIngredient,
} from '../api/inventory'

const PAGE_SIZE = 10

type InventoryTab = 'ingredients' | 'transactions' | 'categories'
type IngredientFormMode = 'create' | 'edit'
type CategoryFormMode = 'create' | 'edit'

type IngredientForm = {
  ingredientCategoryId: string
  ingredientCode: string
  name: string
  unit: string
  currentStock: string
  minimumStock: string
  costPrice: string
  note: string
  isActive: boolean
}

type CategoryForm = {
  name: string
  description: string
  isActive: boolean
}

type TransactionForm = {
  transactionType: InventoryTransactionType
  ingredientId: string
  quantity: string
  unitPrice: string
  newStock: string
  note: string
}

const quantity = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 3,
  }).format(value)

const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)

function formatDateTime(value?: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function toStartOfDayIso(value: string) {
  return value ? new Date(`${value}T00:00:00`).toISOString() : ''
}

function toEndOfDayIso(value: string) {
  return value ? new Date(`${value}T23:59:59.999`).toISOString() : ''
}

function getErrorMessage(exception: unknown) {
  return exception instanceof Error
    ? exception.message
    : 'Đã xảy ra lỗi không xác định.'
}

function getIngredientForm(categoryId = ''): IngredientForm {
  return {
    ingredientCategoryId: categoryId,
    ingredientCode: '',
    name: '',
    unit: '',
    currentStock: '0',
    minimumStock: '0',
    costPrice: '0',
    note: '',
    isActive: true,
  }
}

function toIngredientForm(item: Ingredient): IngredientForm {
  return {
    ingredientCategoryId: item.ingredientCategoryId,
    ingredientCode: item.ingredientCode,
    name: item.name,
    unit: item.unit,
    currentStock: String(item.currentStock),
    minimumStock: String(item.minimumStock),
    costPrice: String(item.costPrice),
    note: item.note ?? '',
    isActive: item.isActive,
  }
}

function getCategoryForm(): CategoryForm {
  return { name: '', description: '', isActive: true }
}

function toCategoryForm(item: IngredientCategory): CategoryForm {
  return {
    name: item.name,
    description: item.description ?? '',
    isActive: item.isActive,
  }
}

function getTransactionForm(
  ingredientId = '',
  transactionType: InventoryTransactionType = 'Import',
  item?: Ingredient,
): TransactionForm {
  return {
    transactionType,
    ingredientId,
    quantity: '',
    unitPrice: item ? String(item.costPrice) : '',
    newStock: item ? String(item.currentStock) : '',
    note: '',
  }
}

const transactionLabels: Record<InventoryTransactionType, string> = {
  Import: 'Nhập kho',
  Export: 'Xuất kho',
  Adjustment: 'Điều chỉnh',
}

function Pagination({
  page,
  totalPages,
  totalCount,
  onChange,
}: {
  page: number
  totalPages: number
  totalCount: number
  onChange: (page: number) => void
}) {
  return (
    <footer className="inventory-pagination">
      <span>
        Trang {page}/{Math.max(totalPages, 1)} • {totalCount} kết quả
      </span>
      <div>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          ← Trước
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        >
          Sau →
        </button>
      </div>
    </footer>
  )
}

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<InventoryTab>('ingredients')
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([])
  const [allCategories, setAllCategories] = useState<IngredientCategory[]>([])
  const [lowStockItems, setLowStockItems] = useState<LowStockIngredient[]>([])
  const [overviewLoading, setOverviewLoading] = useState(true)

  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [ingredientKeyword, setIngredientKeyword] = useState('')
  const [ingredientCategoryId, setIngredientCategoryId] = useState('')
  const [ingredientActivity, setIngredientActivity] = useState('')
  const [ingredientStock, setIngredientStock] = useState('')
  const [ingredientPage, setIngredientPage] = useState(1)
  const [ingredientTotalPages, setIngredientTotalPages] = useState(1)
  const [ingredientTotalCount, setIngredientTotalCount] = useState(0)
  const [ingredientsLoading, setIngredientsLoading] = useState(true)

  const [transactions, setTransactions] = useState<InventoryTransaction[]>([])
  const [transactionKeyword, setTransactionKeyword] = useState('')
  const [transactionIngredientId, setTransactionIngredientId] = useState('')
  const [transactionType, setTransactionType] = useState('')
  const [transactionStatus, setTransactionStatus] = useState('')
  const [transactionFromDate, setTransactionFromDate] = useState('')
  const [transactionToDate, setTransactionToDate] = useState('')
  const [transactionPage, setTransactionPage] = useState(1)
  const [transactionTotalPages, setTransactionTotalPages] = useState(1)
  const [transactionTotalCount, setTransactionTotalCount] = useState(0)
  const [transactionsLoading, setTransactionsLoading] = useState(true)

  const [categories, setCategories] = useState<IngredientCategory[]>([])
  const [categoryKeyword, setCategoryKeyword] = useState('')
  const [categoryActivity, setCategoryActivity] = useState('')
  const [categoryPage, setCategoryPage] = useState(1)
  const [categoryTotalPages, setCategoryTotalPages] = useState(1)
  const [categoryTotalCount, setCategoryTotalCount] = useState(0)
  const [categoriesLoading, setCategoriesLoading] = useState(true)

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [actionId, setActionId] = useState('')

  const [ingredientFormMode, setIngredientFormMode] =
    useState<IngredientFormMode | null>(null)
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(
    null,
  )
  const [ingredientForm, setIngredientForm] = useState<IngredientForm>(
    getIngredientForm,
  )
  const [ingredientFormError, setIngredientFormError] = useState('')
  const [ingredientDetail, setIngredientDetail] = useState<Ingredient | null>(
    null,
  )

  const [categoryFormMode, setCategoryFormMode] =
    useState<CategoryFormMode | null>(null)
  const [editingCategory, setEditingCategory] =
    useState<IngredientCategory | null>(null)
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(getCategoryForm)
  const [categoryFormError, setCategoryFormError] = useState('')

  const [transactionOpen, setTransactionOpen] = useState(false)
  const [transactionForm, setTransactionForm] = useState<TransactionForm>(
    getTransactionForm,
  )
  const [transactionFormError, setTransactionFormError] = useState('')
  const [transactionDetail, setTransactionDetail] =
    useState<InventoryTransaction | null>(null)

  const activeCategories = useMemo(
    () => allCategories.filter(item => item.isActive),
    [allCategories],
  )

  const activeIngredients = useMemo(
    () => allIngredients.filter(item => item.isActive),
    [allIngredients],
  )

  const totalStockValue = useMemo(
    () => activeIngredients.reduce((sum, item) => sum + item.stockValue, 0),
    [activeIngredients],
  )

  const ingredientCountByCategory = useMemo(() => {
    const result = new Map<string, { active: number; total: number }>()
    allIngredients.forEach(item => {
      const current = result.get(item.ingredientCategoryId) ?? {
        active: 0,
        total: 0,
      }
      current.total += 1
      if (item.isActive) current.active += 1
      result.set(item.ingredientCategoryId, current)
    })
    return result
  }, [allIngredients])

  const selectedTransactionIngredient = useMemo(
    () =>
      allIngredients.find(item => item.id === transactionForm.ingredientId) ??
      null,
    [allIngredients, transactionForm.ingredientId],
  )

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true)
    try {
      const [ingredientResult, categoryResult, lowStockResult] =
        await Promise.all([
          getIngredients(),
          getIngredientCategories(),
          getLowStockIngredients(),
        ])
      setAllIngredients(ingredientResult)
      setAllCategories(categoryResult)
      setLowStockItems(lowStockResult)
    } catch (exception) {
      setError(getErrorMessage(exception))
    } finally {
      setOverviewLoading(false)
    }
  }, [])

  const loadIngredientPage = useCallback(async () => {
    setIngredientsLoading(true)
    try {
      const result = await getIngredientsPaginated(
        ingredientKeyword,
        ingredientCategoryId,
        ingredientActivity,
        ingredientStock,
        ingredientPage,
        PAGE_SIZE,
      )
      setIngredients(result.items)
      setIngredientTotalPages(Math.max(result.totalPages, 1))
      setIngredientTotalCount(result.totalCount)
      if (ingredientPage > Math.max(result.totalPages, 1)) {
        setIngredientPage(Math.max(result.totalPages, 1))
      }
    } catch (exception) {
      setError(getErrorMessage(exception))
    } finally {
      setIngredientsLoading(false)
    }
  }, [
    ingredientActivity,
    ingredientCategoryId,
    ingredientKeyword,
    ingredientPage,
    ingredientStock,
  ])

  const loadTransactionPage = useCallback(async () => {
    setTransactionsLoading(true)
    try {
      const result = await getInventoryTransactionsPaginated(
        transactionKeyword,
        transactionIngredientId,
        transactionType,
        transactionStatus,
        toStartOfDayIso(transactionFromDate),
        toEndOfDayIso(transactionToDate),
        transactionPage,
        PAGE_SIZE,
      )
      setTransactions(result.items)
      setTransactionTotalPages(Math.max(result.totalPages, 1))
      setTransactionTotalCount(result.totalCount)
      if (transactionPage > Math.max(result.totalPages, 1)) {
        setTransactionPage(Math.max(result.totalPages, 1))
      }
    } catch (exception) {
      setError(getErrorMessage(exception))
    } finally {
      setTransactionsLoading(false)
    }
  }, [
    transactionFromDate,
    transactionIngredientId,
    transactionKeyword,
    transactionPage,
    transactionStatus,
    transactionToDate,
    transactionType,
  ])

  const loadCategoryPage = useCallback(async () => {
    setCategoriesLoading(true)
    try {
      const result = await getIngredientCategoriesPaginated(
        categoryKeyword,
        categoryActivity,
        categoryPage,
        PAGE_SIZE,
      )
      setCategories(result.items)
      setCategoryTotalPages(Math.max(result.totalPages, 1))
      setCategoryTotalCount(result.totalCount)
      if (categoryPage > Math.max(result.totalPages, 1)) {
        setCategoryPage(Math.max(result.totalPages, 1))
      }
    } catch (exception) {
      setError(getErrorMessage(exception))
    } finally {
      setCategoriesLoading(false)
    }
  }, [categoryActivity, categoryKeyword, categoryPage])

  useEffect(() => {
    void loadOverview()
  }, [loadOverview])

  useEffect(() => {
    void loadIngredientPage()
  }, [loadIngredientPage])

  useEffect(() => {
    if (activeTab === 'transactions') void loadTransactionPage()
  }, [activeTab, loadTransactionPage])

  useEffect(() => {
    if (activeTab === 'categories') void loadCategoryPage()
  }, [activeTab, loadCategoryPage])

  function clearFeedback() {
    setError('')
    setMessage('')
  }

  async function refreshAfterCatalogChange() {
    await Promise.all([loadOverview(), loadIngredientPage(), loadCategoryPage()])
  }

  async function refreshAfterTransaction() {
    await Promise.all([
      loadOverview(),
      loadIngredientPage(),
      loadTransactionPage(),
    ])
  }

  function openCreateIngredient() {
    clearFeedback()
    setEditingIngredient(null)
    setIngredientForm(
      getIngredientForm(activeCategories[0]?.id ?? allCategories[0]?.id ?? ''),
    )
    setIngredientFormError('')
    setIngredientFormMode('create')
  }

  function openEditIngredient(item: Ingredient) {
    clearFeedback()
    setEditingIngredient(item)
    setIngredientForm(toIngredientForm(item))
    setIngredientFormError('')
    setIngredientFormMode('edit')
    setIngredientDetail(null)
  }

  async function openIngredientDetail(item: Ingredient) {
    clearFeedback()
    setActionId(item.id)
    try {
      setIngredientDetail(await getIngredient(item.id))
    } catch (exception) {
      setError(getErrorMessage(exception))
    } finally {
      setActionId('')
    }
  }

  async function submitIngredient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIngredientFormError('')

    const currentStock = Number(ingredientForm.currentStock)
    const minimumStock = Number(ingredientForm.minimumStock)
    const costPrice = Number(ingredientForm.costPrice)
    if (
      !ingredientForm.ingredientCategoryId ||
      !ingredientForm.name.trim() ||
      !ingredientForm.unit.trim() ||
      (ingredientFormMode === 'create' &&
        !ingredientForm.ingredientCode.trim())
    ) {
      setIngredientFormError('Vui lòng nhập đầy đủ các trường bắt buộc.')
      return
    }
    if (
      !Number.isFinite(minimumStock) ||
      minimumStock < 0 ||
      !Number.isFinite(costPrice) ||
      costPrice < 0 ||
      (ingredientFormMode === 'create' &&
        (!Number.isFinite(currentStock) || currentStock < 0))
    ) {
      setIngredientFormError('Tồn kho, định mức và giá vốn không được âm.')
      return
    }

    setSaving(true)
    try {
      if (ingredientFormMode === 'create') {
        const result = await createIngredient({
          ingredientCategoryId: ingredientForm.ingredientCategoryId,
          ingredientCode: ingredientForm.ingredientCode,
          name: ingredientForm.name,
          unit: ingredientForm.unit,
          currentStock,
          minimumStock,
          costPrice,
          note: ingredientForm.note,
        })
        setMessage(result.message || 'Đã thêm nguyên liệu.')
      } else if (editingIngredient) {
        const result = await updateIngredient(editingIngredient.id, {
          ingredientCategoryId: ingredientForm.ingredientCategoryId,
          name: ingredientForm.name,
          unit: ingredientForm.unit,
          minimumStock,
          costPrice,
          note: ingredientForm.note,
          isActive: ingredientForm.isActive,
        })
        setMessage(result.message || 'Đã cập nhật nguyên liệu.')
      }
      setIngredientFormMode(null)
      await refreshAfterCatalogChange()
    } catch (exception) {
      setIngredientFormError(getErrorMessage(exception))
    } finally {
      setSaving(false)
    }
  }

  async function toggleIngredient(item: Ingredient) {
    const action = item.isActive ? 'vô hiệu hóa' : 'kích hoạt lại'
    if (
      !window.confirm(
        item.isActive
          ? `Vô hiệu hóa ${item.name}? Lịch sử kho vẫn được giữ nguyên.`
          : `Kích hoạt lại ${item.name}?`,
      )
    ) {
      return
    }
    clearFeedback()
    setActionId(item.id)
    try {
      if (item.isActive) {
        const result = await deactivateIngredient(item.id)
        setMessage(result.message || `Đã ${action} nguyên liệu.`)
      } else {
        const result = await updateIngredient(item.id, {
          ingredientCategoryId: item.ingredientCategoryId,
          name: item.name,
          unit: item.unit,
          minimumStock: item.minimumStock,
          costPrice: item.costPrice,
          note: item.note ?? '',
          isActive: true,
        })
        setMessage(result.message || `Đã ${action} nguyên liệu.`)
      }
      setIngredientDetail(null)
      await refreshAfterCatalogChange()
    } catch (exception) {
      setError(getErrorMessage(exception))
    } finally {
      setActionId('')
    }
  }

  function openCreateCategory() {
    clearFeedback()
    setEditingCategory(null)
    setCategoryForm(getCategoryForm())
    setCategoryFormError('')
    setCategoryFormMode('create')
  }

  function openEditCategory(item: IngredientCategory) {
    clearFeedback()
    setEditingCategory(item)
    setCategoryForm(toCategoryForm(item))
    setCategoryFormError('')
    setCategoryFormMode('edit')
  }

  async function submitCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCategoryFormError('')
    if (!categoryForm.name.trim()) {
      setCategoryFormError('Tên danh mục là bắt buộc.')
      return
    }

    setSaving(true)
    try {
      if (categoryFormMode === 'create') {
        const result = await createIngredientCategory(categoryForm)
        setMessage(result.message || 'Đã thêm danh mục.')
      } else if (editingCategory) {
        const result = await updateIngredientCategory(
          editingCategory.id,
          categoryForm,
        )
        setMessage(result.message || 'Đã cập nhật danh mục.')
      }
      setCategoryFormMode(null)
      await refreshAfterCatalogChange()
    } catch (exception) {
      setCategoryFormError(getErrorMessage(exception))
    } finally {
      setSaving(false)
    }
  }

  async function toggleCategory(item: IngredientCategory) {
    const counts = ingredientCountByCategory.get(item.id)
    if (
      !window.confirm(
        item.isActive
          ? `Vô hiệu hóa danh mục ${item.name}? Danh mục còn nguyên liệu đang hoạt động sẽ không thể vô hiệu hóa.`
          : `Kích hoạt lại danh mục ${item.name}?`,
      )
    ) {
      return
    }
    clearFeedback()
    setActionId(item.id)
    try {
      if (item.isActive) {
        const result = await deactivateIngredientCategory(item.id)
        setMessage(
          result.message ||
            `Đã vô hiệu hóa danh mục${counts?.active ? '' : ' trống'}.`,
        )
      } else {
        const result = await updateIngredientCategory(item.id, {
          name: item.name,
          description: item.description ?? '',
          isActive: true,
        })
        setMessage(result.message || 'Đã kích hoạt danh mục.')
      }
      await refreshAfterCatalogChange()
    } catch (exception) {
      setError(getErrorMessage(exception))
    } finally {
      setActionId('')
    }
  }

  function openTransaction(
    item?: Ingredient,
    type: InventoryTransactionType = 'Import',
  ) {
    clearFeedback()
    const defaultItem =
      item ?? activeIngredients.find(candidate => candidate.isActive)
    setTransactionForm(
      getTransactionForm(defaultItem?.id ?? '', type, defaultItem),
    )
    setTransactionFormError('')
    setTransactionOpen(true)
    setIngredientDetail(null)
  }

  function changeTransactionIngredient(ingredientId: string) {
    const item = allIngredients.find(candidate => candidate.id === ingredientId)
    setTransactionForm(current => ({
      ...current,
      ingredientId,
      unitPrice: item ? String(item.costPrice) : '',
      newStock: item ? String(item.currentStock) : '',
    }))
  }

  async function submitTransaction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTransactionFormError('')
    const item = allIngredients.find(
      candidate => candidate.id === transactionForm.ingredientId,
    )
    if (!item) {
      setTransactionFormError('Vui lòng chọn nguyên liệu.')
      return
    }
    if (!item.isActive) {
      setTransactionFormError('Không thể giao dịch với nguyên liệu đã vô hiệu.')
      return
    }

    const value = Number(transactionForm.quantity)
    const unitPrice = Number(transactionForm.unitPrice)
    const newStock = Number(transactionForm.newStock)
    if (
      transactionForm.transactionType !== 'Adjustment' &&
      (!Number.isFinite(value) || value <= 0)
    ) {
      setTransactionFormError('Số lượng nhập hoặc xuất phải lớn hơn 0.')
      return
    }
    if (
      transactionForm.transactionType === 'Export' &&
      value > item.currentStock
    ) {
      setTransactionFormError(
        `Không thể xuất quá ${quantity(item.currentStock)} ${item.unit} đang có.`,
      )
      return
    }
    if (
      transactionForm.transactionType === 'Import' &&
      (!Number.isFinite(unitPrice) || unitPrice < 0)
    ) {
      setTransactionFormError('Đơn giá nhập không được âm.')
      return
    }
    if (
      transactionForm.transactionType === 'Adjustment' &&
      (!Number.isFinite(newStock) || newStock < 0)
    ) {
      setTransactionFormError('Tồn kho mới phải là số không âm.')
      return
    }
    if (
      transactionForm.transactionType === 'Adjustment' &&
      newStock === item.currentStock
    ) {
      setTransactionFormError('Tồn kho mới phải khác tồn kho hiện tại.')
      return
    }
    if (
      transactionForm.transactionType === 'Adjustment' &&
      (!Number.isFinite(unitPrice) || unitPrice < 0)
    ) {
      setTransactionFormError('Đơn giá điều chỉnh không được âm.')
      return
    }

    setSaving(true)
    try {
      let result
      if (transactionForm.transactionType === 'Import') {
        result = await importInventory(
          item.id,
          value,
          unitPrice,
          transactionForm.note,
        )
      } else if (transactionForm.transactionType === 'Export') {
        result = await exportInventory(
          item.id,
          value,
          transactionForm.note,
        )
      } else {
        result = await adjustInventory(
          item.id,
          newStock,
          unitPrice,
          transactionForm.note,
        )
      }
      setMessage(result.message || 'Đã ghi nhận giao dịch kho.')
      setTransactionOpen(false)
      await refreshAfterTransaction()
    } catch (exception) {
      setTransactionFormError(getErrorMessage(exception))
    } finally {
      setSaving(false)
    }
  }

  async function openTransactionDetail(item: InventoryTransaction) {
    clearFeedback()
    setActionId(item.id)
    try {
      setTransactionDetail(await getInventoryTransaction(item.id))
    } catch (exception) {
      setError(getErrorMessage(exception))
    } finally {
      setActionId('')
    }
  }

  async function cancelTransaction(item: InventoryTransaction) {
    const warning =
      item.transactionType === 'Import'
        ? 'Hệ thống sẽ trừ lại lượng đã nhập; thao tác có thể thất bại nếu tồn kho hiện tại không đủ.'
        : item.transactionType === 'Export'
          ? 'Hệ thống sẽ nhập trả lại lượng đã xuất.'
          : 'Hệ thống sẽ khôi phục tồn kho về mức trước điều chỉnh.'
    if (
      !window.confirm(
        `Hủy giao dịch ${item.transactionCode}? ${warning}`,
      )
    ) {
      return
    }
    clearFeedback()
    setActionId(item.id)
    try {
      const result = await cancelInventoryTransaction(item.id)
      setMessage(result.message || 'Đã hủy và hoàn tác giao dịch kho.')
      setTransactionDetail(null)
      await refreshAfterTransaction()
    } catch (exception) {
      setError(getErrorMessage(exception))
    } finally {
      setActionId('')
    }
  }

  const transactionPreview = useMemo(() => {
    if (!selectedTransactionIngredient) return null
    const current = selectedTransactionIngredient.currentStock
    if (transactionForm.transactionType === 'Adjustment') {
      const next = Number(transactionForm.newStock)
      return {
        before: current,
        after: Number.isFinite(next) ? next : current,
        difference: Number.isFinite(next) ? next - current : 0,
      }
    }
    const value = Number(transactionForm.quantity)
    const safeValue = Number.isFinite(value) ? value : 0
    return {
      before: current,
      after:
        transactionForm.transactionType === 'Import'
          ? current + safeValue
          : current - safeValue,
      difference:
        transactionForm.transactionType === 'Import' ? safeValue : -safeValue,
    }
  }, [selectedTransactionIngredient, transactionForm])

  return (
    <section className="inventory-page">
      <header className="inventory-toolbar">
        <div>
          <span className="inventory-kicker">QUẢN LÝ KHO</span>
          <h2>Nguyên liệu &amp; tồn kho</h2>
          <p>
            Theo dõi định mức, nhập xuất và giá trị tồn kho từ cùng một nơi.
          </p>
        </div>
        <div className="inventory-toolbar-actions">
          <button
            type="button"
            className="inventory-secondary"
            onClick={() => {
              setActiveTab('categories')
              openCreateCategory()
            }}
          >
            + Danh mục
          </button>
          <button
            type="button"
            className="inventory-transaction-button"
            disabled={!activeIngredients.length}
            onClick={() => openTransaction()}
          >
            ⇄ Giao dịch kho
          </button>
          <button
            type="button"
            className="inventory-primary"
            disabled={!activeCategories.length}
            onClick={openCreateIngredient}
          >
            + Thêm nguyên liệu
          </button>
        </div>
      </header>

      {error && (
        <div className="inventory-alert error" role="alert">
          <span>!</span>
          <p>{error}</p>
          <button type="button" aria-label="Đóng" onClick={() => setError('')}>
            ×
          </button>
        </div>
      )}
      {message && (
        <div className="inventory-alert success" role="status">
          <span>✓</span>
          <p>{message}</p>
          <button type="button" aria-label="Đóng" onClick={() => setMessage('')}>
            ×
          </button>
        </div>
      )}

      <section className="inventory-summary-grid" aria-label="Tổng quan kho">
        <article className="materials">
          <span className="inventory-summary-icon">▧</span>
          <div>
            <p>Nguyên liệu hoạt động</p>
            <strong>{overviewLoading ? '…' : activeIngredients.length}</strong>
            <small>{allIngredients.length} nguyên liệu trong hệ thống</small>
          </div>
        </article>
        <article className="low-stock">
          <span className="inventory-summary-icon">!</span>
          <div>
            <p>Cần bổ sung</p>
            <strong>{overviewLoading ? '…' : lowStockItems.length}</strong>
            <small>Tồn kho bằng hoặc dưới định mức</small>
          </div>
        </article>
        <article className="stock-value">
          <span className="inventory-summary-icon">₫</span>
          <div>
            <p>Giá trị tồn kho</p>
            <strong>{overviewLoading ? '…' : money(totalStockValue)}</strong>
            <small>Tính theo giá vốn hiện tại</small>
          </div>
        </article>
        <article className="categories">
          <span className="inventory-summary-icon">⌑</span>
          <div>
            <p>Danh mục hoạt động</p>
            <strong>{overviewLoading ? '…' : activeCategories.length}</strong>
            <small>{allCategories.length} danh mục đã tạo</small>
          </div>
        </article>
      </section>

      {!overviewLoading && lowStockItems.length > 0 && (
        <section className="low-stock-banner">
          <div className="low-stock-banner-heading">
            <span>!</span>
            <div>
              <strong>{lowStockItems.length} nguyên liệu cần bổ sung</strong>
              <small>Ưu tiên nhập kho để tránh gián đoạn phục vụ.</small>
            </div>
          </div>
          <div className="low-stock-preview">
            {lowStockItems.slice(0, 3).map(item => (
              <button
                type="button"
                key={item.id}
                onClick={() => {
                  const fullItem = allIngredients.find(
                    ingredient => ingredient.id === item.id,
                  )
                  if (fullItem) openTransaction(fullItem, 'Import')
                }}
              >
                <span>{item.ingredientCode}</span>
                <strong>{item.name}</strong>
                <small>
                  Thiếu {quantity(item.missingQuantity)} {item.unit}
                </small>
              </button>
            ))}
            {lowStockItems.length > 3 && (
              <button
                type="button"
                className="low-stock-more"
                onClick={() => {
                  setActiveTab('ingredients')
                  setIngredientStock('true')
                  setIngredientPage(1)
                }}
              >
                +{lowStockItems.length - 3}
                <small>Xem thêm</small>
              </button>
            )}
          </div>
        </section>
      )}

      <section className="inventory-panel">
        <nav className="inventory-tabs" aria-label="Phân hệ kho">
          <button
            type="button"
            className={activeTab === 'ingredients' ? 'active' : ''}
            onClick={() => setActiveTab('ingredients')}
          >
            <span>▧</span> Nguyên liệu
            <small>{ingredientTotalCount}</small>
          </button>
          <button
            type="button"
            className={activeTab === 'transactions' ? 'active' : ''}
            onClick={() => setActiveTab('transactions')}
          >
            <span>⇄</span> Giao dịch kho
            <small>{transactionTotalCount}</small>
          </button>
          <button
            type="button"
            className={activeTab === 'categories' ? 'active' : ''}
            onClick={() => setActiveTab('categories')}
          >
            <span>⌑</span> Danh mục
            <small>{categoryTotalCount}</small>
          </button>
        </nav>

        {activeTab === 'ingredients' && (
          <>
            <div className="inventory-filters ingredient-filters">
              <label className="inventory-search">
                <span className="sr-only">Tìm nguyên liệu</span>
                <i>⌕</i>
                <input
                  value={ingredientKeyword}
                  onChange={event => {
                    setIngredientKeyword(event.target.value)
                    setIngredientPage(1)
                  }}
                  placeholder="Mã, tên, đơn vị hoặc ghi chú…"
                />
              </label>
              <label>
                <span>Danh mục</span>
                <select
                  value={ingredientCategoryId}
                  onChange={event => {
                    setIngredientCategoryId(event.target.value)
                    setIngredientPage(1)
                  }}
                >
                  <option value="">Tất cả danh mục</option>
                  {allCategories.map(item => (
                    <option value={item.id} key={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Trạng thái</span>
                <select
                  value={ingredientActivity}
                  onChange={event => {
                    setIngredientActivity(event.target.value)
                    setIngredientPage(1)
                  }}
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="true">Đang hoạt động</option>
                  <option value="false">Đã vô hiệu</option>
                </select>
              </label>
              <label>
                <span>Mức tồn</span>
                <select
                  value={ingredientStock}
                  onChange={event => {
                    setIngredientStock(event.target.value)
                    setIngredientPage(1)
                  }}
                >
                  <option value="">Tất cả mức tồn</option>
                  <option value="true">Cần bổ sung</option>
                  <option value="false">Đủ tồn kho</option>
                </select>
              </label>
              <button
                type="button"
                className="inventory-primary compact"
                disabled={!activeCategories.length}
                onClick={openCreateIngredient}
              >
                + Thêm
              </button>
            </div>

            <div className="inventory-table-wrap">
              <table className="inventory-table ingredient-table">
                <thead>
                  <tr>
                    <th>Nguyên liệu</th>
                    <th>Danh mục</th>
                    <th>Tồn kho / định mức</th>
                    <th>Giá vốn</th>
                    <th>Giá trị tồn</th>
                    <th>Trạng thái</th>
                    <th>
                      <span className="sr-only">Thao tác</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ingredientsLoading ? (
                    <tr>
                      <td colSpan={7} className="inventory-empty">
                        <span className="inventory-spinner" />
                        Đang tải nguyên liệu…
                      </td>
                    </tr>
                  ) : ingredients.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="inventory-empty">
                        <strong>Chưa tìm thấy nguyên liệu</strong>
                        <span>Thử thay đổi bộ lọc hoặc thêm nguyên liệu mới.</span>
                      </td>
                    </tr>
                  ) : (
                    ingredients.map(item => {
                      const fill =
                        item.minimumStock > 0
                          ? Math.min(
                              (item.currentStock / item.minimumStock) * 100,
                              100,
                            )
                          : 100
                      return (
                        <tr
                          key={item.id}
                          className={!item.isActive ? 'inactive-row' : ''}
                        >
                          <td>
                            <button
                              type="button"
                              className="inventory-name-button"
                              disabled={actionId === item.id}
                              onClick={() => void openIngredientDetail(item)}
                            >
                              <span>{item.ingredientCode}</span>
                              <strong>{item.name}</strong>
                              <small>{item.unit}</small>
                            </button>
                          </td>
                          <td>{item.ingredientCategoryName}</td>
                          <td>
                            <div className="stock-cell">
                              <strong className={item.isLowStock ? 'danger' : ''}>
                                {quantity(item.currentStock)} {item.unit}
                              </strong>
                              <small>
                                Định mức {quantity(item.minimumStock)} {item.unit}
                              </small>
                              <span className="stock-track">
                                <i
                                  className={item.isLowStock ? 'danger' : ''}
                                  style={{ width: `${fill}%` }}
                                />
                              </span>
                            </div>
                          </td>
                          <td>{money(item.costPrice)}</td>
                          <td>
                            <strong>{money(item.stockValue)}</strong>
                          </td>
                          <td>
                            <span
                              className={`inventory-status ${
                                !item.isActive
                                  ? 'inactive'
                                  : item.isLowStock
                                    ? 'warning'
                                    : 'active'
                              }`}
                            >
                              <i />
                              {!item.isActive
                                ? 'Đã vô hiệu'
                                : item.isLowStock
                                  ? 'Cần bổ sung'
                                  : 'Đủ tồn kho'}
                            </span>
                          </td>
                          <td>
                            <div className="inventory-row-actions">
                              <button
                                type="button"
                                title="Nhập kho"
                                aria-label={`Nhập kho ${item.name}`}
                                disabled={!item.isActive}
                                onClick={() => openTransaction(item, 'Import')}
                              >
                                +
                              </button>
                              <button
                                type="button"
                                title="Chỉnh sửa"
                                aria-label={`Chỉnh sửa ${item.name}`}
                                onClick={() => openEditIngredient(item)}
                              >
                                ✎
                              </button>
                              <button
                                type="button"
                                className={item.isActive ? 'danger' : ''}
                                title={item.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                                aria-label={
                                  item.isActive
                                    ? `Vô hiệu hóa ${item.name}`
                                    : `Kích hoạt ${item.name}`
                                }
                                disabled={actionId === item.id}
                                onClick={() => void toggleIngredient(item)}
                              >
                                {item.isActive ? '×' : '↻'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              page={ingredientPage}
              totalPages={ingredientTotalPages}
              totalCount={ingredientTotalCount}
              onChange={setIngredientPage}
            />
          </>
        )}

        {activeTab === 'transactions' && (
          <>
            <div className="inventory-filters transaction-filters">
              <label className="inventory-search">
                <span className="sr-only">Tìm giao dịch</span>
                <i>⌕</i>
                <input
                  value={transactionKeyword}
                  onChange={event => {
                    setTransactionKeyword(event.target.value)
                    setTransactionPage(1)
                  }}
                  placeholder="Mã giao dịch, nguyên liệu…"
                />
              </label>
              <label>
                <span>Nguyên liệu</span>
                <select
                  value={transactionIngredientId}
                  onChange={event => {
                    setTransactionIngredientId(event.target.value)
                    setTransactionPage(1)
                  }}
                >
                  <option value="">Tất cả nguyên liệu</option>
                  {allIngredients.map(item => (
                    <option value={item.id} key={item.id}>
                      {item.ingredientCode} • {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Loại giao dịch</span>
                <select
                  value={transactionType}
                  onChange={event => {
                    setTransactionType(event.target.value)
                    setTransactionPage(1)
                  }}
                >
                  <option value="">Tất cả loại</option>
                  <option value="Import">Nhập kho</option>
                  <option value="Export">Xuất kho</option>
                  <option value="Adjustment">Điều chỉnh</option>
                </select>
              </label>
              <label>
                <span>Trạng thái</span>
                <select
                  value={transactionStatus}
                  onChange={event => {
                    setTransactionStatus(event.target.value)
                    setTransactionPage(1)
                  }}
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="Completed">Đã hoàn tất</option>
                  <option value="Cancelled">Đã hủy</option>
                </select>
              </label>
              <label>
                <span>Từ ngày</span>
                <input
                  type="date"
                  value={transactionFromDate}
                  max={transactionToDate || undefined}
                  onChange={event => {
                    setTransactionFromDate(event.target.value)
                    setTransactionPage(1)
                  }}
                />
              </label>
              <label>
                <span>Đến ngày</span>
                <input
                  type="date"
                  value={transactionToDate}
                  min={transactionFromDate || undefined}
                  onChange={event => {
                    setTransactionToDate(event.target.value)
                    setTransactionPage(1)
                  }}
                />
              </label>
              <button
                type="button"
                className="inventory-transaction-button compact"
                disabled={!activeIngredients.length}
                onClick={() => openTransaction()}
              >
                + Giao dịch
              </button>
            </div>

            <div className="inventory-table-wrap">
              <table className="inventory-table transaction-table">
                <thead>
                  <tr>
                    <th>Giao dịch</th>
                    <th>Nguyên liệu</th>
                    <th>Loại</th>
                    <th>Số lượng</th>
                    <th>Tồn trước → sau</th>
                    <th>Thành tiền</th>
                    <th>Trạng thái</th>
                    <th>
                      <span className="sr-only">Thao tác</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactionsLoading ? (
                    <tr>
                      <td colSpan={8} className="inventory-empty">
                        <span className="inventory-spinner" />
                        Đang tải giao dịch…
                      </td>
                    </tr>
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="inventory-empty">
                        <strong>Chưa tìm thấy giao dịch</strong>
                        <span>Thử thay đổi bộ lọc hoặc tạo giao dịch mới.</span>
                      </td>
                    </tr>
                  ) : (
                    transactions.map(item => (
                      <tr
                        key={item.id}
                        className={
                          item.status === 'Cancelled' ? 'inactive-row' : ''
                        }
                      >
                        <td>
                          <button
                            type="button"
                            className="inventory-name-button"
                            disabled={actionId === item.id}
                            onClick={() => void openTransactionDetail(item)}
                          >
                            <strong>{item.transactionCode}</strong>
                            <small>{formatDateTime(item.transactionDate)}</small>
                          </button>
                        </td>
                        <td>
                          <strong>{item.ingredientName}</strong>
                          <small className="table-subtext">
                            {item.ingredientCode}
                          </small>
                        </td>
                        <td>
                          <span
                            className={`transaction-type ${item.transactionType.toLowerCase()}`}
                          >
                            {item.transactionType === 'Import'
                              ? '↙'
                              : item.transactionType === 'Export'
                                ? '↗'
                                : '↔'}{' '}
                            {transactionLabels[item.transactionType]}
                          </span>
                        </td>
                        <td>
                          <strong
                            className={`transaction-quantity ${item.transactionType.toLowerCase()}`}
                          >
                            {item.transactionType === 'Import'
                              ? '+'
                              : item.transactionType === 'Export'
                                ? '−'
                                : ''}
                            {quantity(item.quantity)} {item.ingredientUnit}
                          </strong>
                        </td>
                        <td>
                          <span className="stock-change">
                            {quantity(item.stockBefore)}
                            <i>→</i>
                            <strong>{quantity(item.stockAfter)}</strong>
                            <small>{item.ingredientUnit}</small>
                          </span>
                        </td>
                        <td>{money(item.totalAmount)}</td>
                        <td>
                          <span
                            className={`inventory-status ${
                              item.status === 'Completed'
                                ? 'active'
                                : 'inactive'
                            }`}
                          >
                            <i />
                            {item.status === 'Completed'
                              ? 'Đã hoàn tất'
                              : 'Đã hủy'}
                          </span>
                        </td>
                        <td>
                          <div className="inventory-row-actions">
                            <button
                              type="button"
                              title="Xem chi tiết"
                              aria-label={`Xem ${item.transactionCode}`}
                              onClick={() => void openTransactionDetail(item)}
                            >
                              ⋯
                            </button>
                            {item.status === 'Completed' && (
                              <button
                                type="button"
                                className="danger"
                                title="Hủy và hoàn tác"
                                aria-label={`Hủy ${item.transactionCode}`}
                                disabled={actionId === item.id}
                                onClick={() => void cancelTransaction(item)}
                              >
                                ×
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              page={transactionPage}
              totalPages={transactionTotalPages}
              totalCount={transactionTotalCount}
              onChange={setTransactionPage}
            />
          </>
        )}

        {activeTab === 'categories' && (
          <>
            <div className="inventory-filters category-filters">
              <label className="inventory-search">
                <span className="sr-only">Tìm danh mục</span>
                <i>⌕</i>
                <input
                  value={categoryKeyword}
                  onChange={event => {
                    setCategoryKeyword(event.target.value)
                    setCategoryPage(1)
                  }}
                  placeholder="Tìm tên hoặc mô tả danh mục…"
                />
              </label>
              <label>
                <span>Trạng thái</span>
                <select
                  value={categoryActivity}
                  onChange={event => {
                    setCategoryActivity(event.target.value)
                    setCategoryPage(1)
                  }}
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="true">Đang hoạt động</option>
                  <option value="false">Đã vô hiệu</option>
                </select>
              </label>
              <button
                type="button"
                className="inventory-primary compact"
                onClick={openCreateCategory}
              >
                + Thêm danh mục
              </button>
            </div>

            <div className="inventory-table-wrap">
              <table className="inventory-table category-table">
                <thead>
                  <tr>
                    <th>Danh mục</th>
                    <th>Mô tả</th>
                    <th>Nguyên liệu</th>
                    <th>Cập nhật</th>
                    <th>Trạng thái</th>
                    <th>
                      <span className="sr-only">Thao tác</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {categoriesLoading ? (
                    <tr>
                      <td colSpan={6} className="inventory-empty">
                        <span className="inventory-spinner" />
                        Đang tải danh mục…
                      </td>
                    </tr>
                  ) : categories.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="inventory-empty">
                        <strong>Chưa tìm thấy danh mục</strong>
                        <span>Thử thay đổi bộ lọc hoặc thêm danh mục mới.</span>
                      </td>
                    </tr>
                  ) : (
                    categories.map(item => {
                      const counts = ingredientCountByCategory.get(item.id) ?? {
                        active: 0,
                        total: 0,
                      }
                      return (
                        <tr
                          key={item.id}
                          className={!item.isActive ? 'inactive-row' : ''}
                        >
                          <td>
                            <div className="category-name">
                              <span>{item.name.charAt(0).toUpperCase()}</span>
                              <strong>{item.name}</strong>
                            </div>
                          </td>
                          <td>
                            <span className="category-description">
                              {item.description || 'Chưa có mô tả'}
                            </span>
                          </td>
                          <td>
                            <strong>{counts.active}</strong>
                            <small className="table-subtext">
                              / {counts.total} hoạt động
                            </small>
                          </td>
                          <td>{formatDateTime(item.updatedAt ?? item.createdAt)}</td>
                          <td>
                            <span
                              className={`inventory-status ${
                                item.isActive ? 'active' : 'inactive'
                              }`}
                            >
                              <i />
                              {item.isActive ? 'Đang hoạt động' : 'Đã vô hiệu'}
                            </span>
                          </td>
                          <td>
                            <div className="inventory-row-actions">
                              <button
                                type="button"
                                title="Chỉnh sửa"
                                aria-label={`Chỉnh sửa ${item.name}`}
                                onClick={() => openEditCategory(item)}
                              >
                                ✎
                              </button>
                              <button
                                type="button"
                                className={item.isActive ? 'danger' : ''}
                                title={item.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
                                aria-label={
                                  item.isActive
                                    ? `Vô hiệu hóa ${item.name}`
                                    : `Kích hoạt ${item.name}`
                                }
                                disabled={actionId === item.id}
                                onClick={() => void toggleCategory(item)}
                              >
                                {item.isActive ? '×' : '↻'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              page={categoryPage}
              totalPages={categoryTotalPages}
              totalCount={categoryTotalCount}
              onChange={setCategoryPage}
            />
          </>
        )}
      </section>

      {ingredientFormMode && (
        <div className="inventory-modal-backdrop">
          <section
            className="inventory-modal inventory-form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ingredient-form-title"
          >
            <header>
              <div>
                <span className="inventory-kicker">
                  {ingredientFormMode === 'create'
                    ? 'NGUYÊN LIỆU MỚI'
                    : 'CHỈNH SỬA NGUYÊN LIỆU'}
                </span>
                <h3 id="ingredient-form-title">
                  {ingredientFormMode === 'create'
                    ? 'Thêm nguyên liệu'
                    : editingIngredient?.name}
                </h3>
                <p>
                  Tồn kho sau khi tạo chỉ được thay đổi bằng giao dịch kho để
                  bảo toàn lịch sử.
                </p>
              </div>
              <button
                type="button"
                aria-label="Đóng"
                disabled={saving}
                onClick={() => setIngredientFormMode(null)}
              >
                ×
              </button>
            </header>
            <form onSubmit={submitIngredient}>
              <div className="inventory-form-body">
                {ingredientFormError && (
                  <div className="inventory-alert error modal-alert">
                    <span>!</span>
                    <p>{ingredientFormError}</p>
                  </div>
                )}
                <div className="inventory-form-grid">
                  <label>
                    Mã nguyên liệu *
                    <input
                      required
                      maxLength={100}
                      disabled={ingredientFormMode === 'edit'}
                      value={ingredientForm.ingredientCode}
                      onChange={event =>
                        setIngredientForm(current => ({
                          ...current,
                          ingredientCode: event.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="VD: NL-THIT-BO"
                    />
                  </label>
                  <label>
                    Tên nguyên liệu *
                    <input
                      required
                      maxLength={200}
                      value={ingredientForm.name}
                      onChange={event =>
                        setIngredientForm(current => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="VD: Thịt bò thăn"
                    />
                  </label>
                  <label>
                    Danh mục *
                    <select
                      required
                      value={ingredientForm.ingredientCategoryId}
                      onChange={event =>
                        setIngredientForm(current => ({
                          ...current,
                          ingredientCategoryId: event.target.value,
                        }))
                      }
                    >
                      <option value="">Chọn danh mục</option>
                      {allCategories
                        .filter(
                          item =>
                            item.isActive ||
                            item.id === ingredientForm.ingredientCategoryId,
                        )
                        .map(item => (
                          <option value={item.id} key={item.id}>
                            {item.name}
                            {!item.isActive ? ' (đã vô hiệu)' : ''}
                          </option>
                        ))}
                    </select>
                  </label>
                  <label>
                    Đơn vị tính *
                    <input
                      required
                      maxLength={50}
                      value={ingredientForm.unit}
                      onChange={event =>
                        setIngredientForm(current => ({
                          ...current,
                          unit: event.target.value,
                        }))
                      }
                      placeholder="kg, lít, hộp…"
                    />
                  </label>
                  <label>
                    Tồn kho ban đầu *
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.001"
                      disabled={ingredientFormMode === 'edit'}
                      value={ingredientForm.currentStock}
                      onChange={event =>
                        setIngredientForm(current => ({
                          ...current,
                          currentStock: event.target.value,
                        }))
                      }
                    />
                    {ingredientFormMode === 'edit' && (
                      <small>Dùng giao dịch kho để thay đổi số lượng.</small>
                    )}
                  </label>
                  <label>
                    Định mức tối thiểu *
                    <input
                      required
                      type="number"
                      min="0"
                      step="0.001"
                      value={ingredientForm.minimumStock}
                      onChange={event =>
                        setIngredientForm(current => ({
                          ...current,
                          minimumStock: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Giá vốn *
                    <div className="inventory-input-suffix">
                      <input
                        required
                        type="number"
                        min="0"
                        step="1"
                        value={ingredientForm.costPrice}
                        onChange={event =>
                          setIngredientForm(current => ({
                            ...current,
                            costPrice: event.target.value,
                          }))
                        }
                      />
                      <span>₫</span>
                    </div>
                  </label>
                  {ingredientFormMode === 'edit' && (
                    <label>
                      Trạng thái
                      <select
                        value={String(ingredientForm.isActive)}
                        onChange={event =>
                          setIngredientForm(current => ({
                            ...current,
                            isActive: event.target.value === 'true',
                          }))
                        }
                      >
                        <option value="true">Đang hoạt động</option>
                        <option value="false">Đã vô hiệu</option>
                      </select>
                    </label>
                  )}
                  <label className="inventory-full-field">
                    Ghi chú
                    <textarea
                      maxLength={500}
                      rows={3}
                      value={ingredientForm.note}
                      onChange={event =>
                        setIngredientForm(current => ({
                          ...current,
                          note: event.target.value,
                        }))
                      }
                      placeholder="Nhà cung cấp, yêu cầu bảo quản…"
                    />
                  </label>
                </div>
              </div>
              <footer>
                <button
                  type="button"
                  className="inventory-secondary"
                  disabled={saving}
                  onClick={() => setIngredientFormMode(null)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="inventory-primary"
                  disabled={saving}
                >
                  {saving
                    ? 'Đang lưu…'
                    : ingredientFormMode === 'create'
                      ? 'Thêm nguyên liệu'
                      : 'Lưu thay đổi'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {categoryFormMode && (
        <div className="inventory-modal-backdrop">
          <section
            className="inventory-modal category-form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="category-form-title"
          >
            <header>
              <div>
                <span className="inventory-kicker">
                  {categoryFormMode === 'create'
                    ? 'DANH MỤC MỚI'
                    : 'CHỈNH SỬA DANH MỤC'}
                </span>
                <h3 id="category-form-title">
                  {categoryFormMode === 'create'
                    ? 'Thêm danh mục'
                    : editingCategory?.name}
                </h3>
                <p>Nhóm nguyên liệu giúp lọc và kiểm kê kho nhanh hơn.</p>
              </div>
              <button
                type="button"
                aria-label="Đóng"
                disabled={saving}
                onClick={() => setCategoryFormMode(null)}
              >
                ×
              </button>
            </header>
            <form onSubmit={submitCategory}>
              <div className="inventory-form-body">
                {categoryFormError && (
                  <div className="inventory-alert error modal-alert">
                    <span>!</span>
                    <p>{categoryFormError}</p>
                  </div>
                )}
                <div className="inventory-form-grid single-column">
                  <label>
                    Tên danh mục *
                    <input
                      required
                      maxLength={100}
                      value={categoryForm.name}
                      onChange={event =>
                        setCategoryForm(current => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="VD: Thịt & hải sản"
                    />
                  </label>
                  <label>
                    Mô tả
                    <textarea
                      rows={4}
                      maxLength={500}
                      value={categoryForm.description}
                      onChange={event =>
                        setCategoryForm(current => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      placeholder="Mô tả ngắn về nhóm nguyên liệu…"
                    />
                  </label>
                  {categoryFormMode === 'edit' && (
                    <label>
                      Trạng thái
                      <select
                        value={String(categoryForm.isActive)}
                        onChange={event =>
                          setCategoryForm(current => ({
                            ...current,
                            isActive: event.target.value === 'true',
                          }))
                        }
                      >
                        <option value="true">Đang hoạt động</option>
                        <option value="false">Đã vô hiệu</option>
                      </select>
                    </label>
                  )}
                </div>
              </div>
              <footer>
                <button
                  type="button"
                  className="inventory-secondary"
                  disabled={saving}
                  onClick={() => setCategoryFormMode(null)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="inventory-primary"
                  disabled={saving}
                >
                  {saving
                    ? 'Đang lưu…'
                    : categoryFormMode === 'create'
                      ? 'Thêm danh mục'
                      : 'Lưu thay đổi'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {transactionOpen && (
        <div className="inventory-modal-backdrop">
          <section
            className="inventory-modal transaction-form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="transaction-form-title"
          >
            <header>
              <div>
                <span className="inventory-kicker">GIAO DỊCH KHO</span>
                <h3 id="transaction-form-title">
                  {transactionLabels[transactionForm.transactionType]}
                </h3>
                <p>
                  Giao dịch hoàn tất sẽ cập nhật tồn kho và được lưu trong lịch
                  sử.
                </p>
              </div>
              <button
                type="button"
                aria-label="Đóng"
                disabled={saving}
                onClick={() => setTransactionOpen(false)}
              >
                ×
              </button>
            </header>
            <form onSubmit={submitTransaction}>
              <div className="inventory-form-body">
                {transactionFormError && (
                  <div className="inventory-alert error modal-alert">
                    <span>!</span>
                    <p>{transactionFormError}</p>
                  </div>
                )}
                <div className="transaction-kind-selector">
                  {(
                    ['Import', 'Export', 'Adjustment'] as InventoryTransactionType[]
                  ).map(type => (
                    <button
                      type="button"
                      key={type}
                      className={
                        transactionForm.transactionType === type ? 'active' : ''
                      }
                      onClick={() => {
                        const item = allIngredients.find(
                          candidate =>
                            candidate.id === transactionForm.ingredientId,
                        )
                        setTransactionForm(
                          getTransactionForm(
                            transactionForm.ingredientId,
                            type,
                            item,
                          ),
                        )
                      }}
                    >
                      <span>
                        {type === 'Import' ? '↙' : type === 'Export' ? '↗' : '↔'}
                      </span>
                      {transactionLabels[type]}
                    </button>
                  ))}
                </div>
                <div className="inventory-form-grid">
                  <label className="inventory-full-field">
                    Nguyên liệu *
                    <select
                      required
                      value={transactionForm.ingredientId}
                      onChange={event =>
                        changeTransactionIngredient(event.target.value)
                      }
                    >
                      <option value="">Chọn nguyên liệu</option>
                      {activeIngredients.map(item => (
                        <option value={item.id} key={item.id}>
                          {item.ingredientCode} • {item.name} • tồn{' '}
                          {quantity(item.currentStock)} {item.unit}
                        </option>
                      ))}
                    </select>
                  </label>
                  {transactionForm.transactionType !== 'Adjustment' ? (
                    <label>
                      Số lượng *
                      <input
                        required
                        type="number"
                        min="0.001"
                        step="0.001"
                        value={transactionForm.quantity}
                        onChange={event =>
                          setTransactionForm(current => ({
                            ...current,
                            quantity: event.target.value,
                          }))
                        }
                        placeholder="0"
                      />
                    </label>
                  ) : (
                    <label>
                      Tồn kho mới *
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.001"
                        value={transactionForm.newStock}
                        onChange={event =>
                          setTransactionForm(current => ({
                            ...current,
                            newStock: event.target.value,
                          }))
                        }
                      />
                    </label>
                  )}
                  {transactionForm.transactionType !== 'Export' && (
                    <label>
                      {transactionForm.transactionType === 'Import'
                        ? 'Đơn giá nhập *'
                        : 'Đơn giá điều chỉnh'}
                      <div className="inventory-input-suffix">
                        <input
                          required={transactionForm.transactionType === 'Import'}
                          type="number"
                          min="0"
                          step="1"
                          value={transactionForm.unitPrice}
                          onChange={event =>
                            setTransactionForm(current => ({
                              ...current,
                              unitPrice: event.target.value,
                            }))
                          }
                        />
                        <span>₫</span>
                      </div>
                      {transactionForm.transactionType === 'Adjustment' && (
                        <small>Nhập 0 để dùng giá vốn hiện tại.</small>
                      )}
                    </label>
                  )}
                  <label className="inventory-full-field">
                    Ghi chú
                    <textarea
                      rows={3}
                      maxLength={500}
                      value={transactionForm.note}
                      onChange={event =>
                        setTransactionForm(current => ({
                          ...current,
                          note: event.target.value,
                        }))
                      }
                      placeholder="Lý do, nhà cung cấp hoặc phiếu đối chiếu…"
                    />
                  </label>
                </div>
                {selectedTransactionIngredient && transactionPreview && (
                  <div
                    className={`transaction-preview ${transactionForm.transactionType.toLowerCase()}`}
                  >
                    <div>
                      <span>Tồn hiện tại</span>
                      <strong>
                        {quantity(transactionPreview.before)}{' '}
                        {selectedTransactionIngredient.unit}
                      </strong>
                    </div>
                    <i>→</i>
                    <div>
                      <span>Sau giao dịch</span>
                      <strong>
                        {quantity(transactionPreview.after)}{' '}
                        {selectedTransactionIngredient.unit}
                      </strong>
                    </div>
                    <small>
                      {transactionPreview.difference >= 0 ? '+' : ''}
                      {quantity(transactionPreview.difference)}{' '}
                      {selectedTransactionIngredient.unit}
                    </small>
                  </div>
                )}
              </div>
              <footer>
                <button
                  type="button"
                  className="inventory-secondary"
                  disabled={saving}
                  onClick={() => setTransactionOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="inventory-transaction-button"
                  disabled={saving || !transactionForm.ingredientId}
                >
                  {saving
                    ? 'Đang ghi nhận…'
                    : `Xác nhận ${transactionLabels[
                        transactionForm.transactionType
                      ].toLowerCase()}`}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {ingredientDetail && (
        <div className="inventory-modal-backdrop">
          <section
            className="inventory-modal inventory-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="ingredient-detail-title"
          >
            <header>
              <div>
                <span className="inventory-kicker">
                  {ingredientDetail.ingredientCode}
                </span>
                <h3 id="ingredient-detail-title">{ingredientDetail.name}</h3>
                <p>{ingredientDetail.ingredientCategoryName}</p>
              </div>
              <button
                type="button"
                aria-label="Đóng"
                onClick={() => setIngredientDetail(null)}
              >
                ×
              </button>
            </header>
            <div className="ingredient-detail-stock">
              <div>
                <span>TỒN KHO HIỆN TẠI</span>
                <strong>
                  {quantity(ingredientDetail.currentStock)}{' '}
                  <small>{ingredientDetail.unit}</small>
                </strong>
              </div>
              <span
                className={`inventory-status ${
                  !ingredientDetail.isActive
                    ? 'inactive'
                    : ingredientDetail.isLowStock
                      ? 'warning'
                      : 'active'
                }`}
              >
                <i />
                {!ingredientDetail.isActive
                  ? 'Đã vô hiệu'
                  : ingredientDetail.isLowStock
                    ? 'Cần bổ sung'
                    : 'Đủ tồn kho'}
              </span>
            </div>
            <div className="inventory-detail-grid">
              <div>
                <span>Định mức tối thiểu</span>
                <strong>
                  {quantity(ingredientDetail.minimumStock)}{' '}
                  {ingredientDetail.unit}
                </strong>
              </div>
              <div>
                <span>Giá vốn</span>
                <strong>{money(ingredientDetail.costPrice)}</strong>
              </div>
              <div>
                <span>Giá trị tồn kho</span>
                <strong>{money(ingredientDetail.stockValue)}</strong>
              </div>
              <div>
                <span>Cập nhật gần nhất</span>
                <strong>
                  {formatDateTime(
                    ingredientDetail.updatedAt ?? ingredientDetail.createdAt,
                  )}
                </strong>
              </div>
            </div>
            <div className="inventory-detail-note">
              <span>Ghi chú</span>
              <p>{ingredientDetail.note || 'Chưa có ghi chú.'}</p>
            </div>
            <footer>
              <button
                type="button"
                className={
                  ingredientDetail.isActive
                    ? 'inventory-danger'
                    : 'inventory-secondary'
                }
                disabled={Boolean(actionId)}
                onClick={() => void toggleIngredient(ingredientDetail)}
              >
                {ingredientDetail.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
              </button>
              <div>
                {ingredientDetail.isActive && (
                  <button
                    type="button"
                    className="inventory-transaction-button"
                    onClick={() =>
                      openTransaction(ingredientDetail, 'Import')
                    }
                  >
                    Nhập kho
                  </button>
                )}
                <button
                  type="button"
                  className="inventory-primary"
                  onClick={() => openEditIngredient(ingredientDetail)}
                >
                  Chỉnh sửa
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}

      {transactionDetail && (
        <div className="inventory-modal-backdrop">
          <section
            className="inventory-modal transaction-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="transaction-detail-title"
          >
            <header>
              <div>
                <span className="inventory-kicker">CHI TIẾT GIAO DỊCH</span>
                <h3 id="transaction-detail-title">
                  {transactionDetail.transactionCode}
                </h3>
                <p>{formatDateTime(transactionDetail.transactionDate)}</p>
              </div>
              <button
                type="button"
                aria-label="Đóng"
                onClick={() => setTransactionDetail(null)}
              >
                ×
              </button>
            </header>
            <div
              className={`transaction-detail-hero ${transactionDetail.transactionType.toLowerCase()}`}
            >
              <span>
                {transactionDetail.transactionType === 'Import'
                  ? '↙'
                  : transactionDetail.transactionType === 'Export'
                    ? '↗'
                    : '↔'}
              </span>
              <div>
                <small>
                  {transactionLabels[transactionDetail.transactionType]}
                </small>
                <strong>
                  {quantity(transactionDetail.quantity)}{' '}
                  {transactionDetail.ingredientUnit}
                </strong>
              </div>
              <span
                className={`inventory-status ${
                  transactionDetail.status === 'Completed'
                    ? 'active'
                    : 'inactive'
                }`}
              >
                <i />
                {transactionDetail.status === 'Completed'
                  ? 'Đã hoàn tất'
                  : 'Đã hủy'}
              </span>
            </div>
            <div className="transaction-detail-ingredient">
              <span>{transactionDetail.ingredientCode}</span>
              <strong>{transactionDetail.ingredientName}</strong>
            </div>
            <div className="inventory-detail-grid">
              <div>
                <span>Tồn trước giao dịch</span>
                <strong>
                  {quantity(transactionDetail.stockBefore)}{' '}
                  {transactionDetail.ingredientUnit}
                </strong>
              </div>
              <div>
                <span>Tồn sau giao dịch</span>
                <strong>
                  {quantity(transactionDetail.stockAfter)}{' '}
                  {transactionDetail.ingredientUnit}
                </strong>
              </div>
              <div>
                <span>Đơn giá</span>
                <strong>{money(transactionDetail.unitPrice)}</strong>
              </div>
              <div>
                <span>Thành tiền</span>
                <strong>{money(transactionDetail.totalAmount)}</strong>
              </div>
            </div>
            <div className="inventory-detail-note">
              <span>Ghi chú</span>
              <p>{transactionDetail.note || 'Chưa có ghi chú.'}</p>
              {transactionDetail.cancelledAt && (
                <small>
                  Đã hủy lúc {formatDateTime(transactionDetail.cancelledAt)}
                </small>
              )}
            </div>
            <footer>
              {transactionDetail.status === 'Completed' ? (
                <button
                  type="button"
                  className="inventory-danger"
                  disabled={Boolean(actionId)}
                  onClick={() => void cancelTransaction(transactionDetail)}
                >
                  Hủy &amp; hoàn tác
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                className="inventory-primary"
                onClick={() => setTransactionDetail(null)}
              >
                Đóng
              </button>
            </footer>
          </section>
        </div>
      )}
    </section>
  )
}

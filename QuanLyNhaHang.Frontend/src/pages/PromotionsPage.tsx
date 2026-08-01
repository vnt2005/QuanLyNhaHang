import { useAutoDismissMessage } from '../design-system/useAutoDismissMessage'
import { confirmAction } from '../design-system/confirmDialog'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import {
  applyPromotion,
  cancelPromotionUsage,
  createPromotion,
  deactivatePromotion,
  getAllPromotions,
  getAllPromotionUsages,
  getPaidPromotionPayments,
  getPromotion,
  getPromotionOrders,
  getPromotions,
  getPromotionUsage,
  getPromotionUsages,
  updatePromotion,
  updatePromotionUsagePayment,
  type ApplyPromotionResult,
  type DiscountType,
  type Promotion,
  type PromotionOrder,
  type PromotionPayment,
  type PromotionUsage,
} from '../api/promotions'

const PROMOTION_PAGE_SIZE = 8
const USAGE_PAGE_SIZE = 10

type PromotionState = 'valid' | 'upcoming' | 'expired' | 'exhausted' | 'inactive'

type PromotionForm = {
  promotionCode: string
  name: string
  description: string
  discountType: DiscountType
  discountValue: string
  minimumOrderAmount: string
  maximumDiscountAmount: string
  startDate: string
  endDate: string
  usageLimit: string
  isActive: boolean
}

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

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

function toLocalDateTimeInput(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function getDefaultForm(): PromotionForm {
  const start = new Date()
  start.setSeconds(0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return {
    promotionCode: '',
    name: '',
    description: '',
    discountType: 'Percent',
    discountValue: '10',
    minimumOrderAmount: '0',
    maximumDiscountAmount: '',
    startDate: toLocalDateTimeInput(start),
    endDate: toLocalDateTimeInput(end),
    usageLimit: '',
    isActive: true,
  }
}

function toForm(promotion: Promotion): PromotionForm {
  return {
    promotionCode: promotion.promotionCode,
    name: promotion.name,
    description: promotion.description ?? '',
    discountType: promotion.discountType,
    discountValue: String(promotion.discountValue),
    minimumOrderAmount: String(promotion.minimumOrderAmount),
    maximumDiscountAmount:
      promotion.maximumDiscountAmount == null
        ? ''
        : String(promotion.maximumDiscountAmount),
    startDate: toLocalDateTimeInput(promotion.startDate),
    endDate: toLocalDateTimeInput(promotion.endDate),
    usageLimit: promotion.usageLimit == null ? '' : String(promotion.usageLimit),
    isActive: promotion.isActive,
  }
}

function getPromotionState(promotion: Promotion): PromotionState {
  if (!promotion.isActive) return 'inactive'
  if (
    promotion.usageLimit != null &&
    promotion.usedCount >= promotion.usageLimit
  ) {
    return 'exhausted'
  }
  const now = Date.now()
  if (new Date(promotion.startDate).getTime() > now) return 'upcoming'
  if (new Date(promotion.endDate).getTime() < now) return 'expired'
  return 'valid'
}

const promotionStateLabels: Record<PromotionState, string> = {
  valid: 'Đang hiệu lực',
  upcoming: 'Sắp diễn ra',
  expired: 'Đã hết hạn',
  exhausted: 'Hết lượt',
  inactive: 'Đã vô hiệu',
}

function getDiscountLabel(promotion: Promotion) {
  return promotion.discountType === 'Percent'
    ? `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(
        promotion.discountValue,
      )}%`
    : money(promotion.discountValue)
}

function getOrderAmount(order?: PromotionOrder) {
  if (!order) return 0
  const activeItems = (order.items ?? []).filter(item => item.status !== 'Cancelled')
  const itemTotal = activeItems.reduce((sum, item) => sum + item.totalPrice, 0)
  return itemTotal || order.totalAmount || 0
}

function calculateEstimatedDiscount(orderAmount: number, promotion?: Promotion) {
  if (!promotion || orderAmount <= 0) return 0
  let value =
    promotion.discountType === 'Percent'
      ? (orderAmount * promotion.discountValue) / 100
      : promotion.discountValue
  if (promotion.maximumDiscountAmount != null) {
    value = Math.min(value, promotion.maximumDiscountAmount)
  }
  return Math.min(value, orderAmount)
}

function toStartOfDayIso(value: string) {
  return value ? new Date(`${value}T00:00:00`).toISOString() : ''
}

function toEndOfDayIso(value: string) {
  return value ? new Date(`${value}T23:59:59.999`).toISOString() : ''
}

function PromotionStatus({ promotion }: { promotion: Promotion }) {
  const state = getPromotionState(promotion)
  return (
    <span className={`promotion-status ${state}`}>
      <i />
      {promotionStateLabels[state]}
    </span>
  )
}

export default function PromotionsPage() {
  const [activeTab, setActiveTab] = useState<'promotions' | 'usages'>('promotions')
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [allPromotions, setAllPromotions] = useState<Promotion[]>([])
  const [allUsages, setAllUsages] = useState<PromotionUsage[]>([])
  const [promotionKeyword, setPromotionKeyword] = useState('')
  const [promotionType, setPromotionType] = useState('')
  const [promotionActivity, setPromotionActivity] = useState('')
  const [validNow, setValidNow] = useState('')
  const [promotionPage, setPromotionPage] = useState(1)
  const [promotionTotalPages, setPromotionTotalPages] = useState(1)
  const [promotionTotalCount, setPromotionTotalCount] = useState(0)
  const [promotionsLoading, setPromotionsLoading] = useState(true)

  const [usages, setUsages] = useState<PromotionUsage[]>([])
  const [usageKeyword, setUsageKeyword] = useState('')
  const [usagePromotionId, setUsagePromotionId] = useState('')
  const [usageStatus, setUsageStatus] = useState('')
  const [usageFromDate, setUsageFromDate] = useState('')
  const [usageToDate, setUsageToDate] = useState('')
  const [usagePage, setUsagePage] = useState(1)
  const [usageTotalPages, setUsageTotalPages] = useState(1)
  const [usageTotalCount, setUsageTotalCount] = useState(0)
  const [usagesLoading, setUsagesLoading] = useState(true)

  const [saving, setSaving] = useState(false)
  const [actionId, setActionId] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  useAutoDismissMessage(message, setMessage)

  const [formMode, setFormMode] = useState<'create' | 'edit' | null>(null)
  const [editing, setEditing] = useState<Promotion | null>(null)
  const [form, setForm] = useState<PromotionForm>(getDefaultForm)
  const [formError, setFormError] = useState('')
  const [detail, setDetail] = useState<Promotion | null>(null)

  const [applyOpen, setApplyOpen] = useState(false)
  const [orders, setOrders] = useState<PromotionOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [applyOrderId, setApplyOrderId] = useState('')
  const [applyPromotionId, setApplyPromotionId] = useState('')
  const [applyNote, setApplyNote] = useState('')
  const [applyError, setApplyError] = useState('')
  const [applyResult, setApplyResult] = useState<ApplyPromotionResult | null>(null)

  const [usageDetail, setUsageDetail] = useState<PromotionUsage | null>(null)
  const [paymentUsage, setPaymentUsage] = useState<PromotionUsage | null>(null)
  const [payments, setPayments] = useState<PromotionPayment[]>([])
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [selectedPaymentId, setSelectedPaymentId] = useState('')
  const [paymentError, setPaymentError] = useState('')

  const validPromotions = useMemo(
    () => allPromotions.filter(item => getPromotionState(item) === 'valid'),
    [allPromotions],
  )

  const appliedOrderIds = useMemo(
    () =>
      new Set(
        allUsages
          .filter(item => item.status === 'Applied')
          .map(item => item.orderId),
      ),
    [allUsages],
  )

  const eligibleOrders = useMemo(
    () =>
      orders
        .filter(
          order =>
            order.status !== 'Completed' &&
            order.status !== 'Cancelled' &&
            !appliedOrderIds.has(order.id),
        )
        .sort(
          (left, right) =>
            new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
        ),
    [appliedOrderIds, orders],
  )

  const selectedOrder = eligibleOrders.find(order => order.id === applyOrderId)
  const selectedApplyPromotion = validPromotions.find(
    promotion => promotion.id === applyPromotionId,
  )
  const selectedOrderAmount = getOrderAmount(selectedOrder)
  const estimatedDiscount = calculateEstimatedDiscount(
    selectedOrderAmount,
    selectedApplyPromotion,
  )

  const summary = useMemo(() => {
    const appliedUsages = allUsages.filter(usage => usage.status === 'Applied')
    return {
      valid: validPromotions.length,
      upcoming: allPromotions.filter(
        promotion => getPromotionState(promotion) === 'upcoming',
      ).length,
      applied: appliedUsages.length,
      totalDiscount: appliedUsages.reduce(
        (sum, usage) => sum + usage.discountAmount,
        0,
      ),
    }
  }, [allPromotions, allUsages, validPromotions])

  function resetNotices() {
    setError('')
    setMessage('')
  }

  async function loadOverview() {
    try {
      const [promotionResult, usageResult] = await Promise.all([
        getAllPromotions(),
        getAllPromotionUsages(),
      ])
      setAllPromotions(promotionResult ?? [])
      setAllUsages(usageResult ?? [])
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Không tải được số liệu tổng quan khuyến mãi.',
      )
    }
  }

  async function loadPromotions(
    targetPage = promotionPage,
    filters = {
      keyword: promotionKeyword,
      type: promotionType,
      activity: promotionActivity,
      valid: validNow,
    },
  ) {
    setPromotionsLoading(true)
    try {
      const result = await getPromotions(
        filters.keyword,
        filters.type,
        filters.activity,
        filters.valid,
        targetPage,
        PROMOTION_PAGE_SIZE,
      )
      const resolvedTotalPages = Math.max(1, result.totalPages || 1)
      if (targetPage > resolvedTotalPages) {
        await loadPromotions(resolvedTotalPages, filters)
        return
      }
      setPromotions(result.items ?? [])
      setPromotionPage(result.pageNumber || targetPage)
      setPromotionTotalPages(resolvedTotalPages)
      setPromotionTotalCount(result.totalCount || 0)
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Không tải được danh sách khuyến mãi.',
      )
    } finally {
      setPromotionsLoading(false)
    }
  }

  async function loadUsages(
    targetPage = usagePage,
    filters = {
      keyword: usageKeyword,
      promotionId: usagePromotionId,
      status: usageStatus,
      fromDate: usageFromDate,
      toDate: usageToDate,
    },
  ) {
    setUsagesLoading(true)
    try {
      const result = await getPromotionUsages(
        filters.keyword,
        filters.promotionId,
        filters.status,
        toStartOfDayIso(filters.fromDate),
        toEndOfDayIso(filters.toDate),
        targetPage,
        USAGE_PAGE_SIZE,
      )
      const resolvedTotalPages = Math.max(1, result.totalPages || 1)
      if (targetPage > resolvedTotalPages) {
        await loadUsages(resolvedTotalPages, filters)
        return
      }
      setUsages(result.items ?? [])
      setUsagePage(result.pageNumber || targetPage)
      setUsageTotalPages(resolvedTotalPages)
      setUsageTotalCount(result.totalCount || 0)
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Không tải được lịch sử sử dụng khuyến mãi.',
      )
    } finally {
      setUsagesLoading(false)
    }
  }

  useEffect(() => {
    setError('')
    void Promise.all([loadOverview(), loadPromotions(1), loadUsages(1)])
  }, [])

  function updateFormField<K extends keyof PromotionForm>(
    field: K,
    value: PromotionForm[K],
  ) {
    setForm(current => ({ ...current, [field]: value }))
  }

  function openCreate() {
    resetNotices()
    setEditing(null)
    setForm(getDefaultForm())
    setFormError('')
    setFormMode('create')
  }

  function openEdit(promotion: Promotion) {
    resetNotices()
    setDetail(null)
    setEditing(promotion)
    setForm(toForm(promotion))
    setFormError('')
    setFormMode('edit')
  }

  function closeForm() {
    if (saving) return
    setFormMode(null)
    setEditing(null)
    setFormError('')
  }

  function validatePromotionForm() {
    if (formMode === 'create' && !form.promotionCode.trim()) {
      return 'Vui lòng nhập mã khuyến mãi.'
    }
    if (!form.name.trim()) return 'Vui lòng nhập tên chương trình.'
    const discountValue = Number(form.discountValue)
    const minimumOrderAmount = Number(form.minimumOrderAmount)
    const maximumDiscountAmount =
      form.maximumDiscountAmount === '' ? null : Number(form.maximumDiscountAmount)
    const usageLimit = form.usageLimit === '' ? null : Number(form.usageLimit)
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      return 'Giá trị giảm phải lớn hơn 0.'
    }
    if (form.discountType === 'Percent' && discountValue > 100) {
      return 'Mức giảm phần trăm không được lớn hơn 100%.'
    }
    if (!Number.isFinite(minimumOrderAmount) || minimumOrderAmount < 0) {
      return 'Giá trị đơn tối thiểu không được nhỏ hơn 0.'
    }
    if (
      maximumDiscountAmount != null &&
      (!Number.isFinite(maximumDiscountAmount) || maximumDiscountAmount < 0)
    ) {
      return 'Số tiền giảm tối đa không được nhỏ hơn 0.'
    }
    if (
      usageLimit != null &&
      (!Number.isInteger(usageLimit) || usageLimit <= 0)
    ) {
      return 'Giới hạn sử dụng phải là số nguyên lớn hơn 0.'
    }
    if (!form.startDate || !form.endDate) {
      return 'Vui lòng chọn đầy đủ thời gian bắt đầu và kết thúc.'
    }
    if (new Date(form.endDate).getTime() < new Date(form.startDate).getTime()) {
      return 'Thời gian kết thúc phải lớn hơn hoặc bằng thời gian bắt đầu.'
    }
    return ''
  }

  function getFormPayload() {
    return {
      name: form.name,
      description: form.description,
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      minimumOrderAmount: Number(form.minimumOrderAmount),
      maximumDiscountAmount:
        form.discountType === 'Amount' || form.maximumDiscountAmount === ''
          ? null
          : Number(form.maximumDiscountAmount),
      startDate: new Date(form.startDate).toISOString(),
      endDate: new Date(form.endDate).toISOString(),
      usageLimit: form.usageLimit === '' ? null : Number(form.usageLimit),
    }
  }

  async function submitPromotion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError('')
    setMessage('')
    const validationError = validatePromotionForm()
    if (validationError) {
      setFormError(validationError)
      return
    }
    setSaving(true)
    try {
      const payload = getFormPayload()
      const result =
        formMode === 'edit' && editing
          ? await updatePromotion(editing.id, {
              ...payload,
              isActive: form.isActive,
            })
          : await createPromotion({
              promotionCode: form.promotionCode,
              ...payload,
            })
      setMessage(
        result.message ??
          (formMode === 'edit'
            ? 'Cập nhật khuyến mãi thành công.'
            : 'Tạo khuyến mãi thành công.'),
      )
      setFormMode(null)
      setEditing(null)
      await Promise.all([loadOverview(), loadPromotions(formMode === 'create' ? 1 : promotionPage)])
    } catch (exception) {
      setFormError(
        exception instanceof Error
          ? exception.message
          : 'Không lưu được khuyến mãi.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function openDetail(promotion: Promotion) {
    resetNotices()
    setActionId(promotion.id)
    try {
      setDetail(await getPromotion(promotion.id))
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Không tải được chi tiết khuyến mãi.',
      )
    } finally {
      setActionId('')
    }
  }

  async function togglePromotion(promotion: Promotion) {
    resetNotices()
    if (
      promotion.isActive &&
      !await confirmAction(`Vô hiệu hóa mã “${promotion.promotionCode}”?`)
    ) {
      return
    }
    setActionId(promotion.id)
    try {
      const result = promotion.isActive
        ? await deactivatePromotion(promotion.id)
        : await updatePromotion(promotion.id, {
            name: promotion.name,
            description: promotion.description ?? '',
            discountType: promotion.discountType,
            discountValue: promotion.discountValue,
            minimumOrderAmount: promotion.minimumOrderAmount,
            maximumDiscountAmount: promotion.maximumDiscountAmount ?? null,
            startDate: promotion.startDate,
            endDate: promotion.endDate,
            usageLimit: promotion.usageLimit ?? null,
            isActive: true,
          })
      setMessage(
        result.message ??
          (promotion.isActive
            ? 'Vô hiệu hóa khuyến mãi thành công.'
            : 'Kích hoạt khuyến mãi thành công.'),
      )
      setDetail(null)
      await Promise.all([loadOverview(), loadPromotions(promotionPage)])
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Không cập nhật được trạng thái khuyến mãi.',
      )
    } finally {
      setActionId('')
    }
  }

  async function openApply(preselected?: Promotion) {
    resetNotices()
    setApplyError('')
    setApplyResult(null)
    setApplyNote('')
    setApplyPromotionId(
      preselected && getPromotionState(preselected) === 'valid'
        ? preselected.id
        : validPromotions[0]?.id ?? '',
    )
    setApplyOpen(true)
    setOrdersLoading(true)
    try {
      const result = await getPromotionOrders()
      setOrders(result)
      const firstEligible = result.find(
        order =>
          order.status !== 'Completed' &&
          order.status !== 'Cancelled' &&
          !appliedOrderIds.has(order.id),
      )
      setApplyOrderId(firstEligible?.id ?? '')
    } catch (exception) {
      setApplyError(
        exception instanceof Error
          ? exception.message
          : 'Không tải được danh sách đơn hàng.',
      )
    } finally {
      setOrdersLoading(false)
    }
  }

  async function submitApply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setApplyError('')
    if (!selectedOrder) {
      setApplyError('Vui lòng chọn đơn hàng cần áp dụng.')
      return
    }
    if (!selectedApplyPromotion) {
      setApplyError('Vui lòng chọn mã khuyến mãi đang hiệu lực.')
      return
    }
    if (selectedOrderAmount < selectedApplyPromotion.minimumOrderAmount) {
      setApplyError(
        `Đơn hàng phải đạt tối thiểu ${money(
          selectedApplyPromotion.minimumOrderAmount,
        )} để dùng mã này.`,
      )
      return
    }
    setSaving(true)
    try {
      const result = await applyPromotion(
        selectedOrder.id,
        selectedApplyPromotion.promotionCode,
        applyNote,
      )
      setApplyResult(result.data)
      setMessage(result.message ?? 'Áp dụng mã khuyến mãi thành công.')
      await Promise.all([
        loadOverview(),
        loadPromotions(promotionPage),
        loadUsages(1),
      ])
    } catch (exception) {
      setApplyError(
        exception instanceof Error
          ? exception.message
          : 'Không áp dụng được mã khuyến mãi.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function openUsageDetail(usage: PromotionUsage) {
    resetNotices()
    setActionId(usage.id)
    try {
      setUsageDetail(await getPromotionUsage(usage.id))
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Không tải được chi tiết lượt sử dụng.',
      )
    } finally {
      setActionId('')
    }
  }

  async function cancelUsage(usage: PromotionUsage) {
    if (!await confirmAction(`Hủy lượt áp dụng mã “${usage.promotionCode}” cho ${usage.orderCode}?`)) {
      return
    }
    resetNotices()
    setActionId(usage.id)
    try {
      const result = await cancelPromotionUsage(usage.id)
      setMessage(result.message ?? 'Hủy lượt sử dụng khuyến mãi thành công.')
      setUsageDetail(null)
      await Promise.all([
        loadOverview(),
        loadPromotions(promotionPage),
        loadUsages(usagePage),
      ])
    } catch (exception) {
      setError(
        exception instanceof Error
          ? exception.message
          : 'Không hủy được lượt sử dụng khuyến mãi.',
      )
    } finally {
      setActionId('')
    }
  }

  async function openPaymentLink(usage: PromotionUsage) {
    resetNotices()
    setUsageDetail(null)
    setPaymentUsage(usage)
    setPaymentError('')
    setSelectedPaymentId(usage.paymentId ?? '')
    setPaymentsLoading(true)
    try {
      const result = await getPaidPromotionPayments()
      const matching = result.filter(payment => payment.orderId === usage.orderId)
      setPayments(matching)
      setSelectedPaymentId(usage.paymentId ?? matching[0]?.id ?? '')
    } catch (exception) {
      setPaymentError(
        exception instanceof Error
          ? exception.message
          : 'Không tải được thanh toán của đơn hàng.',
      )
    } finally {
      setPaymentsLoading(false)
    }
  }

  async function submitPaymentLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!paymentUsage) return
    setPaymentError('')
    if (!selectedPaymentId) {
      setPaymentError('Đơn hàng này chưa có thanh toán phù hợp để liên kết.')
      return
    }
    setSaving(true)
    try {
      const result = await updatePromotionUsagePayment(
        paymentUsage.id,
        selectedPaymentId,
      )
      setMessage(result.message ?? 'Liên kết thanh toán thành công.')
      setPaymentUsage(null)
      await Promise.all([loadOverview(), loadUsages(usagePage)])
    } catch (exception) {
      setPaymentError(
        exception instanceof Error
          ? exception.message
          : 'Không liên kết được thanh toán.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function clearPromotionFilters() {
    setPromotionKeyword('')
    setPromotionType('')
    setPromotionActivity('')
    setValidNow('')
    resetNotices()
    await loadPromotions(1, {
      keyword: '',
      type: '',
      activity: '',
      valid: '',
    })
  }

  async function clearUsageFilters() {
    setUsageKeyword('')
    setUsagePromotionId('')
    setUsageStatus('')
    setUsageFromDate('')
    setUsageToDate('')
    resetNotices()
    await loadUsages(1, {
      keyword: '',
      promotionId: '',
      status: '',
      fromDate: '',
      toDate: '',
    })
  }

  return (
    <section className="promotions-page">
      <div className="promotions-toolbar">
        <div>
          <span className="promotions-kicker">ƯU ĐÃI & GIỮ CHÂN KHÁCH HÀNG</span>
          <h2>Quản lý khuyến mãi</h2>
          <p>
            Tạo chương trình ưu đãi, áp mã vào đơn hàng và kiểm soát toàn bộ lịch sử
            sử dụng.
          </p>
        </div>
        <div className="promotions-toolbar-actions">
          <button
            type="button"
            className="promotions-secondary"
            disabled={promotionsLoading || usagesLoading}
            onClick={() => {
              resetNotices()
              void Promise.all([
                loadOverview(),
                loadPromotions(promotionPage),
                loadUsages(usagePage),
              ])
            }}
          >
            ↻ Làm mới
          </button>
          <button
            type="button"
            className="promotions-apply-button"
            onClick={() => void openApply()}
          >
            ◈ Áp dụng mã
          </button>
          <button type="button" className="promotions-primary" onClick={openCreate}>
            + Tạo khuyến mãi
          </button>
        </div>
      </div>

      {message && (
        <div className="promotions-alert success">
          <span>✓</span>
          <p>{message}</p>
          <button type="button" aria-label="Đóng thông báo" onClick={() => setMessage('')}>
            ×
          </button>
        </div>
      )}
      {error && (
        <div className="promotions-alert error">
          <span>!</span>
          <p>{error}</p>
          <button type="button" aria-label="Đóng thông báo" onClick={() => setError('')}>
            ×
          </button>
        </div>
      )}

      <div className="promotions-summary-grid">
        <article className="valid">
          <span className="promotion-summary-icon">✦</span>
          <div>
            <p>Đang hiệu lực</p>
            <strong>{promotionsLoading ? '—' : summary.valid}</strong>
            <small>Mã có thể áp dụng ngay</small>
          </div>
        </article>
        <article className="upcoming">
          <span className="promotion-summary-icon">◷</span>
          <div>
            <p>Sắp diễn ra</p>
            <strong>{promotionsLoading ? '—' : summary.upcoming}</strong>
            <small>Chương trình đã lên lịch</small>
          </div>
        </article>
        <article className="applied">
          <span className="promotion-summary-icon">✓</span>
          <div>
            <p>Lượt đang áp dụng</p>
            <strong>{usagesLoading ? '—' : summary.applied}</strong>
            <small>Không tính lượt đã hủy</small>
          </div>
        </article>
        <article className="discount">
          <span className="promotion-summary-icon">₫</span>
          <div>
            <p>Tổng tiền đã giảm</p>
            <strong>{usagesLoading ? '—' : money(summary.totalDiscount)}</strong>
            <small>Từ các lượt còn hiệu lực</small>
          </div>
        </article>
      </div>

      <article className="promotions-panel">
        <div className="promotions-tabs">
          <button
            type="button"
            className={activeTab === 'promotions' ? 'active' : ''}
            onClick={() => setActiveTab('promotions')}
          >
            <span>◈</span>
            Chương trình khuyến mãi
            <small>{promotionTotalCount}</small>
          </button>
          <button
            type="button"
            className={activeTab === 'usages' ? 'active' : ''}
            onClick={() => setActiveTab('usages')}
          >
            <span>▤</span>
            Lịch sử sử dụng
            <small>{usageTotalCount}</small>
          </button>
        </div>

        {activeTab === 'promotions' ? (
          <>
            <form
              className="promotions-filters"
              onSubmit={event => {
                event.preventDefault()
                resetNotices()
                void loadPromotions(1)
              }}
            >
              <label className="wide-search">
                <span className="sr-only">Tìm khuyến mãi</span>
                <input
                  value={promotionKeyword}
                  onChange={event => setPromotionKeyword(event.target.value)}
                  placeholder="Tìm theo mã, tên hoặc mô tả..."
                />
              </label>
              <label>
                <span className="sr-only">Loại giảm</span>
                <select
                  value={promotionType}
                  onChange={event => setPromotionType(event.target.value)}
                >
                  <option value="">Tất cả loại giảm</option>
                  <option value="Percent">Theo phần trăm</option>
                  <option value="Amount">Theo số tiền</option>
                </select>
              </label>
              <label>
                <span className="sr-only">Trạng thái hoạt động</span>
                <select
                  value={promotionActivity}
                  onChange={event => setPromotionActivity(event.target.value)}
                >
                  <option value="">Mọi trạng thái</option>
                  <option value="true">Đang bật</option>
                  <option value="false">Đã vô hiệu</option>
                </select>
              </label>
              <label className="valid-now-filter">
                <input
                  type="checkbox"
                  checked={validNow === 'true'}
                  onChange={event => setValidNow(event.target.checked ? 'true' : '')}
                />
                Chỉ mã hiệu lực
              </label>
              <button type="submit" disabled={promotionsLoading}>
                Lọc
              </button>
              <button
                type="button"
                className="clear"
                disabled={promotionsLoading}
                onClick={() => void clearPromotionFilters()}
              >
                Xóa lọc
              </button>
            </form>

            {promotionsLoading ? (
              <div className="promotions-loading">
                <span />
                <p>Đang tải chương trình khuyến mãi…</p>
              </div>
            ) : promotions.length === 0 ? (
              <div className="promotions-empty">
                <span>◈</span>
                <h3>Chưa có khuyến mãi phù hợp</h3>
                <p>Thử xóa bộ lọc hoặc tạo một chương trình mới.</p>
                <button type="button" onClick={openCreate}>
                  + Tạo khuyến mãi
                </button>
              </div>
            ) : (
              <div className="promotion-card-grid">
                {promotions.map(promotion => {
                  const usagePercent =
                    promotion.usageLimit == null
                      ? 0
                      : Math.min(
                          100,
                          (promotion.usedCount / promotion.usageLimit) * 100,
                        )
                  const state = getPromotionState(promotion)
                  return (
                    <article className={`promotion-card ${state}`} key={promotion.id}>
                      <header>
                        <div className="promotion-code">
                          <span>◈</span>
                          <div>
                            <strong>{promotion.promotionCode}</strong>
                            <small>
                              {promotion.discountType === 'Percent'
                                ? 'Giảm theo phần trăm'
                                : 'Giảm số tiền cố định'}
                            </small>
                          </div>
                        </div>
                        <PromotionStatus promotion={promotion} />
                      </header>
                      <div className="promotion-card-content">
                        <div className="promotion-card-offer">
                          <span>GIẢM</span>
                          <strong>{getDiscountLabel(promotion)}</strong>
                          {promotion.maximumDiscountAmount != null &&
                            promotion.discountType === 'Percent' && (
                              <small>
                                Tối đa {money(promotion.maximumDiscountAmount)}
                              </small>
                            )}
                        </div>
                        <div className="promotion-card-copy">
                          <h3>{promotion.name}</h3>
                          <p>{promotion.description || 'Chưa có mô tả chương trình.'}</p>
                          <div className="promotion-meta-grid">
                            <span>
                              <small>Đơn tối thiểu</small>
                              <strong>{money(promotion.minimumOrderAmount)}</strong>
                            </span>
                            <span>
                              <small>Thời gian</small>
                              <strong>
                                {formatDate(promotion.startDate)} –{' '}
                                {formatDate(promotion.endDate)}
                              </strong>
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="promotion-usage-progress">
                        <div>
                          <span>Đã sử dụng</span>
                          <strong>
                            {promotion.usedCount}
                            {promotion.usageLimit == null
                              ? ' lượt'
                              : ` / ${promotion.usageLimit} lượt`}
                          </strong>
                        </div>
                        <div className="promotion-progress-track">
                          <span
                            style={{
                              width:
                                promotion.usageLimit == null
                                  ? '0%'
                                  : `${usagePercent}%`,
                            }}
                          />
                        </div>
                      </div>
                      <footer>
                        <button
                          type="button"
                          disabled={Boolean(actionId)}
                          onClick={() => void openDetail(promotion)}
                        >
                          {actionId === promotion.id ? 'Đang tải…' : 'Chi tiết'}
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(actionId)}
                          onClick={() => openEdit(promotion)}
                        >
                          Chỉnh sửa
                        </button>
                        {state === 'valid' && (
                          <button
                            type="button"
                            className="apply"
                            disabled={Boolean(actionId)}
                            onClick={() => void openApply(promotion)}
                          >
                            Áp dụng
                          </button>
                        )}
                        <button
                          type="button"
                          className={promotion.isActive ? 'danger' : 'activate'}
                          disabled={Boolean(actionId)}
                          onClick={() => void togglePromotion(promotion)}
                        >
                          {promotion.isActive ? 'Vô hiệu' : 'Kích hoạt'}
                        </button>
                      </footer>
                    </article>
                  )
                })}
              </div>
            )}

            <div className="promotions-pagination">
              <span>
                Trang {promotionPage}/{promotionTotalPages} • {promotionTotalCount} kết
                quả
              </span>
              <div>
                <button
                  type="button"
                  disabled={promotionsLoading || promotionPage <= 1}
                  onClick={() => void loadPromotions(promotionPage - 1)}
                >
                  ← Trước
                </button>
                <button
                  type="button"
                  disabled={
                    promotionsLoading || promotionPage >= promotionTotalPages
                  }
                  onClick={() => void loadPromotions(promotionPage + 1)}
                >
                  Sau →
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            <form
              className="promotion-usage-filters"
              onSubmit={event => {
                event.preventDefault()
                resetNotices()
                void loadUsages(1)
              }}
            >
              <input
                value={usageKeyword}
                onChange={event => setUsageKeyword(event.target.value)}
                placeholder="Mã khuyến mãi, đơn hàng hoặc thanh toán..."
              />
              <select
                value={usagePromotionId}
                onChange={event => setUsagePromotionId(event.target.value)}
              >
                <option value="">Tất cả khuyến mãi</option>
                {allPromotions.map(promotion => (
                  <option value={promotion.id} key={promotion.id}>
                    {promotion.promotionCode} — {promotion.name}
                  </option>
                ))}
              </select>
              <select
                value={usageStatus}
                onChange={event => setUsageStatus(event.target.value)}
              >
                <option value="">Tất cả trạng thái</option>
                <option value="Applied">Đang áp dụng</option>
                <option value="Cancelled">Đã hủy</option>
              </select>
              <input
                type="date"
                aria-label="Từ ngày"
                value={usageFromDate}
                max={usageToDate || undefined}
                onChange={event => setUsageFromDate(event.target.value)}
              />
              <input
                type="date"
                aria-label="Đến ngày"
                value={usageToDate}
                min={usageFromDate || undefined}
                onChange={event => setUsageToDate(event.target.value)}
              />
              <button type="submit" disabled={usagesLoading}>
                Lọc
              </button>
              <button
                type="button"
                className="clear"
                disabled={usagesLoading}
                onClick={() => void clearUsageFilters()}
              >
                Xóa lọc
              </button>
            </form>

            <div className="promotion-usage-table-wrap">
              <table className="promotion-usage-table">
                <thead>
                  <tr>
                    <th>Khuyến mãi</th>
                    <th>Đơn hàng</th>
                    <th>Giá trị đơn</th>
                    <th>Số tiền giảm</th>
                    <th>Thanh toán</th>
                    <th>Thời gian</th>
                    <th>Trạng thái</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {usagesLoading ? (
                    <tr>
                      <td colSpan={8}>Đang tải lịch sử…</td>
                    </tr>
                  ) : usages.length === 0 ? (
                    <tr>
                      <td colSpan={8}>Chưa có lượt sử dụng phù hợp.</td>
                    </tr>
                  ) : (
                    usages.map(usage => (
                      <tr key={usage.id}>
                        <td>
                          <strong>{usage.promotionCode}</strong>
                          <small>{usage.promotionName}</small>
                        </td>
                        <td>
                          <strong>{usage.orderCode}</strong>
                          <small>ID {usage.orderId.slice(0, 8)}</small>
                        </td>
                        <td>{money(usage.orderAmount)}</td>
                        <td className="discount-value">
                          -{money(usage.discountAmount)}
                        </td>
                        <td>
                          <strong>{usage.paymentCode || 'Chưa liên kết'}</strong>
                          {usage.paymentId && <small>ID {usage.paymentId.slice(0, 8)}</small>}
                        </td>
                        <td>
                          <strong>{formatDateTime(usage.usedAt)}</strong>
                          {usage.cancelledAt && (
                            <small>Hủy {formatDateTime(usage.cancelledAt)}</small>
                          )}
                        </td>
                        <td>
                          <span
                            className={`promotion-usage-status ${usage.status.toLowerCase()}`}
                          >
                            {usage.status === 'Applied' ? 'Đang áp dụng' : 'Đã hủy'}
                          </span>
                        </td>
                        <td>
                          <div className="promotion-usage-actions">
                            <button
                              type="button"
                              disabled={Boolean(actionId)}
                              onClick={() => void openUsageDetail(usage)}
                            >
                              {actionId === usage.id ? 'Đang tải…' : 'Chi tiết'}
                            </button>
                            {usage.status === 'Applied' && (
                              <>
                                <button
                                  type="button"
                                  disabled={Boolean(actionId)}
                                  onClick={() => void openPaymentLink(usage)}
                                >
                                  {usage.paymentId ? 'Đổi liên kết' : 'Gắn thanh toán'}
                                </button>
                                <button
                                  type="button"
                                  className="danger"
                                  disabled={Boolean(actionId)}
                                  onClick={() => void cancelUsage(usage)}
                                >
                                  Hủy áp dụng
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="promotions-pagination">
              <span>
                Trang {usagePage}/{usageTotalPages} • {usageTotalCount} kết quả
              </span>
              <div>
                <button
                  type="button"
                  disabled={usagesLoading || usagePage <= 1}
                  onClick={() => void loadUsages(usagePage - 1)}
                >
                  ← Trước
                </button>
                <button
                  type="button"
                  disabled={usagesLoading || usagePage >= usageTotalPages}
                  onClick={() => void loadUsages(usagePage + 1)}
                >
                  Sau →
                </button>
              </div>
            </div>
          </>
        )}
      </article>

      {formMode && (
        <div className="promotions-modal-backdrop">
          <section
            className="promotions-modal promotion-form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="promotion-form-title"
          >
            <header>
              <div>
                <span className="promotions-kicker">
                  {formMode === 'create' ? 'CHƯƠNG TRÌNH MỚI' : 'CHỈNH SỬA'}
                </span>
                <h3 id="promotion-form-title">
                  {formMode === 'create'
                    ? 'Tạo chương trình khuyến mãi'
                    : editing?.promotionCode}
                </h3>
                <p>Thiết lập điều kiện và thời gian áp dụng cho ưu đãi.</p>
              </div>
              <button type="button" aria-label="Đóng" disabled={saving} onClick={closeForm}>
                ×
              </button>
            </header>

            <form onSubmit={submitPromotion}>
              {formError && (
                <div className="promotions-alert error modal-alert">
                  <span>!</span>
                  <p>{formError}</p>
                </div>
              )}

              <div className="promotion-form-layout">
                <div className="promotion-form-fields">
                  <fieldset>
                    <legend>
                      <span>1</span>
                      Thông tin chương trình
                    </legend>
                    <div className="promotion-form-grid">
                      <label>
                        Mã khuyến mãi *
                        <input
                          required
                          maxLength={100}
                          disabled={formMode === 'edit'}
                          value={form.promotionCode}
                          placeholder="VD: SUMMER20"
                          onChange={event =>
                            updateFormField(
                              'promotionCode',
                              event.target.value.toUpperCase().replace(/\s+/g, ''),
                            )
                          }
                        />
                        {formMode === 'edit' && <small>Mã không thể thay đổi sau khi tạo.</small>}
                      </label>
                      <label>
                        Tên chương trình *
                        <input
                          required
                          maxLength={200}
                          value={form.name}
                          onChange={event => updateFormField('name', event.target.value)}
                        />
                      </label>
                      <label className="wide">
                        Mô tả
                        <textarea
                          rows={3}
                          maxLength={500}
                          value={form.description}
                          onChange={event =>
                            updateFormField('description', event.target.value)
                          }
                        />
                        <small>{form.description.length}/500 ký tự</small>
                      </label>
                    </div>
                  </fieldset>

                  <fieldset>
                    <legend>
                      <span>2</span>
                      Giá trị ưu đãi
                    </legend>
                    <div className="promotion-form-grid three-columns">
                      <label>
                        Loại giảm *
                        <select
                          value={form.discountType}
                          onChange={event =>
                            updateFormField(
                              'discountType',
                              event.target.value as DiscountType,
                            )
                          }
                        >
                          <option value="Percent">Theo phần trăm</option>
                          <option value="Amount">Theo số tiền</option>
                        </select>
                      </label>
                      <label>
                        {form.discountType === 'Percent'
                          ? 'Phần trăm giảm *'
                          : 'Số tiền giảm *'}
                        <input
                          type="number"
                          required
                          min="0.01"
                          max={form.discountType === 'Percent' ? 100 : undefined}
                          step="0.01"
                          value={form.discountValue}
                          onChange={event =>
                            updateFormField('discountValue', event.target.value)
                          }
                        />
                      </label>
                      <label>
                        Đơn tối thiểu *
                        <input
                          type="number"
                          required
                          min="0"
                          step="1000"
                          value={form.minimumOrderAmount}
                          onChange={event =>
                            updateFormField('minimumOrderAmount', event.target.value)
                          }
                        />
                      </label>
                      <label>
                        Giảm tối đa
                        <input
                          type="number"
                          min="0"
                          step="1000"
                          disabled={form.discountType === 'Amount'}
                          placeholder="Không giới hạn"
                          value={
                            form.discountType === 'Amount'
                              ? ''
                              : form.maximumDiscountAmount
                          }
                          onChange={event =>
                            updateFormField(
                              'maximumDiscountAmount',
                              event.target.value,
                            )
                          }
                        />
                      </label>
                      <label>
                        Giới hạn lượt dùng
                        <input
                          type="number"
                          min="1"
                          step="1"
                          placeholder="Không giới hạn"
                          value={form.usageLimit}
                          onChange={event =>
                            updateFormField('usageLimit', event.target.value)
                          }
                        />
                      </label>
                    </div>
                  </fieldset>

                  <fieldset>
                    <legend>
                      <span>3</span>
                      Thời gian áp dụng
                    </legend>
                    <div className="promotion-form-grid">
                      <label>
                        Bắt đầu *
                        <input
                          type="datetime-local"
                          required
                          value={form.startDate}
                          max={form.endDate}
                          onChange={event =>
                            updateFormField('startDate', event.target.value)
                          }
                        />
                      </label>
                      <label>
                        Kết thúc *
                        <input
                          type="datetime-local"
                          required
                          value={form.endDate}
                          min={form.startDate}
                          onChange={event =>
                            updateFormField('endDate', event.target.value)
                          }
                        />
                      </label>
                    </div>
                  </fieldset>

                  {formMode === 'edit' && (
                    <label className="promotion-active-toggle">
                      <input
                        type="checkbox"
                        checked={form.isActive}
                        onChange={event =>
                          updateFormField('isActive', event.target.checked)
                        }
                      />
                      <span>
                        <strong>Cho phép sử dụng mã</strong>
                        <small>
                          Mã vẫn cần nằm trong thời gian áp dụng và chưa hết lượt.
                        </small>
                      </span>
                    </label>
                  )}
                </div>

                <aside className="promotion-form-preview">
                  <span className="preview-label">XEM TRƯỚC ƯU ĐÃI</span>
                  <div className="promotion-ticket">
                    <div className="ticket-brand">
                      <span>NH</span>
                      <small>ƯU ĐÃI NHÀ HÀNG</small>
                    </div>
                    <strong className="ticket-value">
                      {form.discountType === 'Percent'
                        ? `${form.discountValue || '0'}%`
                        : money(Number(form.discountValue) || 0)}
                    </strong>
                    <p>{form.name || 'Tên chương trình khuyến mãi'}</p>
                    <div className="ticket-code">
                      <span>MÃ</span>
                      <strong>{form.promotionCode || 'PROMO'}</strong>
                    </div>
                    <small>
                      Đơn tối thiểu {money(Number(form.minimumOrderAmount) || 0)}
                    </small>
                    <small>
                      {form.startDate ? formatDate(form.startDate) : '—'} –{' '}
                      {form.endDate ? formatDate(form.endDate) : '—'}
                    </small>
                  </div>
                  <div className="promotion-preview-note">
                    <span>i</span>
                    <p>
                      Hệ thống tự kiểm tra thời gian, giá trị đơn và giới hạn lượt khi
                      áp mã.
                    </p>
                  </div>
                </aside>
              </div>

              <footer>
                <button
                  type="button"
                  className="promotions-secondary"
                  disabled={saving}
                  onClick={closeForm}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="promotions-primary"
                  disabled={saving}
                >
                  {saving
                    ? 'Đang lưu…'
                    : formMode === 'create'
                      ? 'Tạo chương trình'
                      : 'Lưu thay đổi'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {applyOpen && (
        <div className="promotions-modal-backdrop">
          <section
            className="promotions-modal apply-promotion-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="apply-promotion-title"
          >
            <header>
              <div>
                <span className="promotions-kicker">ÁP DỤNG VÀO ĐƠN HÀNG</span>
                <h3 id="apply-promotion-title">
                  {applyResult ? 'Áp dụng thành công' : 'Chọn đơn và mã ưu đãi'}
                </h3>
                <p>Mỗi đơn chỉ có thể có một lượt khuyến mãi đang áp dụng.</p>
              </div>
              <button
                type="button"
                aria-label="Đóng"
                disabled={saving}
                onClick={() => setApplyOpen(false)}
              >
                ×
              </button>
            </header>

            {applyResult ? (
              <div className="apply-success-content">
                <span className="apply-success-icon">✓</span>
                <h4>{applyResult.promotionCode}</h4>
                <p>Đã áp dụng cho đơn hàng thành công.</p>
                <div>
                  <span>
                    Giá trị đơn<strong>{money(applyResult.orderAmount)}</strong>
                  </span>
                  <span>
                    Được giảm<strong>-{money(applyResult.discountAmount)}</strong>
                  </span>
                  <span className="final">
                    Còn thanh toán<strong>{money(applyResult.finalAmount)}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  className="promotions-primary"
                  onClick={() => {
                    setApplyOpen(false)
                    setActiveTab('usages')
                  }}
                >
                  Xem lịch sử sử dụng
                </button>
              </div>
            ) : (
              <form onSubmit={submitApply}>
                {applyError && (
                  <div className="promotions-alert error modal-alert">
                    <span>!</span>
                    <p>{applyError}</p>
                  </div>
                )}

                <div className="apply-promotion-fields">
                  <label>
                    Đơn hàng *
                    <select
                      required
                      disabled={ordersLoading}
                      value={applyOrderId}
                      onChange={event => setApplyOrderId(event.target.value)}
                    >
                      <option value="">
                        {ordersLoading
                          ? 'Đang tải đơn hàng…'
                          : eligibleOrders.length
                            ? 'Chọn đơn hàng'
                            : 'Không có đơn phù hợp'}
                      </option>
                      {eligibleOrders.map(order => (
                        <option value={order.id} key={order.id}>
                          {order.orderCode} • {order.restaurantTableName} •{' '}
                          {money(getOrderAmount(order))}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Mã khuyến mãi *
                    <select
                      required
                      value={applyPromotionId}
                      onChange={event => setApplyPromotionId(event.target.value)}
                    >
                      <option value="">
                        {validPromotions.length
                          ? 'Chọn mã khuyến mãi'
                          : 'Không có mã đang hiệu lực'}
                      </option>
                      {validPromotions.map(promotion => (
                        <option value={promotion.id} key={promotion.id}>
                          {promotion.promotionCode} • Giảm{' '}
                          {getDiscountLabel(promotion)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Ghi chú
                    <textarea
                      rows={3}
                      maxLength={500}
                      value={applyNote}
                      onChange={event => setApplyNote(event.target.value)}
                      placeholder="Ghi chú cho lần áp dụng này..."
                    />
                  </label>
                </div>

                <div className="apply-calculation">
                  <div>
                    <span>Giá trị đơn</span>
                    <strong>{money(selectedOrderAmount)}</strong>
                  </div>
                  <div>
                    <span>Giảm dự kiến</span>
                    <strong>-{money(estimatedDiscount)}</strong>
                  </div>
                  <div className="final">
                    <span>Còn thanh toán</span>
                    <strong>{money(Math.max(0, selectedOrderAmount - estimatedDiscount))}</strong>
                  </div>
                  {selectedApplyPromotion &&
                    selectedOrderAmount < selectedApplyPromotion.minimumOrderAmount && (
                      <p>
                        Đơn cần thêm{' '}
                        {money(
                          selectedApplyPromotion.minimumOrderAmount -
                            selectedOrderAmount,
                        )}{' '}
                        để đủ điều kiện.
                      </p>
                    )}
                </div>

                <footer>
                  <button
                    type="button"
                    className="promotions-secondary"
                    disabled={saving}
                    onClick={() => setApplyOpen(false)}
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="promotions-primary"
                    disabled={
                      saving ||
                      ordersLoading ||
                      !selectedOrder ||
                      !selectedApplyPromotion
                    }
                  >
                    {saving ? 'Đang áp dụng…' : 'Xác nhận áp dụng'}
                  </button>
                </footer>
              </form>
            )}
          </section>
        </div>
      )}

      {detail && (
        <div className="promotions-modal-backdrop">
          <section
            className="promotions-modal promotion-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="promotion-detail-title"
          >
            <header>
              <div>
                <span className="promotions-kicker">CHI TIẾT CHƯƠNG TRÌNH</span>
                <h3 id="promotion-detail-title">{detail.promotionCode}</h3>
                <p>Tạo lúc {formatDateTime(detail.createdAt)}</p>
              </div>
              <button type="button" aria-label="Đóng" onClick={() => setDetail(null)}>
                ×
              </button>
            </header>
            <div className="promotion-detail-hero">
              <div className="promotion-detail-value">
                <span>GIẢM</span>
                <strong>{getDiscountLabel(detail)}</strong>
              </div>
              <div>
                <PromotionStatus promotion={detail} />
                <h4>{detail.name}</h4>
                <p>{detail.description || 'Chưa có mô tả chương trình.'}</p>
              </div>
            </div>
            <div className="promotion-detail-grid">
              <div>
                <span>Đơn tối thiểu</span>
                <strong>{money(detail.minimumOrderAmount)}</strong>
              </div>
              <div>
                <span>Giảm tối đa</span>
                <strong>
                  {detail.maximumDiscountAmount == null
                    ? 'Không giới hạn'
                    : money(detail.maximumDiscountAmount)}
                </strong>
              </div>
              <div>
                <span>Bắt đầu</span>
                <strong>{formatDateTime(detail.startDate)}</strong>
              </div>
              <div>
                <span>Kết thúc</span>
                <strong>{formatDateTime(detail.endDate)}</strong>
              </div>
              <div>
                <span>Đã sử dụng</span>
                <strong>{detail.usedCount} lượt</strong>
              </div>
              <div>
                <span>Giới hạn</span>
                <strong>
                  {detail.usageLimit == null
                    ? 'Không giới hạn'
                    : `${detail.usageLimit} lượt`}
                </strong>
              </div>
            </div>
            <footer>
              <button
                type="button"
                className={
                  detail.isActive
                    ? 'promotions-danger'
                    : 'promotions-secondary'
                }
                disabled={Boolean(actionId)}
                onClick={() => void togglePromotion(detail)}
              >
                {detail.isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
              </button>
              <div>
                {getPromotionState(detail) === 'valid' && (
                  <button
                    type="button"
                    className="promotions-apply-button"
                    onClick={() => {
                      setDetail(null)
                      void openApply(detail)
                    }}
                  >
                    Áp dụng mã
                  </button>
                )}
                <button
                  type="button"
                  className="promotions-primary"
                  onClick={() => openEdit(detail)}
                >
                  Chỉnh sửa
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}

      {usageDetail && (
        <div className="promotions-modal-backdrop">
          <section
            className="promotions-modal usage-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="usage-detail-title"
          >
            <header>
              <div>
                <span className="promotions-kicker">LƯỢT SỬ DỤNG KHUYẾN MÃI</span>
                <h3 id="usage-detail-title">{usageDetail.promotionCode}</h3>
                <p>Áp dụng lúc {formatDateTime(usageDetail.usedAt)}</p>
              </div>
              <button
                type="button"
                aria-label="Đóng"
                onClick={() => setUsageDetail(null)}
              >
                ×
              </button>
            </header>
            <div className="usage-detail-summary">
              <span
                className={`promotion-usage-status ${usageDetail.status.toLowerCase()}`}
              >
                {usageDetail.status === 'Applied' ? 'Đang áp dụng' : 'Đã hủy'}
              </span>
              <h4>{usageDetail.promotionName}</h4>
              <p>{usageDetail.note || 'Không có ghi chú.'}</p>
            </div>
            <div className="usage-detail-amounts">
              <div>
                <span>Giá trị đơn</span>
                <strong>{money(usageDetail.orderAmount)}</strong>
              </div>
              <div>
                <span>Số tiền giảm</span>
                <strong>-{money(usageDetail.discountAmount)}</strong>
              </div>
              <div className="final">
                <span>Sau khuyến mãi</span>
                <strong>
                  {money(usageDetail.orderAmount - usageDetail.discountAmount)}
                </strong>
              </div>
            </div>
            <div className="usage-detail-links">
              <div>
                <span>Đơn hàng</span>
                <strong>{usageDetail.orderCode}</strong>
              </div>
              <div>
                <span>Thanh toán</span>
                <strong>{usageDetail.paymentCode || 'Chưa liên kết'}</strong>
              </div>
            </div>
            <footer>
              {usageDetail.status === 'Applied' && (
                <button
                  type="button"
                  className="promotions-danger"
                  disabled={Boolean(actionId)}
                  onClick={() => void cancelUsage(usageDetail)}
                >
                  Hủy áp dụng
                </button>
              )}
              <div>
                {usageDetail.status === 'Applied' && (
                  <button
                    type="button"
                    className="promotions-secondary"
                    onClick={() => void openPaymentLink(usageDetail)}
                  >
                    {usageDetail.paymentId ? 'Đổi thanh toán' : 'Gắn thanh toán'}
                  </button>
                )}
                <button
                  type="button"
                  className="promotions-primary"
                  onClick={() => setUsageDetail(null)}
                >
                  Đóng
                </button>
              </div>
            </footer>
          </section>
        </div>
      )}

      {paymentUsage && (
        <div className="promotions-modal-backdrop">
          <section
            className="promotions-modal payment-link-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-link-title"
          >
            <header>
              <div>
                <span className="promotions-kicker">LIÊN KẾT THANH TOÁN</span>
                <h3 id="payment-link-title">{paymentUsage.orderCode}</h3>
                <p>Chỉ hiển thị thanh toán đã trả của đúng đơn hàng này.</p>
              </div>
              <button
                type="button"
                aria-label="Đóng"
                disabled={saving}
                onClick={() => setPaymentUsage(null)}
              >
                ×
              </button>
            </header>
            <form onSubmit={submitPaymentLink}>
              {paymentError && (
                <div className="promotions-alert error modal-alert">
                  <span>!</span>
                  <p>{paymentError}</p>
                </div>
              )}
              <div className="payment-link-content">
                <div className="payment-link-promotion">
                  <span>{paymentUsage.promotionCode}</span>
                  <strong>-{money(paymentUsage.discountAmount)}</strong>
                </div>
                <label>
                  Thanh toán *
                  <select
                    required
                    disabled={paymentsLoading}
                    value={selectedPaymentId}
                    onChange={event => setSelectedPaymentId(event.target.value)}
                  >
                    <option value="">
                      {paymentsLoading
                        ? 'Đang tải thanh toán…'
                        : payments.length
                          ? 'Chọn thanh toán'
                          : 'Đơn chưa có thanh toán Paid'}
                    </option>
                    {payments.map(payment => (
                      <option value={payment.id} key={payment.id}>
                        {payment.paymentCode} • {money(payment.finalAmount)} •{' '}
                        {formatDateTime(payment.paidAt)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <footer>
                <button
                  type="button"
                  className="promotions-secondary"
                  disabled={saving}
                  onClick={() => setPaymentUsage(null)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="promotions-primary"
                  disabled={saving || paymentsLoading || !selectedPaymentId}
                >
                  {saving ? 'Đang liên kết…' : 'Lưu liên kết'}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </section>
  )
}

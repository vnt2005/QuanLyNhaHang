import { useAutoDismissMessage } from '../design-system/useAutoDismissMessage'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { getTables, type RestaurantTable } from '../api/areasTables'
import { getOrders, type Order, type OrderItem } from '../api/orders'
import {
  getTableOperations,
  mergeTables,
  splitTable,
  transferTable,
  type TableOperation,
  type TableOperationType,
} from '../api/tableOperations'

type TableOperationsPageProps = {
  role?: string
  permissions?: string[]
}

const operationLabels: Record<TableOperationType, string> = {
  Transfer: 'Chuyển bàn',
  Merge: 'Gộp bàn',
  Split: 'Tách bàn',
}

const itemStatusLabels: Record<string, string> = {
  Pending: 'Chờ xử lý',
  Cooking: 'Đang nấu',
  Ready: 'Sẵn sàng',
  Served: 'Đã phục vụ',
  Cancelled: 'Đã hủy',
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getOrderLabel(order: Order) {
  return `${order.orderCode} — ${order.restaurantTableName} — ${formatMoney(order.totalAmount)}`
}

function getQuantityOptions(item: OrderItem) {
  if (item.status !== 'Pending') return [0, item.quantity]
  return Array.from({ length: item.quantity + 1 }, (_, index) => index)
}

export default function TableOperationsPage({
  role,
  permissions = [],
}: TableOperationsPageProps) {
  const permissionSet = useMemo(() => new Set(permissions), [permissions])
  const isAdmin = role === 'Admin'
  const canTransfer = isAdmin || permissionSet.has('TableOperations.Transfer')
  const canMerge = isAdmin || permissionSet.has('TableOperations.Merge')
  const canSplit = isAdmin || permissionSet.has('TableOperations.Split')

  const availableModes = useMemo(() => {
    const result: TableOperationType[] = []
    if (canTransfer) result.push('Transfer')
    if (canMerge) result.push('Merge')
    if (canSplit) result.push('Split')
    return result
  }, [canMerge, canSplit, canTransfer])

  const [mode, setMode] = useState<TableOperationType>('Transfer')
  const [orders, setOrders] = useState<Order[]>([])
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [operations, setOperations] = useState<TableOperation[]>([])
  const [sourceOrderId, setSourceOrderId] = useState('')
  const [targetTableId, setTargetTableId] = useState('')
  const [targetOrderId, setTargetOrderId] = useState('')
  const [splitQuantities, setSplitQuantities] = useState<Record<string, number>>({})
  const [targetOrderNote, setTargetOrderNote] = useState('')
  const [note, setNote] = useState('')
  const [keyword, setKeyword] = useState('')
  const [historyType, setHistoryType] = useState('')
  const [historyStatus, setHistoryStatus] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [loadingReferences, setLoadingReferences] = useState(true)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  useAutoDismissMessage(message, setMessage)
  const [error, setError] = useState('')

  const sourceOrder = useMemo(
    () => orders.find(order => order.id === sourceOrderId) ?? null,
    [orders, sourceOrderId],
  )

  const sourceItems = useMemo(
    () => sourceOrder?.items.filter(item => item.status !== 'Cancelled') ?? [],
    [sourceOrder],
  )

  const availableTargetTables = useMemo(
    () => tables.filter(table => (
      table.isActive
      && table.status === 'Available'
      && table.id !== sourceOrder?.restaurantTableId
    )),
    [sourceOrder?.restaurantTableId, tables],
  )

  const mergeTargetOrders = useMemo(
    () => orders.filter(order => (
      order.id !== sourceOrderId
      && order.restaurantTableId !== sourceOrder?.restaurantTableId
    )),
    [orders, sourceOrder?.restaurantTableId, sourceOrderId],
  )

  useEffect(() => {
    if (availableModes.length > 0 && !availableModes.includes(mode)) {
      setMode(availableModes[0])
    }
  }, [availableModes, mode])

  useEffect(() => {
    void loadReferences()
    void loadHistory('', '', '', 1)
  }, [])

  async function loadReferences() {
    setLoadingReferences(true)
    setError('')
    try {
      const [orderPage, tablePage] = await Promise.all([
        getOrders('', '', '', 1, 100),
        getTables('', '', '', 1, 200),
      ])
      const activeOrders = (orderPage.items ?? []).filter(order => (
        order.isActive
        && order.status !== 'Completed'
        && order.status !== 'Cancelled'
      ))
      const activeTables = (tablePage.items ?? []).filter(table => table.isActive)
      setOrders(activeOrders)
      setTables(activeTables)
      setSourceOrderId(current => (
        activeOrders.some(order => order.id === current)
          ? current
          : activeOrders[0]?.id ?? ''
      ))
    } catch (exception) {
      setError(exception instanceof Error
        ? exception.message
        : 'Không tải được order và danh sách bàn.')
    } finally {
      setLoadingReferences(false)
    }
  }

  async function loadHistory(
    search = keyword,
    type = historyType,
    status = historyStatus,
    targetPage = 1,
  ) {
    setLoadingHistory(true)
    setError('')
    try {
      const result = await getTableOperations(search, type, status, targetPage)
      setOperations(result.items ?? [])
      setPage(result.pageNumber || targetPage)
      setTotalPages(Math.max(result.totalPages || 1, 1))
      setTotalCount(result.totalCount || 0)
    } catch (exception) {
      setError(exception instanceof Error
        ? exception.message
        : 'Không tải được lịch sử điều phối bàn.')
    } finally {
      setLoadingHistory(false)
    }
  }

  function selectSourceOrder(id: string) {
    setSourceOrderId(id)
    setTargetTableId('')
    setTargetOrderId('')
    setSplitQuantities({})
  }

  function resetOperationForm() {
    setTargetTableId('')
    setTargetOrderId('')
    setSplitQuantities({})
    setTargetOrderNote('')
    setNote('')
  }

  async function submitOperation(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    try {
      if (!sourceOrderId) throw new Error('Hãy chọn order nguồn.')

      let result: { message?: string }
      if (mode === 'Transfer') {
        if (!canTransfer) throw new Error('Tài khoản không có quyền chuyển bàn.')
        if (!targetTableId) throw new Error('Hãy chọn bàn đích.')
        result = await transferTable(sourceOrderId, targetTableId, note)
      } else if (mode === 'Merge') {
        if (!canMerge) throw new Error('Tài khoản không có quyền gộp bàn.')
        if (!targetOrderId) throw new Error('Hãy chọn order đích.')
        result = await mergeTables(sourceOrderId, targetOrderId, note)
      } else {
        if (!canSplit) throw new Error('Tài khoản không có quyền tách bàn.')
        if (!targetTableId) throw new Error('Hãy chọn bàn đích.')
        const items = sourceItems
          .map(item => ({
            orderItemId: item.id,
            quantity: splitQuantities[item.id] ?? 0,
          }))
          .filter(item => item.quantity > 0)
        if (items.length === 0) throw new Error('Hãy chọn ít nhất một món cần tách.')
        result = await splitTable(
          sourceOrderId,
          targetTableId,
          items,
          targetOrderNote,
          note,
        )
      }

      setMessage(result.message ?? `${operationLabels[mode]} thành công.`)
      resetOperationForm()
      await Promise.all([
        loadReferences(),
        loadHistory(keyword, historyType, historyStatus, 1),
      ])
    } catch (exception) {
      setError(exception instanceof Error
        ? exception.message
        : `Không thể thực hiện ${operationLabels[mode].toLocaleLowerCase('vi')}.`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="table-operations-page">
      <div className="page-toolbar">
        <div>
          <h2>Điều phối bàn</h2>
          <p>Chuyển order sang bàn trống, gộp hai order hoặc tách món sang một bàn mới.</p>
        </div>
        <button type="button" onClick={() => void loadReferences()} disabled={loadingReferences}>
          {loadingReferences ? 'Đang làm mới…' : 'Làm mới dữ liệu'}
        </button>
      </div>

      {message && <div className="inline-alert success">{message}</div>}
      {error && <div className="inline-alert error">{error}</div>}

      {availableModes.length === 0 ? (
        <div className="operation-permission-note">
          Tài khoản hiện tại chỉ có quyền xem lịch sử, không có quyền chuyển, gộp hoặc tách bàn.
        </div>
      ) : (
        <>
          <div className="operation-mode-tabs">
            {availableModes.map(item => (
              <button
                type="button"
                key={item}
                className={mode === item ? 'active' : ''}
                onClick={() => {
                  setMode(item)
                  resetOperationForm()
                }}
              >
                <span>{item === 'Transfer' ? '⇄' : item === 'Merge' ? '⇉' : '⑂'}</span>
                {operationLabels[item]}
              </button>
            ))}
          </div>

          <div className="operation-workspace">
            <form className="operation-form-card" onSubmit={submitOperation}>
              <div className="operation-card-heading">
                <div>
                  <span>THAO TÁC</span>
                  <h3>{operationLabels[mode]}</h3>
                </div>
                <small>Chỉ hiển thị order đang hoạt động và bàn đích đang trống.</small>
              </div>

              <label>
                Order nguồn
                <select
                  required
                  value={sourceOrderId}
                  onChange={event => selectSourceOrder(event.target.value)}
                  disabled={loadingReferences}
                >
                  <option value="">Chọn order nguồn</option>
                  {orders.map(order => (
                    <option key={order.id} value={order.id}>{getOrderLabel(order)}</option>
                  ))}
                </select>
              </label>

              {mode === 'Merge' ? (
                <label>
                  Order đích giữ lại sau khi gộp
                  <select
                    required
                    value={targetOrderId}
                    onChange={event => setTargetOrderId(event.target.value)}
                  >
                    <option value="">Chọn order đích</option>
                    {mergeTargetOrders.map(order => (
                      <option key={order.id} value={order.id}>{getOrderLabel(order)}</option>
                    ))}
                  </select>
                  {sourceOrder && mergeTargetOrders.length === 0 && (
                    <small>Không có order ở bàn khác phù hợp để gộp.</small>
                  )}
                </label>
              ) : (
                <label>
                  Bàn đích
                  <select
                    required
                    value={targetTableId}
                    onChange={event => setTargetTableId(event.target.value)}
                  >
                    <option value="">Chọn bàn đang trống</option>
                    {availableTargetTables.map(table => (
                      <option key={table.id} value={table.id}>
                        {table.name} — {table.areaName} — {table.capacity} chỗ
                      </option>
                    ))}
                  </select>
                  {sourceOrder && availableTargetTables.length === 0 && (
                    <small>Hiện không có bàn trống phù hợp.</small>
                  )}
                </label>
              )}

              {mode === 'Split' && (
                <>
                  <div className="split-items-heading">
                    <div>
                      <strong>Chọn số lượng món cần tách</strong>
                      <small>Món đã bắt đầu xử lý chỉ được chuyển toàn bộ số lượng.</small>
                    </div>
                  </div>
                  <div className="split-items-list">
                    {sourceItems.length === 0 ? (
                      <div className="operation-empty">Order nguồn chưa có món có thể tách.</div>
                    ) : sourceItems.map(item => (
                      <div className="split-item-row" key={item.id}>
                        <div>
                          <strong>{item.menuItemName}</strong>
                          <span>
                            {item.quantity} × {formatMoney(item.unitPrice)} ·{' '}
                            {itemStatusLabels[item.status] ?? item.status}
                          </span>
                        </div>
                        <label>
                          Số lượng
                          <select
                            value={splitQuantities[item.id] ?? 0}
                            onChange={event => setSplitQuantities(current => ({
                              ...current,
                              [item.id]: Number(event.target.value),
                            }))}
                          >
                            {getQuantityOptions(item).map(quantity => (
                              <option key={quantity} value={quantity}>{quantity}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                    ))}
                  </div>
                  <label>
                    Ghi chú cho order mới
                    <textarea
                      value={targetOrderNote}
                      onChange={event => setTargetOrderNote(event.target.value)}
                      placeholder="Ví dụ: khách chuyển sang bàn gần cửa sổ"
                    />
                  </label>
                </>
              )}

              <label>
                Ghi chú thao tác
                <textarea
                  value={note}
                  onChange={event => setNote(event.target.value)}
                  placeholder="Lý do hoặc thông tin cần lưu trong lịch sử"
                />
              </label>

              <button
                className="primary-button operation-submit"
                disabled={saving || loadingReferences || orders.length === 0}
              >
                {saving ? 'Đang xử lý…' : `Xác nhận ${operationLabels[mode].toLocaleLowerCase('vi')}`}
              </button>
            </form>

            <aside className="operation-context-card">
              <div className="operation-card-heading">
                <div>
                  <span>ORDER NGUỒN</span>
                  <h3>{sourceOrder?.orderCode ?? 'Chưa chọn order'}</h3>
                </div>
              </div>
              {sourceOrder ? (
                <>
                  <dl>
                    <div><dt>Bàn hiện tại</dt><dd>{sourceOrder.restaurantTableName}</dd></div>
                    <div><dt>Trạng thái</dt><dd>{sourceOrder.status}</dd></div>
                    <div><dt>Số món</dt><dd>{sourceItems.length}</dd></div>
                    <div><dt>Tổng tiền</dt><dd>{formatMoney(sourceOrder.totalAmount)}</dd></div>
                  </dl>
                  <div className="operation-order-items">
                    {sourceItems.map(item => (
                      <div key={item.id}>
                        <span>{item.menuItemName} × {item.quantity}</span>
                        <strong>{formatMoney(item.totalPrice)}</strong>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="operation-empty">Chọn một order để xem thông tin.</div>
              )}
            </aside>
          </div>
        </>
      )}

      <section className="operation-history-section">
        <div className="operation-history-heading">
          <div>
            <span>LỊCH SỬ</span>
            <h3>Chuyển / gộp / tách bàn</h3>
          </div>
          <strong>{totalCount} thao tác</strong>
        </div>

        <form
          className="operation-history-filters"
          onSubmit={event => {
            event.preventDefault()
            void loadHistory(keyword, historyType, historyStatus, 1)
          }}
        >
          <input
            value={keyword}
            onChange={event => setKeyword(event.target.value)}
            placeholder="Tìm mã thao tác, loại hoặc trạng thái..."
          />
          <select value={historyType} onChange={event => setHistoryType(event.target.value)}>
            <option value="">Tất cả loại</option>
            <option value="Transfer">Chuyển bàn</option>
            <option value="Merge">Gộp bàn</option>
            <option value="Split">Tách bàn</option>
          </select>
          <select value={historyStatus} onChange={event => setHistoryStatus(event.target.value)}>
            <option value="">Tất cả trạng thái</option>
            <option value="Completed">Hoàn tất</option>
            <option value="Cancelled">Đã hủy</option>
          </select>
          <button>Tìm kiếm</button>
        </form>

        <div className="operation-history-list">
          {loadingHistory ? (
            <div className="operation-empty">Đang tải lịch sử...</div>
          ) : operations.length === 0 ? (
            <div className="operation-empty">Chưa có thao tác bàn phù hợp.</div>
          ) : operations.map(operation => (
            <article className="operation-history-card" key={operation.id}>
              <div className="operation-history-main">
                <span className={`operation-type-badge type-${operation.operationType.toLowerCase()}`}>
                  {operationLabels[operation.operationType] ?? operation.operationType}
                </span>
                <div>
                  <strong>{operation.sourceTableName || 'Bàn nguồn'}</strong>
                  <span>→</span>
                  <strong>{operation.targetTableName || 'Bàn đích'}</strong>
                </div>
                <small>{operation.operationCode}</small>
              </div>
              <div className="operation-history-meta">
                <span>{operation.note || 'Không có ghi chú'}</span>
                <time>{formatDate(operation.createdAt)}</time>
                <span className={`operation-status status-${operation.status.toLowerCase()}`}>
                  {operation.status === 'Completed' ? 'Hoàn tất' : 'Đã hủy'}
                </span>
              </div>
            </article>
          ))}
        </div>

        <div className="pagination">
          <span>Trang {page}/{totalPages}</span>
          <div>
            <button
              disabled={page <= 1 || loadingHistory}
              onClick={() => void loadHistory(keyword, historyType, historyStatus, page - 1)}
            >
              Trước
            </button>
            <button
              disabled={page >= totalPages || loadingHistory}
              onClick={() => void loadHistory(keyword, historyType, historyStatus, page + 1)}
            >
              Sau
            </button>
          </div>
        </div>
      </section>
    </section>
  )
}

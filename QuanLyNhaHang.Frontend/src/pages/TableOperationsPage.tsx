import { useAutoDismissMessage } from '../design-system/useAutoDismissMessage'
import { FormEvent, useEffect, useMemo, useState } from 'react'
import { getTables, type RestaurantTable } from '../api/areasTables'
import { getOrders, type Order } from '../api/orders'
import {
  getTableOperations,
  transferTable,
  type TableOperation,
} from '../api/tableOperations'

type TableOperationsPageProps = {
  role?: string
  permissions?: string[]
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

export default function TableOperationsPage({
  role,
  permissions = [],
}: TableOperationsPageProps) {
  const permissionSet = useMemo(() => new Set(permissions), [permissions])
  const isAdmin = role === 'Admin'
  const canTransfer = isAdmin || permissionSet.has('TableOperations.Transfer')

  const [orders, setOrders] = useState<Order[]>([])
  const [tables, setTables] = useState<RestaurantTable[]>([])
  const [operations, setOperations] = useState<TableOperation[]>([])
  const [sourceOrderId, setSourceOrderId] = useState('')
  const [targetTableId, setTargetTableId] = useState('')
  const [note, setNote] = useState('')
  const [keyword, setKeyword] = useState('')
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

  useEffect(() => {
    void loadReferences()
    void loadHistory('', '', 1)
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
    status = historyStatus,
    targetPage = 1,
  ) {
    setLoadingHistory(true)
    setError('')
    try {
      const result = await getTableOperations(search, 'Transfer', status, targetPage)
      setOperations(result.items ?? [])
      setPage(result.pageNumber || targetPage)
      setTotalPages(Math.max(result.totalPages || 1, 1))
      setTotalCount(result.totalCount || 0)
    } catch (exception) {
      setError(exception instanceof Error
        ? exception.message
        : 'Không tải được lịch sử chuyển bàn.')
    } finally {
      setLoadingHistory(false)
    }
  }

  function selectSourceOrder(id: string) {
    setSourceOrderId(id)
    setTargetTableId('')
  }

  function resetOperationForm() {
    setTargetTableId('')
    setNote('')
  }

  async function submitOperation(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    setError('')

    try {
      if (!canTransfer) throw new Error('Tài khoản không có quyền chuyển bàn.')
      if (!sourceOrderId) throw new Error('Hãy chọn order nguồn.')
      if (!targetTableId) throw new Error('Hãy chọn bàn đích.')

      const result = await transferTable(sourceOrderId, targetTableId, note)
      setMessage(result.message ?? 'Chuyển bàn thành công.')
      resetOperationForm()
      await Promise.all([
        loadReferences(),
        loadHistory(keyword, historyStatus, 1),
      ])
    } catch (exception) {
      setError(exception instanceof Error
        ? exception.message
        : 'Không thể thực hiện chuyển bàn.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="table-operations-page">
      <div className="page-toolbar">
        <div>
          <h2>Chuyển bàn</h2>
          <p>Chuyển order đang hoạt động sang một bàn trống khác.</p>
        </div>
        <button type="button" onClick={() => void loadReferences()} disabled={loadingReferences}>
          {loadingReferences ? 'Đang làm mới…' : 'Làm mới dữ liệu'}
        </button>
      </div>

      {message && <div className="inline-alert success">{message}</div>}
      {error && <div className="inline-alert error">{error}</div>}

      {!canTransfer ? (
        <div className="operation-permission-note">
          Tài khoản hiện tại chỉ có quyền xem lịch sử, không có quyền chuyển bàn.
        </div>
      ) : (
        <div className="operation-workspace">
          <form className="operation-form-card" onSubmit={submitOperation}>
            <div className="operation-card-heading">
              <div>
                <span>THAO TÁC</span>
                <h3>Chuyển bàn</h3>
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
              {saving ? 'Đang xử lý…' : 'Xác nhận chuyển bàn'}
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
      )}

      <section className="operation-history-section">
        <div className="operation-history-heading">
          <div>
            <span>LỊCH SỬ</span>
            <h3>Chuyển bàn</h3>
          </div>
          <strong>{totalCount} thao tác</strong>
        </div>

        <form
          className="operation-history-filters"
          onSubmit={event => {
            event.preventDefault()
            void loadHistory(keyword, historyStatus, 1)
          }}
        >
          <input
            value={keyword}
            onChange={event => setKeyword(event.target.value)}
            placeholder="Tìm mã thao tác hoặc trạng thái..."
          />
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
            <div className="operation-empty">Chưa có thao tác chuyển bàn phù hợp.</div>
          ) : operations.map(operation => (
            <article className="operation-history-card" key={operation.id}>
              <div className="operation-history-main">
                <span className="operation-type-badge type-transfer">
                  Chuyển bàn
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
              onClick={() => void loadHistory(keyword, historyStatus, page - 1)}
            >
              Trước
            </button>
            <button
              disabled={page >= totalPages || loadingHistory}
              onClick={() => void loadHistory(keyword, historyStatus, page + 1)}
            >
              Sau
            </button>
          </div>
        </div>
      </section>
    </section>
  )
}

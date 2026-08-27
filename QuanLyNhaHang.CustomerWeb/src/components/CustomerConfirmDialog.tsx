import { AlertTriangle, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type CustomerConfirmOptions = {
  title?: string
  confirmLabel?: string
  cancelLabel?: string
}

type ConfirmRequest = Required<CustomerConfirmOptions> & {
  id: number
  message: string
  resolve: (accepted: boolean) => void
}

let requestId = 0
let requestHandler: ((request: ConfirmRequest) => void) | null = null
const waitingRequests: ConfirmRequest[] = []

export function confirmCustomerAction(
  message: string,
  options: CustomerConfirmOptions = {},
) {
  return new Promise<boolean>(resolve => {
    const request: ConfirmRequest = {
      id: ++requestId,
      message,
      title: options.title ?? 'Hủy đơn hàng?',
      confirmLabel: options.confirmLabel ?? 'Hủy đơn',
      cancelLabel: options.cancelLabel ?? 'Giữ đơn',
      resolve,
    }

    if (requestHandler) requestHandler(request)
    else waitingRequests.push(request)
  })
}

export function CustomerConfirmDialogHost() {
  const [request, setRequest] = useState<ConfirmRequest | null>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    requestHandler = nextRequest => {
      setRequest(current => {
        if (current) {
          waitingRequests.push(nextRequest)
          return current
        }
        return nextRequest
      })
    }

    const queuedRequest = waitingRequests.shift()
    if (queuedRequest) setRequest(queuedRequest)

    return () => {
      requestHandler = null
      waitingRequests.splice(0).forEach(item => item.resolve(false))
    }
  }, [])

  useEffect(() => {
    if (!request) return

    cancelButtonRef.current?.focus()
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') finish(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [request])

  function finish(accepted: boolean) {
    if (!request) return
    request.resolve(accepted)
    setRequest(waitingRequests.shift() ?? null)
  }

  if (!request) return null

  return (
    <div className="customer-confirm-backdrop" onMouseDown={() => finish(false)}>
      <section
        className="customer-confirm-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`customer-confirm-title-${request.id}`}
        aria-describedby={`customer-confirm-message-${request.id}`}
        onMouseDown={event => event.stopPropagation()}
      >
        <button
          type="button"
          className="customer-confirm-close"
          aria-label="Đóng hộp xác nhận"
          onClick={() => finish(false)}
        >
          <X aria-hidden="true" />
        </button>

        <div className="customer-confirm-icon" aria-hidden="true">
          <AlertTriangle />
        </div>

        <div className="customer-confirm-copy">
          <span>XÁC NHẬN THAO TÁC</span>
          <h2 id={`customer-confirm-title-${request.id}`}>{request.title}</h2>
          <p id={`customer-confirm-message-${request.id}`}>{request.message}</p>
        </div>

        <div className="customer-confirm-actions">
          <button
            ref={cancelButtonRef}
            type="button"
            className="customer-confirm-keep"
            onClick={() => finish(false)}
          >
            {request.cancelLabel}
          </button>
          <button
            type="button"
            className="customer-confirm-danger"
            onClick={() => finish(true)}
          >
            {request.confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}

import { AlertTriangle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

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

export function confirmCustomerAction(message: string, options: CustomerConfirmOptions = {}) {
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
  const completingRef = useRef(false)

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

  function finish(accepted: boolean) {
    if (!request) return
    completingRef.current = true
    request.resolve(accepted)
    setRequest(waitingRequests.shift() ?? null)
    queueMicrotask(() => { completingRef.current = false })
  }

  return (
    <AlertDialog
      open={Boolean(request)}
      onOpenChange={open => {
        if (!open && request && !completingRef.current) finish(false)
      }}
    >
      {request ? (
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia><AlertTriangle /></AlertDialogMedia>
            <AlertDialogTitle>{request.title}</AlertDialogTitle>
            <AlertDialogDescription>{request.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => finish(false)}>{request.cancelLabel}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => finish(true)}>{request.confirmLabel}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      ) : null}
    </AlertDialog>
  )
}

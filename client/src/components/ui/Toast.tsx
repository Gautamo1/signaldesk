import { createContext, useCallback, useContext, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cx } from '../../lib/utils'
import { Icon } from './Icon'
import type { IconName } from './Icon'

type Kind = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  kind: Kind
  message: string
  action?: { label: string; onClick: () => void }
}

interface ToastApi {
  push: (kind: Kind, message: string, action?: ToastItem['action']) => void
  success: (message: string, action?: ToastItem['action']) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}

const KIND_META: Record<Kind, { icon: IconName; cls: string }> = {
  success: { icon: 'check-circle', cls: 'text-ok border-ok/30' },
  error: { icon: 'alert', cls: 'text-danger border-danger/40' },
  info: { icon: 'info', cls: 'text-info border-info/30' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const push = useCallback(
    (kind: Kind, message: string, action?: ToastItem['action']) => {
      const id = nextId.current++
      setToasts((t) => [...t.slice(-3), { id, kind, message, action }])
      window.setTimeout(() => dismiss(id), action ? 6500 : 4200)
    },
    [dismiss],
  )

  const api: ToastApi = {
    push,
    success: (m, a) => push('success', m, a),
    error: (m) => push('error', m),
    info: (m) => push('info', m),
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div
          className="no-print pointer-events-none fixed bottom-16 right-4 z-[60] flex w-[320px] max-w-[calc(100vw-2rem)] flex-col gap-2 md:bottom-10"
          aria-live="polite"
          role="status"
        >
          {toasts.map((t) => (
            <div
              key={t.id}
              className={cx(
                'sd-enter pointer-events-auto flex items-start gap-2.5 rounded-md border bg-raised px-3 py-2.5 shadow-xl',
                KIND_META[t.kind].cls,
              )}
            >
              <span className="mt-px shrink-0">
                <Icon name={KIND_META[t.kind].icon} size={15} />
              </span>
              <div className="min-w-0 flex-1 text-[12.5px] leading-snug text-ink">{t.message}</div>
              {t.action && (
                <button
                  type="button"
                  className="shrink-0 font-semibold text-accent hover:underline cursor-pointer"
                  onClick={() => {
                    t.action?.onClick()
                    dismiss(t.id)
                  }}
                >
                  {t.action.label}
                </button>
              )}
              <button
                type="button"
                className="shrink-0 text-ink-3 hover:text-ink cursor-pointer"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
              >
                <Icon name="x" size={13} />
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

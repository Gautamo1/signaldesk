import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cx } from '../../lib/utils'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { Icon } from './Icon'
import { Button } from './Button'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function Modal({ open, onClose, title, children, footer, size = 'md' }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref, open)

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const width = size === 'sm' ? 'max-w-[420px]' : size === 'lg' ? 'max-w-[720px]' : 'max-w-[560px]'

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'sd-enter relative flex max-h-[92vh] w-full flex-col rounded-t-lg border border-border bg-raised shadow-2xl sm:rounded-lg',
          width,
        )}
      >
        <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-ink-3 hover:bg-ink-3/10 hover:text-ink cursor-pointer"
            aria-label="Close dialog"
          >
            <Icon name="x" size={16} />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-4">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-hairline px-4 py-3">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  )
}

interface ConfirmProps {
  open: boolean
  title: string
  body: ReactNode
  confirmLabel?: string
  danger?: boolean
  loading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({ open, title, body, confirmLabel = 'Confirm', danger, loading, onConfirm, onCancel }: ConfirmProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm} data-autofocus>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-[13px] leading-relaxed text-ink-2">{body}</div>
    </Modal>
  )
}

import type { ReactNode } from 'react'
import { cx } from '../../lib/utils'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import { Button } from './Button'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded bg-ink-3/15', className)} aria-hidden="true" />
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="flex flex-col gap-2 p-4" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className={cx('h-4', j === 0 ? 'w-1/3' : 'flex-1')} />
          ))}
        </div>
      ))}
    </div>
  )
}

interface EmptyStateProps {
  icon?: IconName
  title: string
  body?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon = 'inbox', title, body, action, className }: EmptyStateProps) {
  return (
    <div className={cx('flex flex-col items-center justify-center gap-2 px-6 py-14 text-center', className)}>
      <span className="mb-1 flex size-10 items-center justify-center rounded-full border border-border bg-surface text-ink-3">
        <Icon name={icon} size={18} />
      </span>
      <h3 className="text-sm font-semibold">{title}</h3>
      {body && <p className="max-w-[420px] text-xs leading-relaxed text-ink-2">{body}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
}

export function ErrorState({ title = 'Something went wrong', message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center" role="alert">
      <span className="mb-1 flex size-10 items-center justify-center rounded-full border border-danger/30 bg-danger/10 text-danger">
        <Icon name="alert" size={18} />
      </span>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="max-w-[420px] text-xs leading-relaxed text-ink-2">{message}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-3" onClick={onRetry} icon={<Icon name="refresh" size={13} />}>
          Retry
        </Button>
      )}
    </div>
  )
}

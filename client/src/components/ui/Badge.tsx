import type { ReactNode } from 'react'
import { cx } from '../../lib/utils'
import { pct } from '../../lib/format'
import { CATEGORY_LABELS, FINDING_STATUS_META, PRIORITY_META, PROJECT_STATUS_META } from '../../lib/constants'
import type { FindingCategory, FindingStatus, Priority, ProjectStatus } from '../../api/types'

const chipBase = 'inline-flex items-center gap-1.5 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider whitespace-nowrap'

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  const meta = PRIORITY_META[priority]
  return (
    <span className={cx(chipBase, meta.cls, className)}>
      <span className={cx('size-1.5 rounded-full', meta.dot)} aria-hidden="true" />
      {meta.label}
    </span>
  )
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  const meta = PROJECT_STATUS_META[status]
  return (
    <span className={cx(chipBase, 'text-ink-2 bg-ink-3/10 border-ink-3/25')}>
      <span className={cx('size-1.5 rounded-full', meta.dot)} aria-hidden="true" />
      {meta.label}
    </span>
  )
}

export function FindingStatusBadge({ status }: { status: FindingStatus }) {
  const meta = FINDING_STATUS_META[status]
  return <span className={cx(chipBase, meta.cls)}>{meta.label}</span>
}

export function CategoryBadge({ category }: { category: FindingCategory }) {
  return (
    <span className={cx(chipBase, 'text-ink-2 bg-transparent border-border')}>
      {CATEGORY_LABELS[category] ?? category}
    </span>
  )
}

export function TagChip({ tag, onRemove }: { tag: string; onRemove?: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-border bg-surface px-1.5 py-0.5 font-mono text-[11px] text-ink-2">
      #{tag}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="text-ink-3 hover:text-danger cursor-pointer -mr-0.5"
          aria-label={`Remove tag ${tag}`}
        >
          ×
        </button>
      )}
    </span>
  )
}

export function ConfidenceBar({ value, className }: { value: number; className?: string }) {
  const color = value >= 0.75 ? 'bg-ok' : value >= 0.5 ? 'bg-info' : 'bg-warn'
  return (
    <span className={cx('inline-flex items-center gap-2', className)} title={`Confidence ${pct(value)}`}>
      <span className="h-1 w-10 overflow-hidden rounded-full bg-ink-3/20" aria-hidden="true">
        <span className={cx('block h-full rounded-full', color)} style={{ width: pct(value) }} />
      </span>
      <span className="font-mono text-[11px] tnum text-ink-2">{pct(value)}</span>
    </span>
  )
}

export function Dot({ className, pulse }: { className?: string; pulse?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cx('inline-block size-1.5 rounded-full', pulse && 'sd-live-dot', className)}
    />
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-raised px-1 py-px font-mono text-[10px] text-ink-2">
      {children}
    </kbd>
  )
}

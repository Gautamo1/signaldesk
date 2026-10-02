import { cx } from '../../lib/utils'
import { Icon } from './Icon'

interface PaginationProps {
  page: number
  pages: number
  total: number
  onPage: (page: number) => void
}

export function Pagination({ page, pages, total, onPage }: PaginationProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-hairline px-4 py-2.5">
      <span className="font-mono text-[11px] tnum text-ink-3">
        {total} result{total === 1 ? '' : 's'} · page {page}/{pages}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="flex size-7 items-center justify-center rounded-md border border-border bg-surface text-ink-2 hover:text-ink disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          <Icon name="chevron-left" size={14} />
        </button>
        {Array.from({ length: Math.min(pages, 5) }).map((_, i) => {
          // Window of up to 5 pages around the current page.
          const start = Math.max(1, Math.min(page - 2, pages - 4))
          const p = start + i
          if (p > pages) return null
          return (
            <button
              key={p}
              type="button"
              onClick={() => onPage(p)}
              aria-current={p === page ? 'page' : undefined}
              className={cx(
                'size-7 rounded-md border font-mono text-[11px] tnum cursor-pointer',
                p === page
                  ? 'border-accent/50 bg-accent-soft text-accent font-semibold'
                  : 'border-border bg-surface text-ink-3 hover:text-ink',
              )}
            >
              {p}
            </button>
          )
        })}
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          className="flex size-7 items-center justify-center rounded-md border border-border bg-surface text-ink-2 hover:text-ink disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          <Icon name="chevron-right" size={14} />
        </button>
      </div>
    </div>
  )
}

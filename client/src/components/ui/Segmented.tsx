import { cx } from '../../lib/utils'

interface SegmentedProps<T extends string> {
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  ariaLabel?: string
}

export function Segmented<T extends string>({ options, value, onChange, size = 'md', ariaLabel }: SegmentedProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="inline-flex items-center gap-0.5 rounded-md border border-border bg-surface p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded cursor-pointer whitespace-nowrap transition-colors duration-100',
            size === 'sm' ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1 text-xs',
            value === o.value
              ? 'bg-raised font-semibold text-ink shadow-sm border border-border'
              : 'text-ink-3 hover:text-ink border border-transparent',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

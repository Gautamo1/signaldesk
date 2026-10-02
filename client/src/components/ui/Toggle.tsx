import { cx } from '../../lib/utils'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label?: string
  disabled?: boolean
}

/** Accessible switch with a visible label option. */
export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(
        'relative inline-flex h-4.5 w-8 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-150',
        checked ? 'border-accent/60 bg-accent/30' : 'border-border bg-ink-3/20',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          'absolute size-3 rounded-full transition-transform duration-150',
          checked ? 'translate-x-[15px] bg-accent' : 'translate-x-[2px] bg-ink-3',
        )}
      />
    </button>
  )
}

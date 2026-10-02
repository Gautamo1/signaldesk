import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '../../lib/utils'
import { Icon } from './Icon'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent text-[#0a0d12] hover:brightness-110 border border-transparent font-semibold disabled:bg-accent/40',
  secondary:
    'bg-surface text-ink border border-border hover:border-ink-3/50 hover:bg-raised',
  ghost: 'bg-transparent text-ink-2 hover:text-ink hover:bg-ink-3/10 border border-transparent',
  danger: 'bg-danger/10 text-danger border border-danger/30 hover:bg-danger/20',
}

const SIZES: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5 rounded-md',
  md: 'h-8 px-3.5 text-[13px] gap-2 rounded-md',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center whitespace-nowrap transition-colors duration-100 select-none',
        'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? (
        <svg className="animate-spin" width={size === 'sm' ? 12 : 14} height={size === 'sm' ? 12 : 14} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      ) : (
        icon
      )}
      {children}
    </button>
  )
}

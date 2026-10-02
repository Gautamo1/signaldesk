import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cx } from '../../lib/utils'
import { Icon } from './Icon'

interface FieldWrapProps {
  label?: string
  error?: string | null
  hint?: string
  required?: boolean
  children: ReactNode
  className?: string
}

export function Field({ label, error, hint, required, children, className }: FieldWrapProps) {
  const id = useId()
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={id} className="text-[11px] font-medium uppercase tracking-wider text-ink-2">
          {label}
          {required && <span className="text-danger ml-0.5" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-3">{hint}</p>
      ) : null}
    </div>
  )
}

const controlCls =
  'w-full rounded-md border bg-surface px-2.5 text-[13px] text-ink placeholder:text-ink-3 transition-colors focus:outline-none focus:border-accent/60 focus:ring-2 focus:ring-accent/20 disabled:opacity-50'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function Input({ className, invalid, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cx(controlCls, 'h-8', invalid ? 'border-danger/60' : 'border-border', className)}
        {...rest}
      />
    )
  },
)

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ className, invalid, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      className={cx(controlCls, 'py-2 min-h-[72px] leading-relaxed', invalid ? 'border-danger/60' : 'border-border', className)}
      {...rest}
    />
  )
})

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(function Select({ className, invalid, children, ...rest }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cx(
          controlCls,
          'h-8 appearance-none pr-8 cursor-pointer',
          invalid ? 'border-danger/60' : 'border-border',
          className,
        )}
        {...rest}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3">
        <Icon name="chevron-down" size={14} />
      </span>
    </div>
  )
})

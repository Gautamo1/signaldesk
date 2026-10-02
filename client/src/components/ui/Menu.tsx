import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cx } from '../../lib/utils'
import { Icon } from './Icon'

export interface MenuItem {
  label: string
  icon?: ReactNode
  danger?: boolean
  disabled?: boolean
  onSelect: () => void
}

interface MenuProps {
  items: MenuItem[]
  align?: 'left' | 'right'
  trigger?: (open: boolean) => ReactNode
  buttonLabel?: string
}

/** Compact dropdown menu with keyboard support (arrows + Enter + Escape). */
export function Menu({ items, align = 'right', trigger, buttonLabel }: MenuProps) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
      const enabled = items.filter((i) => !i.disabled)
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActive((a) => Math.min(a + 1, enabled.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActive((a) => Math.max(a - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const item = items.find((i) => !i.disabled && i.label === enabled[active]?.label)
        item?.onSelect()
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, items, active])

  const enabledCount = items.filter((i) => !i.disabled).length

  return (
    <div ref={rootRef} className="relative inline-block">
      <span onClick={() => { setOpen((o) => !o); setActive(0) }}>
        {trigger ? trigger(open) : (
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={open}
            className="flex size-7 items-center justify-center rounded-md border border-border bg-surface text-ink-2 hover:text-ink hover:border-ink-3/50 cursor-pointer"
          >
            {buttonLabel ? <span className="text-xs">{buttonLabel}</span> : <Icon name="dots" size={15} />}
          </button>
        )}
      </span>
      {open && (
        <div
          role="menu"
          className={cx(
            'sd-enter absolute z-40 mt-1 min-w-[180px] overflow-hidden rounded-md border border-border bg-raised py-1 shadow-xl',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((item, i) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onMouseEnter={() => !item.disabled && setActive(i)}
              onClick={() => {
                if (item.disabled) return
                item.onSelect()
                setOpen(false)
              }}
              className={cx(
                'flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs cursor-pointer',
                item.danger ? 'text-danger hover:bg-danger/10' : 'text-ink-2 hover:bg-ink-3/10 hover:text-ink',
                item.disabled && 'cursor-not-allowed opacity-40',
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

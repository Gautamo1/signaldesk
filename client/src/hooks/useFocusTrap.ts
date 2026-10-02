import { useEffect } from 'react'
import type { RefObject } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Trap focus within a container while `active`, restore focus on close.
 * Used by modals, drawers, and the command palette.
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    if (!active || !ref.current) return
    const node = ref.current
    const previous = document.activeElement as HTMLElement | null

    const focusables = () => Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE))

    // Initial focus: explicit [data-autofocus], else first focusable, else the container.
    const initial =
      node.querySelector<HTMLElement>('[data-autofocus]') ?? focusables()[0] ?? node
    if (!initial.hasAttribute('tabindex')) initial.setAttribute('tabindex', '-1')
    initial.focus({ preventScroll: true })

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const els = focusables()
      if (!els.length) return
      const first = els[0]
      const last = els[els.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    node.addEventListener('keydown', onKeyDown)
    return () => {
      node.removeEventListener('keydown', onKeyDown)
      previous?.focus?.({ preventScroll: true })
    }
  }, [ref, active])
}

import { useUIStore } from '../../store/ui'

/** Read a theme CSS variable as a concrete color (for canvas/SVG charts). */
export function useThemeColor(name: string): string {
  const theme = useUIStore((s) => s.theme)
  void theme // re-render on theme change
  if (typeof window === 'undefined') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export function useChartColors() {
  return {
    accent: useThemeColor('--sd-accent'),
    ok: useThemeColor('--sd-ok'),
    warn: useThemeColor('--sd-warn'),
    danger: useThemeColor('--sd-danger'),
    info: useThemeColor('--sd-info'),
    grid: useThemeColor('--sd-hairline'),
    text3: useThemeColor('--sd-ink-3'),
  }
}

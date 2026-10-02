const MIN = 60_000
const HOUR = 3_600_000
const DAY = 86_400_000

/** Compact relative time: "just now", "4m ago", "3h ago", "12d ago", else a short date. */
export function timeAgo(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return '—'
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return '—'
  const diff = now - t
  if (diff < MIN) return 'just now'
  if (diff < HOUR) return `${Math.floor(diff / MIN)}m ago`
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`
  if (diff < 30 * DAY) return `${Math.floor(diff / DAY)}d ago`
  return fmtDate(iso)
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** HH:MM:SS clock for the status bar. */
export function fmtClock(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString(undefined, { hour12: false })
}

export function pct(value: number): string {
  return `${Math.round(value * 100)}%`
}

/** "Every 5 min" / "Hourly" style label for a check interval in minutes. */
export function frequencyLabel(mins: number): string {
  if (mins < 60) return `Every ${mins} min`
  if (mins % 1440 === 0) return `${mins / 1440 === 1 ? 'Daily' : `Every ${mins / 1440} d`}`
  if (mins % 60 === 0) return mins === 60 ? 'Hourly' : `Every ${mins / 60} h`
  return `${mins} min`
}

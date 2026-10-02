/** Join class names, skipping falsy values. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

/** Trailing debounce. Returns a function with .cancel(). */
export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let timer: ReturnType<typeof setTimeout> | null = null
  const debounced = (...args: A) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn(...args)
    }, ms)
  }
  debounced.cancel = () => {
    if (timer) clearTimeout(timer)
    timer = null
  }
  return debounced
}

/** Read a JSON value from localStorage, tolerating corruption. */
export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full or unavailable — non-fatal */
  }
}

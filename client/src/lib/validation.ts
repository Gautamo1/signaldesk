/** True for well-formed http(s) URLs. */
export function isUrl(value: string): boolean {
  try {
    const u = new URL(value.trim())
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

/** Parse a comma-separated tag string into clean, deduped slugs. */
export function parseTags(input: string): string[] {
  const seen = new Set<string>()
  for (const raw of input.split(',')) {
    let t = raw.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    if (!t) continue
    t = t.slice(0, 40).replace(/-+$/, '')
    if (t) seen.add(t)
  }
  return [...seen]
}

export function required(value: string | undefined | null): string | null {
  return value && value.trim().length > 0 ? null : 'This field is required'
}

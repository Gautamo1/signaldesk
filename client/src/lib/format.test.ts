import { describe, expect, it } from 'vitest'
import { timeAgo, fmtDate, frequencyLabel, pct } from './format'

const NOW = Date.parse('2026-01-15T12:00:00Z')

describe('timeAgo', () => {
  it('handles null/invalid input', () => {
    expect(timeAgo(null, NOW)).toBe('—')
    expect(timeAgo(undefined, NOW)).toBe('—')
    expect(timeAgo('not-a-date', NOW)).toBe('—')
  })
  it('formats recent intervals', () => {
    expect(timeAgo(new Date(NOW - 10_000).toISOString(), NOW)).toBe('just now')
    expect(timeAgo(new Date(NOW - 4 * 60_000).toISOString(), NOW)).toBe('4m ago')
    expect(timeAgo(new Date(NOW - 3 * 3_600_000).toISOString(), NOW)).toBe('3h ago')
    expect(timeAgo(new Date(NOW - 12 * 86_400_000).toISOString(), NOW)).toBe('12d ago')
  })
  it('falls back to a date beyond 30 days', () => {
    const out = timeAgo(new Date(NOW - 45 * 86_400_000).toISOString(), NOW)
    expect(out).toMatch(/2025|2026/)
  })
})

describe('fmtDate', () => {
  it('formats a valid date and tolerates null', () => {
    expect(fmtDate(null)).toBe('—')
    expect(fmtDate('2026-01-15T00:00:00Z')).toContain('2026')
  })
})

describe('frequencyLabel', () => {
  it('maps intervals to labels', () => {
    expect(frequencyLabel(5)).toBe('Every 5 min')
    expect(frequencyLabel(60)).toBe('Hourly')
    expect(frequencyLabel(360)).toBe('Every 6 h')
    expect(frequencyLabel(1440)).toBe('Daily')
  })
})

describe('pct', () => {
  it('rounds to whole percent', () => {
    expect(pct(0.974)).toBe('97%')
    expect(pct(0)).toBe('0%')
  })
})

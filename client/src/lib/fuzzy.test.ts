import { describe, expect, it } from 'vitest'
import { fuzzyScore } from './fuzzy'

describe('fuzzyScore', () => {
  it('scores empty query as a match', () => {
    expect(fuzzyScore('', 'anything')).toBe(1)
  })
  it('rewards exact substring, especially at the start', () => {
    expect(fuzzyScore('proj', 'Projects list')).toBeGreaterThan(0)
    expect(fuzzyScore('proj', 'Projects list')).toBeGreaterThan(fuzzyScore('proj', 'some project things'))
  })
  it('matches subsequence across words', () => {
    expect(fuzzyScore('pml', 'Project Management List')).toBeGreaterThan(0)
  })
  it('returns 0 when the query is not a subsequence', () => {
    expect(fuzzyScore('zzz', 'Project list')).toBe(0)
  })
})

import { describe, expect, it } from 'vitest'
import { isUrl, parseTags, required } from './validation'

describe('isUrl', () => {
  it('accepts http and https URLs', () => {
    expect(isUrl('https://example.com')).toBe(true)
    expect(isUrl('http://example.com/a/b?c=d')).toBe(true)
    expect(isUrl('  https://example.com  ')).toBe(true)
  })
  it('rejects non-URLs and other schemes', () => {
    expect(isUrl('not a url')).toBe(false)
    expect(isUrl('ftp://example.com')).toBe(false)
    expect(isUrl('javascript:alert(1)')).toBe(false)
    expect(isUrl('')).toBe(false)
  })
})

describe('parseTags', () => {
  it('splits on commas and whitespace, slugifies, dedupes', () => {
    expect(parseTags('Shell Companies, shell-companies, ownership, Ownership')).toEqual([
      'shell-companies',
      'ownership',
    ])
  })
  it('strips invalid characters and caps length at 40', () => {
    expect(parseTags('a!b@c d-e-f')).toEqual(['abc-d-e-f'])
    expect(parseTags('x'.repeat(60))).toEqual(['x'.repeat(40)])
  })
  it('handles empty input', () => {
    expect(parseTags('   ,  ')).toEqual([])
  })
})

describe('required', () => {
  it('flags empty values', () => {
    expect(required('')).toBe('This field is required')
    expect(required(null)).toBe('This field is required')
    expect(required('ok')).toBeNull()
  })
})

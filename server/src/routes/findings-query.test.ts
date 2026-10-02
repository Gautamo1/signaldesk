import { describe, expect, it } from 'vitest'
import { buildFindingsQuery } from './findings-query.js'

describe('buildFindingsQuery', () => {
  it('applies no filters by default (active findings only)', () => {
    const { sql, countSql, params } = buildFindingsQuery({})
    expect(sql).toContain('f.archived = false')
    expect(sql).toContain('ORDER BY f.created_at DESC')
    // last two params are limit/offset
    expect(params[params.length - 2]).toBe(25)
    expect(params[params.length - 1]).toBe(0)
  })

  it('parameterizes search text (no interpolation into SQL)', () => {
    const { sql, countSql, params } = buildFindingsQuery({ q: "O'Brien; DROP TABLE findings--" })
    expect(sql).not.toContain("O'Brien")
    expect(params).toContain("%O'Brien; DROP TABLE findings--%")
    expect(countSql).toContain('ILIKE $1')
  })

  it('combines multiple filters with AND', () => {
    const { sql, params } = buildFindingsQuery({ project_id: 'p1', status: 'unread', priority: 'high' })
    expect(sql).toContain('f.project_id = $1')
    expect(sql).toContain('f.status = $2')
    expect(sql).toContain("f.priority = $3")
    expect(params[0]).toBe('p1')
  })

  it('supports tag containment', () => {
    const { sql, params } = buildFindingsQuery({ tag: 'shell-companies' })
    expect(sql).toContain('::text[]')
    expect(params).toContainEqual(['shell-companies'])
  })

  it('whitelists sort keys and clamps paging', () => {
    const bad = buildFindingsQuery({ sort: 'title; DROP TABLE findings--' as never, page: -5, page_size: 9999 })
    expect(bad.sql).not.toContain('DROP TABLE')
    // unknown sort falls back to created_at
    expect(bad.sql).toContain('ORDER BY f.created_at DESC')
    const last = bad.params.length
    expect(bad.params[last - 2]).toBe(100) // page_size clamped
    expect(bad.params[last - 1]).toBe(0) // page clamped to 1 -> offset 0
  })

  it('respects ascending order and confidence sort', () => {
    const { sql } = buildFindingsQuery({ sort: 'confidence', order: 'asc' })
    expect(sql).toContain('f.confidence ASC')
  })
})

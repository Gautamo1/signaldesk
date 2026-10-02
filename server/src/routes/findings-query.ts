/**
 * Findings list query builder — pure and unit-testable.
 * All user input is parameterized; sort keys are whitelisted.
 */

export interface FindingsFilter {
  q?: string
  project_id?: string
  source_id?: string
  category?: string
  status?: string
  priority?: string
  tag?: string
  /** 'active' (default) | 'archived' | 'all' */
  archived?: 'active' | 'archived' | 'all'
  sort?: 'created_at' | 'confidence' | 'priority'
  order?: 'asc' | 'desc'
  page?: number
  page_size?: number
}

const PRIORITY_RANK = `CASE f.priority WHEN 'critical' THEN 4 WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END`

export function buildFindingsQuery(f: FindingsFilter): { sql: string; countSql: string; params: unknown[] } {
  const where: string[] = []
  const params: unknown[] = []

  const archivedMode = f.archived ?? 'active'
  if (archivedMode === 'archived') where.push('f.archived = true')
  else if (archivedMode === 'active') where.push('f.archived = false')

  if (f.q?.trim()) {
    params.push(`%${f.q.trim()}%`)
    where.push(`(f.title ILIKE $${params.length} OR f.summary ILIKE $${params.length})`)
  }
  if (f.project_id) {
    params.push(f.project_id)
    where.push(`f.project_id = $${params.length}`)
  }
  if (f.source_id) {
    params.push(f.source_id)
    where.push(`f.source_id = $${params.length}`)
  }
  if (f.category) {
    params.push(f.category)
    where.push(`f.category = $${params.length}`)
  }
  if (f.status) {
    params.push(f.status)
    where.push(`f.status = $${params.length}`)
  }
  if (f.priority) {
    params.push(f.priority)
    where.push(`f.priority = $${params.length}`)
  }
  if (f.tag) {
    params.push([f.tag])
    where.push(`f.tags @> $${params.length}::text[]`)
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''

  const sortExpr =
    f.sort === 'confidence' ? 'f.confidence' : f.sort === 'priority' ? PRIORITY_RANK : 'f.created_at'
  const orderDir = f.order === 'asc' ? 'ASC' : 'DESC'
  // Secondary sort keeps output stable.
  const orderBy = `${sortExpr} ${orderDir}, f.created_at DESC`

  const page = Math.max(1, Math.floor(f.page ?? 1))
  const pageSize = Math.min(100, Math.max(1, Math.floor(f.page_size ?? 25)))
  params.push(pageSize, (page - 1) * pageSize)

  const select = `
    SELECT f.*,
      s.id AS source_id_j, s.display_name AS source_name, s.url AS source_url,
      p.id AS project_id_j, p.name AS project_name
    FROM findings f
    LEFT JOIN sources s ON s.id = f.source_id
    LEFT JOIN projects p ON p.id = f.project_id`

  const sql = `${select} ${whereSql} ORDER BY ${orderBy} LIMIT $${params.length - 1} OFFSET $${params.length}`
  const countSql = `SELECT count(*)::int AS total FROM findings f ${whereSql}`
  return { sql, countSql, params }
}

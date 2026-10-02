import { Router } from 'express'
import { z } from 'zod'
import { q, qOne } from '../db/pool.js'
import { asyncH, notFoundApi, ApiError } from '../util/http.js'
import { logActivity } from '../db/activity.js'
import { recomputeTags } from '../db/tags.js'

export const projectsRouter = Router()

const STATUS_VALUES = ['active', 'paused', 'archived', 'completed'] as const
const PRIORITY_VALUES = ['low', 'medium', 'high', 'critical'] as const

const tagArray = z.array(z.string().trim().min(1).max(40)).max(12)

const projectSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(120, 'Name must be at most 120 characters'),
  description: z.string().trim().max(2000).default(''),
  status: z.enum(STATUS_VALUES).default('active'),
  priority: z.enum(PRIORITY_VALUES).default('medium'),
  tags: tagArray.default([]),
  source_ids: z.array(z.string().uuid()).max(50).optional(),
})

const PROJECT_SELECT = `
  SELECT p.*,
    (SELECT count(*)::int FROM findings f WHERE f.project_id = p.id AND f.archived = false) AS findings_count,
    (SELECT count(*)::int FROM project_sources ps WHERE ps.project_id = p.id) AS sources_count,
    (SELECT max(f.created_at) FROM findings f WHERE f.project_id = p.id) AS last_activity_at
  FROM projects p`

async function setProjectSources(projectId: string, sourceIds: string[]): Promise<void> {
  await q('DELETE FROM project_sources WHERE project_id = $1', [projectId])
  for (const sid of sourceIds) {
    await q('INSERT INTO project_sources (project_id, source_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [
      projectId,
      sid,
    ])
  }
}

projectsRouter.get(
  '/',
  asyncH(async (req, res) => {
    const status = typeof req.query.status === 'string' && STATUS_VALUES.includes(req.query.status as never)
      ? req.query.status
      : null
    const qText = typeof req.query.q === 'string' && req.query.q.trim() ? req.query.q.trim() : null

    const where: string[] = []
    const params: unknown[] = []
    if (status) {
      params.push(status)
      where.push(`p.status = $${params.length}`)
    }
    if (qText) {
      params.push(`%${qText}%`)
      where.push(`(p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`)
    }
    const sql = `${PROJECT_SELECT}${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY p.updated_at DESC`
    res.json(await q(sql, params))
  }),
)

projectsRouter.post(
  '/',
  asyncH(async (req, res) => {
    const data = projectSchema.parse(req.body ?? {})
    const row = await qOne<{ id: string }>(
      `INSERT INTO projects (name, description, status, priority, tags)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [data.name, data.description, data.status, data.priority, data.tags],
    )
    if (data.source_ids?.length) await setProjectSources(row!.id, data.source_ids)
    await logActivity('project.created', 'project', row!.id, `Project created: ${data.name}`, { projectId: row!.id })
    void recomputeTags().catch(() => undefined)
    res.status(201).json(await qOne(`${PROJECT_SELECT} WHERE p.id = $1`, [row!.id]))
  }),
)

projectsRouter.get(
  '/:id',
  asyncH(async (req, res) => {
    const row = await qOne(`${PROJECT_SELECT} WHERE p.id = $1`, [req.params.id])
    if (!row) return notFoundApi(res, 'Project')
    const sources = await q(
      `SELECT s.* FROM sources s JOIN project_sources ps ON ps.source_id = s.id
       WHERE ps.project_id = $1 ORDER BY s.display_name`,
      [req.params.id],
    )
    const briefsCount = await qOne<{ n: number }>(
      'SELECT count(*)::int AS n FROM briefs WHERE project_id = $1',
      [req.params.id],
    )
    res.json({ ...row, sources, briefs_count: briefsCount?.n ?? 0 })
  }),
)

projectsRouter.patch(
  '/:id',
  asyncH(async (req, res) => {
    const existing = await qOne('SELECT * FROM projects WHERE id = $1', [req.params.id])
    if (!existing) return notFoundApi(res, 'Project')

    const partial = projectSchema.partial().parse(req.body ?? {})
    const fields: string[] = []
    const params: unknown[] = []
    for (const key of ['name', 'description', 'status', 'priority'] as const) {
      if (partial[key] !== undefined) {
        params.push(partial[key])
        fields.push(`${key} = $${params.length}`)
      }
    }
    if (partial.tags !== undefined) {
      params.push(partial.tags)
      fields.push(`tags = $${params.length}`)
    }
    if (!fields.length) throw new ApiError(400, 'No updatable fields provided')

    params.push(req.params.id)
    await q(`UPDATE projects SET ${fields.join(', ')}, updated_at = now() WHERE id = $${params.length}`, params)

    if (partial.source_ids !== undefined) await setProjectSources(req.params.id, partial.source_ids)
    await logActivity('project.updated', 'project', req.params.id, `Project updated: ${partial.name ?? existing.name}`, {
      projectId: req.params.id,
    })
    void recomputeTags().catch(() => undefined)
    res.json(await qOne(`${PROJECT_SELECT} WHERE p.id = $1`, [req.params.id]))
  }),
)

projectsRouter.delete(
  '/:id',
  asyncH(async (req, res) => {
    const existing = await qOne<{ id: string; name: string }>('SELECT id, name FROM projects WHERE id = $1', [
      req.params.id,
    ])
    if (!existing) return notFoundApi(res, 'Project')
    // findings and briefs keep their data (FK ON DELETE SET NULL); links cascade away.
    await q('DELETE FROM projects WHERE id = $1', [req.params.id])
    await logActivity('project.deleted', 'project', existing.id, `Project deleted: ${existing.name}`)
    res.status(204).end()
  }),
)

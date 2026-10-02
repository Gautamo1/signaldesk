import { Router } from 'express'
import { z } from 'zod'
import { q, qOne } from '../db/pool.js'
import { asyncH, notFoundApi } from '../util/http.js'
import { logActivity } from '../db/activity.js'
import { recomputeTags } from '../db/tags.js'
import { buildFindingsQuery } from './findings-query.js'

export const findingsRouter = Router()

const PRIORITY_VALUES = ['low', 'medium', 'high', 'critical'] as const
const STATUS_VALUES = ['unread', 'read', 'reviewed'] as const

const findingSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(300, 'Title must be at most 300 characters'),
  summary: z.string().trim().max(4000).default(''),
  source_id: z.string().uuid().nullable().optional(),
  project_id: z.string().uuid().nullable().optional(),
  category: z.enum(['document', 'filing', 'statement', 'dataset', 'correspondence', 'imagery']).default('document'),
  confidence: z.number().min(0).max(1).default(0.5),
  priority: z.enum(PRIORITY_VALUES).default('medium'),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
})

const UPDATE_FIELDS = ['title', 'summary', 'source_id', 'project_id', 'category', 'confidence', 'priority', 'status', 'archived', 'tags'] as const

findingsRouter.get(
  '/',
  asyncH(async (req, res) => {
    const g = (key: string): string | undefined =>
      typeof req.query[key] === 'string' && req.query[key] !== '' ? req.query[key] : undefined

    const filter = {
      q: g('q'),
      project_id: g('project_id'),
      source_id: g('source_id'),
      category: g('category'),
      status: g('status'),
      priority: g('priority'),
      tag: g('tag'),
      archived: (g('archived') as 'active' | 'archived' | 'all' | undefined) ?? 'active',
      sort: (g('sort') as 'created_at' | 'confidence' | 'priority' | undefined) ?? 'created_at',
      order: (g('order') as 'asc' | 'desc' | undefined) ?? 'desc',
      page: g('page') ? Number(g('page')) : 1,
      page_size: g('page_size') ? Number(g('page_size')) : 25,
    }
    const { sql, countSql, params } = buildFindingsQuery(filter)
    const [items, totalRow] = await Promise.all([q(sql, params), qOne<{ total: number }>(countSql, params)])
    const page = Math.max(1, filter.page ?? 1)
    const pageSize = Math.min(100, Math.max(1, filter.page_size ?? 25))
    res.json({ items, total: totalRow?.total ?? 0, page, pages: Math.max(1, Math.ceil((totalRow?.total ?? 0) / pageSize)), page_size: pageSize })
  }),
)

findingsRouter.get(
  '/by-ids',
  asyncH(async (req, res) => {
    const raw = typeof req.query.ids === 'string' ? req.query.ids : ''
    const ids = raw.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 100)
    if (!ids.length) return res.json([])
    const rows = await q('SELECT id, title FROM findings WHERE id = ANY($1::uuid[])', [ids])
    res.json(rows)
  }),
)

findingsRouter.post(
  '/',
  asyncH(async (req, res) => {
    const data = findingSchema.parse(req.body ?? {})
    const row = await qOne<{ id: string }>(
      `INSERT INTO findings (title, summary, source_id, project_id, category, confidence, priority, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [data.title, data.summary, data.source_id ?? null, data.project_id ?? null, data.category, data.confidence, data.priority, data.tags],
    )
    await logActivity('finding.created', 'finding', row!.id, `New finding: ${data.title}`, {
      projectId: data.project_id ?? null,
    })
    void recomputeTags().catch(() => undefined)
    res.status(201).json(row)
  }),
)

findingsRouter.get(
  '/:id',
  asyncH(async (req, res) => {
    const row = await qOne(
      `SELECT f.*, s.display_name AS source_name, s.url AS source_url, p.name AS project_name
       FROM findings f
       LEFT JOIN sources s ON s.id = f.source_id
       LEFT JOIN projects p ON p.id = f.project_id
       WHERE f.id = $1`,
      [req.params.id],
    )
    if (!row) return notFoundApi(res, 'Finding')
    res.json(row)
  }),
)

findingsRouter.patch(
  '/:id',
  asyncH(async (req, res) => {
    const existing = await qOne<{ id: string; title: string; project_id: string | null }>(
      'SELECT id, title, project_id FROM findings WHERE id = $1',
      [req.params.id],
    )
    if (!existing) return notFoundApi(res, 'Finding')

    const body = (req.body ?? {}) as Record<string, unknown>
    const fields: string[] = []
    const params: unknown[] = []
    for (const key of UPDATE_FIELDS) {
      if (body[key] === undefined) continue
      let value: unknown = body[key]
      if (key === 'confidence') value = Math.min(1, Math.max(0, Number(value)))
      if (key === 'status' && !STATUS_VALUES.includes(value as never)) throw new Error('bad status')
      if (key === 'priority' && !PRIORITY_VALUES.includes(value as never)) throw new Error('bad priority')
      params.push(value)
      fields.push(`${key} = $${params.length}`)
    }
    if (!fields.length) return res.json(existing)

    // FK safety: reject unknown source/project references.
    if (body.source_id) {
      const s = await qOne('SELECT id FROM sources WHERE id = $1', [body.source_id])
      if (!s) throw new Error('unknown source')
    }
    if (body.project_id) {
      const p = await qOne('SELECT id FROM projects WHERE id = $1', [body.project_id])
      if (!p) throw new Error('unknown project')
    }

    params.push(req.params.id)
    await q(`UPDATE findings SET ${fields.join(', ')}, updated_at = now() WHERE id = $${params.length}`, params)

    const updated = await qOne<{ status: string; archived: boolean }>('SELECT status, archived FROM findings WHERE id = $1', [
      req.params.id,
    ])
    if (body.status === 'reviewed' && existing.title) {
      await logActivity('finding.reviewed', 'finding', existing.id, `Finding reviewed: ${existing.title}`, {
        projectId: existing.project_id,
      })
    }
    if (body.archived === true) {
      await logActivity('finding.archived', 'finding', existing.id, `Finding archived: ${existing.title}`, {
        projectId: existing.project_id,
      })
    }
    void recomputeTags().catch(() => undefined)
    res.json({ ...updated, id: existing.id })
  }),
)

findingsRouter.delete(
  '/:id',
  asyncH(async (req, res) => {
    const existing = await qOne<{ id: string; title: string; project_id: string | null }>(
      'SELECT id, title, project_id FROM findings WHERE id = $1',
      [req.params.id],
    )
    if (!existing) return notFoundApi(res, 'Finding')
    await q('DELETE FROM findings WHERE id = $1', [req.params.id])
    await logActivity('finding.deleted', 'finding', existing.id, `Finding deleted: ${existing.title}`, {
      projectId: existing.project_id,
    })
    res.status(204).end()
  }),
)

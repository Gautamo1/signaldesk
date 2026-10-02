import { Router } from 'express'
import { z } from 'zod'
import { q, qOne } from '../db/pool.js'
import { asyncH, notFoundApi } from '../util/http.js'
import { logActivity } from '../db/activity.js'

export const briefsRouter = Router()

const keyFindingSchema = z.object({
  id: z.string().min(1),
  text: z.string().max(2000).default(''),
  finding_ids: z.array(z.string().uuid()).max(30).default([]),
})
const evidenceRefSchema = z.object({
  type: z.enum(['finding', 'source']),
  id: z.string().min(1),
  label: z.string().max(300).default(''),
})
const timelineSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  label: z.string().min(1).max(300),
  detail: z.string().max(1000).default(''),
})

const briefCreateSchema = z.object({
  title: z.string().trim().min(2, 'Title must be at least 2 characters').max(200),
  project_id: z.string().uuid().nullable().optional(),
})

const briefUpdateSchema = z.object({
  base_updated_at: z.string().datetime().optional(),
  title: z.string().trim().min(1).max(200).optional(),
  executive_summary: z.string().max(8000).optional(),
  key_findings: z.array(keyFindingSchema).max(40).optional(),
  evidence_refs: z.array(evidenceRefSchema).max(60).optional(),
  timeline: z.array(timelineSchema).max(60).optional(),
  open_questions: z.array(z.string().min(1).max(500)).max(30).optional(),
  analyst_notes: z.string().max(8000).optional(),
  conclusions: z.string().max(8000).optional(),
  status: z.enum(['draft', 'final']).optional(),
})

const BRIEF_SELECT = `
  SELECT b.*, p.name AS project_name
  FROM briefs b LEFT JOIN projects p ON p.id = b.project_id`

/** Resolve linked finding ids into {id,title} so the client doesn't need a second round trip. */
async function withFindingTitles(brief: Record<string, unknown>) {
  const keyFindings = (brief.key_findings ?? []) as Array<{ finding_ids?: string[] }>
  const allIds = [...new Set(keyFindings.flatMap((k) => k.finding_ids ?? []))]
  const byId = new Map<string, string>()
  if (allIds.length) {
    const rows = await q<{ id: string; title: string }>('SELECT id, title FROM findings WHERE id = ANY($1::uuid[])', [allIds])
    for (const r of rows) byId.set(r.id, r.title)
  }
  brief.key_findings = keyFindings.map((k) => ({
    ...k,
    finding_titles: (k.finding_ids ?? []).map((id) => byId.get(id)).filter(Boolean) as string[],
  }))
  return brief
}

briefsRouter.get(
  '/',
  asyncH(async (req, res) => {
    const projectId = typeof req.query.project_id === 'string' && req.query.project_id ? req.query.project_id : null
    const params: unknown[] = []
    let where = ''
    if (projectId) {
      params.push(projectId)
      where = 'WHERE b.project_id = $1'
    }
    res.json(await q(`${BRIEF_SELECT} ${where} ORDER BY b.updated_at DESC`, params))
  }),
)

briefsRouter.post(
  '/',
  asyncH(async (req, res) => {
    const data = briefCreateSchema.parse(req.body ?? {})
    if (data.project_id) {
      const p = await qOne('SELECT id FROM projects WHERE id = $1', [data.project_id])
      if (!p) return notFoundApi(res, 'Project')
    }
    const row = await qOne<{ id: string }>(
      `INSERT INTO briefs (title, project_id) VALUES ($1, $2) RETURNING *`,
      [data.title, data.project_id ?? null],
    )
    await logActivity('brief.created', 'brief', row!.id, `Brief created: ${data.title}`, { projectId: data.project_id ?? null })
    res.status(201).json(row)
  }),
)

briefsRouter.get(
  '/:id',
  asyncH(async (req, res) => {
    const row = await qOne<Record<string, unknown>>(`${BRIEF_SELECT} WHERE b.id = $1`, [req.params.id])
    if (!row) return notFoundApi(res, 'Brief')
    res.json(await withFindingTitles(row))
  }),
)

briefsRouter.patch(
  '/:id',
  asyncH(async (req, res) => {
    const existing = await qOne<{ id: string; title: string; updated_at: string; project_id: string | null }>(
      'SELECT id, title, updated_at, project_id FROM briefs WHERE id = $1',
      [req.params.id],
    )
    if (!existing) return notFoundApi(res, 'Brief')

    const data = briefUpdateSchema.parse(req.body ?? {})

    // Optimistic concurrency: reject stale writes so a second client/session
    // can't silently clobber newer edits.
    if (data.base_updated_at && new Date(data.base_updated_at).getTime() !== new Date(existing.updated_at).getTime()) {
      const server = await qOne(`${BRIEF_SELECT} WHERE b.id = $1`, [req.params.id])
      return res.status(409).json({
        error: 'This brief was updated elsewhere after you started editing',
        code: 'conflict',
        server,
      })
    }

    const fields: string[] = []
    const params: unknown[] = []
    for (const key of [
      'title',
      'executive_summary',
      'key_findings',
      'evidence_refs',
      'timeline',
      'open_questions',
      'analyst_notes',
      'conclusions',
      'status',
    ] as const) {
      if (data[key] === undefined) continue
      params.push(typeof data[key] === 'object' ? JSON.stringify(data[key]) : data[key])
      fields.push(`${key} = $${params.length}`)
    }
    if (!fields.length) return res.json(existing)

    params.push(req.params.id)
    await q(`UPDATE briefs SET ${fields.join(', ')}, updated_at = now() WHERE id = $${params.length}`, params)

    if (data.status === 'final') {
      await logActivity('brief.finalized', 'brief', existing.id, `Brief finalized: ${data.title ?? existing.title}`, {
        projectId: existing.project_id,
      })
    }
    res.json(await qOne(`${BRIEF_SELECT} WHERE b.id = $1`, [req.params.id]))
  }),
)

briefsRouter.delete(
  '/:id',
  asyncH(async (req, res) => {
    const existing = await qOne<{ id: string; title: string; project_id: string | null }>(
      'SELECT id, title, project_id FROM briefs WHERE id = $1',
      [req.params.id],
    )
    if (!existing) return notFoundApi(res, 'Brief')
    await q('DELETE FROM briefs WHERE id = $1', [req.params.id])
    await logActivity('brief.deleted', 'brief', existing.id, `Brief deleted: ${existing.title}`, {
      projectId: existing.project_id,
    })
    res.status(204).end()
  }),
)

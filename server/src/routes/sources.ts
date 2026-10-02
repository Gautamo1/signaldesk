import { Router } from 'express'
import { z } from 'zod'
import { q, qOne } from '../db/pool.js'
import { asyncH, notFoundApi } from '../util/http.js'
import { logActivity } from '../db/activity.js'
import { checkSource } from '../sim/monitor.js'

export const sourcesRouter = Router()

const SOURCE_CATEGORIES = [
  'wire-service',
  'financial-media',
  'regulatory-filings',
  'sanctions-data',
  'public-records',
  'academic',
  'other',
] as const

/** Normalize a URL for duplicate detection: lowercase host, no trailing slash, no default port. */
export function normalizeUrl(raw: string): string {
  const u = new URL(raw.trim())
  const isDefaultPort = (u.protocol === 'https:' && u.port === '443') || (u.protocol === 'http:' && u.port === '80')
  const host = isDefaultPort ? u.hostname.toLowerCase() : `${u.hostname.toLowerCase()}:${u.port}`
  const path = u.pathname.replace(/\/+$/, '') || ''
  return `${u.protocol}//${host}${path}${u.search}`
}

const sourceSchema = z.object({
  display_name: z.string().trim().min(2, 'Display name must be at least 2 characters').max(120),
  url: z.string().url('Must be a valid http(s) URL'),
  category: z.enum(SOURCE_CATEGORIES).default('other'),
  check_interval_min: z.number().int().min(1).max(1440).default(60),
  enabled: z.boolean().default(true),
  notes: z.string().trim().max(2000).default(''),
})

const SOURCE_SELECT = `
  SELECT s.*,
    (SELECT count(*)::int FROM findings f WHERE f.source_id = s.id AND f.archived = false) AS findings_count,
    (SELECT coalesce(json_agg(json_build_object('id', p.id, 'name', p.name) ORDER BY p.name), '[]')
       FROM project_sources ps JOIN projects p ON p.id = ps.project_id WHERE ps.source_id = s.id) AS monitoring_projects
  FROM sources s`

sourcesRouter.get(
  '/',
  asyncH(async (_req, res) => {
    const rows = await q(`${SOURCE_SELECT} ORDER BY s.display_name`)
    res.json(rows)
  }),
)

sourcesRouter.post(
  '/',
  asyncH(async (req, res) => {
    const data = sourceSchema.parse(req.body ?? {})
    const urlKey = normalizeUrl(data.url)
    const dup = await qOne('SELECT id FROM sources WHERE url_key = $1', [urlKey])
    if (dup) {
      return res.status(409).json({ error: 'A source with this URL already exists', code: 'duplicate' })
    }
    const row = await qOne<{ id: string }>(
      `INSERT INTO sources (url, url_key, display_name, category, check_interval_min, enabled, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [data.url, urlKey, data.display_name, data.category, data.check_interval_min, data.enabled, data.notes],
    )
    await logActivity('source.created', 'source', row!.id, `Source added: ${data.display_name}`)
    res.status(201).json(row)
  }),
)

sourcesRouter.get(
  '/:id',
  asyncH(async (req, res) => {
    const row = await qOne(`${SOURCE_SELECT} WHERE s.id = $1`, [req.params.id])
    if (!row) return notFoundApi(res, 'Source')
    res.json(row)
  }),
)

sourcesRouter.patch(
  '/:id',
  asyncH(async (req, res) => {
    const existing = await qOne<{ id: string; display_name: string }>('SELECT id, display_name FROM sources WHERE id = $1', [
      req.params.id,
    ])
    if (!existing) return notFoundApi(res, 'Source')

    const partial = sourceSchema.partial().parse(req.body ?? {})
    const fields: string[] = []
    const params: unknown[] = []
    for (const key of ['display_name', 'url', 'category', 'check_interval_min', 'enabled', 'notes'] as const) {
      if (partial[key] === undefined) continue
      let value: unknown = partial[key]
      if (key === 'url') value = normalizeUrl(String(partial.url))
      params.push(value)
      fields.push(`${key} = $${params.length}`)
    }
    if (!fields.length) return res.json(existing)

    // If the URL changed, re-check uniqueness under the new key.
    if (partial.url !== undefined) {
      const dup = await qOne('SELECT id FROM sources WHERE url_key = $1 AND id <> $2', [
        normalizeUrl(String(partial.url)),
        req.params.id,
      ])
      if (dup) return res.status(409).json({ error: 'A source with this URL already exists', code: 'duplicate' })
    }

    params.push(req.params.id)
    await q(`UPDATE sources SET ${fields.join(', ')}, updated_at = now() WHERE id = $${params.length}`, params)
    res.json(await qOne(`${SOURCE_SELECT} WHERE s.id = $1`, [req.params.id]))
  }),
)

sourcesRouter.delete(
  '/:id',
  asyncH(async (req, res) => {
    const existing = await qOne<{ id: string; display_name: string }>('SELECT id, display_name FROM sources WHERE id = $1', [
      req.params.id,
    ])
    if (!existing) return notFoundApi(res, 'Source')
    // Findings survive with source_id NULLed ("Unknown source").
    await q('DELETE FROM sources WHERE id = $1', [req.params.id])
    await logActivity('source.deleted', 'source', existing.id, `Source removed: ${existing.display_name}`)
    res.status(204).end()
  }),
)

/** Manually trigger a (simulated) check for one source. */
sourcesRouter.post(
  '/:id/check-now',
  asyncH(async (req, res) => {
    const existing = await qOne('SELECT id FROM sources WHERE id = $1', [req.params.id])
    if (!existing) return notFoundApi(res, 'Source')
    const result = await checkSource(req.params.id)
    res.json({ ...result, source_id: req.params.id })
  }),
)

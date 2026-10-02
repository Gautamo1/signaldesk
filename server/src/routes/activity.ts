import { Router } from 'express'
import { q } from '../db/pool.js'
import { asyncH } from '../util/http.js'

export const activityRouter = Router()

activityRouter.get(
  '/',
  asyncH(async (req, res) => {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 30)))
    const projectId = typeof req.query.project_id === 'string' && req.query.project_id ? req.query.project_id : null

    const params: unknown[] = [limit]
    let where = ''
    if (projectId) {
      params.push(projectId)
      where = `WHERE project_id = $${params.length}`
    }
    const rows = await q(
      `SELECT id, type, entity_type, entity_id, project_id, message, meta, created_at
       FROM activity_events ${where} ORDER BY created_at DESC, id DESC LIMIT $1`,
      params,
    )
    res.json(rows)
  }),
)

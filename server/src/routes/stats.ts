import { Router } from 'express'
import { q, qOne } from '../db/pool.js'
import { asyncH } from '../util/http.js'

export const statsRouter = Router()

/** Aggregated metrics for the Command Center dashboard. */
statsRouter.get(
  '/',
  asyncH(async (_req, res) => {
    const [src, failing, fTotal, f30, f7, unread, highUnread, proj, briefs] = await Promise.all([
      qOne<{ total: number; enabled: number }>(
        'SELECT count(*)::int AS total, count(*) FILTER (WHERE enabled) ::int AS enabled FROM sources',
      ),
      qOne<{ n: number }>("SELECT count(*)::int AS n FROM sources WHERE enabled AND last_status = 'error'"),
      qOne<{ n: number }>('SELECT count(*)::int AS n FROM findings WHERE archived = false'),
      qOne<{ n: number }>('SELECT count(*)::int AS n FROM findings WHERE archived = false AND created_at >= now() - interval \'30 days\''),
      qOne<{ n: number }>('SELECT count(*)::int AS n FROM findings WHERE archived = false AND created_at >= now() - interval \'7 days\''),
      qOne<{ n: number }>("SELECT count(*)::int AS n FROM findings WHERE archived = false AND status = 'unread'"),
      qOne<{ n: number }>(
        "SELECT count(*)::int AS n FROM findings WHERE archived = false AND status = 'unread' AND priority IN ('high','critical')",
      ),
      qOne<{ total: number; active: number }>(
        'SELECT count(*)::int AS total, count(*) FILTER (WHERE status = \'active\') ::int AS active FROM projects',
      ),
      qOne<{ total: number; final: number; draft: number }>(
        "SELECT count(*)::int AS total, count(*) FILTER (WHERE status = 'final') ::int AS \"final\", count(*) FILTER (WHERE status = 'draft') ::int AS draft FROM briefs",
      ),
    ])

    // 14-day findings series (gaps filled with zero).
    const since = new Date(Date.now() - 13 * 86_400_000)
    since.setUTCHours(0, 0, 0, 0)
    const dayRows = await q<{ d: string; n: number }>(
      `SELECT to_char(date_trunc('day', created_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS d, count(*)::int AS n
       FROM findings WHERE archived = false AND created_at >= $1 GROUP BY 1`,
      [since.toISOString()],
    )
    const byDay = new Map(dayRows.map((r) => [r.d, r.n]))
    const series: Array<{ date: string; count: number }> = []
    for (let i = 0; i < 14; i++) {
      const d = new Date(since.getTime() + i * 86_400_000)
      const key = d.toISOString().slice(0, 10)
      series.push({ date: key, count: byDay.get(key) ?? 0 })
    }

    const byCategory = await q<{ category: string; n: number }>(
      `SELECT category, count(*)::int AS n FROM findings WHERE archived = false GROUP BY category ORDER BY n DESC LIMIT 6`,
    )

    const [alertFindings, alertSources] = await Promise.all([
      q<{ id: string; title: string; created_at: string; source_name: string | null }>(
        `SELECT id, title, priority, created_at, s.display_name AS source_name
         FROM findings f LEFT JOIN sources s ON s.id = f.source_id
         WHERE f.archived = false AND f.status = 'unread' AND f.priority IN ('high','critical')
         ORDER BY CASE f.priority WHEN 'critical' THEN 0 ELSE 1 END, f.created_at DESC LIMIT 4`,
      ),
      q<{ id: string; display_name: string; last_checked_at: string | null }>(
        `SELECT id, display_name, last_checked_at FROM sources WHERE enabled AND last_status = 'error' ORDER BY last_checked_at DESC LIMIT 2`,
      ),
    ])

    res.json({
      sources: { total: src?.total ?? 0, enabled: src?.enabled ?? 0, failing: failing?.n ?? 0 },
      findings: {
        total: fTotal?.n ?? 0,
        last30: f30?.n ?? 0,
        last7: f7?.n ?? 0,
        unread: unread?.n ?? 0,
        highPriorityUnread: highUnread?.n ?? 0,
      },
      projects: { total: proj?.total ?? 0, active: proj?.active ?? 0 },
      briefs: { total: briefs?.total ?? 0, final: briefs?.final ?? 0, draft: briefs?.draft ?? 0 },
      series14d: series,
      byCategory,
      alerts: [
        ...alertFindings.map((f) => ({
          type: 'finding' as const,
          id: f.id,
          title: f.title,
          detail: f.source_name ?? 'Unknown source',
          created_at: f.created_at,
          href: `/inbox?q=${encodeURIComponent(f.title.split(' ').slice(0, 3).join(' '))}`,
        })),
        ...alertSources.map((s) => ({
          type: 'source' as const,
          id: s.id,
          title: `Source check failing: ${s.display_name}`,
          detail: 'Last check returned an error',
          created_at: s.last_checked_at,
          href: '/sources',
        })),
      ],
    })
  }),
)

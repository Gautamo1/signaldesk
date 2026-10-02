import { q, qOne } from '../db/pool.js'
import { logActivity } from '../db/activity.js'
import { recomputeTags } from '../db/tags.js'
import { generateFindingsForSource } from './templates.js'

/**
 * SIMULATED MONITORING ENGINE
 * ---------------------------
 * Ticks every `intervalMs` and "checks" each enabled source whose configured
 * interval has elapsed. Checks are synthetic: findings are generated from the
 * template pools in ./templates.ts. No network requests are made to any
 * configured URL. This is clearly labelled in the UI ("Simulated feed").
 */

export interface CheckResult {
  status: 'ok' | 'new-findings' | 'error'
  created: number
}

let timer: NodeJS.Timeout | null = null

async function pickProjectForSource(sourceId: string): Promise<string | null> {
  const rows = await q<{ project_id: string }>(
    'SELECT project_id FROM project_sources WHERE source_id = $1',
    [sourceId],
  )
  if (!rows.length) return null
  return rows[Math.floor(Math.random() * rows.length)].project_id
}

/** Run a single (simulated) check for one source. */
export async function checkSource(sourceId: string): Promise<CheckResult> {
  const source = await qOne<{ id: string; display_name: string; category: string }>(
    'SELECT id, display_name, category FROM sources WHERE id = $1',
    [sourceId],
  )
  if (!source) throw new Error('Source not found')

  // ~4% of checks fail, to exercise the error state in the UI.
  const failed = Math.random() < 0.04
  if (failed) {
    await q("UPDATE sources SET last_checked_at = now(), last_status = 'error', updated_at = now() WHERE id = $1", [sourceId])
    await logActivity('source.check_failed', 'source', sourceId, `Source check failed: ${source.display_name}`, {
      meta: { simulated: true },
    })
    return { status: 'error', created: 0 }
  }

  const generated = generateFindingsForSource(source.category)
  for (const f of generated) {
    const projectId = await pickProjectForSource(sourceId)
    const row = await qOne<{ id: string }>(
      `INSERT INTO findings (title, summary, source_id, project_id, category, confidence, priority, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [f.title, f.summary, sourceId, projectId, f.category, f.confidence, f.priority, f.tags],
    )
    await logActivity('finding.created', 'finding', row?.id ?? null, `New finding: ${f.title}`, {
      projectId,
      meta: { source_id: sourceId, simulated: true },
    })
  }

  const status = generated.length > 0 ? 'new-findings' : 'ok'
  await q(
    'UPDATE sources SET last_checked_at = now(), last_status = $2, updated_at = now() WHERE id = $1',
    [sourceId, status],
  )
  await logActivity('source.checked', 'source', sourceId, `Source checked: ${source.display_name} — ${generated.length} new finding${generated.length === 1 ? '' : 's'}`, {
    meta: { status, created: generated.length, simulated: true },
  })
  void recomputeTags().catch(() => undefined)

  return { status, created: generated.length }
}

/** Check every enabled source whose interval has elapsed. */
async function tick(): Promise<void> {
  try {
    const due = await q<{ id: string }>(
      `SELECT id FROM sources
       WHERE enabled = true
         AND (last_checked_at IS NULL OR last_checked_at <= now() - make_interval(secs => check_interval_min * 60))`,
    )
    for (const s of due) {
      await checkSource(s.id).catch((err) => console.error('[monitor] check failed:', err.message))
    }
  } catch (err) {
    // DB may be mid cold-start; the next tick will retry.
    console.error('[monitor] tick error:', (err as Error).message)
  }
}

export function startMonitor(intervalMs = 20_000): void {
  if (timer) return
  timer = setInterval(() => void tick(), intervalMs)
  timer.unref?.()
  console.log('[monitor] simulated feed active (no live scraping is performed)')
}

export function stopMonitor(): void {
  if (timer) clearInterval(timer)
  timer = null
}

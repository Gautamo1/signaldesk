import { q } from './pool.js'

/** Append an event to the research activity timeline. */
export async function logActivity(
  type: string,
  entityType: string,
  entityId: string | null,
  message: string,
  opts: { projectId?: string | null; meta?: Record<string, unknown> } = {},
): Promise<void> {
  await q(
    `INSERT INTO activity_events (type, entity_type, entity_id, project_id, message, meta)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [type, entityType, entityId, opts.projectId ?? null, message, JSON.stringify(opts.meta ?? {})],
  )
}

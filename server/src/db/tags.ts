import { q } from './pool.js'

/**
 * Keep the tags registry in sync with live usage across projects and findings.
 * Counts are recomputed on each write (cheap at this scale) so the registry
 * always reflects reality without trigger-based bookkeeping.
 */
export async function recomputeTags(): Promise<void> {
  await q(`
    WITH usage AS (
      SELECT unnest(tags) AS name FROM projects
      UNION ALL
      SELECT unnest(tags) AS name FROM findings WHERE archived = false
    ),
    agg AS (SELECT name, count(*)::int AS c FROM usage GROUP BY name)
    INSERT INTO tags (name, count)
    SELECT name, c FROM agg
    ON CONFLICT (name) DO UPDATE SET count = EXCLUDED.count
  `)
}

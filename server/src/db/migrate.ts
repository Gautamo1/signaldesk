import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { pool } from './pool.js'

const MIGRATIONS_DIR = path.join(import.meta.dirname, 'migrations')

/**
 * Apply pending SQL migrations in lexical order.
 * Idempotent: applied files are tracked in schema_migrations.
 */
export async function migrate(): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)
    const applied = new Set(
      (await client.query('SELECT name FROM schema_migrations')).rows.map((r: { name: string }) => r.name),
    )

    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort()
    for (const file of files) {
      if (applied.has(file)) continue
      const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8')
      console.log(`[migrate] applying ${file}`)
      await client.query('BEGIN')
      try {
        await client.query(sql)
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file])
        await client.query('COMMIT')
      } catch (err) {
        await client.query('ROLLBACK')
        throw new Error(`Migration ${file} failed: ${(err as Error).message}`)
      }
    }
    console.log('[migrate] up to date')
  } finally {
    client.release()
  }
}

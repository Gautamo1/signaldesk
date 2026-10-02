import pg from 'pg'
import { config } from '../config.js'

if (!config.databaseUrl) {
  console.error('[db] DATABASE_URL is not set. Copy .env.example to .env or configure the environment.')
}

let urlHost = ''
try {
  urlHost = new URL(config.databaseUrl).hostname
} catch {
  /* invalid URL — pool construction will surface a clear error */
}

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 20_000,
  // Render-managed Postgres requires TLS. Local postgres does not offer it by default.
  ssl: urlHost.includes('render.com') ? { rejectUnauthorized: false } : undefined,
})

pool.on('error', (err) => {
  console.error('[db] idle client error:', err.message)
})

const RETRIABLE = new Set(['ECONNREFUSED', 'ETIMEDOUT', 'EHOSTUNREACH', 'ENOTFOUND', '57P01', '08006'])

/**
 * Run a query with retries for transient connection failures.
 * Free-tier managed Postgres spins down after inactivity; the first query
 * after a cold start can fail while the instance wakes up.
 */
async function queryWithRetry(text: string, params: unknown[], attempt = 0): Promise<pg.QueryResult> {
  try {
    return await pool.query(text, params)
  } catch (err) {
    const code = (err as { code?: string }).code ?? ''
    if (attempt < 3 && RETRIABLE.has(code)) {
      const delay = 1_500 * (attempt + 1)
      console.warn(`[db] transient error ${code}, retrying in ${delay}ms (attempt ${attempt + 1}/3)`)
      await new Promise((r) => setTimeout(r, delay))
      return queryWithRetry(text, params, attempt + 1)
    }
    throw err
  }
}

export async function q<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T[]> {
  const res = await queryWithRetry(text, params)
  return res.rows as T[]
}

export async function qOne<T = Record<string, unknown>>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await q<T>(text, params)
  return rows[0] ?? null
}

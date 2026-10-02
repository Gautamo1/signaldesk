import express from 'express'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { config } from './config.js'
import { pool } from './db/pool.js'
import { migrate } from './db/migrate.js'
import { seedIfEmpty } from './db/seed.js'
import { startMonitor, stopMonitor } from './sim/monitor.js'
import { sendError } from './util/http.js'
import { projectsRouter } from './routes/projects.js'
import { findingsRouter } from './routes/findings.js'
import { sourcesRouter } from './routes/sources.js'
import { briefsRouter } from './routes/briefs.js'
import { activityRouter } from './routes/activity.js'
import { statsRouter } from './routes/stats.js'

const app = express()
app.disable('x-powered-by')
app.use(express.json({ limit: '1mb' }))

// Minimal security headers.
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('Referrer-Policy', 'same-origin')
  next()
})

// Optional artificial latency for slow-network QA (SIMULATE_LATENCY_MS).
if (config.simulateLatencyMs > 0) {
  app.use('/api', (_req, _res, next) => {
    setTimeout(next, config.simulateLatencyMs)
  })
}

app.get('/api/health', async (_req, res) => {
  try {
    await Promise.race([
      pool.query('SELECT 1'),
      new Promise((_, reject) => setTimeout(() => reject(new Error('db timeout')), 3000)),
    ])
    res.json({ ok: true, db: 'ok', sim: true })
  } catch {
    res.status(503).json({ ok: false, db: 'degraded', sim: true })
  }
})

app.get('/api/monitor', async (_req, res) => {
  const { qOne } = await import('./db/pool.js')
  const row = await qOne<{ total: number; enabled: number; last_check: string | null }>(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE enabled) ::int AS enabled,
            max(last_checked_at) AS last_check
     FROM sources`,
  )
  res.json({
    total: row?.total ?? 0,
    enabled: row?.enabled ?? 0,
    last_check: row?.last_check ?? null,
    sim: true,
  })
})

app.use('/api/projects', projectsRouter)
app.use('/api/findings', findingsRouter)
app.use('/api/sources', sourcesRouter)
app.use('/api/briefs', briefsRouter)
app.use('/api/activity', activityRouter)
app.use('/api/stats', statsRouter)

// Unknown API route.
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found', code: 'not_found' })
})

// Static SPA (production build). In dev, Vite serves the client on :5173 and
// proxies /api here.
const clientDir = path.join(import.meta.dirname, '../../dist/client')
if (existsSync(clientDir)) {
  app.use(express.static(clientDir))
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(clientDir, 'index.html'))
  })
}

// Central error handler.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  sendError(res, err)
})

async function main() {
  await migrate()
  await seedIfEmpty()
  const server = app.listen(config.port, () => {
    console.log(`[signaldesk] API + SPA listening on :${config.port}`)
  })
  startMonitor(20_000)

  const shutdown = (signal: string) => {
    console.log(`[signaldesk] ${signal} received, shutting down`)
    stopMonitor()
    server.close(() => {
      void pool.end().then(() => process.exit(0))
    })
    setTimeout(() => process.exit(1), 8000).unref()
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT', () => shutdown('SIGINT'))
}

main().catch((err) => {
  console.error('[signaldesk] fatal startup error:', err)
  process.exit(1)
})

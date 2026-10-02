import 'dotenv/config'

export const config = {
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL ?? '',
  /** Artificial latency (ms) added to every /api response — for slow-network QA. */
  simulateLatencyMs: Math.max(0, Number(process.env.SIMULATE_LATENCY_MS || 0)),
  seedOnEmpty: (process.env.SEED_ON_EMPTY ?? 'true') !== 'false',
  isProd: process.env.NODE_ENV === 'production',
}

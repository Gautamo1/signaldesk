# SignalDesk

A production-quality **research operations console**: monitor sources, triage an evidence inbox, track projects, and produce structured research briefs — in a dense, terminal-inspired interface.

## Stack

| Layer     | Technology                                                        |
| --------- | ----------------------------------------------------------------- |
| Client    | React 19 · TypeScript · Vite 6 · Tailwind CSS v4 · TanStack Query · Recharts · Zustand |
| Server    | Node 20+ · Express 4 · zod validation                              |
| Database  | PostgreSQL 16 (local: Docker Compose; production: Render Postgres) |
| Deploy    | Single service — Express serves the built SPA **and** the JSON API |

## Quick start (local)

```bash
# 1. Install
npm install

# 2. Database (Docker required)
docker compose up -d db

# 3. Environment
cp .env.example .env        # defaults work for the docker-compose DB

# 4. Run API (:4000) + client dev server (:5173, proxies /api)
npm run dev
```

Open http://localhost:5173 — an empty database is seeded automatically with a realistic research world (5 projects, 6 sources, ~47 findings over 30 days, 2 briefs).

### Production build

```bash
npm run build     # tsc server -> server/dist, vite client -> dist/client
npm start         # node server/dist/index.js  (serves SPA + API on PORT)
```

### Tests & checks

```bash
npm test          # vitest unit tests (validation, fuzzy search, formatting, SQL query builder)
npm run typecheck # strict TS for client + server
```

## Features

- **Command Center** — KPI tiles with sparklines, 14-day findings trend, category breakdown, priority alerts, live activity timeline, project overview table.
- **Projects** — create/edit/delete with tags (chip input), status & priority, source assignment; detail page with Overview / Findings / Briefs / Sources tabs. Deleting a project keeps its findings and briefs (they become unassigned).
- **Evidence Inbox** — debounced search + filters (status, project, type, sort) synced to the URL; paginated table (cards on mobile); J/K/Enter/X/M/R keyboard triage; detail drawer with inline project assignment, priority control, review/archive (with undo toast), and source link.
- **Source Monitor** — add/edit/remove sources with URL duplicate detection (409 → field error), category + check frequency, enable/disable toggle, manual “Check now”, per-source status (idle/ok/new-findings/error).
- **Brief Builder** — sectioned editor (exec summary, key findings with linked evidence, evidence references, timeline, open questions, analyst notes, conclusions); debounced autosave with visible save state; optimistic-concurrency conflict banner (load latest / overwrite); live “paper” preview that prints cleanly to PDF.
- **Command Palette** — `⌘K` / `Ctrl+K` (or `/`): fuzzy search across commands, navigation, projects, and findings; recent items persisted locally.
- **Design system** — dark-first terminal aesthetic with light theme (persisted), Inter + JetBrains Mono (self-hosted), gold accent, status bar, keyboard shortcuts, reduced-motion support, focus-visible rings, ARIA labels/roles throughout.

## Simulated feed (important)

Source monitoring is **intentionally simulated**: a server-side engine ticks every 20 s and generates synthetic findings from per-category template pools when a source's interval elapses (~4% of checks fail to exercise the error state). **No live web scraping or outbound requests are made** — configured URLs are reference metadata only. The UI labels this in the status bar, on the Source Monitor banner, and here.

## Architecture notes

- `server/src/db/migrate.ts` applies SQL migrations from `db/migrations/` in order (tracked in `schema_migrations`).
- `server/src/sim/monitor.ts` is the monitor engine; `sim/templates.ts` holds the content pools keyed by source category.
- Findings list filtering lives in a pure, unit-tested builder (`routes/findings-query.ts`) — all input parameterized, sort keys whitelisted.
- Brief updates accept `base_updated_at`; mismatched writes return `409 { code: 'conflict', server }` so the client can offer recovery instead of clobbering.
- DB pool retries transient connection errors (free-tier Postgres cold starts).
- `SIMULATE_LATENCY_MS=800 npm run dev` adds artificial API latency for slow-network QA.

## Environment variables

| Variable            | Default                                  | Purpose                          |
| ------------------- | ---------------------------------------- | -------------------------------- |
| `DATABASE_URL`      | —                                        | Postgres connection string       |
| `PORT`              | `4000`                                   | HTTP port (Render injects it)    |
| `SIMULATE_LATENCY_MS` | `0`                                    | Artificial API latency for QA    |
| `SEED_ON_EMPTY`     | `true`                                   | Seed a fresh database            |

## Deployment (Render)

1. Create a **Postgres** instance on Render and copy its internal `DATABASE_URL`.
2. Push this repo to GitHub; create a **Web Service**:
   - Build: `npm install`
   - Start: `npm run build && npm start` (or build command `npm run build`, start command `npm start`)
   - Env: `DATABASE_URL` from step 1.
3. The service serves the SPA and API on one URL; migrations + seeding run automatically at boot.

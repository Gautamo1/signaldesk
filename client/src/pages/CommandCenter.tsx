import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useActivity, useProjects, useStats } from '../api/hooks'
import type { Stats } from '../api/types'
import { cx } from '../lib/utils'
import { timeAgo } from '../lib/format'
import { CATEGORY_LABELS } from '../lib/constants'
import { Icon } from '../components/ui/Icon'
import type { IconName } from '../components/ui/Icon'
import { Skeleton, TableSkeleton, ErrorState, EmptyState } from '../components/ui/Skeleton'
import { PriorityBadge, ProjectStatusBadge, Dot } from '../components/ui/Badge'
import { Sparkline } from '../components/charts/Sparkline'
import { TrendArea } from '../components/charts/TrendArea'
import { CategoryBars } from '../components/charts/CategoryBars'

function Card({ title, action, children, className }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx('rounded-lg border border-hairline bg-surface', className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-2.5">
          {title && <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-3">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

function StatTile({ label, value, sub, spark, tone }: { label: string; value: string; sub?: ReactNode; spark?: number[]; tone?: 'ok' | 'warn' | 'danger' }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-hairline bg-surface px-4 py-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">{label}</span>
      <div className="flex items-end justify-between gap-2">
        <span className={cx('font-mono text-[26px] font-semibold leading-none tnum', tone === 'danger' ? 'text-danger' : tone === 'warn' ? 'text-warn' : 'text-ink')}>
          {value}
        </span>
        {spark && <Sparkline data={spark} className="mb-0.5" />}
      </div>
      {sub && <span className="text-[11px] text-ink-2">{sub}</span>}
    </div>
  )
}

function ActivityIcon({ type }: { type: string }) {
  const map: Record<string, { icon: IconName; cls: string }> = {
    'finding.created': { icon: 'zap', cls: 'text-accent bg-accent-soft' },
    'finding.reviewed': { icon: 'check-circle', cls: 'text-ok bg-ok/10' },
    'finding.archived': { icon: 'archive', cls: 'text-ink-2 bg-ink-3/10' },
    'source.checked': { icon: 'radio', cls: 'text-info bg-info/10' },
    'source.check_failed': { icon: 'alert', cls: 'text-danger bg-danger/10' },
    'project.created': { icon: 'folder', cls: 'text-ok bg-ok/10' },
    'project.updated': { icon: 'pencil', cls: 'text-ink-2 bg-ink-3/10' },
    'brief.created': { icon: 'file', cls: 'text-info bg-info/10' },
    'brief.finalized': { icon: 'check-circle', cls: 'text-ok bg-ok/10' },
  }
  const m = map[type] ?? { icon: 'activity', cls: 'text-ink-2 bg-ink-3/10' }
  return (
    <span className={cx('flex size-6 shrink-0 items-center justify-center rounded-full', m.cls)}>
      <Icon name={m.icon} size={12} />
    </span>
  )
}

export function CommandCenter() {
  const stats = useStats()
  const activity = useActivity(14)
  const projects = useProjects()
  if (stats.isError) {
    return <ErrorState message={(stats.error as Error).message} onRetry={() => void stats.refetch()} />
  }

  // Zero-filled fallback keeps TS happy while the first load is in flight;
  // every block below renders its own skeleton until data arrives.
  const s: Stats =
    stats.data ?? {
      sources: { total: 0, enabled: 0, failing: 0 },
      findings: { total: 0, last30: 0, last7: 0, unread: 0, highPriorityUnread: 0 },
      projects: { total: 0, active: 0 },
      briefs: { total: 0, final: 0, draft: 0 },
      series14d: [],
      byCategory: [],
      alerts: [],
    }

  const delta7 = s.findings.last7
  const sparkData = s.series14d.map((d) => d.count)

  return (
    <div className="flex flex-col gap-4 pt-5">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Command Center</h1>
          <p className="mt-0.5 text-xs text-ink-2">Research posture across all monitored projects.</p>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[104px]" />)
        ) : (
          <>
            <StatTile
              label="Sources monitored"
              value={`${s.sources.enabled}/${s.sources.total}`}
              sub={
                s.sources.failing > 0 ? (
                  <span className="text-warn">{s.sources.failing} failing</span>
                ) : (
                  'all checks passing'
                )
              }
            />
            <StatTile
              label="Findings · 30d"
              value={String(s.findings.last30)}
              spark={sparkData}
              sub={
                <span className={delta7 >= 5 ? 'text-ok' : undefined}>
                  +{s.findings.last7} in last 7 days
                </span>
              }
            />
            <StatTile
              label="Unresolved"
              value={String(s.findings.unread)}
              tone={s.findings.highPriorityUnread > 0 ? 'warn' : undefined}
              sub={
                s.findings.highPriorityUnread > 0 ? (
                  <span className="text-warn">{s.findings.highPriorityUnread} high priority</span>
                ) : (
                  'queue clear'
                )
              }
            />
            <StatTile
              label="Briefs generated"
              value={String(s.briefs.final)}
              sub={`${s.briefs.draft} draft${s.briefs.draft === 1 ? '' : 's'} in progress`}
            />
          </>
        )}
      </div>

      {/* Charts + alerts */}
      <div className="grid gap-3 lg:grid-cols-5">
        <Card title="Findings — last 14 days" className="lg:col-span-3">
          {stats.isLoading ? (
            <Skeleton className="m-4 h-[200px]" />
          ) : (
            <div className="p-3">
              <TrendArea data={s.series14d} />
            </div>
          )}
        </Card>

        <Card
          title="Priority alerts"
          className="lg:col-span-2"
          action={
            <Link to="/inbox?status=unread" className="text-[11px] font-medium text-accent hover:underline">
              Open inbox →
            </Link>
          }
        >
          {stats.isLoading ? (
            <div className="flex flex-col gap-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-9" />
              ))}
            </div>
          ) : s.alerts.length === 0 ? (
            <EmptyState icon="check-circle" title="No priority alerts" body="Nothing high-priority is waiting on you." className="py-10" />
          ) : (
            <ul className="divide-y divide-hairline">
              {s.alerts.map((a) => (
                <li key={`${a.type}-${a.id}`}>
                  <Link to={a.href} className="flex items-start gap-2.5 px-4 py-2.5 transition-colors hover:bg-raised">
                    <span className={cx('mt-1', a.type === 'source' ? 'text-danger' : 'text-warn')}>
                      <Icon name={a.type === 'source' ? 'alert' : 'zap'} size={13} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-medium">{a.title}</span>
                      <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-wide text-ink-3">
                        {a.detail} · {timeAgo(a.created_at)}
                      </span>
                    </span>
                    <Icon name="chevron-right" size={13} className="mt-1 shrink-0 text-ink-3" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Activity + categories */}
      <div className="grid gap-3 lg:grid-cols-5">
        <Card title="Activity timeline" className="lg:col-span-3">
          {activity.isLoading ? (
            <div className="flex flex-col gap-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8" />
              ))}
            </div>
          ) : (activity.data ?? []).length === 0 ? (
            <EmptyState icon="activity" title="No activity yet" body="Source checks and findings will appear here." className="py-10" />
          ) : (
            <ol className="max-h-[340px] overflow-y-auto">
              {activity.data!.map((e) => (
                <li key={e.id} className="flex items-start gap-2.5 border-b border-hairline px-4 py-2 last:border-0">
                  <ActivityIcon type={e.type} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px]">{e.message}</p>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-ink-3">{timeAgo(e.created_at)}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card title="Evidence by category" className="lg:col-span-2">
          {stats.isLoading ? (
            <Skeleton className="m-4 h-[200px]" />
          ) : (s.byCategory.length === 0 ? (
            <EmptyState icon="tag" title="No findings yet" className="py-10" />
          ) : (
            <div className="p-3">
              <CategoryBars data={s.byCategory} height={210} />
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 px-1 font-mono text-[10px] uppercase tracking-wide text-ink-3">
                {s.byCategory.map((c) => (
                  <li key={c.category} className="flex items-center gap-1.5">
                    <Dot className="bg-info" />
                    {CATEGORY_LABELS[c.category as keyof typeof CATEGORY_LABELS] ?? c.category} · {c.n}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Card>
      </div>

      {/* Projects table */}
      <Card
        title="Projects"
        action={
          <Link to="/projects" className="text-[11px] font-medium text-accent hover:underline">
            View all →
          </Link>
        }
      >
        {projects.isLoading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : (projects.data ?? []).length === 0 ? (
          <EmptyState
            icon="folder"
            title="No projects yet"
            body="Create your first research project to start routing findings."
            action={
              <Link to="/projects?new=1" className="text-xs font-semibold text-accent hover:underline">
                New project →
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
                  <th className="px-4 py-2 font-medium">Project</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Priority</th>
                  <th className="px-3 py-2 text-right font-medium">Sources</th>
                  <th className="px-3 py-2 text-right font-medium">Findings</th>
                  <th className="px-3 py-2 font-medium">Last activity</th>
                  <th className="w-8" aria-label="Navigate" />
                </tr>
              </thead>
              <tbody>
                {projects.data!.map((p) => (
                  <tr key={p.id} className="border-b border-hairline transition-colors last:border-0 hover:bg-raised">
                    <td className="px-4 py-2.5">
                      <Link to={`/projects/${p.id}`} className="font-medium hover:text-accent hover:underline">
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5"><ProjectStatusBadge status={p.status} /></td>
                    <td className="px-3 py-2.5"><PriorityBadge priority={p.priority} /></td>
                    <td className="px-3 py-2.5 text-right font-mono tnum text-ink-2">{p.sources_count ?? 0}</td>
                    <td className="px-3 py-2.5 text-right font-mono tnum text-ink-2">{p.findings_count ?? 0}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-ink-3">{timeAgo(p.last_activity_at)}</td>
                    <td className="pr-3"><Icon name="chevron-right" size={13} className="text-ink-3" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { Finding } from '../api/types'
import { useActivity, useBriefs, useDeleteProject, useFindings, useProject } from '../api/hooks'
import { timeAgo } from '../lib/format'
import { cx } from '../lib/utils'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { Segmented } from '../components/ui/Segmented'
import { Pagination } from '../components/ui/Pagination'
import { TableSkeleton, EmptyState, ErrorState, Skeleton } from '../components/ui/Skeleton'
import { PriorityBadge, ProjectStatusBadge, TagChip, Dot } from '../components/ui/Badge'
import { ConfirmDialog } from '../components/ui/Modal'
import { ProjectFormModal } from '../features/projects/ProjectFormModal'
import { FindingCard, FindingRow, FindingTableHead } from '../features/inbox/FindingTable'

type Tab = 'overview' | 'findings' | 'briefs' | 'sources'

const SOURCE_STATUS_DOT: Record<string, string> = {
  idle: 'bg-ink-3',
  ok: 'bg-ok',
  'new-findings': 'bg-accent',
  error: 'bg-danger',
}

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'overview'
  const project = useProject(id)

  const [editOpen, setEditOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const deleteMut = useDeleteProject()
  const [findingPage, setFindingPage] = useState(1)
  const findingsQuery = useFindings({ project_id: id, page: findingPage, page_size: 10 })

  if (project.isLoading) {
    return (
      <div className="flex flex-col gap-4 pt-5">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[300px]" />
      </div>
    )
  }
  if (project.isError || !project.data) {
    return (
      <ErrorState
        title="Project not found"
        message={project.isError ? (project.error as Error).message : 'This project may have been deleted.'}
        onRetry={() => void project.refetch()}
      />
    )
  }

  const p = project.data

  function setTab(t: Tab) {
    if (t === 'overview') params.delete('tab')
    else params.set('tab', t)
    setParams(params, { replace: true })
  }

  return (
    <div className="flex flex-col gap-4 pt-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/projects" className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-ink-3 hover:text-accent">
            <Icon name="arrow-left" size={12} /> Projects
          </Link>
          <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight">{p.name}</h1>
            <ProjectStatusBadge status={p.status} />
            <PriorityBadge priority={p.priority} />
          </div>
          {p.description && <p className="mt-1.5 max-w-[720px] text-[12.5px] leading-relaxed text-ink-2">{p.description}</p>}
          {p.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {p.tags.map((t) => <TagChip key={t} tag={t} />)}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="secondary" icon={<Icon name="pencil" size={13} />} onClick={() => setEditOpen(true)}>
            Edit
          </Button>
          <Button size="sm" variant="primary" icon={<Icon name="file" size={13} />} onClick={() => navigate(`/briefs?new=1&project=${p.id}`)}>
            New brief
          </Button>
          <Button size="sm" variant="danger" icon={<Icon name="trash" size={13} />} onClick={() => setConfirmDelete(true)} aria-label="Delete project">
            Delete
          </Button>
        </div>
      </div>

      <Segmented<Tab>
        ariaLabel="Project sections"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'overview', label: 'Overview' },
          { value: 'findings', label: `Findings (${p.findings_count ?? 0})` },
          { value: 'briefs', label: `Briefs (${p.briefs_count ?? 0})` },
          { value: 'sources', label: `Sources (${p.sources_count ?? 0})` },
        ]}
      />

      {tab === 'overview' && <OverviewTab projectId={p.id} />}
      {tab === 'findings' && (
        <FindingsTab findingsQuery={findingsQuery} page={findingPage} onPage={setFindingPage} />
      )}
      {tab === 'briefs' && <BriefsTab projectId={p.id} />}
      {tab === 'sources' && <SourcesTab sourceIds={(p.sources ?? []).map((s) => s)} />}

      <ProjectFormModal open={editOpen} onClose={() => setEditOpen(false)} project={p} />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete project?"
        danger
        confirmLabel="Delete project"
        loading={deleteMut.isPending}
        body={
          <>
            <strong className="text-ink">{p.name}</strong> will be removed. Its {p.findings_count ?? 0} findings and {p.briefs_count ?? 0} briefs are kept but become unassigned.
          </>
        }
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          try {
            await deleteMut.mutateAsync(p.id)
            navigate('/projects')
          } catch {
            /* toast shown by mutation */
          }
        }}
      />
    </div>
  )
}

/* --------------------------------- tabs --------------------------------- */

function OverviewTab({ projectId }: { projectId: string }) {
  const project = useProject(projectId)
  const recent = useFindings({ project_id: projectId, page_size: 5 })
  const activity = useActivity(10, projectId)
  const p = project.data

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <section className="rounded-lg border border-hairline bg-surface">
        <header className="border-b border-hairline px-4 py-2.5">
          <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-3">Recent findings</h2>
        </header>
        {recent.isLoading ? (
          <TableSkeleton rows={4} cols={4} />
        ) : (recent.data?.items ?? []).length === 0 ? (
          <EmptyState icon="inbox" title="No findings yet" body="Findings from this project's sources will appear here." className="py-10" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[12.5px]">
              <tbody>
                {(recent.data?.items ?? []).map((f) => (
                  <FindingRow key={f.id} finding={f} onOpen={() => {}} showProject={false} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-hairline bg-surface">
        <header className="border-b border-hairline px-4 py-2.5">
          <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-ink-3">Project activity</h2>
        </header>
        {activity.isLoading ? (
          <div className="flex flex-col gap-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-7" />)}</div>
        ) : (activity.data ?? []).length === 0 ? (
          <EmptyState icon="activity" title="No activity yet" className="py-10" />
        ) : (
          <ol className="max-h-[320px] overflow-y-auto">
            {activity.data!.map((e) => (
              <li key={e.id} className="flex items-start gap-2.5 border-b border-hairline px-4 py-2 last:border-0">
                <Dot className="mt-1.5 bg-accent" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12.5px]">{e.message}</p>
                  <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-ink-3">{timeAgo(e.created_at)}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {p && (
        <div className="grid grid-cols-3 gap-3 lg:col-span-2">
          <MiniStat label="Findings" value={String(p.findings_count ?? 0)} />
          <MiniStat label="Briefs" value={String(p.briefs_count ?? 0)} />
          <MiniStat label="Monitored sources" value={String(p.sources_count ?? 0)} />
        </div>
      )}
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-hairline bg-surface px-4 py-3">
      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">{label}</span>
      <p className="mt-1 font-mono text-xl font-semibold tnum">{value}</p>
    </div>
  )
}

function FindingsTab({ findingsQuery, page, onPage }: { findingsQuery: ReturnType<typeof useFindings>; page: number; onPage: (p: number) => void }) {
  const q = findingsQuery
  return (
    <div className="overflow-hidden rounded-lg border border-hairline bg-surface">
      {q.isLoading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : q.isError ? (
        <ErrorState message={(q.error as Error).message} onRetry={() => void q.refetch()} />
      ) : (q.data?.items ?? []).length === 0 ? (
        <EmptyState icon="inbox" title="No findings for this project" body="Assign findings from the inbox or wait for the monitor to route new ones." />
      ) : (
        <>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[900px] text-left">
              <thead>
                <FindingTableHead showProject={false} />
              </thead>
              <tbody>
                {(q.data?.items ?? []).map((f: Finding) => (
                  <FindingRow key={f.id} finding={f} onOpen={() => {}} showProject={false} />
                ))}
              </tbody>
            </table>
          </div>
          <ul className="divide-y divide-hairline md:hidden">
            {(q.data?.items ?? []).map((f) => (
              <FindingCard key={f.id} finding={f} onOpen={() => {}} />
            ))}
          </ul>
          <Pagination page={page} pages={q.data?.pages ?? 1} total={q.data?.total ?? 0} onPage={onPage} />
        </>
      )}
    </div>
  )
}

function BriefsTab({ projectId }: { projectId: string }) {
  const briefs = useBriefs(projectId)
  return (
    <div className="overflow-hidden rounded-lg border border-hairline bg-surface">
      {briefs.isLoading ? (
        <TableSkeleton rows={3} cols={4} />
      ) : (briefs.data ?? []).length === 0 ? (
        <EmptyState
          icon="file"
          title="No briefs for this project yet"
          body="Turn reviewed findings into a structured research brief."
          action={
            <Link to={`/briefs?new=1&project=${projectId}`} className="text-xs font-semibold text-accent hover:underline">
              Start a brief →
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-hairline">
          {briefs.data!.map((b) => (
            <li key={b.id}>
              <Link to={`/briefs/${b.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-raised">
                <Icon name="file" size={15} className="shrink-0 text-ink-3" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{b.title}</span>
                  <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-wide text-ink-3">
                    {b.key_findings.length} key findings · updated {timeAgo(b.updated_at)}
                  </span>
                </span>
                <span className={cx('rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider', b.status === 'final' ? 'border-ok/25 bg-ok/10 text-ok' : 'border-warn/25 bg-warn/10 text-warn')}>
                  {b.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function SourcesTab({ sourceIds }: { sourceIds: Array<{ id: string; display_name: string; url: string; category: string; check_interval_min: number; last_checked_at: string | null; last_status: string; enabled: boolean }> }) {
  return (
    <div className="overflow-hidden rounded-lg border border-hairline bg-surface">
      {sourceIds.length === 0 ? (
        <EmptyState
          icon="radio"
          title="No sources assigned"
          body="Assign sources to this project from the edit dialog so routed findings land here."
          action={
            <Link to="/sources?new=1" className="text-xs font-semibold text-accent hover:underline">
              Add a source →
            </Link>
          }
        />
      ) : (
        <ul className="divide-y divide-hairline">
          {sourceIds.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Dot className={SOURCE_STATUS_DOT[s.last_status] ?? 'bg-ink-3'} />
              <span className="min-w-0 flex-1">
                <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 truncate font-medium hover:text-accent">
                  {s.display_name}
                  <Icon name="external" size={11} className="shrink-0 text-ink-3" />
                </a>
                <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-wide text-ink-3">
                  {s.category} · last check {timeAgo(s.last_checked_at)}
                </span>
              </span>
              {!s.enabled && <span className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-ink-3">disabled</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

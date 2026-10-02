import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useProjects, useDeleteProject } from '../api/hooks'
import type { ProjectStatus } from '../api/types'
import { timeAgo } from '../lib/format'
import { Button } from '../components/ui/Button'
import { Icon } from '../components/ui/Icon'
import { Segmented } from '../components/ui/Segmented'
import { TableSkeleton, EmptyState, ErrorState } from '../components/ui/Skeleton'
import { PriorityBadge, ProjectStatusBadge, TagChip } from '../components/ui/Badge'
import { ConfirmDialog } from '../components/ui/Modal'
import { ProjectFormModal } from '../features/projects/ProjectFormModal'

type Filter = 'all' | ProjectStatus

export function ProjectsPage() {
  const [params, setParams] = useSearchParams()
  const filter = (params.get('filter') as Filter) || 'all'
  const [formOpen, setFormOpen] = useState(false)
  const [toDelete, setToDelete] = useState<string | null>(null)
  const navigate = useNavigate()

  const projects = useProjects(filter === 'all' ? undefined : filter)
  const deleteMut = useDeleteProject()

  // Deep link: /projects?new=1 opens the create modal (used by command palette).
  if (params.get('new') === '1') {
    setFormOpen(true)
    params.delete('new')
    setParams(params, { replace: true })
  }

  const data = projects.data ?? []
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: data.length, active: 0, paused: 0, completed: 0, archived: 0 }
    for (const p of data) c[p.status]++
    return c
  }, [data])

  function setFilter(f: Filter) {
    if (f === 'all') params.delete('filter')
    else params.set('filter', f)
    setParams(params, { replace: true })
  }

  const deleteTarget = data.find((p) => p.id === toDelete)

  return (
    <div className="flex flex-col gap-4 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Research Projects</h1>
          <p className="mt-0.5 text-xs text-ink-2">{data.length} projects · {counts.active} active</p>
        </div>
        <Button variant="primary" icon={<Icon name="plus" size={14} />} onClick={() => setFormOpen(true)}>
          New project
        </Button>
      </div>

      <Segmented<Filter>
        ariaLabel="Filter projects by status"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: `All ${counts.all ? `(${counts.all})` : ''}` },
          { value: 'active', label: `Active ${counts.active ? `(${counts.active})` : ''}` },
          { value: 'paused', label: `Paused ${counts.paused ? `(${counts.paused})` : ''}` },
          { value: 'completed', label: `Completed ${counts.completed ? `(${counts.completed})` : ''}` },
          { value: 'archived', label: `Archived ${counts.archived ? `(${counts.archived})` : ''}` },
        ]}
      />

      <div className="overflow-hidden rounded-lg border border-hairline bg-surface">
        {projects.isLoading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : projects.isError ? (
          <ErrorState message={(projects.error as Error).message} onRetry={() => void projects.refetch()} />
        ) : data.length === 0 ? (
          <EmptyState
            icon="folder"
            title={filter === 'all' ? 'No projects yet' : `No ${filter} projects`}
            body="Projects group findings, sources, and briefs around a single investigation."
            action={
              <Button variant="primary" size="sm" onClick={() => setFormOpen(true)} icon={<Icon name="plus" size={13} />}>
                New project
              </Button>
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[820px] text-left text-[12.5px]">
                <thead>
                  <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
                    <th className="px-4 py-2 font-medium">Project</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Priority</th>
                    <th className="px-3 py-2 text-right font-medium">Sources</th>
                    <th className="px-3 py-2 text-right font-medium">Findings</th>
                    <th className="px-3 py-2 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((p) => (
                    <tr key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="cursor-pointer border-b border-hairline transition-colors last:border-0 hover:bg-raised">
                      <td className="max-w-[340px] px-4 py-3">
                        <Link to={`/projects/${p.id}`} className="font-medium hover:text-accent" onClick={(e) => e.stopPropagation()}>
                          {p.name}
                        </Link>
                        {p.description && <p className="mt-0.5 truncate text-[11.5px] text-ink-3">{p.description}</p>}
                        {p.tags.length > 0 && (
                          <span className="mt-1.5 flex flex-wrap gap-1">
                            {p.tags.slice(0, 3).map((t) => <TagChip key={t} tag={t} />)}
                            {p.tags.length > 3 && <span className="font-mono text-[10px] text-ink-3">+{p.tags.length - 3}</span>}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3"><ProjectStatusBadge status={p.status} /></td>
                      <td className="px-3 py-3"><PriorityBadge priority={p.priority} /></td>
                      <td className="px-3 py-3 text-right font-mono tnum text-ink-2">{p.sources_count ?? 0}</td>
                      <td className="px-3 py-3 text-right font-mono tnum text-ink-2">{p.findings_count ?? 0}</td>
                      <td className="px-3 py-3 font-mono text-[11px] text-ink-3">{timeAgo(p.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <ul className="divide-y divide-hairline md:hidden">
              {data.map((p) => (
                <li key={p.id}>
                  <Link to={`/projects/${p.id}`} className="block px-4 py-3 hover:bg-raised">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{p.name}</span>
                      <ProjectStatusBadge status={p.status} />
                    </div>
                    {p.description && <p className="mt-1 line-clamp-2 text-[11.5px] text-ink-3">{p.description}</p>}
                    <div className="mt-2 flex items-center gap-3 font-mono text-[10px] uppercase tracking-wide text-ink-3">
                      <PriorityBadge priority={p.priority} />
                      <span>{p.sources_count ?? 0} sources</span>
                      <span>{p.findings_count ?? 0} findings</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <ProjectFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onCreated={(p) => navigate(`/projects/${p.id}`)}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete project?"
        danger
        confirmLabel="Delete project"
        loading={deleteMut.isPending}
        body={
          <>
            <strong className="text-ink">{deleteTarget?.name}</strong> will be removed. Its{' '}
            <strong className="text-ink">{deleteTarget?.findings_count ?? 0} findings</strong> and{' '}
            <strong className="text-ink">{deleteTarget?.briefs_count ?? 0} briefs</strong> are kept but become unassigned. This cannot be undone.
          </>
        }
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return
          try {
            await deleteMut.mutateAsync(toDelete)
            setToDelete(null)
          } catch {
            /* toast shown by mutation */
          }
        }}
      />
    </div>
  )
}

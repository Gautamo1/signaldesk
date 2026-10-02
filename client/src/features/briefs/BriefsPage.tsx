import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useBriefs, useCreateBrief, useDeleteBrief, useProjects } from '../../api/hooks'
import { timeAgo } from '../../lib/format'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { Field, Input, Select } from '../../components/ui/Field'
import { TableSkeleton, EmptyState, ErrorState } from '../../components/ui/Skeleton'
import { Modal, ConfirmDialog } from '../../components/ui/Modal'

export function BriefsPage() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const briefs = useBriefs()
  const projects = useProjects()
  const createMut = useCreateBrief()
  const deleteMut = useDeleteBrief()

  const [modalOpen, setModalOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [projectId, setProjectId] = useState('')
  const [titleError, setTitleError] = useState<string | null>(null)
  const [toDelete, setToDelete] = useState<string | null>(null)

  // Deep link: /briefs?new=1[&project=id] opens the create modal.
  useEffect(() => {
    if (params.get('new') === '1') {
      setProjectId(params.get('project') ?? '')
      setTitle('')
      setTitleError(null)
      setModalOpen(true)
      params.delete('new')
      params.delete('project')
      setParams(params, { replace: true })
    }
  }, [params, setParams])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    if (title.trim().length < 2) {
      setTitleError('Title must be at least 2 characters')
      return
    }
    try {
      const created = await createMut.mutateAsync({ title: title.trim(), project_id: projectId || null })
      setModalOpen(false)
      navigate(`/briefs/${created.id}`)
    } catch (err) {
      setTitleError((err as Error).message)
    }
  }

  const list = briefs.data ?? []
  const deleteTarget = list.find((b) => b.id === toDelete)

  return (
    <div className="flex flex-col gap-4 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Research Briefs</h1>
          <p className="mt-0.5 text-xs text-ink-2">
            {briefs.data ? `${list.length} brief${list.length === 1 ? '' : 's'} · ${list.filter((b) => b.status === 'final').length} final` : 'Loading…'}
          </p>
        </div>
        <Button variant="primary" icon={<Icon name="plus" size={14} />} onClick={() => { setProjectId(''); setTitle(''); setModalOpen(true) }}>
          New brief
        </Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-hairline bg-surface">
        {briefs.isLoading ? (
          <TableSkeleton rows={4} cols={4} />
        ) : briefs.isError ? (
          <ErrorState message={(briefs.error as Error).message} onRetry={() => void briefs.refetch()} />
        ) : list.length === 0 ? (
          <EmptyState
            icon="file"
            title="No briefs yet"
            body="A brief turns reviewed findings into a structured, citable research report."
            action={
              <Button variant="primary" size="sm" onClick={() => setModalOpen(true)} icon={<Icon name="plus" size={13} />}>
                Start your first brief
              </Button>
            }
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] text-left text-[12.5px]">
                <thead>
                  <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
                    <th className="px-4 py-2 font-medium">Brief</th>
                    <th className="px-3 py-2 font-medium">Project</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 text-right font-medium">Key findings</th>
                    <th className="px-3 py-2 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((b) => (
                    <tr key={b.id} onClick={() => navigate(`/briefs/${b.id}`)} className="cursor-pointer border-b border-hairline transition-colors last:border-0 hover:bg-raised">
                      <td className="max-w-[360px] px-4 py-3">
                        <span className="block truncate font-medium">{b.title}</span>
                        {b.executive_summary && <span className="mt-0.5 block truncate text-[11.5px] text-ink-3">{b.executive_summary}</span>}
                      </td>
                      <td className="max-w-[200px] px-3 py-3">
                        {b.project_name ? (
                          <span className="block truncate text-ink-2">{b.project_name}</span>
                        ) : (
                          <span className="text-[11px] italic text-ink-3">Unassigned</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${b.status === 'final' ? 'border-ok/25 bg-ok/10 text-ok' : 'border-warn/25 bg-warn/10 text-warn'}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right font-mono tnum text-ink-2">{b.key_findings.length}</td>
                      <td className="whitespace-nowrap px-3 py-3 font-mono text-[11px] tnum text-ink-3">{timeAgo(b.updated_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-hairline md:hidden">
              {list.map((b) => (
                <li key={b.id}>
                  <button type="button" onClick={() => navigate(`/briefs/${b.id}`)} className="w-full px-4 py-3 text-left hover:bg-raised cursor-pointer">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{b.title}</span>
                      <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${b.status === 'final' ? 'border-ok/25 bg-ok/10 text-ok' : 'border-warn/25 bg-warn/10 text-warn'}`}>
                        {b.status}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-wide text-ink-3">
                      {b.project_name ?? 'Unassigned'} · updated {timeAgo(b.updated_at)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* New brief modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="New research brief"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={createMut.isPending} form="new-brief-form" type="submit">
              Create & open editor
            </Button>
          </>
        }
      >
        <form id="new-brief-form" onSubmit={onCreate} className="flex flex-col gap-4" noValidate>
          <Field label="Title" required error={titleError}>
            <Input
              data-autofocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Meridian Holdings — Beneficial Ownership Assessment"
              invalid={Boolean(titleError)}
              maxLength={200}
            />
          </Field>
          <Field label="Project" hint="Optional — links the brief to a project for routing and context.">
            <Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              <option value="">— No project —</option>
              {(projects.data ?? []).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Delete brief?"
        danger
        confirmLabel="Delete brief"
        loading={deleteMut.isPending}
        body={<><strong className="text-ink">{deleteTarget?.title}</strong> will be permanently deleted.</>}
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

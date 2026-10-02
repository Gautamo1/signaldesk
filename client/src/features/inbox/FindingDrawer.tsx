import { useEffect, useRef } from 'react'
import type { Finding } from '../../api/types'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { fmtDateTime, timeAgo } from '../../lib/format'
import { useProjects, useUpdateFinding } from '../../api/hooks'
import { useToast } from '../../components/ui/Toast'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { Select } from '../../components/ui/Field'
import { CategoryBadge, ConfidenceBar, PriorityBadge, TagChip } from '../../components/ui/Badge'
import { Segmented } from '../../components/ui/Segmented'
import type { Priority } from '../../api/types'

interface Props {
  finding: Finding | null
  onClose: () => void
}

/** Right-hand detail drawer (full-screen sheet on mobile) with inline triage actions. */
export function FindingDrawer({ finding, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref, Boolean(finding))
  const updateMut = useUpdateFinding()
  const projects = useProjects()
  const toast = useToast()

  useEffect(() => {
    if (!finding) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [finding, onClose])

  if (!finding) return null
  const f = finding

  function patch(data: Partial<Finding>, successMsg?: string) {
    updateMut.mutate(
      { id: f.id, data },
      { onSuccess: () => successMsg && toast.success(successMsg), onError: (e) => toast.error(e.message) },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={`Finding: ${f.title}`}
        className="sd-enter relative flex h-full w-full flex-col overflow-y-auto border-l border-border bg-raised sm:w-[480px]"
      >
        <div className="flex items-center justify-between gap-2 border-b border-hairline px-5 py-3">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">Finding detail</span>
          <button type="button" onClick={onClose} className="rounded p-1 text-ink-3 hover:bg-ink-3/10 hover:text-ink cursor-pointer" aria-label="Close drawer">
            <Icon name="x" size={16} />
          </button>
        </div>

        <div className="flex flex-col gap-5 px-5 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={f.category} />
            <PriorityBadge priority={f.priority} />
            {f.archived && <span className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-ink-3">Archived</span>}
          </div>

          <h2 className="text-[17px] font-semibold leading-snug">{f.title}</h2>

          {f.summary && <p className="text-[13px] leading-relaxed text-ink-2">{f.summary}</p>}

          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-hairline bg-surface p-3.5">
            <div>
              <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">Source</dt>
              <dd className="mt-1 flex items-center gap-1.5 text-[12.5px]">
                {f.source_url ? (
                  <a href={f.source_url} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-1 text-accent hover:underline">
                    <span className="truncate">{f.source_name ?? 'Unknown'}</span>
                    <Icon name="external" size={11} className="shrink-0" />
                  </a>
                ) : (
                  <span className="italic text-ink-3">Unknown source</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">Received</dt>
              <dd className="mt-1 font-mono text-[12px] tnum" title={fmtDateTime(f.created_at)}>{timeAgo(f.created_at)}</dd>
            </div>
            <div className="col-span-2">
              <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">Confidence</dt>
              <dd className="mt-1"><ConfidenceBar value={f.confidence} /></dd>
            </div>
          </dl>

          {f.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {f.tags.map((t) => <TagChip key={t} tag={t} />)}
            </div>
          )}

          {/* Assign to project */}
          <div>
            <label htmlFor="drawer-project" className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">
              Project
            </label>
            <div className="mt-1.5">
              <Select
                id="drawer-project"
                value={f.project_id ?? ''}
                onChange={(e) => patch({ project_id: e.target.value || null }, 'Project assignment updated')}
              >
                <option value="">— Unassigned —</option>
                {(projects.data ?? []).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </div>
          </div>

          {/* Priority */}
          <div>
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">Priority</span>
            <div className="mt-1.5">
              <Segmented<Priority>
                size="sm"
                ariaLabel="Set priority"
                value={f.priority}
                onChange={(p) => patch({ priority: p }, `Priority set to ${p}`)}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Med' },
                  { value: 'high', label: 'High' },
                  { value: 'critical', label: 'Crit' },
                ]}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
            {f.status !== 'reviewed' ? (
              <Button size="sm" variant="secondary" icon={<Icon name="check-circle" size={13} />} onClick={() => patch({ status: 'reviewed' }, 'Marked as reviewed')}>
                Mark reviewed
              </Button>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ok">
                <Icon name="check-circle" size={14} /> Reviewed
              </span>
            )}
            {f.status === 'unread' ? (
              <Button size="sm" variant="ghost" onClick={() => patch({ status: 'read' }, 'Marked as read')}>
                Mark read
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => patch({ status: 'unread' })}>
                Mark unread
              </Button>
            )}
            {!f.archived ? (
              <Button
                size="sm"
                variant="danger"
                icon={<Icon name="archive" size={13} />}
                onClick={() => {
                  const id = f.id
                  updateMut.mutate(
                    { id, data: { archived: true } },
                    {
                      onSuccess: () =>
                        toast.success('Finding archived', {
                          label: 'Undo',
                          onClick: () => updateMut.mutate({ id, data: { archived: false } }),
                        }),
                      onError: (e) => toast.error(e.message),
                    },
                  )
                  onClose()
                }}
              >
                Archive
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => patch({ archived: false }, 'Restored to inbox')}>
                Restore
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

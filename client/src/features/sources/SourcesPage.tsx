import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Source, SourceStatus } from '../../api/types'
import { useSources, useUpdateSource, useDeleteSource, useCheckSourceNow } from '../../api/hooks'
import { cx } from '../../lib/utils'
import { frequencyLabel, timeAgo } from '../../lib/format'
import { SOURCE_CATEGORIES } from '../../lib/constants'
import { readJson, writeJson } from '../../lib/utils'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { Toggle } from '../../components/ui/Toggle'
import { Menu } from '../../components/ui/Menu'
import { TableSkeleton, EmptyState, ErrorState } from '../../components/ui/Skeleton'
import { ConfirmDialog } from '../../components/ui/Modal'
import { SourceFormModal } from './SourceFormModal'

const STATUS_META: Record<SourceStatus, { label: string; dot: string }> = {
  idle: { label: 'Idle', dot: 'bg-ink-3' },
  ok: { label: 'OK', dot: 'bg-ok' },
  'new-findings': { label: 'New findings', dot: 'bg-accent' },
  error: { label: 'Error', dot: 'bg-danger' },
}

function categoryLabel(c: string): string {
  return SOURCE_CATEGORIES.find((x) => x.value === c)?.label ?? c
}

export function SourcesPage() {
  const [params, setParams] = useSearchParams()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Source | null>(null)
  const [toDelete, setToDelete] = useState<Source | null>(null)
  const [bannerHidden, setBannerHidden] = useState(() => readJson('sd:sim-banner-hidden', false))

  const sources = useSources()
  const updateMut = useUpdateSource()
  const deleteMut = useDeleteSource()
  const checkMut = useCheckSourceNow()

  if (params.get('new') === '1') {
    setEditing(null)
    setFormOpen(true)
    params.delete('new')
    setParams(params, { replace: true })
  }

  const list = sources.data ?? []

  function hideBanner() {
    setBannerHidden(true)
    writeJson('sd:sim-banner-hidden', true)
  }

  return (
    <div className="flex flex-col gap-4 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Source Monitor</h1>
          <p className="mt-0.5 text-xs text-ink-2">
            {list.filter((s) => s.enabled).length} of {list.length} sources enabled · checks run automatically on their interval
          </p>
        </div>
        <Button variant="primary" icon={<Icon name="plus" size={14} />} onClick={() => { setEditing(null); setFormOpen(true) }}>
          Add source
        </Button>
      </div>

      {!bannerHidden && (
        <div className="flex items-start gap-2.5 rounded-lg border border-info/25 bg-info/5 px-3.5 py-2.5 text-[12px] leading-relaxed text-ink-2" role="note">
          <span className="mt-0.5 shrink-0 text-info"><Icon name="info" size={14} /></span>
          <p className="flex-1">
            <strong className="text-ink">Simulated feed.</strong> SignalDesk generates synthetic findings for configured sources — no live web scraping is performed, and the URLs below are reference metadata only.
          </p>
          <button type="button" onClick={hideBanner} className="shrink-0 text-ink-3 hover:text-ink cursor-pointer" aria-label="Dismiss notice">
            <Icon name="x" size={14} />
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-hairline bg-surface">
        {sources.isLoading ? (
          <TableSkeleton rows={6} cols={6} />
        ) : sources.isError ? (
          <ErrorState message={(sources.error as Error).message} onRetry={() => void sources.refetch()} />
        ) : list.length === 0 ? (
          <EmptyState
            icon="radio"
            title="No sources configured"
            body="Add a source to start collecting findings. Checks run automatically and new evidence lands in the inbox."
            action={
              <Button variant="primary" size="sm" icon={<Icon name="plus" size={13} />} onClick={() => { setEditing(null); setFormOpen(true) }}>
                Add source
              </Button>
            }
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px] text-left text-[12.5px]">
                <thead>
                  <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
                    <th className="px-4 py-2 font-medium">Source</th>
                    <th className="px-3 py-2 font-medium">Category</th>
                    <th className="px-3 py-2 font-medium">Frequency</th>
                    <th className="px-3 py-2 font-medium">Last check</th>
                    <th className="px-3 py-2 text-right font-medium">Findings</th>
                    <th className="px-3 py-2 font-medium">Enabled</th>
                    <th className="w-10" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {list.map((s) => {
                    const meta = STATUS_META[s.last_status]
                    return (
                      <tr key={s.id} className={cx('border-b border-hairline last:border-0 hover:bg-raised', !s.enabled && 'opacity-55')}>
                        <td className="max-w-[300px] px-4 py-3">
                          <p className="truncate font-medium">{s.display_name}</p>
                          <a href={s.url} target="_blank" rel="noreferrer" className="mt-0.5 flex items-center gap-1 truncate font-mono text-[10.5px] text-ink-3 hover:text-accent">
                            <span className="truncate">{s.url.replace(/^https?:\/\//, '')}</span>
                            <Icon name="external" size={10} className="shrink-0" />
                          </a>
                        </td>
                        <td className="px-3 py-3 text-[12px] text-ink-2">{categoryLabel(s.category)}</td>
                        <td className="whitespace-nowrap px-3 py-3 font-mono text-[11px] tnum text-ink-2">{frequencyLabel(s.check_interval_min)}</td>
                        <td className="whitespace-nowrap px-3 py-3">
                          <span className="flex items-center gap-1.5">
                            <span className={cx('size-1.5 rounded-full', meta.dot)} aria-hidden="true" />
                            <span className="font-mono text-[11px] tnum text-ink-2">{timeAgo(s.last_checked_at)}</span>
                          </span>
                          {s.last_status === 'error' && <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-danger">check failed</span>}
                        </td>
                        <td className="px-3 py-3 text-right font-mono tnum text-ink-2">{s.findings_count ?? 0}</td>
                        <td className="px-3 py-3">
                          <Toggle
                            checked={s.enabled}
                            label={`Enable ${s.display_name}`}
                            onChange={(v) => updateMut.mutate({ id: s.id, data: { enabled: v } })}
                          />
                        </td>
                        <td className="px-2 py-3">
                          <Menu
                            items={[
                              {
                                label: 'Check now',
                                icon: <Icon name="refresh" size={13} />,
                                onSelect: () => checkMut.mutate(s.id),
                                disabled: checkMut.isPending,
                              },
                              { label: 'Edit', icon: <Icon name="pencil" size={13} />, onSelect: () => { setEditing(s); setFormOpen(true) } },
                              { label: 'Delete', icon: <Icon name="trash" size={13} />, danger: true, onSelect: () => setToDelete(s) },
                            ]}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {/* Mobile cards */}
            <ul className="divide-y divide-hairline md:hidden">
              {list.map((s) => {
                const meta = STATUS_META[s.last_status]
                return (
                  <li key={s.id} className={cx('px-4 py-3', !s.enabled && 'opacity-55')}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{s.display_name}</p>
                        <p className="mt-0.5 truncate font-mono text-[10.5px] text-ink-3">{s.url.replace(/^https?:\/\//, '')}</p>
                      </div>
                      <Toggle checked={s.enabled} label={`Enable ${s.display_name}`} onChange={(v) => updateMut.mutate({ id: s.id, data: { enabled: v } })} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-wide text-ink-3">
                      <span className={cx('flex items-center gap-1.5')}>
                        <span className={cx('size-1.5 rounded-full', meta.dot)} /> {meta.label} · {timeAgo(s.last_checked_at)}
                      </span>
                      <span>{frequencyLabel(s.check_interval_min)}</span>
                      <span>{s.findings_count ?? 0} findings</span>
                    </div>
                    <div className="mt-2.5 flex items-center gap-2">
                      <Button size="sm" variant="ghost" loading={checkMut.isPending && checkMut.variables === s.id} onClick={() => checkMut.mutate(s.id)} icon={<Icon name="refresh" size={12} />}>
                        Check now
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(s); setFormOpen(true) }}>Edit</Button>
                      <Button size="sm" variant="danger" onClick={() => setToDelete(s)}>Delete</Button>
                    </div>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>

      <SourceFormModal open={formOpen} onClose={() => setFormOpen(false)} source={editing} />

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Remove source?"
        danger
        confirmLabel="Remove source"
        loading={deleteMut.isPending}
        body={
          <>
            <strong className="text-ink">{toDelete?.display_name}</strong> will stop being monitored. Its{' '}
            <strong className="text-ink">{toDelete?.findings_count ?? 0} findings</strong> are kept and shown as “Unknown source”.
          </>
        }
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return
          try {
            await deleteMut.mutateAsync(toDelete.id)
            setToDelete(null)
          } catch {
            /* toast shown by mutation */
          }
        }}
      />
    </div>
  )
}

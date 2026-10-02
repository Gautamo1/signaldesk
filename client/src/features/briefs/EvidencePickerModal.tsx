import { useEffect, useMemo, useState } from 'react'
import { useFindings, useSources } from '../../api/hooks'
import type { Finding, Source } from '../../api/types'
import { debounce } from '../../lib/utils'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Field'
import { Segmented } from '../../components/ui/Segmented'
import { Icon } from '../../components/ui/Icon'
import { TableSkeleton, EmptyState } from '../../components/ui/Skeleton'

export interface PickedItem {
  id: string
  label: string
}

interface Props {
  open: boolean
  onClose: () => void
  mode: 'findings' | 'evidence'
  onPick: (items: Array<PickedItem & { type: 'finding' | 'source' }>) => void
}

/** Search + multi-select findings (or sources, in evidence mode) for linking. */
export function EvidencePickerModal({ open, onClose, mode, onPick }: Props) {
  const [tab, setTab] = useState<'findings' | 'sources'>('findings')
  const [q, setQ] = useState('')
  const [draftQ, setDraftQ] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const findingsQuery = useFindings({ q: q || undefined, page_size: 20 })
  const sources = useSources()

  useEffect(() => {
    if (open) {
      setTab('findings')
      setQ('')
      setDraftQ('')
      setSelected(new Set())
    }
  }, [open])

  const applySearch = useMemo(
    () =>
      debounce((v: string) => setQ(v.trim()), 300),
    [],
  )

  const activeList: Array<{ id: string; label: string; sub?: string }> =
    tab === 'findings'
      ? (findingsQuery.data?.items ?? []).map((f: Finding) => ({ id: f.id, label: f.title, sub: f.source_name ?? undefined }))
      : (sources.data ?? []).map((s: Source) => ({ id: s.id, label: s.display_name, sub: s.category }))

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function confirm() {
    const type = tab === 'findings' ? 'finding' : 'source'
    onPick(activeList.filter((x) => selected.has(x.id)).map((x) => ({ ...x, type })))
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === 'findings' ? 'Link evidence to this finding' : 'Add evidence reference'}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={selected.size === 0} onClick={confirm}>
            Add {selected.size > 0 ? `${selected.size} ` : ''}reference{selected.size === 1 ? '' : 's'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {mode === 'evidence' && (
          <Segmented<'findings' | 'sources'>
            size="sm"
            ariaLabel="Reference type"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'findings', label: 'Findings' },
              { value: 'sources', label: 'Sources' },
            ]}
          />
        )}
        <div className="relative">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3">
            <Icon name="search" size={13} />
          </span>
          <Input
            data-autofocus
            value={draftQ}
            onChange={(e) => {
              setDraftQ(e.target.value)
              applySearch(e.target.value)
            }}
            placeholder={tab === 'findings' ? 'Search findings by title or summary…' : 'Filter sources…'}
            className="pl-8"
            aria-label="Search evidence"
          />
        </div>

        <div className="max-h-[320px] overflow-y-auto rounded-md border border-border bg-surface">
          {tab === 'findings' ? (
            findingsQuery.isLoading ? (
              <TableSkeleton rows={6} cols={2} />
            ) : activeList.length === 0 ? (
              <EmptyState icon="search" title="No matches" body="Try a different search term." className="py-8" />
            ) : (
              <ul className="divide-y divide-hairline">
                {activeList.map((item) => (
                  <li key={item.id}>
                    <label className="flex cursor-pointer items-start gap-2.5 px-3 py-2 hover:bg-raised">
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggle(item.id)}
                        className="mt-0.5 size-3.5 accent-[var(--sd-accent)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px]">{item.label}</span>
                        {item.sub && <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-wide text-ink-3">{item.sub}</span>}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <ul className="divide-y divide-hairline">
              {activeList
                .filter((s) => !q || s.label.toLowerCase().includes(q.toLowerCase()) || s.sub?.toLowerCase().includes(q.toLowerCase()))
                .map((item) => (
                  <li key={item.id}>
                    <label className="flex cursor-pointer items-start gap-2.5 px-3 py-2 hover:bg-raised">
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggle(item.id)}
                        className="mt-0.5 size-3.5 accent-[var(--sd-accent)]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px]">{item.label}</span>
                        {item.sub && <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-wide text-ink-3">{item.sub}</span>}
                      </span>
                    </label>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  )
}

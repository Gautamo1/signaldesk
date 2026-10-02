import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { Finding } from '../../api/types'
import { useFindings, useProjects, useUpdateFinding } from '../../api/hooks'
import type { FindingsParams } from '../../api/client'
import { debounce } from '../../lib/utils'
import { useToast } from '../../components/ui/Toast'
import { Icon } from '../../components/ui/Icon'
import { Input, Select } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { Toggle } from '../../components/ui/Toggle'
import { TableSkeleton, EmptyState, ErrorState } from '../../components/ui/Skeleton'
import { Pagination } from '../../components/ui/Pagination'
import { FindingCard, FindingRow, FindingTableHead, KbdHints } from './FindingTable'
import { FindingDrawer } from './FindingDrawer'

const PAGE_SIZE = 25

export function InboxPage() {
  const [params, setParams] = useSearchParams()
  const [searchDraft, setSearchDraft] = useState(params.get('q') ?? '')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [cursor, setCursor] = useState(0)
  const updateMut = useUpdateFinding()
  const toast = useToast()
  const projects = useProjects()

  const filter: FindingsParams = {
    q: params.get('q') ?? undefined,
    status: params.get('status') ?? undefined,
    project_id: params.get('project') ?? undefined,
    category: params.get('category') ?? undefined,
    sort: (params.get('sort') as FindingsParams['sort']) ?? 'created_at',
    archived: (params.get('archived') as 'active' | 'all') === 'all' ? 'all' : 'active',
    page: Number(params.get('page') ?? 1),
    page_size: PAGE_SIZE,
  }

  const findings = useFindings(filter)
  const items = findings.data?.items ?? []

  // Debounced search -> URL (replace so history isn't spammed).
  const applySearch = useRef(
    debounce((value: string) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (value.trim()) next.set('q', value.trim())
          else next.delete('q')
          next.delete('page')
          return next
        },
        { replace: true },
      )
    }, 300),
  ).current

  function setParam(key: string, value: string | null) {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value === null || value === '' || value === 'default') next.delete(key)
        else next.set(key, value)
        if (key !== 'page') next.delete('page')
        return next
      },
      { replace: true },
    )
  }

  // Reset keyboard cursor when the result set changes.
  useEffect(() => {
    setCursor(0)
  }, [filter.q, filter.status, filter.project_id, filter.category, filter.sort, filter.page])

  const selected = items.find((f) => f.id === selectedId) ?? null

  function quickPatch(f: Finding, data: Partial<Finding>, msg?: string) {
    updateMut.mutate(
      { id: f.id, data },
      { onSuccess: () => msg && toast.success(msg), onError: (e) => toast.error(e.message) },
    )
  }

  // Keyboard triage: J/K navigate, Enter open, X archive, M read/unread, R review.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable) return
      if (selectedId) return // drawer handles its own keys
      const key = e.key.toLowerCase()
      if (!['j', 'k', 'x', 'm', 'r', 'enter'].includes(key)) return
      e.preventDefault()
      const idx = Math.min(cursor, items.length - 1)
      const f = items[idx]
      if (key === 'j') setCursor(Math.min(idx + 1, items.length - 1))
      else if (key === 'k') setCursor(Math.max(idx - 1, 0))
      else if (!f) return
      else if (key === 'enter') setSelectedId(f.id)
      else if (key === 'x' && !f.archived) {
        const id = f.id
        updateMut.mutate(
          { id, data: { archived: true } },
          {
            onSuccess: () => toast.success('Finding archived', { label: 'Undo', onClick: () => updateMut.mutate({ id, data: { archived: false } }) }),
            onError: (err) => toast.error(err.message),
          },
        )
      } else if (key === 'm') quickPatch(f, { status: f.status === 'unread' ? 'read' : 'unread' })
      else if (key === 'r') quickPatch(f, { status: 'reviewed' }, 'Marked as reviewed')
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [items, cursor, selectedId, updateMut, toast])

  const hasFilters = Boolean(filter.q || filter.status || filter.project_id || filter.category)
  const total = findings.data?.total ?? 0
  const pages = findings.data?.pages ?? 1

  return (
    <div className="flex flex-col gap-4 pt-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Evidence Inbox</h1>
          <p className="mt-0.5 text-xs text-ink-2">
            {total} finding{total === 1 ? '' : 's'} {filter.archived === 'all' ? '(including archived)' : 'in the active queue'}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-hairline bg-surface p-2.5">
        <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3">
            <Icon name="search" size={13} />
          </span>
          <Input
            value={searchDraft}
            onChange={(e) => {
              setSearchDraft(e.target.value)
              applySearch(e.target.value)
            }}
            placeholder="Search findings…"
            className="pl-8"
            aria-label="Search findings"
          />
        </div>
        <Select value={filter.status ?? 'default'} onChange={(e) => setParam('status', e.target.value)} className="w-auto min-w-[110px]" aria-label="Filter by status">
          <option value="default">All statuses</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
          <option value="reviewed">Reviewed</option>
        </Select>
        <Select value={filter.project_id ?? 'default'} onChange={(e) => setParam('project', e.target.value)} className="w-auto min-w-[130px]" aria-label="Filter by project">
          <option value="default">All projects</option>
          {(projects.data ?? []).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
        <Select value={filter.category ?? 'default'} onChange={(e) => setParam('category', e.target.value)} className="w-auto min-w-[120px]" aria-label="Filter by category">
          <option value="default">All types</option>
          <option value="document">Document</option>
          <option value="filing">Filing</option>
          <option value="statement">Statement</option>
          <option value="dataset">Dataset</option>
          <option value="correspondence">Correspondence</option>
          <option value="imagery">Imagery</option>
        </Select>
        <Select value={filter.sort ?? 'created_at'} onChange={(e) => setParam('sort', e.target.value)} className="w-auto min-w-[120px]" aria-label="Sort order">
          <option value="created_at">Newest first</option>
          <option value="priority">Priority</option>
          <option value="confidence">Confidence</option>
        </Select>
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-[11px] uppercase tracking-wider text-ink-3">
          Archived
          <Toggle checked={filter.archived === 'all'} onChange={(v) => setParam('archived', v ? 'all' : null)} label="Include archived" />
        </label>
        {hasFilters && (
          <Button variant="ghost" size="sm" icon={<Icon name="x" size={12} />} onClick={() => setParams(new URLSearchParams(), { replace: true })}>
            Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-hairline bg-surface">
        {findings.isLoading ? (
          <TableSkeleton rows={10} cols={6} />
        ) : findings.isError ? (
          <ErrorState message={(findings.error as Error).message} onRetry={() => void findings.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState
            icon="inbox"
            title={hasFilters ? 'No findings match these filters' : 'Inbox zero'}
            body={hasFilters ? 'Try widening the filters or clearing the search.' : 'New findings from monitored sources will land here.'}
          />
        ) : (
          <>
            <div className="hidden md:block">
              <table className="w-full min-w-[900px] text-left">
                <thead>
                  <FindingTableHead />
                </thead>
                <tbody>
                  {items.map((f, i) => (
                    <FindingRow key={f.id} finding={f} selected={i === cursor && !selectedId} onOpen={(x) => setSelectedId(x.id)} />
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-hairline md:hidden">
              {items.map((f) => (
                <FindingCard key={f.id} finding={f} onOpen={(x) => setSelectedId(x.id)} />
              ))}
            </ul>
            <KbdHints />
            <Pagination page={filter.page ?? 1} pages={pages} total={total} onPage={(p) => setParam('page', String(p))} />
          </>
        )}
      </div>

      <FindingDrawer finding={selected} onClose={() => setSelectedId(null)} />
    </div>
  )
}

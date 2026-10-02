import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { Brief, KeyFinding, TimelineEntry } from '../../api/types'
import { api, ApiError } from '../../api/client'
import { useBrief, useDeleteBrief } from '../../api/hooks'
import { cx } from '../../lib/utils'
import { fmtClock, fmtDateTime } from '../../lib/format'
import { Button } from '../../components/ui/Button'
import { Icon } from '../../components/ui/Icon'
import { Input, Select, Textarea } from '../../components/ui/Field'
import { Segmented } from '../../components/ui/Segmented'
import { Menu } from '../../components/ui/Menu'
import { ConfirmDialog } from '../../components/ui/Modal'
import { ErrorState, Skeleton } from '../../components/ui/Skeleton'
import { useToast } from '../../components/ui/Toast'
import { BriefPreview } from './BriefPreview'
import { EvidencePickerModal } from './EvidencePickerModal'

interface Draft {
  title: string
  executive_summary: string
  key_findings: KeyFinding[]
  evidence_refs: Brief['evidence_refs']
  timeline: TimelineEntry[]
  open_questions: string[]
  analyst_notes: string
  conclusions: string
  status: 'draft' | 'final'
}

type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error' | 'conflict'

function toDraft(b: Brief): Draft {
  return {
    title: b.title,
    executive_summary: b.executive_summary,
    key_findings: (b.key_findings ?? []).map((k) => ({ id: k.id, text: k.text, finding_ids: k.finding_ids ?? [] })),
    evidence_refs: b.evidence_refs ?? [],
    timeline: b.timeline ?? [],
    open_questions: b.open_questions ?? [],
    analyst_notes: b.analyst_notes,
    conclusions: b.conclusions,
    status: b.status,
  }
}

let kfSeq = 0
const newKfId = () => `kf-${Date.now().toString(36)}-${++kfSeq}`

export function BriefEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const briefQuery = useBrief(id)
  const deleteMut = useDeleteBrief()

  const [draft, setDraft] = useState<Draft | null>(null)
  const [lastSaved, setLastSaved] = useState<{ updatedAt: string; snapshot: string } | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [serverConflict, setServerConflict] = useState<Brief | null>(null)
  const [linkedTitles, setLinkedTitles] = useState<Record<string, string>>({})
  const [picker, setPicker] = useState<{ open: boolean; mode: 'findings' | 'evidence'; kfIndex?: number }>({ open: false, mode: 'findings' })
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit')

  // Initialize local state once the brief loads (or when navigating between briefs).
  const initializedFor = useRef<string | null>(null)
  useEffect(() => {
    if (!id || !briefQuery.data) return
    if (initializedFor.current === id && draft) return
    const d = toDraft(briefQuery.data)
    setDraft(d)
    setLastSaved({ updatedAt: briefQuery.data.updated_at, snapshot: JSON.stringify(d) })
    setSaveState('idle')
    setServerConflict(null)
    // Seed linked-finding titles from the server-resolved payload.
    const titles: Record<string, string> = {}
    for (const kf of briefQuery.data.key_findings ?? []) {
      ;(kf.finding_ids ?? []).forEach((fid, i) => {
        const t = kf.finding_titles?.[i]
        if (t && !titles[fid]) titles[fid] = t
      })
    }
    setLinkedTitles((prev) => ({ ...titles, ...prev }))
    initializedFor.current = id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, briefQuery.data])

  const dirty = useMemo(
    () => Boolean(draft && lastSaved && JSON.stringify(draft) !== lastSaved.snapshot),
    [draft, lastSaved],
  )

  const save = useCallback(
    async (overwriteBase?: string) => {
      if (!id || !draft) return
      setSaveState('saving')
      try {
        const res = await api.briefs.update(id, {
          ...draft,
          base_updated_at: overwriteBase ?? lastSaved?.updatedAt,
        })
        setLastSaved({ updatedAt: res.updated_at, snapshot: JSON.stringify(draft) })
        setSaveState('saved')
      } catch (err) {
        if (err instanceof ApiError && err.status === 409 && err.server) {
          setServerConflict(err.server as Brief)
          setSaveState('conflict')
        } else {
          setSaveState('error')
        }
      }
    },
    [id, draft, lastSaved],
  )

  // Debounced autosave.
  useEffect(() => {
    if (!draft || !dirty || saveState === 'saving' || saveState === 'conflict') return
    setSaveState('dirty')
    const t = setTimeout(() => void save(), 800)
    return () => clearTimeout(t)
  }, [draft, dirty, saveState, save])

  // Warn before leaving with unsaved work.
  useEffect(() => {
    function onBefore(e: BeforeUnloadEvent) {
      if (dirty || saveState === 'saving') {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', onBefore)
    return () => window.removeEventListener('beforeunload', onBefore)
  }, [dirty, saveState])

  if (briefQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4 pt-5">
        <Skeleton className="h-8 w-72" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-[420px]" />
          <Skeleton className="h-[420px]" />
        </div>
      </div>
    )
  }
  if (briefQuery.isError || !briefQuery.data) {
    return (
      <ErrorState
        title="Brief not found"
        message={briefQuery.isError ? (briefQuery.error as Error).message : 'This brief may have been deleted.'}
        onRetry={() => void briefQuery.refetch()}
      />
    )
  }

  if (!draft) return null
  const d = draft
  const patch = (p: Partial<Draft>) => setDraft((prev) => (prev ? { ...prev, ...p } : prev))

  function resolveConflict(latest: boolean) {
    if (!serverConflict) return
    if (latest) {
      const sd = toDraft(serverConflict)
      setDraft(sd)
      setLastSaved({ updatedAt: serverConflict.updated_at, snapshot: JSON.stringify(sd) })
      setServerConflict(null)
      setSaveState('idle')
      toast.info('Loaded the latest version — your conflicting edits were discarded')
    } else {
      void save(serverConflict.updated_at)
      setServerConflict(null)
    }
  }

  const projectName = briefQuery.data.project_name ?? null

  return (
    <div className="flex flex-col gap-4 pt-5">
      {/* Header */}
      <div className="no-print flex flex-wrap items-center gap-3">
        <Link to="/briefs" className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider text-ink-3 hover:text-accent">
          <Icon name="arrow-left" size={12} /> Briefs
        </Link>
        <h1 className="hidden min-w-0 flex-1 truncate text-base font-bold tracking-tight sm:block">{d.title || 'Untitled brief'}</h1>
        <SaveChip state={saveState} savedAt={lastSaved?.updatedAt ?? null} onRetry={() => void save()} />
        <div className="ml-auto flex items-center gap-2">
          <Select
            value={d.status}
            onChange={(e) => patch({ status: e.target.value as 'draft' | 'final' })}
            className="h-7 w-auto text-xs"
            aria-label="Brief status"
          >
            <option value="draft">Draft</option>
            <option value="final">Final</option>
          </Select>
          <Button size="sm" variant="secondary" icon={<Icon name="printer" size={13} />} onClick={() => window.print()}>
            Print / PDF
          </Button>
          <Menu
            items={[
              { label: 'Delete brief', icon: <Icon name="trash" size={13} />, danger: true, onSelect: () => setConfirmDelete(true) },
            ]}
          />
        </div>
      </div>

      {/* Conflict banner */}
      {saveState === 'conflict' && serverConflict && (
        <div className="no-print flex flex-wrap items-center gap-3 rounded-lg border border-warn/40 bg-warn/10 px-4 py-3" role="alert">
          <Icon name="alert" size={16} className="text-warn" />
          <p className="min-w-0 flex-1 text-[12.5px] leading-snug">
            <strong>Editing conflict.</strong> This brief was updated elsewhere at {fmtDateTime(serverConflict.updated_at)}.
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => resolveConflict(true)}>Load latest</Button>
            <Button size="sm" variant="primary" onClick={() => resolveConflict(false)}>Overwrite with my changes</Button>
          </div>
        </div>
      )}

      {/* Mobile view switch */}
      <div className="no-print lg:hidden">
        <Segmented<'edit' | 'preview'>
          ariaLabel="Editor view"
          value={mobileView}
          onChange={setMobileView}
          options={[
            { value: 'edit', label: 'Edit' },
            { value: 'preview', label: 'Preview' },
          ]}
        />
      </div>

      {/* Body */}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,11fr)_minmax(0,9fr)]">
        <div className={cx('no-print flex min-w-0 flex-col gap-3', mobileView !== 'edit' && 'hidden lg:flex')}>
          <SectionCard num="01" title="Title">
            <Input value={d.title} onChange={(e) => patch({ title: e.target.value })} placeholder="Brief title" className="text-[15px] font-semibold" maxLength={200} />
          </SectionCard>

          <SectionCard num="02" title="Executive Summary" hint={`${d.executive_summary.length}/8000`}>
            <Textarea rows={5} value={d.executive_summary} onChange={(e) => patch({ executive_summary: e.target.value })} placeholder="Two or three sentences framing the question, what is known, and the bottom line." maxLength={8000} />
          </SectionCard>

          <SectionCard num="03" title="Key Findings" hint="Each finding can cite evidence from the inbox.">
            <div className="flex flex-col gap-2.5">
              {d.key_findings.length === 0 && (
                <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-ink-3">
                  No key findings yet — add the conclusions your evidence supports.
                </p>
              )}
              {d.key_findings.map((kf, i) => (
                <div key={kf.id} className="rounded-md border border-border bg-surface p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-ink-3">Finding {i + 1}</span>
                    <button
                      type="button"
                      onClick={() => patch({ key_findings: d.key_findings.filter((x) => x.id !== kf.id) })}
                      className="text-ink-3 hover:text-danger cursor-pointer"
                      aria-label={`Remove finding ${i + 1}`}
                    >
                      <Icon name="x" size={13} />
                    </button>
                  </div>
                  <Textarea rows={2} value={kf.text} onChange={(e) => patch({ key_findings: d.key_findings.map((x) => (x.id === kf.id ? { ...x, text: e.target.value } : x)) })} placeholder="State the finding in one or two sentences." />
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {kf.finding_ids.map((fid) => (
                      <span key={fid} className="inline-flex max-w-full items-center gap-1 rounded border border-accent/30 bg-accent-soft px-1.5 py-0.5 font-mono text-[10px] text-accent">
                        <Icon name="link" size={9} className="shrink-0" />
                        <span className="truncate">{linkedTitles[fid] ?? 'Finding'}</span>
                        <button type="button" onClick={() => patch({ key_findings: d.key_findings.map((x) => (x.id === kf.id ? { ...x, finding_ids: x.finding_ids.filter((y) => y !== fid) } : x)) })} className="hover:text-danger cursor-pointer" aria-label="Unlink evidence">
                          ×
                        </button>
                      </span>
                    ))}
                    <button type="button" onClick={() => setPicker({ open: true, mode: 'findings', kfIndex: i })} className="text-[11px] font-medium text-accent hover:underline cursor-pointer">
                      + Link evidence
                    </button>
                  </div>
                </div>
              ))}
              <Button variant="secondary" size="sm" icon={<Icon name="plus" size={13} />} onClick={() => patch({ key_findings: [...d.key_findings, { id: newKfId(), text: '', finding_ids: [] }] })}>
                Add key finding
              </Button>
            </div>
          </SectionCard>

          <SectionCard num="04" title="Evidence References" hint="Cited as [n] in the appendix.">
            <div className="flex flex-col gap-1.5">
              {d.evidence_refs.length === 0 && (
                <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-ink-3">No references yet — link findings or sources.</p>
              )}
              {d.evidence_refs.map((r, i) => (
                <div key={`${r.type}-${r.id}`} className="flex items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-1.5">
                  <span className="font-mono text-[10px] font-semibold text-ink-3">[{i + 1}]</span>
                  <span className={cx('rounded px-1 py-px font-mono text-[9px] uppercase tracking-wider', r.type === 'finding' ? 'bg-accent-soft text-accent' : 'bg-info/10 text-info')}>
                    {r.type}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[12px]">{r.label}</span>
                  <button type="button" onClick={() => patch({ evidence_refs: d.evidence_refs.filter((x) => !(x.id === r.id && x.type === r.type)) })} className="text-ink-3 hover:text-danger cursor-pointer" aria-label="Remove reference">
                    <Icon name="x" size={12} />
                  </button>
                </div>
              ))}
              <Button variant="secondary" size="sm" icon={<Icon name="plus" size={13} />} onClick={() => setPicker({ open: true, mode: 'evidence' })}>
                Add reference
              </Button>
            </div>
          </SectionCard>

          <SectionCard num="05" title="Timeline">
            <div className="flex flex-col gap-2">
              {d.timeline.length === 0 && (
                <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-ink-3">No events yet — map how the situation developed.</p>
              )}
              {d.timeline.map((t, i) => (
                <div key={i} className="flex flex-wrap items-start gap-2 rounded-md border border-border bg-surface p-2.5">
                  <Input type="date" value={t.date} onChange={(e) => patch({ timeline: d.timeline.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)) })} className="w-[140px]" aria-label={`Event ${i + 1} date`} />
                  <div className="min-w-[160px] flex-1">
                    <Input value={t.label} onChange={(e) => patch({ timeline: d.timeline.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} placeholder="Event" aria-label={`Event ${i + 1} label`} />
                    <Input value={t.detail ?? ''} onChange={(e) => patch({ timeline: d.timeline.map((x, j) => (j === i ? { ...x, detail: e.target.value } : x)) })} placeholder="Detail (optional)" className="mt-1.5 text-[12px]" aria-label={`Event ${i + 1} detail`} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <button type="button" disabled={i === 0} onClick={() => { const next = [...d.timeline]; ;[next[i - 1], next[i]] = [next[i], next[i - 1]]; patch({ timeline: next }) }} className="text-ink-3 hover:text-ink disabled:opacity-30 cursor-pointer" aria-label="Move event up">
                      <Icon name="chevron-down" size={14} className="rotate-180" />
                    </button>
                    <button type="button" disabled={i === d.timeline.length - 1} onClick={() => { const next = [...d.timeline]; ;[next[i + 1], next[i]] = [next[i], next[i + 1]]; patch({ timeline: next }) }} className="text-ink-3 hover:text-ink disabled:opacity-30 cursor-pointer" aria-label="Move event down">
                      <Icon name="chevron-down" size={14} />
                    </button>
                    <button type="button" onClick={() => patch({ timeline: d.timeline.filter((_, j) => j !== i) })} className="text-ink-3 hover:text-danger cursor-pointer" aria-label={`Remove event ${i + 1}`}>
                      <Icon name="x" size={13} />
                    </button>
                  </div>
                </div>
              ))}
              <Button variant="secondary" size="sm" icon={<Icon name="plus" size={13} />} onClick={() => patch({ timeline: [...d.timeline, { date: new Date().toISOString().slice(0, 10), label: '', detail: '' }] })}>
                Add event
              </Button>
            </div>
          </SectionCard>

          <SectionCard num="06" title="Open Questions">
            <div className="flex flex-col gap-1.5">
              {d.open_questions.map((qText, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input value={qText} onChange={(e) => patch({ open_questions: d.open_questions.map((x, j) => (j === i ? e.target.value : x)) })} aria-label={`Open question ${i + 1}`} />
                  <button type="button" onClick={() => patch({ open_questions: d.open_questions.filter((_, j) => j !== i) })} className="shrink-0 text-ink-3 hover:text-danger cursor-pointer" aria-label={`Remove question ${i + 1}`}>
                    <Icon name="x" size={13} />
                  </button>
                </div>
              ))}
              <Button variant="secondary" size="sm" icon={<Icon name="plus" size={13} />} onClick={() => patch({ open_questions: [...d.open_questions, ''] })}>
                Add question
              </Button>
            </div>
          </SectionCard>

          <SectionCard num="07" title="Analyst Notes" hint="Internal only — marked in the preview, excluded from external distribution.">
            <Textarea rows={3} value={d.analyst_notes} onChange={(e) => patch({ analyst_notes: e.target.value })} placeholder="Provenance caveats, legal flags, follow-ups for the team…" className="border-l-2 border-l-warn/50" maxLength={8000} />
          </SectionCard>

          <SectionCard num="08" title="Conclusions & Recommendations">
            <Textarea rows={4} value={d.conclusions} onChange={(e) => patch({ conclusions: e.target.value })} placeholder="What the evidence supports, what it does not, and the recommended next steps." maxLength={8000} />
          </SectionCard>
        </div>

        {/* Live preview (always visible on desktop) */}
        <div className={cx('min-w-0 lg:sticky lg:top-16', mobileView !== 'preview' && 'hidden lg:block')}>
          <p className="no-print mb-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3">
            <Icon name="eye" size={12} /> Live preview
          </p>
          <div className="print-doc-frame max-h-[calc(100vh-9rem)] overflow-y-auto rounded-lg border border-border bg-bg/40 p-3 lg:max-h-[calc(100vh-8.5rem)]">
            <BriefPreview draft={{ ...d, updated_at: lastSaved?.updatedAt ?? briefQuery.data.updated_at }} projectName={projectName} />
          </div>
        </div>
      </div>

      {/* Evidence picker */}
      <EvidencePickerModal
        open={picker.open}
        onClose={() => setPicker((p) => ({ ...p, open: false }))}
        mode={picker.mode}
        onPick={(items) => {
          if (picker.mode === 'findings' && picker.kfIndex !== undefined) {
            const idx = picker.kfIndex
            patch({
              key_findings: d.key_findings.map((kf, i) =>
                i === idx ? { ...kf, finding_ids: [...new Set([...kf.finding_ids, ...items.map((x) => x.id)])] } : kf,
              ),
            })
          } else if (picker.mode === 'evidence') {
            patch({ evidence_refs: [...d.evidence_refs, ...items.map((x) => ({ type: x.type, id: x.id, label: x.label }))] })
          }
          setLinkedTitles((prev) => {
            const next = { ...prev }
            for (const it of items) if (it.type === 'finding') next[it.id] = it.label
            return next
          })
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        title="Delete brief?"
        danger
        confirmLabel="Delete brief"
        loading={deleteMut.isPending}
        body={<><strong className="text-ink">{d.title || 'Untitled brief'}</strong> will be permanently deleted.</>}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={async () => {
          try {
            if (id) await deleteMut.mutateAsync(id)
            navigate('/briefs')
          } catch {
            /* toast shown by mutation */
          }
        }}
      />
    </div>
  )
}

/* ------------------------------ subcomponents ----------------------------- */

function SectionCard({ num, title, hint, children }: { num: string; title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-hairline bg-surface">
      <header className="flex items-baseline gap-2 border-b border-hairline px-4 py-2.5">
        <span className="font-mono text-[10px] font-semibold text-accent">{num}</span>
        <h2 className="text-[12.5px] font-semibold tracking-tight">{title}</h2>
        {hint && <span className="ml-auto font-mono text-[10px] tnum text-ink-3">{hint}</span>}
      </header>
      <div className="p-4">{children}</div>
    </section>
  )
}

function SaveChip({ state, savedAt, onRetry }: { state: SaveState; savedAt: string | null; onRetry: () => void }) {
  return (
    <span aria-live="polite" className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider">
      {state === 'saving' && (
        <>
          <svg className="animate-spin text-info" width={11} height={11} viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span className="text-info">Saving…</span>
        </>
      )}
      {state === 'saved' && (
        <>
          <span className="size-1.5 rounded-full bg-ok" aria-hidden="true" />
          <span className="text-ok">Saved {fmtClock(savedAt)}</span>
        </>
      )}
      {state === 'dirty' && (
        <>
          <span className="size-1.5 rounded-full bg-warn" aria-hidden="true" />
          <span className="text-warn">Unsaved changes</span>
        </>
      )}
      {state === 'idle' && (
        <>
          <span className="size-1.5 rounded-full bg-ink-3" aria-hidden="true" />
          <span className="text-ink-3">Saved</span>
        </>
      )}
      {state === 'error' && (
        <>
          <span className="size-1.5 rounded-full bg-danger" aria-hidden="true" />
          <span className="text-danger">Save failed</span>
          <button type="button" onClick={onRetry} className="ml-1 text-danger underline cursor-pointer">Retry</button>
        </>
      )}
      {state === 'conflict' && (
        <>
          <Icon name="alert" size={12} className="text-warn" />
          <span className="text-warn">Conflict</span>
        </>
      )}
    </span>
  )
}

import type { EvidenceRef, TimelineEntry } from '../../api/types'
import { fmtDate, fmtDateTime } from '../../lib/format'

/** The subset of brief fields the preview document renders. */
export interface PreviewDraft {
  title: string
  executive_summary: string
  key_findings: Array<{ id: string; text: string; finding_ids: string[] }>
  evidence_refs: EvidenceRef[]
  timeline: TimelineEntry[]
  open_questions: string[]
  analyst_notes: string
  conclusions: string
  status: 'draft' | 'final'
  updated_at: string
}

interface Props {
  draft: PreviewDraft
  projectName?: string | null
}

/**
 * The brief rendered as a paper document. Deliberately uses a fixed light
 * palette (independent of the app theme) so it reads like a printed report
 * and survives `window.print()` cleanly.
 */
export function BriefPreview({ draft, projectName }: Props) {
  const evidence = draft.evidence_refs ?? []
  const refIndex = new Map<string, number>()
  evidence.forEach((r, i) => {
    if (!refIndex.has(r.id)) refIndex.set(r.id, i + 1)
  })

  const sections: Array<{ num: string; title: string; empty: boolean }> = [
    { num: '01', title: 'Executive Summary', empty: !draft.executive_summary.trim() },
    { num: '02', title: 'Key Findings', empty: (draft.key_findings ?? []).length === 0 },
    { num: '03', title: 'Timeline', empty: (draft.timeline ?? []).length === 0 },
    { num: '04', title: 'Open Questions', empty: (draft.open_questions ?? []).length === 0 },
    { num: '05', title: 'Conclusions & Recommendations', empty: !draft.conclusions.trim() },
    { num: '06', title: 'Analyst Notes', empty: !draft.analyst_notes.trim() },
  ]

  return (
    <article className="print-doc-frame mx-auto w-full max-w-[760px] rounded-lg border border-border bg-white p-8 text-neutral-900 shadow-sm sm:p-10">
      {/* Letterhead */}
      <header className="flex items-start justify-between gap-4 border-b-2 border-neutral-900 pb-4">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">
            SignalDesk · Research Brief
          </p>
          <h1 className="mt-2 text-[24px] font-bold leading-tight tracking-tight">{draft.title || 'Untitled brief'}</h1>
        </div>
        <span
          className={`shrink-0 rounded border px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-widest ${
            draft.status === 'final' ? 'border-emerald-700 text-emerald-700' : 'border-amber-600 text-amber-700'
          }`}
        >
          {draft.status}
        </span>
      </header>

      {/* Meta grid */}
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 font-mono text-[10.5px] uppercase tracking-wide text-neutral-500 sm:grid-cols-4">
        <div>
          <dt>Project</dt>
          <dd className="mt-0.5 normal-case tracking-normal text-neutral-800">{projectName ?? 'Unassigned'}</dd>
        </div>
        <div>
          <dt>Date</dt>
          <dd className="mt-0.5 normal-case tracking-normal text-neutral-800">{fmtDate(draft.updated_at)}</dd>
        </div>
        <div>
          <dt>Evidence cited</dt>
          <dd className="mt-0.5 normal-case tracking-normal text-neutral-800">{evidence.length}</dd>
        </div>
        <div>
          <dt>Last updated</dt>
          <dd className="mt-0.5 normal-case tracking-normal text-neutral-800">{fmtDateTime(draft.updated_at)}</dd>
        </div>
      </dl>

      {/* Sections */}
      <div className="mt-6 flex flex-col gap-6">
        {sections.map((s) => (
          <section key={s.num}>
            <h2 className="flex items-baseline gap-2 border-b border-neutral-300 pb-1.5">
              <span className="font-mono text-[11px] font-semibold text-neutral-400">{s.num}</span>
              <span className="text-[13px] font-bold uppercase tracking-wider">{s.title}</span>
            </h2>

            {s.empty ? (
              <p className="mt-3 text-[12.5px] italic text-neutral-400">Not yet written.</p>
            ) : s.num === '01' ? (
              <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed">{draft.executive_summary}</p>
            ) : s.num === '02' ? (
              <ol className="mt-3 flex list-none flex-col gap-3">
                {(draft.key_findings ?? []).map((kf, i) => (
                  <li key={kf.id} className="flex gap-2.5 text-[13px] leading-relaxed">
                    <span className="shrink-0 font-mono text-[11px] font-semibold text-neutral-400">{String(i + 1).padStart(2, '0')}</span>
                    <span>
                      {kf.text || <em className="text-neutral-400">Unwritten finding</em>}
                      {kf.finding_ids.length > 0 && (
                        <sup className="ml-1 font-mono text-[9px] text-neutral-500">
                          [{kf.finding_ids.map((fid) => refIndex.get(fid)).filter(Boolean).join(', ')}]
                        </sup>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            ) : s.num === '03' ? (
              <table className="mt-3 w-full border-collapse text-[12.5px]">
                <tbody>
                  {(draft.timeline ?? []).map((t, i) => (
                    <tr key={i} className="border-b border-neutral-200 last:border-0">
                      <td className="w-24 py-1.5 pr-3 align-top font-mono text-[11px] text-neutral-500">{t.date}</td>
                      <td className="py-1.5">
                        <span className="font-medium">{t.label}</span>
                        {t.detail && <span className="block text-[12px] text-neutral-600">{t.detail}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : s.num === '04' ? (
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[13px] leading-relaxed">
                {(draft.open_questions ?? []).map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            ) : s.num === '05' ? (
              <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed">{draft.conclusions}</p>
            ) : (
              <div className="mt-3 rounded border border-amber-300 bg-amber-50 p-3.5">
                <p className="mb-1.5 font-mono text-[9px] font-semibold uppercase tracking-widest text-amber-700">Internal — not for external distribution</p>
                <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-neutral-800">{draft.analyst_notes}</p>
              </div>
            )}
          </section>
        ))}

        {/* Evidence appendix */}
        {evidence.length > 0 && (
          <section className="border-t border-neutral-300 pt-4">
            <h2 className="text-[13px] font-bold uppercase tracking-wider">Appendix · Evidence References</h2>
            <ol className="mt-3 flex flex-col gap-1.5">
              {evidence.map((r, i) => (
                <li key={`${r.type}-${r.id}`} className="flex items-baseline gap-2 text-[12px] leading-relaxed">
                  <span className="shrink-0 font-mono text-[10px] font-semibold text-neutral-400">[{i + 1}]</span>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-400">{r.type}</span>
                  <span className="min-w-0 flex-1 truncate">{r.label || 'Untitled reference'}</span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>

      <footer className="mt-8 border-t border-neutral-300 pt-3 text-center font-mono text-[9.5px] uppercase tracking-[0.18em] text-neutral-400">
        Generated by SignalDesk · {fmtDate(draft.updated_at)} · Page 1 of 1
      </footer>
    </article>
  )
}

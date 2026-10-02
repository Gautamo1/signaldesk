import { Link } from 'react-router-dom'
import type { Finding } from '../../api/types'
import { cx } from '../../lib/utils'
import { timeAgo } from '../../lib/format'
import { CategoryBadge, ConfidenceBar, FindingStatusBadge, PriorityBadge, TagChip } from '../../components/ui/Badge'

interface Props {
  finding: Finding
  selected?: boolean
  onOpen: (f: Finding) => void
  showProject?: boolean
}

function Unassigned() {
  return <span className="rounded border border-dashed border-border px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-ink-3">Unassigned</span>
}

/** One finding row (desktop table) — also used inside the project detail page. */
export function FindingRow({ finding: f, selected, onOpen, showProject = true }: Props) {
  return (
    <tr
      onClick={() => onOpen(f)}
      className={cx(
        'cursor-pointer border-b border-hairline transition-colors last:border-0',
        selected ? 'bg-accent-soft/60' : 'hover:bg-raised',
        f.status === 'read' && 'opacity-75',
      )}
    >
      <td className="w-8 pl-4">
        {f.status === 'unread' && (
          <span className="block size-2 rounded-full bg-accent" title="Unread" aria-label="Unread" />
        )}
      </td>
      <td className="max-w-[360px] px-3 py-2.5">
        <p className={cx('truncate text-[12.5px]', f.status === 'unread' ? 'font-semibold' : 'font-medium')}>{f.title}</p>
        {f.tags.length > 0 && (
          <span className="mt-1 flex flex-wrap gap-1">
            {f.tags.slice(0, 3).map((t) => <TagChip key={t} tag={t} />)}
          </span>
        )}
      </td>
      <td className="max-w-[160px] px-3 py-2.5">
        {f.source_name ? (
          <span className="block truncate text-[12px] text-ink-2">{f.source_name}</span>
        ) : (
          <span className="text-[11px] italic text-ink-3">Unknown source</span>
        )}
      </td>
      {showProject && (
        <td className="max-w-[160px] px-3 py-2.5">
          {f.project_name ? (
            <Link to={`/projects/${f.project_id}`} onClick={(e) => e.stopPropagation()} className="block truncate text-[12px] text-ink-2 hover:text-accent hover:underline">
              {f.project_name}
            </Link>
          ) : (
            <Unassigned />
          )}
        </td>
      )}
      <td className="px-3 py-2.5"><CategoryBadge category={f.category} /></td>
      <td className="px-3 py-2.5"><ConfidenceBar value={f.confidence} /></td>
      <td className="px-3 py-2.5"><PriorityBadge priority={f.priority} /></td>
      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] tnum text-ink-3" title={new Date(f.created_at).toLocaleString()}>
        {timeAgo(f.created_at)}
      </td>
      <td className="px-3 py-2.5 pr-4"><FindingStatusBadge status={f.status} /></td>
    </tr>
  )
}

/** Mobile card variant of a finding. */
export function FindingCard({ finding: f, onOpen }: { finding: Finding; onOpen: (f: Finding) => void }) {
  return (
    <li>
      <button type="button" onClick={() => onOpen(f)} className="w-full px-4 py-3 text-left hover:bg-raised cursor-pointer">
        <div className="flex items-start gap-2">
          {f.status === 'unread' && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" aria-label="Unread" />}
          <p className={cx('min-w-0 flex-1 text-[13px] leading-snug', f.status === 'unread' ? 'font-semibold' : 'font-medium')}>{f.title}</p>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <PriorityBadge priority={f.priority} />
          <CategoryBadge category={f.category} />
          <span className="font-mono text-[10px] uppercase tracking-wide text-ink-3">{timeAgo(f.created_at)}</span>
        </div>
        {(f.source_name || f.project_name) && (
          <p className="mt-1.5 truncate font-mono text-[10.5px] text-ink-3">
            {f.source_name ?? 'Unknown source'}{f.project_name ? ` · ${f.project_name}` : ''}
          </p>
        )}
      </button>
    </li>
  )
}

export function FindingTableHead({ showProject = true }: { showProject?: boolean }) {
  return (
    <tr className="border-b border-hairline font-mono text-[10px] uppercase tracking-[0.12em] text-ink-3">
      <th className="w-8 pl-4" aria-label="Unread" />
      <th className="px-3 py-2 font-medium">Finding</th>
      <th className="px-3 py-2 font-medium">Source</th>
      {showProject && <th className="px-3 py-2 font-medium">Project</th>}
      <th className="px-3 py-2 font-medium">Type</th>
      <th className="px-3 py-2 font-medium">Confidence</th>
      <th className="px-3 py-2 font-medium">Priority</th>
      <th className="px-3 py-2 font-medium">Age</th>
      <th className="px-3 py-2 pr-4 font-medium">Status</th>
    </tr>
  )
}

/** Keyboard hint strip under the table (desktop only). */
export function KbdHints() {
  return (
    <div className="hidden items-center gap-3 border-t border-hairline bg-surface px-4 py-1.5 font-mono text-[10px] uppercase tracking-wide text-ink-3 md:flex">
      <span><Kbd>J</Kbd>/<Kbd>K</Kbd> navigate</span>
      <span><Kbd>↵</Kbd> open</span>
      <span><Kbd>X</Kbd> archive</span>
      <span><Kbd>M</Kbd> mark read</span>
      <span><Kbd>R</Kbd> review</span>
    </div>
  )
}

function Kbd({ children }: { children: string }) {
  return <span className="rounded border border-border bg-raised px-1 py-px">{children}</span>
}

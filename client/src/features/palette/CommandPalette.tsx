import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '../../store/ui'
import { useFindings, useProjects } from '../../api/hooks'
import { fuzzyScore } from '../../lib/fuzzy'
import { readJson, writeJson } from '../../lib/utils'
import { cx } from '../../lib/utils'
import { Icon, type IconName } from '../../components/ui/Icon'
import { Kbd } from '../../components/ui/Badge'
import { useFocusTrap } from '../../hooks/useFocusTrap'

interface PaletteItem {
  key: string
  section: 'Recent' | 'Commands' | 'Navigate' | 'Projects' | 'Findings'
  label: string
  hint?: string
  icon: IconName
  run: () => void
}

interface RecentEntry {
  id: string
  label: string
  href: string
  ts: number
}

const RECENTS_KEY = 'sd:recents'

export function CommandPalette() {
  const open = useUIStore((s) => s.paletteOpen)
  const setOpen = useUIStore((s) => s.setPaletteOpen)
  const toggleTheme = useUIStore((s) => s.toggleTheme)
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  useFocusTrap(boxRef, open)

  const projects = useProjects()
  const findingsQuery = useFindings({ q: query.length >= 2 ? query : undefined, page_size: 8 })

  // Reset on open.
  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
    }
  }, [open])

  const items = useMemo<PaletteItem[]>(() => {
    if (!open) return []
    const go = (path: string) => () => {
      navigate(path)
      setOpen(false)
    }
    const act = (fn: () => void) => () => {
      fn()
      setOpen(false)
    }

    const base: PaletteItem[] = [
      { key: 'cmd-new-project', section: 'Commands', label: 'New project', hint: 'Create', icon: 'plus', run: go('/projects?new=1') },
      { key: 'cmd-new-brief', section: 'Commands', label: 'New research brief', hint: 'Create', icon: 'file', run: go('/briefs?new=1') },
      { key: 'cmd-add-source', section: 'Commands', label: 'Add monitored source', hint: 'Create', icon: 'radio', run: go('/sources?new=1') },
      { key: 'cmd-theme', section: 'Commands', label: 'Toggle theme', hint: 'Dark / light', icon: 'sun', run: act(toggleTheme) },
      { key: 'nav-cc', section: 'Navigate', label: 'Command Center', icon: 'home', run: go('/') },
      { key: 'nav-projects', section: 'Navigate', label: 'Projects', icon: 'folder', run: go('/projects') },
      { key: 'nav-inbox', section: 'Navigate', label: 'Evidence Inbox', icon: 'inbox', run: go('/inbox') },
      { key: 'nav-briefs', section: 'Navigate', label: 'Briefs', icon: 'file', run: go('/briefs') },
      { key: 'nav-sources', section: 'Navigate', label: 'Source Monitor', icon: 'radio', run: go('/sources') },
    ]

    const recents = readJson<RecentEntry[]>(RECENTS_KEY, []).slice(0, 5)
    const recentItems: PaletteItem[] = recents.map((r) => ({
      key: `recent-${r.id}`,
      section: 'Recent',
      label: r.label,
      hint: 'Recently opened',
      icon: 'clock',
      run: go(r.href),
    }))

    const projectItems: PaletteItem[] = (projects.data ?? []).map((p) => ({
      key: `project-${p.id}`,
      section: 'Projects',
      label: p.name,
      hint: p.status,
      icon: 'folder',
      run: () => {
        pushRecent({ id: p.id, label: p.name, href: `/projects/${p.id}`, ts: Date.now() })
        navigate(`/projects/${p.id}`)
        setOpen(false)
      },
    }))

    const findingItems: PaletteItem[] = (findingsQuery.data?.items ?? []).map((f) => ({
      key: `finding-${f.id}`,
      section: 'Findings',
      label: f.title,
      hint: f.source_name ?? undefined,
      icon: 'zap',
      run: () => {
        navigate(`/inbox?q=${encodeURIComponent(f.title.split(' ').slice(0, 3).join(' '))}`)
        setOpen(false)
      },
    }))

    return [...recentItems, ...base, ...projectItems, ...findingItems]
  }, [open, projects.data, findingsQuery.data, navigate, setOpen, toggleTheme])

  const filtered = useMemo(() => {
    if (!query.trim()) return items.slice(0, 14)
    return items
      .map((it) => ({ it, score: fuzzyScore(query, it.label) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 14)
      .map((x) => x.it)
  }, [items, query])

  useEffect(() => setActive(0), [query])

  // Keep the active row in view.
  useEffect(() => {
    const el = listRef.current?.children[active] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      filtered[active]?.run()
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[55] flex items-start justify-center px-4 pt-[12vh]">
      <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} aria-hidden="true" />
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="sd-enter relative w-full max-w-[620px] overflow-hidden rounded-lg border border-border bg-raised shadow-2xl"
        onKeyDown={onKey}
      >
        <div className="flex items-center gap-2.5 border-b border-hairline px-4">
          <Icon name="search" size={15} className="shrink-0 text-ink-3" />
          <input
            data-autofocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, findings, or type a command…"
            className="h-12 w-full bg-transparent text-[14px] outline-none placeholder:text-ink-3"
            aria-label="Search commands"
          />
          <Kbd>esc</Kbd>
        </div>

        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-ink-3">No matches for “{query}”.</p>
        ) : (
          <ul ref={listRef} role="listbox" aria-label="Results" className="max-h-[46vh] overflow-y-auto py-1.5">
            {filtered.map((it, i) => {
              const showSection = i === 0 || filtered[i - 1].section !== it.section
              return (
                <li key={it.key} role="option" aria-selected={i === active}>
                  {showSection && (
                    <p className="px-4 pb-1 pt-2 font-mono text-[9px] uppercase tracking-[0.16em] text-ink-3">{it.section}</p>
                  )}
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={it.run}
                    className={cx(
                      'flex w-full items-center gap-2.5 px-4 py-2 text-left cursor-pointer',
                      i === active ? 'bg-accent-soft' : 'hover:bg-ink-3/8',
                    )}
                  >
                    <span className={cx('shrink-0', i === active ? 'text-accent' : 'text-ink-3')}>
                      <Icon name={it.icon} size={14} />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px]">{it.label}</span>
                    {it.hint && <span className="shrink-0 font-mono text-[10px] uppercase tracking-wide text-ink-3">{it.hint}</span>}
                    {i === active && <Kbd>↵</Kbd>}
                  </button>
                </li>
              )
            })}
          </ul>
        )}

        <div className="flex items-center gap-3 border-t border-hairline px-4 py-2 font-mono text-[10px] uppercase tracking-wide text-ink-3">
          <span><Kbd>↑↓</Kbd> navigate</span>
          <span><Kbd>↵</Kbd> select</span>
          <span className="ml-auto">{filtered.length} results</span>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function pushRecent(entry: RecentEntry) {
  const recents = readJson<RecentEntry[]>(RECENTS_KEY, []).filter((r) => r.id !== entry.id)
  writeJson(RECENTS_KEY, [entry, ...recents].slice(0, 6))
}

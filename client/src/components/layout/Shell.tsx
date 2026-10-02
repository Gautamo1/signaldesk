import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { cx } from '../../lib/utils'
import { fmtClock } from '../../lib/format'
import { useUIStore } from '../../store/ui'
import { useHealth, useMonitorStatus, useStats } from '../../api/hooks'
import { Icon, type IconName } from '../ui/Icon'
import { Kbd } from '../ui/Badge'
import { Dot } from '../ui/Badge'

const NAV: Array<{ to: string; label: string; icon: IconName; end?: boolean }> = [
  { to: '/', label: 'Command Center', icon: 'home', end: true },
  { to: '/projects', label: 'Projects', icon: 'folder' },
  { to: '/inbox', label: 'Evidence Inbox', icon: 'inbox' },
  { to: '/briefs', label: 'Briefs', icon: 'file' },
  { to: '/sources', label: 'Source Monitor', icon: 'radio' },
]

function sectionFor(pathname: string): string {
  const seg = pathname.split('/').filter(Boolean)[0]
  switch (seg) {
    case undefined:
      return 'Command Center'
    case 'projects':
      return 'Projects'
    case 'inbox':
      return 'Evidence Inbox'
    case 'briefs':
      return 'Briefs'
    case 'sources':
      return 'Source Monitor'
    default:
      return 'Not found'
  }
}

function Brand({ collapsed }: { collapsed: boolean }) {
  return (
    <div className={cx('flex h-12 items-center gap-2.5 border-b border-hairline', collapsed ? 'justify-center px-0' : 'px-4')}>
      <span className="flex size-6 shrink-0 items-center justify-center rounded bg-accent text-[#0a0d12]">
        <Icon name="activity" size={14} strokeWidth={2.2} />
      </span>
      {!collapsed && (
        <>
          <span className="text-[13px] font-bold tracking-tight">SignalDesk</span>
          <span className="ml-auto rounded border border-border bg-surface px-1 py-px font-mono text-[9px] uppercase tracking-wider text-ink-3">
            v1.0
          </span>
        </>
      )}
    </div>
  )
}

function NavItem({ to, label, icon, end, collapsed }: (typeof NAV)[number] & { collapsed: boolean }) {
  const unread = useStats().data?.findings.unread ?? 0
  return (
    <NavLink
      to={to}
      end={end}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        cx(
          'group relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[12.5px] transition-colors duration-100',
          collapsed && 'justify-center px-0',
          isActive ? 'bg-raised font-semibold text-ink' : 'text-ink-2 hover:bg-ink-3/8 hover:text-ink',
        )
      }
    >
      {({ isActive }) => (
        <>
          <span
            aria-hidden="true"
            className={cx(
              'absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r bg-accent transition-opacity',
              isActive ? 'opacity-100' : 'opacity-0',
            )}
          />
          <Icon name={icon} size={15} className={cx(isActive && 'text-accent')} />
          {!collapsed && <span className="flex-1 truncate">{label}</span>}
          {!collapsed && to === '/inbox' && unread > 0 && (
            <span className="rounded-full bg-accent-soft px-1.5 py-px font-mono text-[10px] tnum text-accent">
              {unread}
            </span>
          )}
        </>
      )}
    </NavLink>
  )
}

function Sidebar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const theme = useUIStore((s) => s.theme)
  const toggleTheme = useUIStore((s) => s.toggleTheme)

  return (
    <aside
      className={cx(
        'no-print fixed bottom-6 left-0 top-0 z-40 hidden flex-col border-r border-hairline bg-surface transition-[width] duration-150 md:flex',
        collapsed ? 'w-14' : 'w-[224px]',
      )}
    >
      <Brand collapsed={collapsed} />
      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2" aria-label="Primary">
        {!collapsed && (
          <p className="px-2.5 pb-1 pt-2 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-3">Workspace</p>
        )}
        {NAV.map((item) => (
          <NavItem key={item.to} {...item} collapsed={collapsed} />
        ))}
      </nav>
      <div className="border-t border-hairline p-2">
        <button
          type="button"
          onClick={toggleTheme}
          className={cx(
            'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[12px] text-ink-2 hover:bg-ink-3/8 hover:text-ink cursor-pointer',
            collapsed && 'justify-center px-0',
          )}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} />
          {!collapsed && <span>{theme === 'dark' ? 'Light theme' : 'Dark theme'}</span>}
        </button>
        <button
          type="button"
          onClick={toggleSidebar}
          className={cx(
            'flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[12px] text-ink-3 hover:bg-ink-3/8 hover:text-ink cursor-pointer',
            collapsed && 'justify-center px-0',
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <Icon name={collapsed ? 'chevron-right' : 'chevron-left'} size={15} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  )
}

function Topbar() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const setPaletteOpen = useUIStore((s) => s.setPaletteOpen)
  const location = useLocation()

  return (
    <header
      className={cx(
        'no-print fixed right-0 top-0 z-30 flex h-12 items-center gap-3 border-b border-hairline bg-bg/85 px-4 backdrop-blur transition-[left] duration-150 md:px-6',
        collapsed ? 'left-14' : 'md:left-[224px]',
      )}
    >
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-ink-3">
        <span className="hidden sm:inline">signaldesk</span>
        <span className="hidden sm:inline" aria-hidden="true">/</span>
        <span className="truncate text-ink-2">{sectionFor(location.pathname)}</span>
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="hidden h-8 w-60 items-center justify-between rounded-md border border-border bg-surface px-2.5 text-xs text-ink-3 transition-colors hover:border-ink-3/40 cursor-pointer lg:flex"
        >
          <span className="flex items-center gap-2">
            <Icon name="search" size={13} />
            Search or jump to…
          </span>
          <Kbd>⌘K</Kbd>
        </button>
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="flex size-8 items-center justify-center rounded-md border border-border bg-surface text-ink-2 hover:text-ink cursor-pointer lg:hidden"
          aria-label="Open command palette"
        >
          <Icon name="search" size={15} />
        </button>
      </div>
    </header>
  )
}

function StatusBar() {
  const monitor = useMonitorStatus()
  const health = useHealth()
  const m = monitor.data
  return (
    <footer
      className="no-print fixed bottom-0 left-0 right-0 z-30 flex h-6 items-center gap-4 overflow-hidden border-t border-hairline bg-surface px-4 font-mono text-[10px] uppercase tracking-wider text-ink-3"
      aria-label="System status"
    >
      <span className="flex items-center gap-1.5 whitespace-nowrap">
        <Dot className={m && m.enabled > 0 ? 'bg-ok' : 'bg-ink-3'} pulse={Boolean(m && m.enabled > 0)} />
        monitoring {m ? `${m.enabled}/${m.total}` : '–/–'} sources
      </span>
      <span className="hidden whitespace-nowrap sm:inline">last check {fmtClock(m?.last_check ?? null)}</span>
      <span className="whitespace-nowrap text-accent/80">simulated feed</span>
      <span className="ml-auto hidden whitespace-nowrap md:inline">
        db {health.data ? (health.data.db === 'ok' ? 'ok' : 'degraded') : '…'} · signaldesk v1.0.0
      </span>
    </footer>
  )
}

function MobileNav() {
  return (
    <nav
      className="no-print fixed inset-x-0 bottom-0 z-40 grid h-[52px] grid-cols-5 border-t border-hairline bg-raised pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Primary mobile"
    >
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) =>
            cx('flex flex-col items-center justify-center gap-0.5 text-[9px] uppercase tracking-wide', isActive ? 'text-accent' : 'text-ink-3')
          }
        >
          <Icon name={item.icon} size={16} />
          {item.label.split(' ')[0]}
        </NavLink>
      ))}
    </nav>
  )
}

export function Shell() {
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const setPaletteOpen = useUIStore((s) => s.setPaletteOpen)

  // Global shortcuts: ⌘K / Ctrl+K toggles the palette; "/" focuses search.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen(!useUIStore.getState().paletteOpen)
      } else if (e.key === '/' && !typing && !useUIStore.getState().paletteOpen) {
        e.preventDefault()
        setPaletteOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [setPaletteOpen])

  // Scroll to top on route change.
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="min-h-screen">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-[70] focus:rounded focus:bg-accent focus:px-3 focus:py-1.5 focus:text-sm focus:font-semibold focus:text-[#0a0d12]"
      >
        Skip to content
      </a>
      <Sidebar />
      <Topbar />
      <main
        id="main"
        className={cx(
          'print-root min-h-screen pb-16 pt-12 transition-[padding] duration-150 md:pb-10',
          collapsed ? 'md:pl-14' : 'md:pl-[224px]',
        )}
      >
        <div className="mx-auto w-full max-w-[1500px] px-4 lg:px-6">
          <Outlet />
        </div>
      </main>
      <StatusBar />
      <MobileNav />
    </div>
  )
}

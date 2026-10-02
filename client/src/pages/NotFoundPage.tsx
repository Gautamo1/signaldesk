import { Link } from 'react-router-dom'
import { useUIStore } from '../store/ui'
import { Icon } from '../components/ui/Icon'
import { Kbd } from '../components/ui/Badge'

export function NotFoundPage() {
  const setPaletteOpen = useUIStore((s) => s.setPaletteOpen)
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-28 text-center">
      <p className="font-mono text-[64px] font-bold leading-none text-ink-3/40">404</p>
      <div>
        <h1 className="text-lg font-bold">Signal lost.</h1>
        <p className="mx-auto mt-1 max-w-[380px] text-xs leading-relaxed text-ink-2">
          This route doesn't exist in the desk. Jump back to the command center or open the palette and search for what you need.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <Link
          to="/"
          className="inline-flex h-8 items-center gap-2 rounded-md bg-accent px-3.5 text-[13px] font-semibold text-[#0a0d12] hover:brightness-110"
        >
          <Icon name="arrow-left" size={14} />
          Command Center
        </Link>
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-surface px-3.5 text-[13px] text-ink-2 hover:text-ink cursor-pointer"
        >
          <Icon name="command" size={14} />
          Search <Kbd>⌘K</Kbd>
        </button>
      </div>
    </div>
  )
}

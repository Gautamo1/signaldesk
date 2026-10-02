import { create } from 'zustand'

type Theme = 'dark' | 'light'

interface UIState {
  theme: Theme
  setTheme: (t: Theme) => void
  toggleTheme: () => void
  paletteOpen: boolean
  setPaletteOpen: (open: boolean) => void
  sidebarCollapsed: boolean
  toggleSidebar: () => void
}

function initialTheme(): Theme {
  try {
    const t = localStorage.getItem('sd:theme')
    if (t === 'light' || t === 'dark') return t
  } catch {
    /* ignore */
  }
  return 'dark' // dark-first product identity
}

function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = t
  try {
    localStorage.setItem('sd:theme', t)
  } catch {
    /* ignore */
  }
}

export const useUIStore = create<UIState>((set, get) => ({
  theme: initialTheme(),
  setTheme: (t) => {
    applyTheme(t)
    set({ theme: t })
  },
  toggleTheme: () => {
    const next: Theme = get().theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    set({ theme: next })
  },
  paletteOpen: false,
  setPaletteOpen: (open) => set({ paletteOpen: open }),
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}))

// Apply on module load (index.html already did a pre-paint pass; this keeps
// the store in sync after hydration).
applyTheme(useUIStore.getState().theme)

import { create } from 'zustand'

type Theme = 'light' | 'dark'

interface UIState {
  theme: Theme
  toggleTheme: () => void
  setTheme: (t: Theme) => void
  init: () => void
}

function apply(theme: Theme) {
  if (theme === 'dark') document.documentElement.classList.add('dark')
  else document.documentElement.classList.remove('dark')
  document.documentElement.style.colorScheme = theme
}

export const useUIStore = create<UIState>((set, get) => ({
  theme: 'light',
  toggleTheme: () => {
    const next = get().theme === 'light' ? 'dark' : 'light'
    set({ theme: next })
    apply(next)
    localStorage.setItem('flash-theme', next)
  },
  setTheme: (t) => {
    set({ theme: t })
    apply(t)
    localStorage.setItem('flash-theme', t)
  },
  init: () => {
    const saved = (localStorage.getItem('flash-theme') as Theme | null)
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches
    const theme = saved ?? (prefersDark ? 'dark' : 'light')
    set({ theme })
    apply(theme)
  },
}))

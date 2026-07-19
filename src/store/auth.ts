import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

interface AuthState {
  session: | { user: { id: string; email?: string } } | null
  profile: Profile | null
  loading: boolean
  init: () => Promise<void>
  setProfile: (p: Profile | null) => void
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  profile: null,
  loading: true,

  init: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    set({ session: session as any, loading: false })
    if (session) {
      await get().refreshProfile()
    }
    supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        set({ session: session as any, loading: false })
        if (session) {
          await ensureProfile(session.user.id, session.user.email ?? '')
          await get().refreshProfile()
        } else {
          set({ profile: null })
        }
      })()
    })
  },

  setProfile: (p) => set({ profile: p }),

  refreshProfile: async () => {
    const { session } = get()
    if (!session) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle()
    set({ profile: data as Profile | null })
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, profile: null })
  },
}))

async function ensureProfile(userId: string, email: string) {
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()
  if (!data) {
    const base = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_')
    let username = base || 'user'
    // ensure uniqueness
    const { data: existing } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .maybeSingle()
    if (existing) username = `${base}_${Math.random().toString(36).slice(2, 6)}`
    await supabase.from('profiles').insert({
      id: userId,
      username,
      full_name: '',
      bio: '',
    })
  }
}

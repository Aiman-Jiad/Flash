import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import { getConversations, searchProfiles, getOrCreateConversation, isFollowing, toggleFollow } from '@/lib/api'
import { TopBar } from '@/components/Navigation'
import { Avatar } from '@/components/Avatar'
import { ChatIcon, SearchIcon, CloseIcon } from '@/components/icons'
import { timeAgo, cn } from '@/lib/utils'
import type { Conversation, Profile } from '@/types'

export function MessagesScreen() {
  const profile = useAuthStore((s) => s.profile)
  const navigate = useNavigate()
  const [convs, setConvs] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [people, setPeople] = useState<Profile[]>([])
  const [followMap, setFollowMap] = useState<Record<string, boolean>>({})
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    getConversations(profile.id).then((c) => { setConvs(c); setLoading(false) })
  }, [profile?.id])

  useEffect(() => {
    const q = query.trim()
    if (!q) { setPeople([]); setFollowMap({}); return }
    const t = setTimeout(async () => {
      const p = await searchProfiles(q)
      const filtered = p.filter((x) => x.id !== profile?.id)
      setPeople(filtered)
      if (profile && filtered.length) {
        const entries = await Promise.all(
          filtered.map(async (x) => [x.id, await isFollowing(profile.id, x.id)] as const),
        )
        setFollowMap(Object.fromEntries(entries))
      }
    }, 250)
    return () => clearTimeout(t)
  }, [query, profile?.id])

  async function startChat(other: Profile) {
    if (!profile) return
    setBusy(other.id)
    try {
      const id = await getOrCreateConversation(profile.id, other.id)
      navigate(`/messages/${id}`)
    } finally {
      setBusy(null)
    }
  }

  async function onFollow(other: Profile) {
    if (!profile) return
    setBusy(other.id)
    try {
      const nowFollowing = await toggleFollow(profile.id, other.id)
      setFollowMap((m) => ({ ...m, [other.id]: nowFollowing }))
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="md:pl-64 pb-20 md:pb-0 min-h-screen">
      <TopBar title="Messages" />
      <div className="max-w-xl mx-auto md:pt-8 p-4">
        {/* New chat search */}
        <div className="relative mb-5">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search to start a new chat"
            className="w-full pl-12 pr-12 py-3 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500/30"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-800">
              <CloseIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {query && people.length > 0 && (
          <div className="mb-5 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 px-2 mb-1">People</div>
            {people.map((p) => {
              const following = !!followMap[p.id]
              const isBusy = busy === p.id
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-900/50"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button onClick={() => navigate(`/u/${p.username}`)} className="shrink-0">
                      <Avatar src={p.avatar_url} name={p.username} size={44} ring="story" />
                    </button>
                    <button onClick={() => navigate(`/u/${p.username}`)} className="min-w-0 flex-1 text-left">
                      <div className="font-semibold text-sm truncate">{p.username}</div>
                      <div className="text-xs text-neutral-500 truncate">{p.full_name || 'Flash user'}</div>
                    </button>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 sm:justify-end">
                    {!following && (
                      <motion.button
                        whileTap={{ scale: 0.94 }}
                        disabled={isBusy}
                        onClick={() => onFollow(p)}
                        className="flex-1 sm:flex-none px-4 py-2 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 text-white text-xs font-bold shadow-md shadow-accent-500/25 hover:shadow-accent-500/40 hover:brightness-110 transition disabled:opacity-50"
                      >
                        Follow
                      </motion.button>
                    )}
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      disabled={isBusy}
                      onClick={() => startChat(p)}
                      className={cn(
                        'flex items-center justify-center gap-1.5 flex-1 sm:flex-none px-4 py-2 rounded-full text-xs font-bold transition disabled:opacity-50',
                        following
                          ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-300 dark:hover:bg-neutral-700'
                          : 'bg-accent-500/10 text-accent-600 dark:text-accent-400 hover:bg-accent-500/20',
                      )}
                    >
                      <ChatIcon className="w-4 h-4" />
                      Message
                    </motion.button>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {query && people.length === 0 && (
          <div className="text-center text-sm text-neutral-400 py-8">No people found</div>
        )}

        {/* Conversation list */}
        {!query && (
          loading ? (
            <div className="text-center text-sm text-neutral-400 py-12">Loading…</div>
          ) : convs.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mx-auto mb-4">
                <ChatIcon className="w-8 h-8 text-neutral-400" />
              </div>
              <h3 className="font-semibold text-lg mb-1">No messages yet</h3>
              <p className="text-sm text-neutral-500">Search above to start a conversation.</p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 px-2 mb-1">Conversations</div>
              {convs.map((c) => (
                <motion.button
                  key={c.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(`/messages/${c.id}`)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-900 transition text-left"
                >
                  <Avatar src={c.otherUser?.avatar_url} name={c.otherUser?.username} size={56} ring="story" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{c.otherUser?.username}</div>
                    <div className="text-xs text-neutral-500 truncate">{c.lastMessage?.body || 'Say hi 👋'}</div>
                  </div>
                  <div className="text-right">
                    {c.lastMessage && <div className="text-xs text-neutral-400 mb-1">{timeAgo(c.lastMessage.created_at)}</div>}
                    {c.unread ? <div className="ml-auto w-2.5 h-2.5 rounded-full bg-accent-500" /> : null}
                  </div>
                </motion.button>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}

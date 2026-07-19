import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import { getConversations, searchProfiles, getOrCreateConversation } from '@/lib/api'
import { TopBar } from '@/components/Navigation'
import { Avatar } from '@/components/Avatar'
import { ChatIcon, SearchIcon, CloseIcon } from '@/components/icons'
import { timeAgo } from '@/lib/utils'
import type { Conversation, Profile } from '@/types'

export function MessagesScreen() {
  const profile = useAuthStore((s) => s.profile)
  const navigate = useNavigate()
  const [convs, setConvs] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [people, setPeople] = useState<Profile[]>([])

  useEffect(() => {
    if (!profile) return
    getConversations(profile.id).then((c) => { setConvs(c); setLoading(false) })
  }, [profile?.id])

  useEffect(() => {
    const q = query.trim()
    if (!q) { setPeople([]); return }
    const t = setTimeout(async () => {
      const p = await searchProfiles(q)
      setPeople(p.filter((x) => x.id !== profile?.id))
    }, 250)
    return () => clearTimeout(t)
  }, [query, profile?.id])

  async function startChat(other: Profile) {
    if (!profile) return
    const id = await getOrCreateConversation(profile.id, other.id)
    navigate(`/messages/${id}`)
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
          <div className="mb-5 space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 px-2 mb-1">Start chat with</div>
            {people.map((p) => (
              <button key={p.id} onClick={() => startChat(p)} className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-900 transition text-left">
                <Avatar src={p.avatar_url} name={p.username} size={40} />
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate">{p.username}</div>
                  <div className="text-xs text-neutral-500 truncate">{p.full_name || 'Flash user'}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Conversation list */}
        {loading ? (
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
        )}
      </div>
    </div>
  )
}

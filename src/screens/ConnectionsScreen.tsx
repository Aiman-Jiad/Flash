import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import { getProfileByUsername, getFollowers, getFollowing, canViewConnections, toggleFollow } from '@/lib/api'
import { TopBar } from '@/components/Navigation'
import { Avatar } from '@/components/Avatar'
import { BackIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types'

type Row = Profile & { followed_by_me: boolean }

export function ConnectionsScreen() {
  const { username, tab } = useParams<{ username: string; tab: string }>()
  const profile = useAuthStore((s) => s.profile)
  const navigate = useNavigate()
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [denied, setDenied] = useState(false)
  const [target, setTarget] = useState<Profile | null>(null)
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>(tab === 'following' ? 'following' : 'followers')

  const isOwn = profile?.username === username

  useEffect(() => {
    if (!username || !profile) return
    let alive = true
    setLoading(true)
    setDenied(false)
    ;(async () => {
      const u = await getProfileByUsername(username)
      if (!u) { if (alive) setLoading(false); return }
      setTarget(u)
      const allowed = await canViewConnections(profile.id, u.id)
      if (!allowed) { if (alive) { setDenied(true); setLoading(false) }; return }
      const list = activeTab === 'followers'
        ? await getFollowers(u.id, profile.id)
        : await getFollowing(u.id, profile.id)
      if (alive) { setRows(list); setLoading(false) }
    })()
    return () => { alive = false }
  }, [username, profile?.id, activeTab])

  async function onToggle(row: Row) {
    if (!profile) return
    const next = await toggleFollow(profile.id, row.id)
    setRows((prev) => prev.map((r) => r.id === row.id ? { ...r, followed_by_me: next } : r))
  }

  return (
    <div className="md:pl-64 pb-20 md:pb-0 min-h-screen">
      <TopBar
        title={target?.username ? `${target.username}'s ${activeTab}` : 'Connections'}
        onBack={() => navigate(`/u/${username}`)}
      />
      <div className="max-w-xl mx-auto md:pt-8">
        {/* Tabs */}
        <div className="flex border-b border-neutral-200/60 dark:border-neutral-800/60">
          <button
            onClick={() => { setActiveTab('followers'); navigate(`/u/${username}/followers`, { replace: true }) }}
            className={cn('flex-1 py-3 text-sm font-semibold transition', activeTab === 'followers' ? 'text-neutral-900 dark:text-white border-b-2 border-neutral-900 dark:border-white' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300')}
          >
            Followers
          </button>
          <button
            onClick={() => { setActiveTab('following'); navigate(`/u/${username}/following`, { replace: true }) }}
            className={cn('flex-1 py-3 text-sm font-semibold transition', activeTab === 'following' ? 'text-neutral-900 dark:text-white border-b-2 border-neutral-900 dark:border-white' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300')}
          >
            Following
          </button>
        </div>

        <div className="p-3">
          {loading ? (
            <div className="text-center text-sm text-neutral-400 py-12">Loading…</div>
          ) : denied ? (
            <div className="text-center py-16 px-6">
              <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mx-auto mb-4">
                <LockIcon className="w-7 h-7 text-neutral-400" />
              </div>
              <h3 className="font-semibold text-lg mb-1">This account is private</h3>
              <p className="text-sm text-neutral-500">
                {target?.username} only shares their followers and following with approved followers.
              </p>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-16">
              <h3 className="font-semibold text-lg mb-1">No {activeTab} yet</h3>
              <p className="text-sm text-neutral-500">
                {isOwn ? 'When someone follows you, they’ll appear here.' : `${target?.username} hasn't ${activeTab === 'followers' ? 'been followed by anyone yet' : 'followed anyone yet'}.`}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              <AnimatePresence mode="popLayout">
                {rows.map((r) => (
                  <motion.div
                    key={r.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-3 p-2 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition"
                  >
                    <button onClick={() => navigate(`/u/${r.username}`)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                      <Avatar src={r.avatar_url} name={r.username} size={44} />
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate flex items-center gap-1">
                          {r.username}
                          {r.is_private && <LockIcon className="w-3 h-3 text-neutral-400" />}
                        </div>
                        {r.full_name && <div className="text-xs text-neutral-500 truncate">{r.full_name}</div>}
                      </div>
                    </button>
                    {r.id !== profile?.id && (
                      <button
                        onClick={() => onToggle(r)}
                        className={cn('px-4 py-1.5 rounded-lg text-xs font-semibold transition active:scale-95', r.followed_by_me ? 'bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800' : 'bg-accent-500 text-white hover:bg-accent-600 shadow-md shadow-accent-500/20')}
                      >
                        {r.followed_by_me ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 1 1 8 0v4" /></svg>
  )
}

import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import { getProfileByUsername, getFollowStats, isFollowing, toggleFollow, getUserPosts, getSavedPosts } from '@/lib/api'
import { TopBar } from '@/components/Navigation'
import { Avatar } from '@/components/Avatar'
import { SettingsIcon, BackIcon, BookmarkIcon, MoreIcon } from '@/components/icons'
import { ProfileSkeleton } from '@/components/Skeleton'
import { formatCount, cn } from '@/lib/utils'
import type { Profile, Post } from '@/types'

export function ProfileScreen({ saved = false }: { saved?: boolean }) {
  const { username } = useParams()
  const profile = useAuthStore((s) => s.profile)
  const navigate = useNavigate()
  const [user, setUser] = useState<Profile | null>(null)
  const [stats, setStats] = useState({ followers: 0, following: 0 })
  const [following, setFollowing] = useState(false)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'posts' | 'saved'>(saved ? 'saved' : 'posts')

  const isOwn = profile?.username === username

  useEffect(() => {
    if (!username) return
    setLoading(true)
    ;(async () => {
      const u = await getProfileByUsername(username)
      setUser(u)
      if (u) {
        const s = await getFollowStats(u.id)
        setStats(s)
        if (profile) {
          const f = await isFollowing(profile.id, u.id)
          setFollowing(f)
        }
        if (isOwn) {
          if (saved) {
            const p = await getSavedPosts(profile!.id)
            setPosts(p)
            setTab('saved')
          } else {
            const p = await getUserPosts(u.id)
            setPosts(p)
            setTab('posts')
          }
        } else {
          const p = await getUserPosts(u.id)
          setPosts(p)
          setTab('posts')
        }
      }
      setLoading(false)
    })()
  }, [username, profile?.id, saved])

  async function onFollow() {
    if (!profile || !user) return
    const next = await toggleFollow(profile.id, user.id)
    setFollowing(next)
    setStats((s) => ({ ...s, followers: s.followers + (next ? 1 : -1) }))
  }

  return (
    <div className="md:pl-64 pb-20 md:pb-0 min-h-screen">
      <TopBar title={user?.username || 'Profile'} right={
        isOwn ? (
          <Link to="/accounts/edit" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 transition">
            <SettingsIcon className="w-5 h-5" />
          </Link>
        ) : <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 transition"><MoreIcon className="w-5 h-5" /></button>
      } />
      <div className="max-w-3xl mx-auto md:pt-6">
        {loading || !user ? <ProfileSkeleton /> : (
          <>
            {/* Header */}
            <div className="p-5 sm:p-8 flex flex-col sm:flex-row gap-6 sm:gap-10 items-center sm:items-start">
              <Avatar src={user.avatar_url} name={user.username} size={96} ring="story" className="flex-shrink-0" />
              <div className="flex-1 w-full">
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <h1 className="font-display text-xl font-bold">{user.username}</h1>
                  {isOwn ? (
                    <div className="flex gap-2">
                      <Link to="/accounts/edit" className="px-4 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-900 text-sm font-semibold hover:bg-neutral-200 dark:hover:bg-neutral-800 transition">Edit profile</Link>
                      <button onClick={() => useAuthStore.getState().signOut().then(() => navigate('/login'))} className="px-4 py-1.5 rounded-lg bg-neutral-100 dark:bg-neutral-900 text-sm font-semibold hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 transition">Log out</button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={onFollow} className={cn('px-5 py-1.5 rounded-lg text-sm font-semibold transition', following ? 'bg-neutral-100 dark:bg-neutral-900 hover:bg-neutral-200 dark:hover:bg-neutral-800' : 'bg-accent-500 text-white hover:bg-accent-600 shadow-lg shadow-accent-500/30')}>
                        {following ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex gap-6 mb-4">
                  <div><span className="font-semibold">{posts.length}</span> <span className="text-neutral-500 text-sm">posts</span></div>
                  <div><span className="font-semibold">{formatCount(stats.followers)}</span> <span className="text-neutral-500 text-sm">followers</span></div>
                  <div><span className="font-semibold">{formatCount(stats.following)}</span> <span className="text-neutral-500 text-sm">following</span></div>
                </div>
                <div className="text-sm">
                  {user.full_name && <div className="font-semibold">{user.full_name}</div>}
                  {user.bio && <div className="text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap">{user.bio}</div>}
                  {user.website && <a href={user.website} target="_blank" rel="noreferrer" className="text-accent-500 font-medium hover:underline block mt-1">{user.website}</a>}
                </div>
              </div>
            </div>

            {/* Tabs */}
            {isOwn && (
              <div className="border-t border-neutral-200/60 dark:border-neutral-800/60 flex">
                <TabButton active={tab === 'posts'} onClick={() => { setTab('posts'); navigate(`/u/${user.username}`) }} icon={<GridIcon />} label="Posts" />
                <TabButton active={tab === 'saved'} onClick={() => { setTab('saved'); navigate(`/u/${user.username}/saved`) }} icon={<BookmarkIcon className="w-5 h-5" />} label="Saved" />
              </div>
            )}

            {/* Grid */}
            <div className="grid grid-cols-3 gap-1 sm:gap-2 p-1 sm:p-2">
              {posts.length === 0 ? (
                <div className="col-span-3 text-center py-20 text-sm text-neutral-400">
                  {tab === 'saved' ? 'No saved posts yet.' : 'No posts yet.'}
                </div>
              ) : posts.map((p) => {
                const img = p.images?.[0]
                return (
                  <motion.button
                    key={p.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => navigate(`/p/${p.id}`)}
                    className="relative aspect-square rounded-md overflow-hidden bg-neutral-100 dark:bg-neutral-900 group"
                  >
                    {img && <img src={img.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />}
                    {p.images && p.images.length > 1 && (
                      <div className="absolute top-1.5 right-1.5 text-white text-[10px]">▦</div>
                    )}
                    <div className="absolute bottom-1.5 left-1.5 text-white text-[10px] flex items-center gap-0.5 bg-black/40 rounded-full px-1.5">
                      <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="currentColor"><path d="M12 21s-7-4.5-9.5-9C1 9 2.5 5.5 6 5.5c2 0 3.2 1 4 2 .8-1 2-2 4-2 3.5 0 5 3.5 3.5 6.5C19 16.5 12 21 12 21z" /></svg>
                      {p.like_count}
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={cn('flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold uppercase tracking-wide transition', active ? 'text-neutral-900 dark:text-white border-t border-neutral-900 dark:border-white' : 'text-neutral-400')}>
      {icon} {label}
    </button>
  )
}

function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
  )
}

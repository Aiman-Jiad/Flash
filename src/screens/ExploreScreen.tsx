import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getExplorePosts, searchProfiles } from '@/lib/api'
import { TopBar } from '@/components/Navigation'
import { SearchIcon, CloseIcon } from '@/components/icons'
import { Avatar } from '@/components/Avatar'
import { Skeleton } from '@/components/Skeleton'
import type { Post, Profile } from '@/types'

export function ExploreScreen() {
  const navigate = useNavigate()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [people, setPeople] = useState<Profile[]>([])

  useEffect(() => {
    getExplorePosts(40).then((p) => { setPosts(p); setLoading(false) })
  }, [])

  useEffect(() => {
    const q = query.trim()
    if (!q) { setSearching(false); setPeople([]); return }
    setSearching(true)
    const t = setTimeout(async () => {
      if (q.startsWith('#')) {
        // hashtag search: just navigate to hashtag results
        setPeople([])
      } else {
        const p = await searchProfiles(q)
        setPeople(p)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  return (
    <div className="md:pl-64 pb-20 md:pb-0 min-h-screen">
      <TopBar title="Explore" />
      <div className="max-w-5xl mx-auto md:pt-8 p-4">
        {/* Search */}
        <div className="relative mb-6">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people or #hashtags"
            className="w-full pl-12 pr-12 py-3 rounded-2xl bg-neutral-100 dark:bg-neutral-900 border border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500/30"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-neutral-800">
              <CloseIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* People results */}
        {searching && query && !query.startsWith('#') && (
          <div className="mb-6">
            <div className="text-sm font-semibold text-neutral-500 mb-3">People</div>
            {people.length === 0 ? (
              <div className="text-sm text-neutral-400 py-4">No people found.</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {people.map((p) => (
                  <button key={p.id} onClick={() => navigate(`/u/${p.username}`)} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-neutral-50 dark:hover:bg-neutral-900 transition border border-neutral-200/60 dark:border-neutral-800/60">
                    <Avatar src={p.avatar_url} name={p.username} size={40} />
                    <div className="min-w-0 text-left">
                      <div className="font-semibold text-sm truncate">{p.username}</div>
                      <div className="text-xs text-neutral-500 truncate">{p.full_name || p.bio || 'Flash user'}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Hashtag hint */}
        {query.startsWith('#') && query.length > 1 && (
          <div className="mb-6 text-sm text-neutral-500">
            Showing posts matching <span className="text-accent-500 font-semibold">{query}</span> — tap any post below.
          </div>
        )}

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 sm:gap-2">
          {loading ? (
            Array.from({ length: 9 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-lg" />)
          ) : (
            posts.map((p) => {
              const img = p.images?.[0]
              const match = !query || (query.startsWith('#') ? (p.caption || '').toLowerCase().includes(query.toLowerCase()) : false)
              if (query.startsWith('#') && !match) return null
              return (
                <motion.button
                  key={p.id}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => navigate(`/p/${p.id}`)}
                  className="relative aspect-square rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-900 group"
                >
                  {img && <img src={img.url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />}
                  {p.images && p.images.length > 1 && (
                    <div className="absolute top-2 right-2 text-white text-xs bg-black/40 rounded-full px-1.5 py-0.5">▦ {p.images.length}</div>
                  )}
                  {p.like_count > 0 && (
                    <div className="absolute bottom-2 left-2 text-white text-xs bg-black/40 rounded-full px-2 py-0.5 flex items-center gap-1">
                      <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor"><path d="M12 21s-7-4.5-9.5-9C1 9 2.5 5.5 6 5.5c2 0 3.2 1 4 2 .8-1 2-2 4-2 3.5 0 5 3.5 3.5 6.5C19 16.5 12 21 12 21z" /></svg>
                      {p.like_count}
                    </div>
                  )}
                </motion.button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

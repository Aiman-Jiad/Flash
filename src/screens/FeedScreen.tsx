import { useEffect, useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import { getFeedPage, getActiveStories, createStory, uploadFile } from '@/lib/api'
import { PostCard } from '@/components/PostCard'
import { CommentsModal } from '@/components/CommentsModal'
import { StoryBar } from '@/components/StoryBar'
import { StoryViewer } from '@/components/StoryViewer'
import { PostCardSkeleton, StoryBarSkeleton } from '@/components/Skeleton'
import { TopBar } from '@/components/Navigation'
import { CameraIcon } from '@/components/icons'
import { Avatar } from '@/components/Avatar'
import type { Post, Story } from '@/types'

export function FeedScreen() {
  const profile = useAuthStore((s) => s.profile)
  const [posts, setPosts] = useState<Post[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [stories, setStories] = useState<Story[]>([])
  const [openComments, setOpenComments] = useState<Post | null>(null)
  const [storyViewerIndex, setStoryViewerIndex] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [pullY, setPullY] = useState(0)
  const startY = useRef<number | null>(null)
  const feedRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async (reset = false) => {
    if (!profile) return
    if (reset) { setLoading(true); setPosts([]); setCursor(null) }
    const { items, nextCursor } = await getFeedPage({ userId: profile.id, cursor: reset ? undefined : cursor || undefined })
    setPosts((prev) => reset ? items : [...prev, ...items])
    setCursor(nextCursor)
    setLoading(false)
    setLoadingMore(false)
    setRefreshing(false)
  }, [profile, cursor])

  useEffect(() => {
    if (profile) {
      load(true)
      getActiveStories().then(setStories)
    }
  }, [profile])

  // Infinite scroll
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && cursor && !loadingMore && !loading) {
        setLoadingMore(true)
        load()
      }
    }, { rootMargin: '600px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [cursor, loadingMore, loading, load])

  // Pull to refresh
  function onTouchStart(e: React.TouchEvent) {
    const el = feedRef.current
    if (!el || el.scrollTop > 0) return
    startY.current = e.touches[0].clientY
  }
  function onTouchMove(e: React.TouchEvent) {
    if (startY.current == null) return
    const dy = e.touches[0].clientY - startY.current
    if (dy > 0) {
      setPullY(Math.min(dy * 0.4, 80))
    }
  }
  async function onTouchEnd() {
    if (pullY > 60) {
      setRefreshing(true)
      await load(true)
      getActiveStories().then(setStories)
    }
    setPullY(0)
    startY.current = null
  }

  async function onAddStory(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    const { url } = await uploadFile('stories', file, profile.id)
    if (url) {
      await createStory({ userId: profile.id, url })
      getActiveStories().then(setStories)
    }
  }

  return (
    <div className="md:pl-64 pb-20 md:pb-0 min-h-screen">
      <TopBar title="Flash" />
      <div
        ref={feedRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="max-w-xl mx-auto md:pt-8"
        style={{ transform: `translateY(${pullY}px)` }}
      >
        {refreshing && (
          <div className="flex justify-center py-3 text-sm text-neutral-400">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-5 h-5 border-2 border-accent-500 border-t-transparent rounded-full" />
          </div>
        )}

        {/* Story bar */}
        {loading ? <StoryBarSkeleton /> : (
          <StoryBar stories={stories} myAvatar={profile?.avatar_url} myUsername={profile?.username} onAddStory={onAddStory} onOpen={(i) => setStoryViewerIndex(i)} />
        )}

        {/* Feed */}
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <PostCardSkeleton key={i} />)
        ) : posts.length === 0 ? (
          <EmptyFeed />
        ) : (
          posts.map((p) => <PostCard key={p.id} post={p} onOpenComments={setOpenComments} />)
        )}

        {loadingMore && <PostCardSkeleton />}

        <div ref={sentinelRef} className="h-10" />
      </div>

      {openComments && <CommentsModal post={openComments} onClose={() => setOpenComments(null)} />}
      {storyViewerIndex !== null && (
        <StoryViewer
          stories={stories}
          startIndex={storyViewerIndex}
          onClose={() => setStoryViewerIndex(null)}
        />
      )}
    </div>
  )
}

function EmptyFeed() {
  return (
    <div className="text-center py-20 px-6">
      <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mx-auto mb-4">
        <CameraIcon className="w-8 h-8 text-neutral-400" />
      </div>
      <h3 className="font-semibold text-lg mb-1">Your feed is quiet</h3>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto">
        Follow people or share your first post to bring it to life.
      </p>
    </div>
  )
}

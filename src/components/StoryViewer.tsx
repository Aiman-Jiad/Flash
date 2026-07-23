import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Avatar } from '@/components/Avatar'
import { CloseIcon, TrashIcon } from '@/components/icons'
import { useAuthStore } from '@/store/auth'
import { supabase } from '@/lib/supabase'
import { markStoryViewed, reactToStory, sendStoryMessage, getTopStoryEmojis, getStoryViewers, deleteStory } from '@/lib/api'
import { timeAgo } from '@/lib/utils'
import type { Story, Profile } from '@/types'

const FALLBACK_EMOJIS = ['❤️', '😂', '🔥', '😍', '👏']

interface StoryViewerProps {
  stories: Story[]
  startIndex: number
  onClose: () => void
  onStoriesChange?: () => void
}

export function StoryViewer({ stories, startIndex, onClose, onStoriesChange }: StoryViewerProps) {
  const profile = useAuthStore((s) => s.profile)
  const [userIdx, setUserIdx] = useState(startIndex)
  const [storyIdx, setStoryIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [emojis, setEmojis] = useState<string[]>(FALLBACK_EMOJIS)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [viewCount, setViewCount] = useState(0)
  const [viewers, setViewers] = useState<Pick<Profile, 'id' | 'username' | 'full_name' | 'avatar_url'>[]>([])
  const [showViewers, setShowViewers] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<number | null>(null)

  // Group by user
  const byUser = new Map<string, Story[]>()
  stories.forEach((s) => {
    const arr = byUser.get(s.user_id) || []
    arr.push(s)
    byUser.set(s.user_id, arr)
  })
  const users = Array.from(byUser.entries()).map(([userId, arr]) => ({ userId, stories: arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) }))

  const currentUser = users[userIdx]
  const currentStory = currentUser?.stories[storyIdx]
  const isOwnStory = currentStory?.user_id === profile?.id

  // Load top emojis once
  useEffect(() => {
    getTopStoryEmojis(5).then((rows) => {
      if (rows.length >= 5) {
        setEmojis(rows.map((r) => r.emoji))
      } else if (rows.length > 0) {
        const merged = [...rows.map((r) => r.emoji)]
        for (const e of FALLBACK_EMOJIS) {
          if (merged.length >= 5) break
          if (!merged.includes(e)) merged.push(e)
        }
        setEmojis(merged.slice(0, 5))
      }
    })
  }, [])

  // Mark viewed when story changes
  useEffect(() => {
    if (!currentStory || !profile) return
    markStoryViewed(currentStory.id, profile.id)
  }, [currentStory?.id, profile?.id])

  // Load view count + viewers for own story
  useEffect(() => {
    if (!currentStory) return
    setViewCount(currentStory.view_count || 0)
    setShowViewers(false)
    setConfirmDelete(false)
    if (isOwnStory) {
      getStoryViewers(currentStory.id).then(setViewers)
    }
  }, [currentStory?.id, isOwnStory])

  // Realtime: live view count updates for own story
  useEffect(() => {
    if (!currentStory || !isOwnStory) return
    const channel = supabase
      .channel(`story-views-${currentStory.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'story_views', filter: `story_id=eq.${currentStory.id}` }, () => {
        setViewCount((c) => c + 1)
        getStoryViewers(currentStory.id).then(setViewers)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [currentStory?.id, isOwnStory])

  // Progress timer
  useEffect(() => {
    setProgress(0)
    setSent(false)
    setMessage('')
    if (!currentStory) return
    const startRef = { val: Date.now() }
    const duration = 5000
    timerRef.current = window.setInterval(() => {
      if (paused) { startRef.val = Date.now() - (progressRef.current / 100) * duration; return }
      const p = Math.min(100, ((Date.now() - startRef.val) / duration) * 100)
      setProgress(p)
      if (p >= 100) next()
    }, 50)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [userIdx, storyIdx])

  const progressRef = useRef(0)
  useEffect(() => { progressRef.current = progress }, [progress])

  function next() {
    if (!currentStory) return
    if (storyIdx < currentUser.stories.length - 1) {
      setStoryIdx((i) => i + 1)
    } else if (userIdx < users.length - 1) {
      setUserIdx((i) => i + 1)
      setStoryIdx(0)
    } else {
      onClose()
    }
  }

  function prev() {
    if (storyIdx > 0) {
      setStoryIdx((i) => i - 1)
    } else if (userIdx > 0) {
      setUserIdx((i) => i - 1)
      setStoryIdx((users[userIdx - 1].stories.length || 1) - 1)
    }
  }

  function onReact(emoji: string) {
    if (!currentStory || !profile) return
    reactToStory(currentStory.id, profile.id, emoji, currentStory.user_id)
  }

  async function onSend(e: React.FormEvent) {
    e.preventDefault()
    if (!currentStory || !profile || !message.trim() || sending) return
    setSending(true)
    try {
      await sendStoryMessage(currentStory.user_id, profile.id, message)
      setSent(true)
      setMessage('')
      setTimeout(() => setSent(false), 2500)
    } finally {
      setSending(false)
    }
  }

  async function onDelete() {
    if (!currentStory) return
    setDeleting(true)
    try {
      await deleteStory(currentStory.id)
      onStoriesChange?.()
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  if (!currentStory) return null

  return (
    <motion.div
      className="fixed inset-0 z-[60] bg-black flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="relative w-full h-full max-w-md mx-auto flex flex-col">
        {/* Progress bars */}
        <div className="absolute top-0 inset-x-0 z-20 pt-3 px-3 flex gap-1">
          {currentUser.stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
              <div
                className="h-full bg-white"
                style={{ width: i < storyIdx ? '100%' : i === storyIdx ? `${progress}%` : '0%' }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-6 inset-x-0 z-20 flex items-center gap-3 px-4 pt-2">
          <Avatar src={currentStory.profile?.avatar_url} name={currentStory.profile?.username} size={36} />
          <div className="flex-1 min-w-0">
            <div className="text-white font-semibold text-sm truncate">{currentStory.profile?.username}</div>
            <div className="text-white/60 text-xs">{timeAgo(currentStory.created_at)} ago</div>
          </div>
          {isOwnStory && (
            <button
              onClick={() => setShowViewers((v) => !v)}
              className="text-white/80 text-xs font-medium px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 transition"
            >
              {viewCount} {viewCount === 1 ? 'view' : 'views'}
            </button>
          )}
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Image + tap zones */}
        <div
          className="flex-1 relative"
          onMouseDown={() => setPaused(true)}
          onMouseUp={() => setPaused(false)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
        >
          <img src={currentStory.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 flex">
            <button className="w-1/3 h-full" onClick={prev} />
            <button className="w-1/3 h-full" onClick={next} />
            <button className="w-1/3 h-full" onClick={next} />
          </div>
          {currentStory.caption && (
            <div className="absolute bottom-28 inset-x-0 px-6 text-center text-white text-lg font-medium drop-shadow-lg">
              {currentStory.caption}
            </div>
          )}
        </div>

        {/* Viewers list (own story) */}
        <AnimatePresence>
          {isOwnStory && showViewers && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-28 inset-x-4 z-30 max-h-64 overflow-y-auto rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 p-3"
            >
              <div className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-2 px-1">Viewers</div>
              {viewers.length === 0 ? (
                <div className="text-white/50 text-sm text-center py-4">No views yet</div>
              ) : (
                <div className="space-y-2">
                  {viewers.map((v) => (
                    <div key={v.id} className="flex items-center gap-2">
                      <Avatar src={v.avatar_url} name={v.username} size={32} />
                      <span className="text-white text-sm font-medium">{v.username}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete confirmation (own story) */}
        <AnimatePresence>
          {isOwnStory && confirmDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center px-8"
            >
              <div className="bg-white dark:bg-neutral-900 rounded-3xl p-6 max-w-xs w-full text-center">
                <h3 className="font-bold text-lg mb-1">Delete story?</h3>
                <p className="text-sm text-neutral-500 mb-5">This can't be undone.</p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={onDelete}
                    disabled={deleting}
                    className="w-full py-3 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition disabled:opacity-50"
                  >
                    {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="w-full py-3 rounded-xl bg-neutral-100 dark:bg-neutral-800 font-semibold hover:bg-neutral-200 dark:hover:bg-neutral-700 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom: emojis + message box / delete for own */}
        <div className="absolute bottom-8 inset-x-0 z-20 px-4 flex flex-col items-center gap-3">
          {isOwnStory ? (
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-sm font-medium hover:bg-red-500/80 transition"
            >
              <TrashIcon className="w-4 h-4" />
              Delete story
            </motion.button>
          ) : (
            <>
              <div className="flex justify-center gap-3">
                {emojis.map((e) => (
                  <motion.button
                    key={e}
                    whileTap={{ scale: 1.4 }}
                    whileHover={{ scale: 1.15 }}
                    onClick={() => onReact(e)}
                    className="w-11 h-11 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-2xl border border-white/20"
                  >
                    {e}
                  </motion.button>
                ))}
              </div>
              <form onSubmit={onSend} className="w-full flex items-center gap-2">
                <div className="flex-1 relative">
                  <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={sent ? 'Sent!' : `Reply to ${currentStory.profile?.username || ''}...`}
                    className="w-full rounded-full bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2.5 text-white text-sm placeholder-white/60 focus:outline-none focus:border-white/40 transition"
                    maxLength={500}
                  />
                  {sent && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400 text-xs font-medium"
                    >
                      Sent
                    </motion.span>
                  )}
                </div>
                {message.trim() && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    type="submit"
                    disabled={sending}
                    className="px-4 py-2.5 rounded-full bg-accent-500 text-white text-sm font-semibold disabled:opacity-50 transition"
                  >
                    Send
                  </motion.button>
                )}
              </form>
            </>
          )}
        </div>
      </div>
    </motion.div>
  )
}

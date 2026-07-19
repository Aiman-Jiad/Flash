import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Avatar } from '@/components/Avatar'
import { CloseIcon } from '@/components/icons'
import { useAuthStore } from '@/store/auth'
import { markStoryViewed, reactToStory } from '@/lib/api'
import { timeAgo } from '@/lib/utils'
import type { Story } from '@/types'

const EMOJIS = ['❤️', '😂', '🔥', '😍']

export function StoryViewer({ stories, startIndex, onClose }: { stories: Story[]; startIndex: number; onClose: () => void }) {
  const profile = useAuthStore((s) => s.profile)
  const [userIdx, setUserIdx] = useState(startIndex)
  const [storyIdx, setStoryIdx] = useState(0)
  const [progress, setProgress] = useState(0)
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

  useEffect(() => {
    if (!currentStory || !profile) return
    markStoryViewed(currentStory.id, profile.id)
  }, [currentStory?.id, profile?.id])

  useEffect(() => {
    setProgress(0)
    if (!currentStory) return
    const start = Date.now()
    const duration = 5000
    timerRef.current = window.setInterval(() => {
      const p = Math.min(100, ((Date.now() - start) / duration) * 100)
      setProgress(p)
      if (p >= 100) {
        next()
      }
    }, 50)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [userIdx, storyIdx])

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

  if (!currentStory) return null

  return (
    <motion.div
      className="fixed inset-0 z-[60] bg-black flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Image */}
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
          <div className="flex-1">
            <div className="text-white font-semibold text-sm">{currentStory.profile?.username}</div>
            <div className="text-white/60 text-xs">{timeAgo(currentStory.created_at)} ago</div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Tap zones */}
        <div className="flex-1 relative">
          <img src={currentStory.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 flex">
            <button className="w-1/3 h-full" onClick={prev} />
            <button className="w-1/3 h-full" onClick={next} />
            <button className="w-1/3 h-full" onClick={next} />
          </div>
          {currentStory.caption && (
            <div className="absolute bottom-24 inset-x-0 px-6 text-center text-white text-lg font-medium drop-shadow-lg">
              {currentStory.caption}
            </div>
          )}
        </div>

        {/* Reactions */}
        <div className="absolute bottom-8 inset-x-0 flex justify-center gap-4 z-20">
          {EMOJIS.map((e) => (
            <motion.button
              key={e}
              whileTap={{ scale: 1.4 }}
              whileHover={{ scale: 1.15 }}
              onClick={() => onReact(e)}
              className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-2xl border border-white/20"
            >
              {e}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

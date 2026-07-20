import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Avatar } from '@/components/Avatar'
import { CloseIcon } from '@/components/icons'
import { useAuthStore } from '@/store/auth'
import { markStoryViewed, reactToStory, sendStoryMessage, getTopStoryEmojis } from '@/lib/api'
import { timeAgo } from '@/lib/utils'
import type { Story } from '@/types'

const FALLBACK_EMOJIS = ['❤️', '😂', '🔥', '😍', '👏']

export function StoryViewer({ stories, startIndex, onClose }: { stories: Story[]; startIndex: number; onClose: () => void }) {
  const profile = useAuthStore((s) => s.profile)
  const [userIdx, setUserIdx] = useState(startIndex)
  const [storyIdx, setStoryIdx] = useState(0)
  const [progress, setProgress] = useState(0)
  const [emojis, setEmojis] = useState<string[]>(FALLBACK_EMOJIS)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
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

  useEffect(() => {
    if (!currentStory || !profile) return
    markStoryViewed(currentStory.id, profile.id)
  }, [currentStory?.id, profile?.id])

  useEffect(() => {
    setProgress(0)
    setSent(false)
    setMessage('')
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
          <div className="flex-1">
            <div className="text-white font-semibold text-sm">{currentStory.profile?.username}</div>
            <div className="text-white/60 text-xs">{timeAgo(currentStory.created_at)} ago</div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition">
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Image + tap zones */}
        <div className="flex-1 relative">
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

        {/* Bottom: emojis + message box */}
        <div className="absolute bottom-8 inset-x-0 z-20 px-4 flex flex-col items-center gap-3">
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

          {!isOwnStory && (
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
          )}
        </div>
      </div>
    </motion.div>
  )
}

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Avatar } from '@/components/Avatar'
import { HeartIcon, HeartFilledIcon, CommentIcon, ShareIcon, BookmarkIcon, BookmarkFilledIcon, MoreIcon, LocationIcon } from '@/components/icons'
import { useAuthStore } from '@/store/auth'
import { toggleLike, toggleSave } from '@/lib/api'
import { timeAgo, formatCount, renderCaption, cn } from '@/lib/utils'
import type { Post } from '@/types'

export function PostCard({ post, onOpenComments }: { post: Post; onOpenComments?: (p: Post) => void }) {
  const profile = useAuthStore((s) => s.profile)
  const navigate = useNavigate()
  const [liked, setLiked] = useState(!!post.liked_by_me)
  const [likeCount, setLikeCount] = useState(post.like_count || 0)
  const [saved, setSaved] = useState(!!post.saved_by_me)
  const [showHeart, setShowHeart] = useState(false)
  const [imgIdx, setImgIdx] = useState(0)
  const lastTap = useRef(0)

  useEffect(() => {
    setLiked(!!post.liked_by_me)
    setLikeCount(post.like_count || 0)
    setSaved(!!post.saved_by_me)
  }, [post.id, post.liked_by_me, post.like_count, post.saved_by_me])

  const images = post.images || []
  const owner = post.profile

  async function onLike() {
    if (!profile) return
    const next = !liked
    setLiked(next)
    setLikeCount((c) => c + (next ? 1 : -1))
    await toggleLike(post.id, profile.id, post.user_id)
  }

  async function onDoubleTap() {
    if (!liked) {
      setShowHeart(true)
      setTimeout(() => setShowHeart(false), 1000)
      await onLike()
    } else {
      setShowHeart(true)
      setTimeout(() => setShowHeart(false), 1000)
    }
  }

  function handleTap() {
    const now = Date.now()
    if (now - lastTap.current < 300) {
      onDoubleTap()
    }
    lastTap.current = now
  }

  async function onSave() {
    if (!profile) return
    const next = !saved
    setSaved(next)
    await toggleSave(post.id, profile.id)
  }

  async function onShare() {
    const url = `${window.location.origin}/p/${post.id}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {}
  }

  return (
    <article className="border-b border-neutral-200/60 dark:border-neutral-800/60 pb-3 mb-3">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2.5">
        <Avatar src={owner?.avatar_url} name={owner?.username} size={36} ring="story" onClick={() => navigate(`/u/${owner?.username}`)} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <button onClick={() => navigate(`/u/${owner?.username}`)} className="font-semibold text-sm hover:opacity-70 transition truncate">
              {owner?.username}
            </button>
            {post.location && (
              <>
                <span className="text-neutral-400">·</span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-0.5 truncate">
                  <LocationIcon className="w-3 h-3" /> {post.location}
                </span>
              </>
            )}
          </div>
        </div>
        <button className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition tap-scale">
          <MoreIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Image carousel */}
      <div className="relative bg-neutral-100 dark:bg-neutral-950 select-none" onClick={handleTap}>
        <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar" style={{ scrollSnapType: 'x mandatory' }}>
          {images.length > 0 ? images.map((img) => (
            <div key={img.id} className="w-full flex-shrink-0 snap-center max-h-[600px] relative bg-neutral-100 dark:bg-neutral-950 flex items-center justify-center">
              <img src={img.url} alt="" className="w-full h-auto max-h-[600px] object-contain" loading="lazy" />
            </div>
          )) : (
            <div className="w-full aspect-square flex items-center justify-center text-neutral-400">No image</div>
          )}
        </div>

        {/* Heart pop */}
        <AnimatePresence>
          {showHeart && (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 0.95 }}
              exit={{ scale: 1.4, opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <HeartFilledIcon className="w-24 h-24 text-white drop-shadow-lg" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Carousel dots */}
        {images.length > 1 && (
          <div className="absolute bottom-3 inset-x-0 flex justify-center gap-1.5">
            {images.map((_, i) => (
              <span key={i} className={cn('w-1.5 h-1.5 rounded-full transition', i === imgIdx ? 'bg-accent-500' : 'bg-white/60')} />
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4 px-4 pt-3">
        <motion.button whileTap={{ scale: 0.8 }} onClick={onLike} className="tap-scale">
          {liked ? <HeartFilledIcon className="w-6 h-6 text-accent-500" /> : <HeartIcon className="w-6 h-6" />}
        </motion.button>
        <motion.button whileTap={{ scale: 0.8 }} onClick={() => onOpenComments?.(post)} className="tap-scale">
          <CommentIcon className="w-6 h-6" />
        </motion.button>
        <motion.button whileTap={{ scale: 0.8 }} onClick={onShare} className="tap-scale">
          <ShareIcon className="w-6 h-6" />
        </motion.button>
        <div className="flex-1" />
        <motion.button whileTap={{ scale: 0.8 }} onClick={onSave} className="tap-scale">
          {saved ? <BookmarkFilledIcon className="w-6 h-6" /> : <BookmarkIcon className="w-6 h-6" />}
        </motion.button>
      </div>

      {/* Likes + caption */}
      <div className="px-4 pt-2 space-y-1">
        {likeCount > 0 && (
          <div className="text-sm font-semibold">{formatCount(likeCount)} like{likeCount !== 1 ? 's' : ''}</div>
        )}
        {post.caption && (
          <div className="text-sm leading-relaxed">
            <button onClick={() => navigate(`/u/${owner?.username}`)} className="font-semibold mr-1.5">{owner?.username}</button>
            {renderCaption(post.caption).map((t) => (
              <span key={t.key} className={t.type === 'tag' ? 'text-accent-500' : ''}>{t.text}</span>
            ))}
          </div>
        )}
        {post.comment_count > 0 && (
          <button onClick={() => onOpenComments?.(post)} className="text-sm text-neutral-500 dark:text-neutral-400 hover:underline">
            View all {post.comment_count} comments
          </button>
        )}
        <div className="text-xs text-neutral-400 uppercase tracking-wide">{timeAgo(post.created_at)} ago</div>
      </div>
    </article>
  )
}

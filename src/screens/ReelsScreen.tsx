import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getReelsPage, toggleReelLike, getReelComments, addReelComment, createReel, uploadFile } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { Avatar } from '@/components/Avatar'
import { HeartIcon, HeartFilledIcon, CommentIcon, ShareIcon, CloseIcon, PlusIcon, MuteIcon, VolumeIcon } from '@/components/icons'
import { timeAgo, formatCount, cn } from '@/lib/utils'
import type { Reel } from '@/types'

export function ReelsScreen() {
  const profile = useAuthStore((s) => s.profile)
  const navigate = useNavigate()
  const [reels, setReels] = useState<Reel[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [openComments, setOpenComments] = useState<Reel | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    (async () => {
      const { items, nextCursor } = await getReelsPage()
      setReels(items)
      setCursor(nextCursor)
      setLoading(false)
    })()
  }, [])

  // Intersection observer to determine active reel
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const idx = Number((e.target as HTMLElement).dataset.idx)
        if (e.isIntersecting && e.intersectionRatio > 0.6) {
          setActiveIdx(idx)
          // load more near end
          if (idx >= reels.length - 2 && cursor && !loading) {
            (async () => {
              const { items, nextCursor } = await getReelsPage(cursor)
              setReels((prev) => [...prev, ...items])
              setCursor(nextCursor)
            })()
          }
        }
      })
    }, { threshold: [0.6] })
    container.querySelectorAll('[data-idx]').forEach((el) => obs.observe(el))
    return () => obs.disconnect()
  }, [reels, cursor, loading])

  async function onLike(reel: Reel) {
    if (!profile) return
    const next = !reel.liked_by_me
    setReels((prev) => prev.map((r) => r.id === reel.id ? { ...r, liked_by_me: next, like_count: r.like_count + (next ? 1 : -1) } : r))
    await toggleReelLike(reel.id, profile.id, reel.user_id)
  }

  if (loading) {
    return (
      <div className="md:pl-64 min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (reels.length === 0) {
    return (
      <div className="md:pl-64 min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center">
          <PlusIcon className="w-8 h-8 text-neutral-400" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">No reels yet</h3>
          <p className="text-sm text-neutral-500">Be the first to share a reel.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="px-5 py-2.5 rounded-full bg-gradient-to-r from-accent-500 to-accent-600 text-white font-semibold shadow-lg shadow-accent-500/30">
          Upload a reel
        </button>
        {showCreate && <CreateReelModal onClose={() => setShowCreate(false)} onDone={() => { setShowCreate(false); window.location.reload() }} />}
      </div>
    )
  }

  return (
    <div className="md:pl-64 min-h-screen bg-black">
      <div ref={containerRef} className="h-screen overflow-y-auto snap-y snap-mandatory no-scrollbar">
        {reels.map((reel, idx) => (
          <div key={reel.id} data-idx={idx} className="h-screen w-full snap-start snap-always relative flex items-center justify-center">
            <ReelItem reel={reel} active={idx === activeIdx} onLike={() => onLike(reel)} onOpenComments={() => setOpenComments(reel)} />
          </div>
        ))}
      </div>

      {/* Create FAB */}
      <button onClick={() => setShowCreate(true)} className="fixed right-5 top-20 md:top-6 z-30 w-12 h-12 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 text-white flex items-center justify-center shadow-lg shadow-accent-500/40 active:scale-95 transition">
        <PlusIcon className="w-6 h-6" />
      </button>

      {openComments && <ReelCommentsModal reel={openComments} onClose={() => setOpenComments(null)} />}
      {showCreate && <CreateReelModal onClose={() => setShowCreate(false)} onDone={() => { setShowCreate(false); window.location.reload() }} />}
    </div>
  )
}

function ReelItem({ reel, active, onLike, onOpenComments }: { reel: Reel; active: boolean; onLike: () => void; onOpenComments: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const navigate = useNavigate()
  const [liked, setLiked] = useState(!!reel.liked_by_me)
  const [likeCount, setLikeCount] = useState(reel.like_count)
  const [showHeart, setShowHeart] = useState(false)
  const [muted, setMuted] = useState(true)
  const lastTap = useRef(0)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.muted = muted
    if (active) {
      v.play().catch(() => {})
    } else {
      v.pause()
      v.currentTime = 0
    }
  }, [active, muted])

  function toggleMute(e?: React.MouseEvent) {
    e?.stopPropagation()
    setMuted((m) => {
      const next = !m
      const v = videoRef.current
      if (v) v.muted = next
      return next
    })
  }

  function handleTap() {
    const now = Date.now()
    if (now - lastTap.current < 300) {
      if (!liked) {
        setLiked(true)
        setLikeCount((c) => c + 1)
        onLike()
      }
      setShowHeart(true)
      setTimeout(() => setShowHeart(false), 1000)
    } else {
      const v = videoRef.current
      if (v) { if (v.paused) v.play().catch(() => {}); else v.pause() }
      if (muted) toggleMute()
    }
    lastTap.current = now
  }

  return (
    <div className="relative w-full h-full max-w-md mx-auto" onClick={handleTap}>
      <video
        ref={videoRef}
        src={reel.url}
        loop
        muted={muted}
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none" />

      {/* Heart pop */}
      <AnimatePresence>
        {showHeart && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.2, opacity: 0.9 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.7 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <HeartFilledIcon className="w-28 h-28 text-white drop-shadow-2xl" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Right action rail */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5 z-10">
        <motion.button whileTap={{ scale: 0.8 }} onClick={toggleMute} className="flex flex-col items-center gap-1">
          {muted ? <MuteIcon className="w-8 h-8 text-white" /> : <VolumeIcon className="w-8 h-8 text-white" />}
        </motion.button>
        <motion.button whileTap={{ scale: 0.8 }} onClick={(e) => { e.stopPropagation(); setLiked(!liked); setLikeCount((c) => c + (liked ? -1 : 1)); onLike() }} className="flex flex-col items-center gap-1">
          {liked ? <HeartFilledIcon className="w-8 h-8 text-accent-500" /> : <HeartIcon className="w-8 h-8 text-white" />}
          <span className="text-white text-xs font-semibold">{formatCount(likeCount)}</span>
        </motion.button>
        <motion.button whileTap={{ scale: 0.8 }} onClick={(e) => { e.stopPropagation(); onOpenComments() }} className="flex flex-col items-center gap-1">
          <CommentIcon className="w-8 h-8 text-white" />
          <span className="text-white text-xs font-semibold">{reel.comment_count}</span>
        </motion.button>
        <motion.button whileTap={{ scale: 0.8 }} onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(`${window.location.origin}/p/${reel.id}`) }} className="flex flex-col items-center gap-1">
          <ShareIcon className="w-8 h-8 text-white" />
        </motion.button>
      </div>

      {/* Bottom info */}
      <div className="absolute left-4 right-20 bottom-24 z-10">
        <div className="flex items-center gap-2 mb-3">
          <Avatar src={reel.profile?.avatar_url} name={reel.profile?.username} size={36} ring="story" onClick={() => navigate(`/u/${reel.profile?.username}`)} />
          <button onClick={() => navigate(`/u/${reel.profile?.username}`)} className="text-white font-semibold text-sm">{reel.profile?.username}</button>
        </div>
        {reel.caption && <p className="text-white text-sm leading-relaxed line-clamp-3">{reel.caption}</p>}
        {reel.audio_name && (
          <div className="flex items-center gap-1.5 mt-2 text-white/80 text-xs">
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3z" /></svg>
            <span className="truncate">{reel.audio_name}</span>
          </div>
        )}
      </div>
    </div>
  )
}

function ReelCommentsModal({ reel, onClose }: { reel: Reel; onClose: () => void }) {
  const profile = useAuthStore((s) => s.profile)
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')

  useEffect(() => {
    getReelComments(reel.id).then((c) => { setComments(c); setLoading(false) })
  }, [reel.id])

  async function submit() {
    if (!profile || !body.trim()) return
    const c = await addReelComment({ reelId: reel.id, userId: profile.id, body: body.trim(), reelOwnerId: reel.user_id })
    if (c) { setComments((prev) => [...prev, c]); setBody('') }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        className="glass-strong w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl h-[70vh] flex flex-col border border-white/20 shadow-2xl"
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-neutral-200/60 dark:border-neutral-800/60">
          <div className="w-8" />
          <div className="font-semibold">Comments</div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900"><CloseIcon className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {loading ? <div className="text-center text-sm text-neutral-400 py-8">Loading…</div> :
            comments.length === 0 ? <div className="text-center text-sm text-neutral-400 py-12">No comments yet.</div> :
            comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <Avatar src={c.profile?.avatar_url} name={c.profile?.username} size={32} />
                <div>
                  <div className="text-sm"><span className="font-semibold mr-1.5">{c.profile?.username}</span>{c.body}</div>
                  <div className="text-xs text-neutral-400 mt-0.5">{timeAgo(c.created_at)} ago</div>
                </div>
              </div>
            ))
          }
        </div>
        <div className="border-t border-neutral-200/60 dark:border-neutral-800/60 p-3 flex items-center gap-2">
          <Avatar src={profile?.avatar_url} name={profile?.username} size={32} />
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
            placeholder="Add a comment…"
            className="flex-1 px-3 py-2 rounded-full bg-neutral-100 dark:bg-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/30"
          />
          <button onClick={submit} disabled={!body.trim()} className="text-accent-500 font-semibold text-sm px-3 disabled:opacity-40">Post</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function CreateReelModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const profile = useAuthStore((s) => s.profile)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [caption, setCaption] = useState('')
  const [audioName, setAudioName] = useState('')
  const [uploading, setUploading] = useState(false)

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function submit() {
    if (!profile || !file) return
    setUploading(true)
    const { url } = await uploadFile('reels', file, profile.id)
    if (url) {
      await createReel({ userId: profile.id, url, caption: caption.trim() || null, audioName: audioName.trim() || null })
      onDone()
    }
    setUploading(false)
  }

  return (
    <motion.div
      className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass-strong rounded-3xl w-full max-w-md p-6 border border-white/20 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">New reel</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900"><CloseIcon className="w-5 h-5" /></button>
        </div>
        {!preview ? (
          <label className="block aspect-[9/16] max-h-72 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 flex items-center justify-center cursor-pointer">
            <input type="file" accept="video/*" className="hidden" onChange={onPick} />
            <div className="text-center text-sm text-neutral-500">Tap to pick a video</div>
          </label>
        ) : (
          <video src={preview} muted loop autoPlay className="w-full max-h-72 object-cover rounded-2xl" />
        )}
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Caption"
          rows={2}
          className="mt-3 w-full p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:outline-none focus:ring-2 focus:ring-accent-500/30 resize-none"
        />
        <input
          value={audioName}
          onChange={(e) => setAudioName(e.target.value)}
          placeholder="Audio name (optional)"
          className="mt-2 w-full p-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
        />
        <button
          onClick={submit}
          disabled={!file || uploading}
          className="mt-4 w-full py-3 rounded-2xl bg-gradient-to-r from-accent-500 to-accent-600 text-white font-semibold disabled:opacity-60"
        >
          {uploading ? 'Uploading…' : 'Share reel'}
        </button>
      </motion.div>
    </motion.div>
  )
}

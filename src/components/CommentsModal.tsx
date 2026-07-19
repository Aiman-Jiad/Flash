import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Avatar } from '@/components/Avatar'
import { CloseIcon, HeartIcon, BackIcon } from '@/components/icons'
import { useAuthStore } from '@/store/auth'
import { getComments, addComment, deleteComment } from '@/lib/api'
import { timeAgo, cn } from '@/lib/utils'
import type { Post, Comment } from '@/types'

export function CommentsModal({ post, onClose }: { post: Post; onClose: () => void }) {
  const profile = useAuthStore((s) => s.profile)
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [body, setBody] = useState('')
  const [replyTo, setReplyTo] = useState<Comment | null>(null)
  const [sending, setSending] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    getComments(post.id).then((c) => {
      if (alive) { setComments(c); setLoading(false) }
    })
    return () => { alive = false }
  }, [post.id])

  async function submit() {
    if (!profile || !body.trim() || sending) return
    setSending(true)
    const c = await addComment({
      postId: post.id,
      userId: profile.id,
      body: body.trim(),
      parentId: replyTo?.id,
      postOwnerId: post.user_id,
    })
    setSending(false)
    if (c) {
      if (replyTo) {
        setComments((prev) => prev.map((p) => p.id === replyTo.id ? { ...p, replies: [...(p.replies || []), c] } : p))
      } else {
        setComments((prev) => [...prev, c])
      }
      setBody('')
      setReplyTo(null)
      setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }), 50)
    }
  }

  function removeComment(id: string) {
    deleteComment(id)
    setComments((prev) => prev.filter((c) => c.id !== id && c.id !== id).map((c) => ({ ...c, replies: (c.replies || []).filter((r) => r.id !== id) })))
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      initial={{ backgroundColor: 'rgba(0,0,0,0)' }}
      animate={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
      exit={{ backgroundColor: 'rgba(0,0,0,0)' }}
      onClick={onClose}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
        className="glass-strong w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl h-[80vh] sm:h-[600px] flex flex-col border border-white/40 dark:border-white/5 shadow-2xl"
      >
        <div className="flex items-center justify-between px-4 h-14 border-b border-neutral-200/60 dark:border-neutral-800/60">
          {replyTo ? (
            <button onClick={() => setReplyTo(null)} className="flex items-center gap-1 text-sm text-neutral-500">
              <BackIcon className="w-5 h-5" /> Back
            </button>
          ) : (
            <div className="w-8" />
          )}
          <div className="font-semibold">Comments</div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 transition">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {loading ? (
            <div className="text-center text-sm text-neutral-400 py-8">Loading comments…</div>
          ) : comments.length === 0 ? (
            <div className="text-center text-sm text-neutral-400 py-12">No comments yet. Start the conversation.</div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-3">
                <Avatar src={c.profile?.avatar_url} name={c.profile?.username} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    <span className="font-semibold mr-1.5">{c.profile?.username}</span>
                    {c.body}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-neutral-400">
                    <span>{timeAgo(c.created_at)} ago</span>
                    <button onClick={() => setReplyTo(c)} className="hover:text-neutral-700 dark:hover:text-neutral-200">Reply</button>
                    {c.user_id === profile?.id && (
                      <button onClick={() => removeComment(c.id)} className="hover:text-red-500">Delete</button>
                    )}
                  </div>
                  {c.replies && c.replies.length > 0 && (
                    <div className="mt-3 space-y-3 pl-2 border-l border-neutral-200 dark:border-neutral-800">
                      {c.replies.map((r) => (
                        <div key={r.id} className="flex gap-2">
                          <Avatar src={r.profile?.avatar_url} name={r.profile?.username} size={26} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm">
                              <span className="font-semibold mr-1.5">{r.profile?.username}</span>
                              {r.body}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-neutral-400">
                              <span>{timeAgo(r.created_at)} ago</span>
                              {r.user_id === profile?.id && (
                                <button onClick={() => removeComment(r.id)} className="hover:text-red-500">Delete</button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-neutral-200/60 dark:border-neutral-800/60 p-3">
          {replyTo && (
            <div className="text-xs text-neutral-500 mb-2 px-2">
              Replying to <span className="font-semibold">{replyTo.profile?.username}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Avatar src={profile?.avatar_url} name={profile?.username} size={32} />
            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
              placeholder="Add a comment…"
              className="flex-1 px-3 py-2 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-transparent focus:outline-none focus:ring-2 focus:ring-accent-500/30 text-sm"
            />
            <button
              onClick={submit}
              disabled={!body.trim() || sending}
              className="text-accent-500 font-semibold text-sm px-3 py-2 disabled:opacity-40"
            >
              Post
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

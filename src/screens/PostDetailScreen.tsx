import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getPost } from '@/lib/api'
import { TopBar } from '@/components/Navigation'
import { PostCard } from '@/components/PostCard'
import { CommentsModal } from '@/components/CommentsModal'
import { BackIcon } from '@/components/icons'
import { Skeleton } from '@/components/Skeleton'
import type { Post } from '@/types'

export function PostDetailScreen() {
  const { postId } = useParams()
  const navigate = useNavigate()
  const [post, setPost] = useState<Post | null>(null)
  const [loading, setLoading] = useState(true)
  const [openComments, setOpenComments] = useState<Post | null>(null)

  useEffect(() => {
    if (!postId) return
    getPost(postId).then((p) => { setPost(p); setLoading(false) })
  }, [postId])

  return (
    <div className="md:pl-64 pb-20 md:pb-0 min-h-screen">
      <TopBar title="Post" right={
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 transition">
          <BackIcon className="w-5 h-5" />
        </button>
      } />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        className="max-w-xl mx-auto md:pt-8"
      >
        {loading || !post ? <div className="p-4"><Skeleton className="aspect-square w-full rounded-2xl" /></div> : (
          <PostCard post={post} onOpenComments={setOpenComments} />
        )}
      </motion.div>
      {openComments && <CommentsModal post={openComments} onClose={() => setOpenComments(null)} />}
    </div>
  )
}

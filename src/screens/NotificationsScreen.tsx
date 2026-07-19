import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { getNotifications, markAllNotificationsRead } from '@/lib/api'
import { TopBar } from '@/components/Navigation'
import { Avatar } from '@/components/Avatar'
import { HeartIcon, CommentIcon } from '@/components/icons'
import { timeAgo, cn } from '@/lib/utils'
import type { Notification } from '@/types'

const TYPE_LABEL: Record<Notification['type'], string> = {
  like: 'liked your post',
  comment: 'commented on your post',
  follow: 'started following you',
  reel_like: 'liked your reel',
  comment_reply: 'replied to your comment',
  story_reaction: 'reacted to your story',
  message: 'sent you a message',
}

export function NotificationsScreen() {
  const profile = useAuthStore((s) => s.profile)
  const navigate = useNavigate()
  const [items, setItems] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    let alive = true
    getNotifications(profile.id).then((n) => {
      if (alive) { setItems(n); setLoading(false) }
    })
    markAllNotificationsRead(profile.id)

    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` }, (payload) => {
        const newRow = payload.new as Notification
        // fetch actor profile
        supabase.from('profiles').select('*').eq('id', newRow.actor_id).maybeSingle().then(({ data }) => {
          setItems((prev) => [{ ...newRow, actor: data as any }, ...prev])
        })
      })
      .subscribe()

    return () => { alive = false; supabase.removeChannel(channel) }
  }, [profile?.id])

  function open(n: Notification) {
    if (n.type === 'follow') {
      navigate(`/u/${n.actor?.username}`)
    } else if (n.type === 'message') {
      navigate('/messages')
    } else if (n.entity_id) {
      navigate(`/p/${n.entity_id}`)
    }
  }

  return (
    <div className="md:pl-64 pb-20 md:pb-0 min-h-screen">
      <TopBar title="Activity" />
      <div className="max-w-xl mx-auto md:pt-8 p-4">
        {loading ? (
          <div className="text-center text-sm text-neutral-400 py-12">Loading…</div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center mx-auto mb-4">
              <HeartIcon className="w-8 h-8 text-neutral-400" />
            </div>
            <h3 className="font-semibold text-lg mb-1">No activity yet</h3>
            <p className="text-sm text-neutral-500">Likes, comments and follows will show up here in real time.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {items.map((n) => (
              <motion.button
                key={n.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => open(n)}
                className={cn('w-full flex items-center gap-3 p-3 rounded-2xl transition text-left', n.read ? 'hover:bg-neutral-50 dark:hover:bg-neutral-900/50' : 'bg-accent-50/50 dark:bg-accent-950/20 hover:bg-accent-50/70')}
              >
                <div className="relative">
                  <Avatar src={n.actor?.avatar_url} name={n.actor?.username} size={44} />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-accent-500 border-2 border-white dark:border-black flex items-center justify-center">
                    {n.type === 'like' || n.type === 'reel_like' || n.type === 'story_reaction' ? (
                      <HeartFilledIconSmall />
                    ) : (
                      <CommentIcon className="w-3 h-3 text-white" />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm">
                    <span className="font-semibold">{n.actor?.username}</span>{' '}
                    <span className="text-neutral-600 dark:text-neutral-400">{TYPE_LABEL[n.type]}</span>
                    {n.body && n.type === 'comment' && <span className="text-neutral-500"> · {n.body}</span>}
                    {n.body && n.type === 'story_reaction' && <span className="text-neutral-500"> · {n.body}</span>}
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5">{timeAgo(n.created_at)} ago</div>
                </div>
                {!n.read && <div className="w-2 h-2 rounded-full bg-accent-500" />}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function HeartFilledIconSmall() {
  return (
    <svg viewBox="0 0 24 24" className="w-3 h-3 text-white" fill="currentColor"><path d="M12 21s-7-4.5-9.5-9C1 9 2.5 5.5 6 5.5c2 0 3.2 1 4 2 .8-1 2-2 4-2 3.5 0 5 3.5 3.5 6.5C19 16.5 12 21 12 21z" /></svg>
  )
}

import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { getMessages, sendMessage, markMessagesSeen } from '@/lib/api'
import { TopBar } from '@/components/Navigation'
import { Avatar } from '@/components/Avatar'
import { BackIcon, SmileIcon } from '@/components/icons'
import { timeAgo, cn } from '@/lib/utils'
import type { Message, Profile } from '@/types'

const EMOJIS = [
  '😀','😁','😂','🤣','😊','😍','🥰','😘','😎','🤩','🥳','😇','🙂','🙃','😉','😌',
  '🤔','🤨','😐','😑','😶','😏','😒','🙄','😬','😮‍💨','🤥','😴','🤤','😪','😵','🤯',
  '🥺','😢','😭','😤','😠','😡','🤬','🤠','🤡','💀','👻','🤖','🥹','😬','🫠','🫡',
  '👍','👎','👌','🤌','🤏','✌️','🤞','🤟','🤘','👏','🙌','🤝','🙏','💪','✊','👊',
  '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖',
  '🔥','✨','⭐','🌟','💫','💥','💯','🎉','🎊','🎁','🎈','✅','❌','❓','❗','👀',
]

export function ConversationScreen() {
  const { conversationId } = useParams()
  const profile = useAuthStore((s) => s.profile)
  const navigate = useNavigate()
  const [messages, setMessages] = useState<Message[]>([])
  const [other, setOther] = useState<Profile | null>(null)
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [otherTyping, setOtherTyping] = useState(false)
  const [otherOnline, setOtherOnline] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const typingTimeout = useRef<number | null>(null)

  useEffect(() => {
    if (!conversationId || !profile) return
    let alive = true
    ;(async () => {
      const msgs = await getMessages(conversationId)
      if (!alive) return
      setMessages(msgs)
      setLoading(false)
      // find other member
      const { data: members } = await supabase
        .from('conversation_members')
        .select('user_id, profile:profiles!conversation_members_user_id_fkey(*)')
        .eq('conversation_id', conversationId)
      const otherMember = (members || []).find((m: any) => m.user_id !== profile.id) as any
      setOther((otherMember?.profile ?? null) as Profile | null)
      await markMessagesSeen(conversationId, profile.id)
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
    })()

    // Realtime: new messages
    const channel = supabase
      .channel(`conv-${conversationId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const m = payload.new as Message
        setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m])
        if (m.sender_id !== profile.id) {
          markMessagesSeen(conversationId!, profile.id)
          setOtherTyping(false)
        }
        setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }), 50)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` }, (payload) => {
        const m = payload.new as Message
        setMessages((prev) => prev.map((x) => x.id === m.id ? m : x))
      })
      .on('broadcast', { event: 'typing' }, (payload: any) => {
        if (payload?.payload?.userId !== profile.id) {
          setOtherTyping(true)
          if (typingTimeout.current) clearTimeout(typingTimeout.current)
          typingTimeout.current = window.setTimeout(() => setOtherTyping(false), 2500)
        }
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const ids = Object.keys(state)
        setOtherOnline(ids.some((id) => id !== profile.id))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: profile.id, online_at: new Date().toISOString() })
        }
      })

    return () => { alive = false; supabase.removeChannel(channel) }
  }, [conversationId, profile?.id])

  async function send() {
    if (!profile || !conversationId || !body.trim()) return
    const text = body.trim()
    setBody('')
    await sendMessage(conversationId, profile.id, text)
  }

  function onTyping() {
    if (!profile) return
    const channel = supabase.channel(`conv-${conversationId}`)
    channel.send({ type: 'broadcast', event: 'typing', payload: { userId: profile.id } })
  }

  return (
    <div className="md:pl-64 pb-20 md:pb-0 min-h-screen flex flex-col h-screen">
      <TopBar
        title={other?.username || 'Chat'}
        onBack={() => navigate('/messages')}
        hideActions
        right={
          <Avatar src={other?.avatar_url} name={other?.username} size={32} onClick={() => other && navigate(`/u/${other.username}`)} />
        }
      />
      <div className="flex-1 flex flex-col max-w-xl mx-auto w-full min-h-0 overflow-y-auto">
        {/* Status bar */}
        <div className="px-4 py-2 text-xs text-neutral-500 flex items-center gap-2 border-b border-neutral-200/60 dark:border-neutral-800/60">
          {otherOnline ? (
            <><span className="w-2 h-2 rounded-full bg-emerald-500" /> Online</>
          ) : (
            <><span className="w-2 h-2 rounded-full bg-neutral-400" /> Offline</>
          )}
        </div>

        {/* Messages */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? <div className="text-center text-sm text-neutral-400 py-8">Loading…</div> :
            messages.map((m, i) => {
              const mine = m.sender_id === profile?.id
              const prev = messages[i - 1]
              const showAvatar = !mine && (!prev || prev.sender_id !== m.sender_id)
              return (
                <div key={m.id} className={cn('flex items-end gap-2', mine ? 'justify-end' : 'justify-start')}>
                  {!mine && (showAvatar ? <Avatar src={other?.avatar_url} name={other?.username} size={28} /> : <div className="w-7" />)}
                  <div className={cn('max-w-[75%] px-4 py-2.5 rounded-2xl text-sm', mine ? 'bg-gradient-to-br from-accent-500 to-accent-600 text-white rounded-br-md' : 'bg-neutral-100 dark:bg-neutral-900 rounded-bl-md')}>
                    {m.body}
                    <div className={cn('text-[10px] mt-1', mine ? 'text-white/70' : 'text-neutral-400')}>
                      {timeAgo(m.created_at)} {mine && (m.seen ? '· Seen' : '· Sent')}
                    </div>
                  </div>
                </div>
              )
            })
          }
          {otherTyping && (
            <div className="flex items-center gap-2">
              <Avatar src={other?.avatar_url} name={other?.username} size={28} />
              <div className="bg-neutral-100 dark:bg-neutral-900 px-4 py-3 rounded-2xl rounded-bl-md flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.span key={i} className="w-1.5 h-1.5 rounded-full bg-neutral-400" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="relative">
          {showEmoji && (
            <div className="absolute bottom-full left-0 right-0 mb-2 p-3 rounded-2xl glass-strong border border-neutral-200/60 dark:border-neutral-800/60 max-h-64 overflow-y-auto">
              <div className="grid grid-cols-8 gap-1">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => { setBody((b) => b + e); setShowEmoji(false) }}
                    className="text-2xl p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-90 transition"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="border-t border-neutral-200/60 dark:border-neutral-800/60 p-3 flex items-center gap-2 glass-strong">
            <Avatar src={profile?.avatar_url} name={profile?.username} size={32} />
            <button
              onClick={() => setShowEmoji((v) => !v)}
              className={cn('p-2 rounded-full transition active:scale-90', showEmoji ? 'text-accent-500 bg-accent-500/10' : 'text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200')}
              aria-label="Emoji"
            >
              <SmileIcon className="w-6 h-6" />
            </button>
            <input
              value={body}
              onChange={(e) => { setBody(e.target.value); onTyping() }}
              onKeyDown={(e) => { if (e.key === 'Enter') send() }}
              placeholder="Message…"
              className="flex-1 px-4 py-2.5 rounded-full bg-neutral-100 dark:bg-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/30"
            />
            <button onClick={send} disabled={!body.trim()} className="text-accent-500 font-semibold text-sm px-4 py-2 disabled:opacity-40">Send</button>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import { createStory, uploadFile } from '@/lib/api'
import { TopBar } from '@/components/Navigation'
import { CloseIcon, SmileIcon } from '@/components/icons'
import { Spinner } from '@/components/Spinner'
import { Avatar } from '@/components/Avatar'

const QUICK_CAPTIONS = ['✨ Good vibes', '🔥 FOMO', '☀️ Out & about', '🎉 Celebration', '😌 Chill']

const EMOJIS = [
  '😀','😂','🥰','😎','🤩','🥳','😇','🤔',
  '👍','👏','🙌','🔥','✨','⭐','💯','🎉',
  '❤️','💙','💚','🖤','💔','💕','💓','💖',
]

export function CreateStoryScreen() {
  const profile = useAuthStore((s) => s.profile)
  const navigate = useNavigate()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [uploading, setUploading] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  function reset() {
    setFile(null)
    setPreview(null)
    setCaption('')
    setShowEmoji(false)
  }

  async function share() {
    if (!profile || !file || uploading) return
    setUploading(true)
    try {
      const { url } = await uploadFile('stories', file, profile.id)
      if (!url) { setUploading(false); return }
      await createStory({ userId: profile.id, url, caption: caption.trim() || null })
      navigate('/')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="md:pl-64 min-h-screen pb-20 md:pb-0">
      <TopBar
        title="New story"
        onBack={() => navigate(-1)}
        hideActions
        right={
          <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 transition">
            <CloseIcon className="w-5 h-5" />
          </button>
        }
      />

      <div className="max-w-xl mx-auto md:pt-8 p-4">
        {!preview ? (
          <label className="block aspect-[9/16] max-h-[70vh] mx-auto rounded-3xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900 transition flex flex-col items-center justify-center gap-3">
            <input type="file" accept="image/*" className="hidden" onChange={onPick} />
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-lg shadow-accent-500/30">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            </div>
            <div className="text-center">
              <div className="font-semibold">Add your story</div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400">Tap to upload a photo</div>
            </div>
          </label>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Preview */}
            <div className="relative aspect-[9/16] max-h-[60vh] mx-auto rounded-3xl overflow-hidden bg-black">
              <img src={preview} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-md">
                <Avatar src={profile?.avatar_url} name={profile?.username} size={24} />
                <span className="text-white text-xs font-semibold">{profile?.username}</span>
              </div>
              <button onClick={reset} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition">
                <CloseIcon className="w-5 h-5" />
              </button>
              {caption && (
                <div className="absolute bottom-16 inset-x-0 px-6 text-center text-white text-lg font-medium drop-shadow-lg">
                  {caption}
                </div>
              )}
              {/* Quick caption chips */}
              <div className="absolute bottom-3 inset-x-0 flex justify-center gap-2 px-4 overflow-x-auto no-scrollbar">
                {QUICK_CAPTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => setCaption((c) => (c === q ? '' : q))}
                    className="shrink-0 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-medium border border-white/20 hover:bg-white/25 transition"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Caption input with emoji */}
            <div className="relative">
              {showEmoji && (
                <div className="mb-2 p-3 rounded-2xl glass-strong border border-neutral-200/60 dark:border-neutral-800/60 max-h-48 overflow-y-auto">
                  <div className="grid grid-cols-8 gap-1">
                    {EMOJIS.map((e) => (
                      <button
                        key={e}
                        onClick={() => { setCaption((b) => b + e); setShowEmoji(false) }}
                        className="text-2xl p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 active:scale-90 transition"
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowEmoji((v) => !v)}
                  className="shrink-0 p-2.5 rounded-full text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
                  aria-label="Emoji"
                >
                  <SmileIcon className="w-6 h-6" />
                </button>
                <input
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a caption…"
                  maxLength={200}
                  className="flex-1 px-4 py-3 rounded-full bg-neutral-100 dark:bg-neutral-900 text-sm focus:outline-none focus:ring-2 focus:ring-accent-500/30"
                />
                <button
                  onClick={reset}
                  className="shrink-0 text-sm font-semibold text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 px-3"
                >
                  Reset
                </button>
              </div>
            </div>

            <button
              onClick={share}
              disabled={uploading}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-accent-500 to-accent-600 text-white font-semibold shadow-lg shadow-accent-500/30 hover:brightness-105 active:scale-[0.98] transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {uploading ? <><Spinner className="text-white" /> Sharing…</> : 'Share story'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

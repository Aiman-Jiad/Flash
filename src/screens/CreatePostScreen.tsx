import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import { createPost, uploadFile } from '@/lib/api'
import { TopBar } from '@/components/Navigation'
import { BackIcon, CloseIcon, LocationIcon } from '@/components/icons'
import { Spinner } from '@/components/Spinner'

export function CreatePostScreen() {
  const profile = useAuthStore((s) => s.profile)
  const navigate = useNavigate()
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [caption, setCaption] = useState('')
  const [location, setLocation] = useState('')
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const list = Array.from(e.target.files || [])
    if (!list.length) return
    const urls = await Promise.all(list.map((f) => URL.createObjectURL(f)))
    setFiles((prev) => [...prev, ...list])
    setPreviews((prev) => [...prev, ...urls])
  }

  function removeAt(i: number) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i))
    setPreviews((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function submit() {
    if (!profile || files.length === 0 || uploading) return
    setUploading(true)
    try {
      const urls: string[] = []
      for (const f of files) {
        const { url } = await uploadFile('posts', f, profile.id)
        if (url) urls.push(url)
      }
      await createPost({ userId: profile.id, caption: caption.trim() || null, location: location.trim() || null, imageUrls: urls })
      navigate('/')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="md:pl-64 min-h-screen pb-20 md:pb-0">
      <TopBar title="New post" right={
        <button onClick={() => navigate(-1)} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-900 transition">
          <CloseIcon className="w-5 h-5" />
        </button>
      } />

      <div className="max-w-xl mx-auto md:pt-8 p-4">
        {/* Dropzone */}
        {previews.length === 0 ? (
          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const list = Array.from(e.dataTransfer.files); if (list.length) { const urls = list.map((f) => URL.createObjectURL(f)); setFiles(list); setPreviews(urls) } }}
            className={`block aspect-square sm:aspect-[4/3] rounded-3xl border-2 border-dashed cursor-pointer transition ${dragOver ? 'border-accent-500 bg-accent-50/30 dark:bg-accent-950/20' : 'border-neutral-300 dark:border-neutral-700'} flex flex-col items-center justify-center gap-3`}
          >
            <input type="file" accept="image/*" multiple className="hidden" onChange={onPick} />
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-lg shadow-accent-500/30">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" /></svg>
            </div>
            <div className="text-center">
              <div className="font-semibold">Drag photos here</div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400">or click to browse — carousels supported</div>
            </div>
          </label>
        ) : (
          <div>
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {previews.map((src, i) => (
                <div key={i} className="relative flex-shrink-0">
                  <img src={src} alt="" className="w-32 h-32 object-cover rounded-2xl" />
                  <button onClick={() => removeAt(i)} className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition">
                    <CloseIcon className="w-4 h-4" />
                  </button>
                  {i === 0 && <span className="absolute bottom-1.5 left-1.5 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">Cover</span>}
                </div>
              ))}
              <label className="w-32 h-32 rounded-2xl border-2 border-dashed border-neutral-300 dark:border-neutral-700 flex items-center justify-center cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900 transition">
                <input type="file" accept="image/*" multiple className="hidden" onChange={onPick} />
                <span className="text-3xl text-neutral-400">+</span>
              </label>
            </div>

            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption…"
              rows={4}
              className="mt-4 w-full p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:outline-none focus:ring-2 focus:ring-accent-500/30 resize-none"
            />
            <div className="mt-3 relative">
              <LocationIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Add location"
                className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:outline-none focus:ring-2 focus:ring-accent-500/30"
              />
            </div>

            <button
              onClick={submit}
              disabled={uploading}
              className="mt-4 w-full py-3.5 rounded-2xl bg-gradient-to-r from-accent-500 to-accent-600 text-white font-semibold shadow-lg shadow-accent-500/30 hover:brightness-105 active:scale-[0.98] transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {uploading ? <><Spinner className="text-white" /> Uploading…</> : 'Share post'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

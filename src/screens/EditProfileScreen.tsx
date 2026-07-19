import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/store/auth'
import { updateProfile, uploadFile } from '@/lib/api'
import { TopBar } from '@/components/Navigation'
import { Avatar } from '@/components/Avatar'
import { BackIcon, CameraIcon, CheckIcon, CloseIcon } from '@/components/icons'
import { Spinner } from '@/components/Spinner'

export function EditProfileScreen() {
  const profile = useAuthStore((s) => s.profile)
  const refreshProfile = useAuthStore((s) => s.refreshProfile)
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [username, setUsername] = useState(profile?.username || '')
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [website, setWebsite] = useState(profile?.website || '')
  const [isPrivate, setIsPrivate] = useState(profile?.is_private || false)
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || null)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f || !profile) return
    setUploadingAvatar(true)
    const { url } = await uploadFile('avatars', f, profile.id)
    if (url) setAvatarUrl(url)
    setUploadingAvatar(false)
  }

  async function save() {
    if (!profile || saving) return
    setSaving(true)
    await updateProfile(profile.id, { username, full_name: fullName, bio, website, is_private: isPrivate, avatar_url: avatarUrl })
    await refreshProfile()
    setSaving(false)
    navigate(`/u/${username}`, { replace: true })
  }

  return (
    <div className="md:pl-64 pb-20 md:pb-0 min-h-screen">
      <TopBar title="Edit profile" right={
        <button onClick={save} disabled={saving} className="text-accent-500 font-semibold text-sm px-3 disabled:opacity-50 flex items-center gap-1">
          {saving ? <Spinner className="text-accent-500" /> : <CheckIcon className="w-5 h-5" />}
        </button>
      } />
      <div className="max-w-xl mx-auto md:pt-8 p-6">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative">
            <Avatar src={avatarUrl} name={username} size={96} ring="story" />
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-accent-500 border-2 border-white dark:border-black flex items-center justify-center shadow-lg"
            >
              {uploadingAvatar ? <Spinner className="text-white w-3 h-3" /> : <CameraIcon className="w-4 h-4 text-white" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />
          </div>
          <button onClick={() => fileRef.current?.click()} className="text-accent-500 font-semibold text-sm mt-3">Change photo</button>
        </div>

        {/* Fields */}
        <div className="space-y-5">
          <Field label="Username">
            <input value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:outline-none focus:ring-2 focus:ring-accent-500/30" />
          </Field>
          <Field label="Name">
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" className="w-full px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:outline-none focus:ring-2 focus:ring-accent-500/30" />
          </Field>
          <Field label="Bio">
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell people about yourself" rows={3} className="w-full px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:outline-none focus:ring-2 focus:ring-accent-500/30 resize-none" />
          </Field>
          <Field label="Website">
            <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" className="w-full px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 focus:outline-none focus:ring-2 focus:ring-accent-500/30" />
          </Field>
          <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <div>
              <div className="font-semibold text-sm">Private account</div>
              <div className="text-xs text-neutral-500">Only approved followers can see your posts</div>
            </div>
            <Toggle on={isPrivate} onChange={setIsPrivate} />
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!on)} className={`w-12 h-7 rounded-full p-0.5 transition ${on ? 'bg-accent-500' : 'bg-neutral-300 dark:bg-neutral-700'}`}>
      <motion.div layout className="w-6 h-6 rounded-full bg-white shadow" style={{ marginLeft: on ? 'auto' : 0 }} />
    </button>
  )
}

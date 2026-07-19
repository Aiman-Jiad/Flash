import { Avatar } from '@/components/Avatar'
import { CameraIcon } from '@/components/icons'
import { useAuthStore } from '@/store/auth'
import type { Story } from '@/types'

interface StoryBarProps {
  stories: Story[]
  myAvatar?: string | null
  myUsername?: string
  onAddStory: (e: React.ChangeEvent<HTMLInputElement>) => void
  onOpen: (index: number) => void
}

export function StoryBar({ stories, myAvatar, myUsername, onAddStory, onOpen }: StoryBarProps) {
  // Group stories by user
  const byUser = new Map<string, Story[]>()
  stories.forEach((s) => {
    const arr = byUser.get(s.user_id) || []
    arr.push(s)
    byUser.set(s.user_id, arr)
  })
  const users = Array.from(byUser.entries()).map(([userId, arr]) => ({ userId, stories: arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) }))

  return (
    <div className="border-b border-neutral-200/60 dark:border-neutral-800/60">
      <div className="flex gap-4 px-4 py-3 overflow-x-auto no-scrollbar">
        {/* Your story */}
        <label className="flex flex-col items-center gap-1.5 cursor-pointer flex-shrink-0">
          <div className="relative">
            <Avatar src={myAvatar} name={myUsername} size={64} ring="seen" />
            <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-accent-500 border-2 border-white dark:border-black flex items-center justify-center">
              <CameraIcon className="w-3.5 h-3.5 text-white" />
            </div>
          </div>
          <span className="text-xs text-neutral-600 dark:text-neutral-400 max-w-[64px] truncate">Your story</span>
          <input type="file" accept="image/*" className="hidden" onChange={onAddStory} />
        </label>

        {users.map((u, i) => (
          <button key={u.userId} onClick={() => onOpen(i)} className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <Avatar src={u.stories[0].profile?.avatar_url} name={u.stories[0].profile?.username} size={64} ring="story" />
            <span className="text-xs text-neutral-600 dark:text-neutral-400 max-w-[64px] truncate">{u.stories[0].profile?.username}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

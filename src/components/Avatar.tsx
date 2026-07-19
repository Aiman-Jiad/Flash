import { useAuthStore } from '@/store/auth'
import { initials } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  name?: string | null
  size?: number
  ring?: 'story' | 'seen' | 'none'
  className?: string
  onClick?: () => void
}

export function Avatar({ src, name, size = 44, ring = 'none', className, onClick }: AvatarProps) {
  const inner = (
    <div
      className={cn('rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 font-semibold tap-scale', className)}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {src ? (
        <img src={src} alt={name || 'avatar'} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <span>{initials(name)}</span>
      )}
    </div>
  )

  if (ring === 'none') {
    return onClick ? <button onClick={onClick} className="tap-scale">{inner}</button> : inner
  }

  const ringClass = ring === 'story' ? 'story-ring' : 'story-ring-seen'
  const pad = Math.max(2, Math.round(size * 0.04))
  return (
    <button onClick={onClick} className={cn(ringClass, 'inline-block tap-scale')} style={{ padding: pad }}>
      <div className="bg-white dark:bg-black rounded-full" style={{ padding: 2 }}>
        {inner}
      </div>
    </button>
  )
}

export function CurrentUserAvatar({ size = 44, ring = 'none' }: { size?: number; ring?: 'story' | 'seen' | 'none' }) {
  const profile = useAuthStore((s) => s.profile)
  return <Avatar src={profile?.avatar_url} name={profile?.username} size={size} ring={ring} />
}

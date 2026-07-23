import { NavLink, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useUIStore } from '@/store/ui'
import { useAuthStore } from '@/store/auth'
import { Avatar } from '@/components/Avatar'
import {
  HomeIcon, SearchIcon, PlusIcon, ReelIcon, HeartIcon, ChatIcon, LogoutIcon,
} from '@/components/icons'
import { cn } from '@/lib/utils'

export function BottomNav() {
  const profile = useAuthStore((s) => s.profile)
  const theme = useUIStore((s) => s.theme)
  const toggleTheme = useUIStore((s) => s.toggleTheme)
  const signOut = useAuthStore((s) => s.signOut)
  const navigate = useNavigate()

  const items = [
    { to: '/', icon: HomeIcon, label: 'Home' },
    { to: '/explore', icon: SearchIcon, label: 'Explore' },
    { to: '/create', icon: PlusIcon, label: 'Create', accent: true },
    { to: '/reels', icon: ReelIcon, label: 'Reels' },
  ]

  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 glass-strong border-t border-neutral-200/60 dark:border-neutral-800/60 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-14">
        {items.map(({ to, icon: Icon, label, accent }) => (
          <NavLink key={to} to={to} end={to === '/'}>
            {({ isActive }) => (
              <motion.div
                whileTap={{ scale: 0.85 }}
                className={cn(
                  'flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-colors',
                  accent && 'bg-gradient-to-br from-accent-400 to-accent-600 text-white shadow-lg shadow-accent-500/30',
                  !accent && isActive && 'text-accent-500',
                  !accent && !isActive && 'text-neutral-700 dark:text-neutral-300',
                )}
              >
                <Icon className="w-6 h-6" />
              </motion.div>
            )}
          </NavLink>
        ))}
        <NavLink to={`/u/${profile?.username}`} className="block">
          {({ isActive }) => (
            <Avatar src={profile?.avatar_url} name={profile?.username} size={28} className={cn('ring-2', isActive ? 'ring-accent-500' : 'ring-transparent')} />
          )}
        </NavLink>
      </div>
    </nav>
  )
}

export function SideNav() {
  const profile = useAuthStore((s) => s.profile)
  const theme = useUIStore((s) => s.theme)
  const toggleTheme = useUIStore((s) => s.toggleTheme)
  const signOut = useAuthStore((s) => s.signOut)
  const navigate = useNavigate()

  const items = [
    { to: '/', icon: HomeIcon, label: 'Home' },
    { to: '/explore', icon: SearchIcon, label: 'Explore' },
    { to: '/create', icon: PlusIcon, label: 'Create' },
    { to: '/reels', icon: ReelIcon, label: 'Reels' },
    { to: '/messages', icon: HeartIcon, label: 'Messages' },
    { to: `/u/${profile?.username}`, icon: Avatar, label: 'Profile', isAvatar: true },
  ]

  return (
    <aside className="hidden md:flex flex-col fixed inset-y-0 left-0 w-64 glass border-r border-neutral-200/60 dark:border-neutral-800/60 px-4 py-6 z-30">
      <div className="flex items-center gap-2 px-2 mb-8">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-lg shadow-accent-500/30">
          <svg viewBox="0 0 64 64" className="w-6 h-6">
            <path d="M34 12 L20 36 H30 L28 52 L44 26 H34 Z" fill="white" />
          </svg>
        </div>
        <span className="font-display text-xl font-extrabold tracking-tight">Flash</span>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {items.map(({ to, icon: Icon, label, isAvatar }) => (
          <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => cn(
            'flex items-center gap-4 px-3 py-3 rounded-xl transition-colors',
            isActive ? 'bg-neutral-100 dark:bg-neutral-900 font-semibold' : 'hover:bg-neutral-50 dark:hover:bg-neutral-900/50',
          )}>
            {({ isActive }) => isAvatar ? (
              <>
                <Avatar src={profile?.avatar_url} name={profile?.username} size={26} className={cn('ring-2', isActive ? 'ring-accent-500' : 'ring-transparent')} />
                <span>Profile</span>
              </>
            ) : (
              <>
                <Icon className={cn('w-6 h-6', isActive && 'text-accent-500')} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="flex flex-col gap-1">
        <button onClick={() => { signOut(); navigate('/login') }} className="flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-900/50 transition text-red-500">
          <LogoutIcon className="w-6 h-6" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  )
}

export function TopBar({ title, right, onBack, hideActions }: { title?: string; right?: React.ReactNode; onBack?: () => void; hideActions?: boolean }) {
  return (
    <header className="sticky top-0 z-30 glass-strong border-b border-neutral-200/60 dark:border-neutral-800/60">
      <div className="flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2 min-w-0">
          {onBack && (
            <button onClick={onBack} className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-900 transition active:scale-90" aria-label="Back">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          {!onBack && (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shrink-0">
              <svg viewBox="0 0 64 64" className="w-5 h-5">
                <path d="M34 12 L20 36 H30 L28 52 L44 26 H34 Z" fill="white" />
              </svg>
            </div>
          )}
          {title && <span className="font-display font-bold text-lg truncate">{title}</span>}
        </div>
        {!hideActions && (
          <div className="flex items-center gap-2 shrink-0">
            {right}
            <NavLink to="/notifications" className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-neutral-100 dark:hover:bg-neutral-900 transition" aria-label="Activity">
              {({ isActive }) => (
                <HeartIcon className={cn('w-5 h-5', isActive ? 'text-accent-500' : 'text-neutral-700 dark:text-neutral-300')} />
              )}
            </NavLink>
            <NavLink to="/messages" className={({ isActive }) => cn(
              'flex items-center gap-2 h-10 px-4 rounded-full transition active:scale-95',
              isActive
                ? 'bg-gradient-to-br from-accent-400 to-accent-600 text-white shadow-lg shadow-accent-500/30'
                : 'bg-gradient-to-br from-accent-400 to-accent-600 text-white shadow-lg shadow-accent-500/30 hover:shadow-accent-500/50 hover:brightness-110',
            )}>
              <ChatIcon className="w-5 h-5" />
              <span className="font-semibold text-sm hidden sm:inline">Messages</span>
            </NavLink>
          </div>
        )}
        {hideActions && right && <div className="shrink-0">{right}</div>}
      </div>
    </header>
  )
}

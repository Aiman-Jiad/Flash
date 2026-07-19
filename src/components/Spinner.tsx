import { cn } from '@/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn('inline-block animate-spin rounded-full border-2 border-current border-t-transparent', className)} style={{ width: 20, height: 20 }} />
  )
}

export function FullScreenLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-black">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shadow-lg shadow-accent-500/30 animate-pulse">
            <svg viewBox="0 0 64 64" className="w-10 h-10">
              <path d="M34 12 L20 36 H30 L28 52 L44 26 H34 Z" fill="white" />
            </svg>
          </div>
        </div>
        <div className="text-lg font-display font-bold tracking-tight text-neutral-900 dark:text-white">Flash</div>
        <div className="w-32 h-1 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
          <div className="h-full w-1/2 bg-accent-500 animate-[shimmer_1.4s_infinite] rounded-full" />
        </div>
      </div>
    </div>
  )
}

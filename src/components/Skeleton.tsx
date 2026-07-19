import { cn } from '@/lib/utils'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('shimmer rounded-md', className)} />
}

export function PostCardSkeleton() {
  return (
    <div className="border-b border-neutral-200/60 dark:border-neutral-800/60 pb-4 mb-4">
      <div className="flex items-center gap-3 px-4 py-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="w-full aspect-square" />
      <div className="px-4 pt-3 space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-3 w-64" />
      </div>
    </div>
  )
}

export function StoryBarSkeleton() {
  return (
    <div className="flex gap-4 px-4 py-3 overflow-hidden">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5">
          <Skeleton className="w-16 h-16 rounded-full" />
          <Skeleton className="h-2 w-12" />
        </div>
      ))}
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="p-6 space-y-4">
      <div className="flex gap-6 items-center">
        <Skeleton className="w-20 h-20 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <Skeleton className="h-12 w-full" />
    </div>
  )
}

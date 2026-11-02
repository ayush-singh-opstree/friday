import { cn } from '@/lib/utils'

/** Shimmering placeholder used while data loads (perceived-performance win). */
export function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded-sm bg-line/70', className)} />
}

/** Skeleton shaped like a thread card. */
export function ThreadCardSkeleton({ className }) {
  return (
    <div className={cn('rounded-md border border-line bg-card p-4', className)}>
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="size-7 rounded-full" />
      </div>
      <Skeleton className="mt-3 h-3 w-24" />
      <Skeleton className="mt-2 h-3 w-full" />
    </div>
  )
}

/** A short stack of thread card skeletons. */
export function ThreadListSkeleton({ count = 3 }) {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: count }).map((_, index) => (
        <ThreadCardSkeleton key={index} />
      ))}
    </div>
  )
}

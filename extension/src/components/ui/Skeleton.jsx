import { cn } from '@/lib/utils'

/** Shimmering placeholder used while data loads. */
export function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded bg-line/70', className)} />
}

/** Modern row skeleton for threads and search results. */
export function ThreadRowSkeleton({ className }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 rounded-xl border border-line/60 bg-card p-2.5 shadow-2xs', className)}>
      <div className="flex-1 space-y-1.5 min-w-0">
        <Skeleton className="h-4 w-3/5 rounded-md" />
        <Skeleton className="h-2.5 w-2/5 rounded bg-line/60" />
      </div>
      <Skeleton className="h-7 w-16 rounded-lg bg-line/80 shrink-0" />
    </div>
  )
}

/** Row skeleton for contacts / people. */
export function PersonRowSkeleton({ className }) {
  return (
    <div className={cn('flex items-center justify-between gap-2.5 rounded-lg border border-line/60 bg-card p-2', className)}>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Skeleton className="size-7 rounded-full shrink-0" />
        <div className="flex-1 space-y-1 min-w-0">
          <Skeleton className="h-3.5 w-28 rounded-md" />
          <Skeleton className="h-2.5 w-20 rounded bg-line/60" />
        </div>
      </div>
      <Skeleton className="size-4 rounded-md shrink-0" />
    </div>
  )
}

/** Skeleton shaped like a thread card. */
export function ThreadCardSkeleton({ className }) {
  return (
    <div className={cn('rounded-xl border border-line/70 bg-card p-3 shadow-xs', className)}>
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-40 rounded-md" />
        <Skeleton className="size-7 rounded-full" />
      </div>
      <Skeleton className="mt-2.5 h-3 w-24 rounded" />
      <Skeleton className="mt-1.5 h-3 w-full rounded bg-line/60" />
    </div>
  )
}

/** A short stack of thread row skeletons. */
export function ThreadListSkeleton({ count = 3, className }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {Array.from({ length: count }).map((_, index) => (
        <ThreadRowSkeleton key={index} />
      ))}
    </div>
  )
}

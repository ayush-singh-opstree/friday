import { cn } from '@/lib/utils'

/** Inline loading spinner. */
export function Spinner({ className }) {
  return (
    <svg className={cn('animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/** Shimmering placeholder block. */
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

export function ThreadListSkeleton({ count = 3 }) {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: count }).map((_, index) => (
        <ThreadCardSkeleton key={index} />
      ))}
    </div>
  )
}

/** Centred loading state for a route or panel. */
export function LoadingState({ label = 'Loading…', className }) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center gap-3 px-6 py-14 text-center', className)}
      role="status"
      aria-live="polite"
    >
      <Spinner className="size-5 text-primary" />
      <p className="text-small text-ink-muted">{label}</p>
    </div>
  )
}

/** Empty state with an optional icon, copy and action. */
export function EmptyState({ icon = null, title, description, action = null, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-line bg-card px-6 py-12 text-center',
        className,
      )}
    >
      {icon ? <div className="mb-1 text-ink-subtle">{icon}</div> : null}
      <h3 className="text-heading-3 text-ink">{title}</h3>
      {description ? <p className="max-w-sm text-small text-ink-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}

/** Inline error state with a retry affordance. */
export function ErrorState({ title = 'Something went wrong', description, action, className }) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-md border border-danger/30 bg-danger/5 px-6 py-10 text-center',
        className,
      )}
    >
      <h3 className="text-heading-3 text-ink">{title}</h3>
      {description ? <p className="max-w-sm text-small text-ink-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}
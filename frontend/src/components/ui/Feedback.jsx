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
  return <div className={cn('animate-pulse rounded-xl bg-line/60', className)} />
}

/** Skeleton shaped like a thread card. */
export function ThreadCardSkeleton({ className }) {
  return (
    <div className={cn('relative overflow-hidden rounded-2xl border border-line/80 bg-card p-4.5 shadow-xs sm:p-5', className)}>
      <Skeleton className="absolute inset-x-0 top-0 h-1 rounded-none" />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Skeleton className="h-4 w-3/5" />
          <Skeleton className="mt-2 h-3 w-2/5" />
        </div>
        <Skeleton className="size-9 shrink-0 rounded-full" />
      </div>
      <Skeleton className="mt-3 h-3 w-4/5" />
      <Skeleton className="mt-1.5 h-3 w-3/5" />
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-line/60 pt-3">
        <div className="flex items-center gap-2">
          <Skeleton className="size-6 rounded-full" />
          <Skeleton className="h-3.5 w-16" />
        </div>
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>
    </div>
  )
}

export function ThreadListSkeleton({ count = 6, className }) {
  return (
    <div className={cn('grid gap-3 sm:grid-cols-2 2xl:grid-cols-3', className)}>
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
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-16 text-center',
        className,
      )}
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
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line bg-card/50 px-8 py-14 text-center',
        className,
      )}
    >
      {icon ? (
        <div className="flex size-12 items-center justify-center rounded-xl bg-overlay text-ink-subtle">
          {icon}
        </div>
      ) : null}
      <div className="flex flex-col gap-1">
        <h3 className="text-heading-3 text-ink">{title}</h3>
        {description ? <p className="max-w-sm text-small text-ink-muted">{description}</p> : null}
      </div>
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}

/** Inline error state with a retry affordance. */
export function ErrorState({ title = 'Something went wrong', description, action, className }) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-2xl border border-danger/30 bg-danger/5 px-8 py-12 text-center',
        className,
      )}
    >
      <h3 className="text-heading-3 text-ink">{title}</h3>
      {description ? <p className="max-w-sm text-small text-ink-muted">{description}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}

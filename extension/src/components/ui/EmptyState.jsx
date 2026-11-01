import { cn } from '@/lib/utils'

/**
 * Empty state with an illustration slot, copy and an optional action.
 * Used for empty threads, empty Inbox, "no match found" and offline states.
 */
export function EmptyState({ icon = null, title, description, action = null, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-line bg-card px-6 py-10 text-center',
        className,
      )}
    >
      {icon ? <div className="text-ink-subtle">{icon}</div> : null}
      <h3 className="text-heading-3 text-ink">{title}</h3>
      {description ? (
        <p className="max-w-64 text-small text-ink-muted">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}

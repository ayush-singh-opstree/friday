import { Check } from '@phosphor-icons/react'
import { UrgencyDot } from '@/components/ui/Badge'
import { humaniseDueDate } from '@/lib/date'
import { cn } from '@/lib/utils'

/**
 * Commitment row (Feature 5): urgency dot, description, thread, owner and due
 * date, with an inline complete affordance.
 */
export function CommitmentRow({
  commitment,
  onComplete,
  showThread = true,
  className,
  busy = false,
}) {
  const owner = commitment.ownerType === 'person' ? (commitment.ownerPerson?.fullName ?? 'Them') : 'Me'
  const completed = commitment.status === 'completed'

  return (
    <div
      className={cn(
        'group flex items-start gap-2.5 rounded-sm px-2 py-2 transition-colors hover:bg-overlay',
        completed && 'opacity-60',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onComplete?.(commitment)}
        disabled={completed || busy || !onComplete}
        aria-label={completed ? 'Completed' : `Mark "${commitment.description}" complete`}
        className={cn(
          'mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full border transition-colors',
          completed
            ? 'border-success bg-success text-white'
            : 'border-line bg-card hover:border-success hover:text-success',
        )}
      >
        {completed ? <Check size={11} weight="bold" /> : null}
      </button>

      <div className="min-w-0 flex-1">
        <p className={cn('text-body-medium text-ink', completed && 'line-through')}>
          {commitment.description}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-tiny text-ink-muted">
          <UrgencyDot dueDate={commitment.dueDate} status={commitment.status} />
          <span>{humaniseDueDate(commitment.dueDate, commitment.status)}</span>
          <span aria-hidden="true">·</span>
          <span>{owner}</span>
          {showThread && commitment.threadTitle ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate">{commitment.threadTitle}</span>
            </>
          ) : null}
        </p>
      </div>
    </div>
  )
}
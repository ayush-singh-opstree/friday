import { Check } from '@/components/icons'
import { Chip } from '@/components/ui/Chip'
import { commitmentStatusMeta, humaniseDueDate } from '@/lib/date'
import { cn } from '@/lib/utils'

/**
 * Commitment row (Feature 5).
 *
 * Answers the three questions a row should answer at a glance:
 *   1. How do I complete it?  -> a single checkbox control that previews a tick
 *      on hover, and toggles to reopen once the commitment is complete.
 *   2. What is its status?    -> a status chip (Overdue / Due soon / Open /
 *      Completed) alongside the humanised due date.
 *   3. Who owns it, and for which thread? -> a meta line.
 */
export function CommitmentRow({
  commitment,
  onComplete,
  onReopen,
  showThread = true,
  className,
  busy = false,
}) {
  const completed = commitment.status === 'completed'
  const owner =
    commitment.ownerType === 'person' ? (commitment.ownerPerson?.fullName ?? 'Them') : 'Mine'
  const status = commitmentStatusMeta(commitment.dueDate, commitment.status)
  const due = humaniseDueDate(commitment.dueDate, commitment.status)

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-3.5 py-3 transition-colors hover:bg-overlay/60',
        className,
      )}
    >
      {/* 1. The single completion affordance: a checkbox that previews a tick on
             hover, with a tooltip-free `title` fallback. */}
      <button
        type="button"
        onClick={() => (completed ? onReopen?.(commitment) : onComplete?.(commitment))}
        disabled={busy || (completed ? !onReopen : !onComplete)}
        title={completed ? 'Completed - click to reopen' : 'Mark as complete'}
        aria-label={
          completed
            ? `Reopen "${commitment.description}"`
            : `Mark "${commitment.description}" complete`
        }
        className={cn(
          'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-150',
          completed
            ? 'border-success bg-success text-ink-inverse'
            : 'border-ink-subtle/60 bg-card text-transparent hover:border-success hover:bg-success/15 hover:text-success',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        <Check size={12} weight="bold" />
      </button>

      {/* 2. Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
          <p
            className={cn(
              'min-w-0 flex-1 text-body-medium text-ink',
              completed && 'text-ink-muted line-through',
            )}
          >
            {commitment.description}
          </p>
          <Chip tone={status.tone} className="shrink-0">
            {status.label}
          </Chip>
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-tiny text-ink-muted">
          <span className={cn(status.key === 'overdue' && 'font-semibold text-danger')}>{due}</span>
          <span aria-hidden="true">·</span>
          <span>{owner}</span>
          {showThread && commitment.threadTitle ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate">{commitment.threadTitle}</span>
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

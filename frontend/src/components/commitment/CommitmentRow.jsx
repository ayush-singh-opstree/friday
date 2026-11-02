import { ChatCircleDots, Check, Clock, Users } from '@/components/icons'
import { UrgencyDot } from '@/components/ui/Badge'
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
  const urgencyBorder = {
    overdue: 'border-l-danger bg-danger/[0.025]',
    soon: 'border-l-warning bg-warning/[0.02]',
    completed: 'border-l-success/60',
    open: 'border-l-transparent',
  }[status.key]

  return (
    <div
      className={cn(
        'group/row flex items-start gap-3 border-l-2 px-4 py-3.5 transition-colors hover:bg-overlay/70 sm:px-4.5',
        urgencyBorder,
        'not-last:border-b not-last:border-line/70',
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
            : 'border-ink-subtle/50 bg-card text-transparent hover:border-success hover:bg-success/15 hover:text-success group-hover/row:border-ink-muted',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        <Check size={12} weight="bold" />
      </button>

      {/* 2. Content */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <p
            className={cn(
              'min-w-0 flex-1 text-body-medium leading-snug text-ink',
              completed && 'text-ink-muted line-through',
            )}
          >
            {commitment.description}
          </p>
          <Chip
            tone={status.tone}
            icon={<UrgencyDot dueDate={commitment.dueDate} status={commitment.status} />}
            className="shrink-0"
          >
            {status.label}
          </Chip>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-tiny text-ink-muted">
          <span className={cn('inline-flex items-center gap-1.5', status.key === 'overdue' && 'font-semibold text-danger')}>
            <Clock size={12} weight="bold" />
            {due}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users size={12} />
            {owner}
          </span>
          {showThread && commitment.threadTitle ? (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <ChatCircleDots size={12} />
              <span className="truncate">{commitment.threadTitle}</span>
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}

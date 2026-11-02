import { CheckSquare, Clock, Lightning, PushPin, Snowflake } from '@/components/icons'
import { Link } from 'react-router-dom'
import { AttentionScoreBadge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { AvatarGroup } from '@/components/ui/Avatar'
import { Chip } from '@/components/ui/Chip'
import { daysSince, relativeTime } from '@/lib/date'
import { cn } from '@/lib/utils'

/**
 * Thread card (Feature 2):
 * Displays title, people involved, last interaction, attention score,
 * open commitment count, and context-aware attention rationale.
 */
export function ThreadCard({ thread, to, className }) {
  const people = thread.people ?? []
  const days = daysSince(thread.lastInteractionAt)
  const score = thread.attentionScore ?? 0

  return (
    <Card
      as={Link}
      to={to}
      interactive
      className={cn(
        'group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-line/80 bg-card p-4.5 sm:p-5 shadow-xs transition-all duration-200',
        'hover:-translate-y-1 hover:border-primary/40 hover:shadow-md',
        className,
      )}
    >
      {/* Top accent line indicator colored by attention score band */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-x-0 top-0 h-1 transition-opacity duration-200',
          score >= 85
            ? 'bg-gradient-to-r from-danger via-danger to-danger/80'
            : score >= 70
              ? 'bg-gradient-to-r from-danger/80 to-accent'
              : score >= 45
                ? 'bg-gradient-to-r from-accent to-primary'
                : score >= 20
                  ? 'bg-primary/70'
                  : 'bg-line/80',
        )}
      />

      {/* Main card body */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {thread.isPinned ? (
                <span
                  title="Pinned thread"
                  className="inline-flex size-5 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent"
                >
                  <PushPin size={11} weight="fill" />
                </span>
              ) : null}
              <h3 className="truncate text-heading-3 font-semibold text-ink tracking-tight transition-colors group-hover:text-primary">
                {thread.title}
              </h3>
            </div>

            {people.length > 0 ? (
              <p className="mt-1 truncate text-small font-medium text-ink-muted">
                {people.map((person) => person.fullName).join(' · ')}
              </p>
            ) : null}
          </div>

          <AttentionScoreBadge score={score} />
        </div>

        {thread.description ? (
          <p className="mt-2 line-clamp-2 text-small text-ink-muted leading-relaxed">
            {thread.description}
          </p>
        ) : null}

        {thread.attentionReason ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-line/60 bg-overlay/60 px-2.5 py-1.5 text-tiny font-medium text-ink-muted">
            <Lightning size={12} weight="fill" className="text-accent shrink-0" />
            <span className="truncate">{thread.attentionReason}</span>
          </div>
        ) : null}
      </div>

      {/* Card footer */}
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-line/60 pt-3">
        <div className="flex items-center gap-2 min-w-0">
          {people.length > 0 ? <AvatarGroup people={people} size="xs" /> : null}
          <span className="flex items-center gap-1 text-tiny text-ink-subtle">
            <Clock size={11} />
            {relativeTime(thread.lastInteractionAt)}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          {thread.openCommitmentCount > 0 ? (
            <span
              title={`${thread.openCommitmentCount} open commitment(s)`}
              className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-tiny font-semibold text-primary"
            >
              <CheckSquare size={11} weight="bold" />
              {thread.openCommitmentCount} open
            </span>
          ) : null}

          {thread.isGoingCold ? (
            <Chip tone="cold" icon={<Snowflake size={11} weight="bold" />} className="py-0.5">
              {days}d quiet
            </Chip>
          ) : null}
        </div>
      </div>
    </Card>
  )
}

import { PushPin, Snowflake } from '@phosphor-icons/react'
import { Link } from 'react-router-dom'
import { AttentionScoreBadge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'
import { AvatarGroup } from '@/components/ui/Avatar'
import { Chip } from '@/components/ui/Chip'
import { daysSince, relativeTime } from '@/lib/date'
import { cn, pluralise } from '@/lib/utils'

/**
 * Thread card (Feature 2): title, people avatars, last interaction, attention
 * score, open commitment count and the plain-language attention reason.
 */
export function ThreadCard({ thread, to, className }) {
  const people = thread.people ?? []
  const days = daysSince(thread.lastInteractionAt)

  return (
    <Card
      as={Link}
      to={to}
      interactive
      className={cn('relative block overflow-hidden pl-4', className)}
    >
      {/* 4px attention indicator bar, coloured by score band */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute inset-y-0 left-0 w-1',
          thread.attentionScore >= 85
            ? 'bg-danger'
            : thread.attentionScore >= 70
              ? 'bg-danger/70'
              : thread.attentionScore >= 45
                ? 'bg-accent'
                : thread.attentionScore >= 20
                  ? 'bg-primary'
                  : 'bg-line',
        )}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-heading-2 text-ink">{thread.title}</h3>
          <p className="mt-0.5 truncate text-small text-ink-muted">
            {people.length > 0 ? people.map((person) => person.fullName).join(' · ') : 'No people yet'}
          </p>
        </div>
        <AttentionScoreBadge score={thread.attentionScore ?? 0} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-small text-ink-muted">
        {people.length > 0 ? <AvatarGroup people={people} size="xs" /> : null}
        <span>{relativeTime(thread.lastInteractionAt)}</span>
        {thread.openCommitmentCount > 0 ? (
          <>
            <span aria-hidden="true">·</span>
            <span>{pluralise(thread.openCommitmentCount, 'open commitment')}</span>
          </>
        ) : null}
        {thread.isPinned ? (
          <PushPin size={13} weight="fill" className="text-primary" aria-label="Pinned" />
        ) : null}
        {thread.isGoingCold ? (
          <Chip tone="cold" icon={<Snowflake size={11} weight="bold" />}>
            {days}d cold
          </Chip>
        ) : null}
      </div>

      {thread.attentionReason ? (
        <p className="mt-2 text-small text-ink-muted">{thread.attentionReason}</p>
      ) : null}
    </Card>
  )
}
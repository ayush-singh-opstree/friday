import { Link } from 'react-router-dom'
import { EnvelopeSimple } from '@/components/icons'
import { Avatar } from '@/components/ui/Avatar'
import { Chip } from '@/components/ui/Chip'
import { relativeTime } from '@/lib/date'
import { cn, pluralise } from '@/lib/utils'

/**
 * Person card (Feature 3):
 * Displays avatar, name, role, organisation, email, thread count,
 * open commitments, and last interaction timestamp.
 */
export function PersonRow({ person, className }) {
  const meta = [person.role, person.organisation].filter(Boolean).join(' · ')
  const threadCount = person.threadCount ?? 0
  const openCount = person.openCommitmentCount ?? 0

  return (
    <Link
      to={`/people/${person.id}`}
      className={cn(
        'group flex h-full flex-col justify-between gap-3 rounded-2xl border border-line/80 bg-card p-4 shadow-xs',
        'transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md',
        className,
      )}
    >
      <div>
        <div className="flex items-start gap-3">
          <Avatar name={person.fullName} size="md" className="ring-2 ring-primary/10 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-medium font-semibold text-ink group-hover:text-primary transition-colors">
              {person.fullName}
            </p>
            <p className="truncate text-small text-ink-muted mt-0.5">
              {meta || 'No role recorded'}
            </p>
          </div>
        </div>

        {person.email ? (
          <p className="mt-2.5 flex items-center gap-1.5 truncate text-tiny text-ink-subtle">
            <EnvelopeSimple size={12} className="shrink-0 text-ink-muted" />
            <span className="truncate">{person.email}</span>
          </p>
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-line/50 pt-2.5">
        <Chip tone="neutral" className="py-0.5">
          {threadCount === 1 ? '1 thread' : `${threadCount} threads`}
        </Chip>
        {openCount > 0 ? (
          <Chip tone="warning" className="py-0.5">
            {pluralise(openCount, 'commitment')}
          </Chip>
        ) : null}
        {person.lastInteractionAt ? (
          <span className="ml-auto text-tiny text-ink-subtle">
            {relativeTime(person.lastInteractionAt)}
          </span>
        ) : null}
      </div>
    </Link>
  )
}

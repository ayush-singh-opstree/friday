import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Chip } from '@/components/ui/Chip'
import { cn, pluralise } from '@/lib/utils'

/**
 * Person row (Feature 3 -> "Each person card shows: name, organisation, role,
 * thread count, and last interaction date").
 */
export function PersonRow({ person, className }) {
  const meta = [person.role, person.organisation].filter(Boolean).join(' · ')

  return (
    <li>
      <Link
        to={`/people/${person.id}`}
        className={cn(
          'flex items-center gap-3 rounded-md border border-line bg-card p-3 transition-shadow hover:shadow-md',
          className,
        )}
      >
        <Avatar name={person.fullName} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-medium text-ink">{person.fullName}</p>
          <p className="truncate text-small text-ink-muted">{meta || 'No role recorded'}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {person.openCommitmentCount > 0 ? (
            <Chip tone="warning">{pluralise(person.openCommitmentCount, 'commitment')}</Chip>
          ) : null}
          <Chip tone="neutral">
            {person.threadCount === 1 ? '1 thread' : `${person.threadCount ?? 0} threads`}
          </Chip>
        </div>
      </Link>
    </li>
  )
}
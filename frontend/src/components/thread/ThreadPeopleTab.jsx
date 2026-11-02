import { Users } from '@/components/icons'
import { Avatar } from '@/components/ui/Avatar'
import { Chip } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/Feedback'
import { relativeTime } from '@/lib/date'

/**
 * People tab on a thread (Feature 2 -> Thread Detail, item 4).
 * Deep links to person profiles arrive with the full directory in Phase 1D.
 */
export function ThreadPeopleTab({ people = [], personDetails = {} }) {
  if (people.length === 0) {
    return (
      <EmptyState
        icon={<Users size={26} weight="duotone" />}
        title="No people on this thread"
        description="Associate the people involved so you always know who this relationship is with."
      />
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {people.map((person) => {
        const detail = personDetails[person.id] ?? {}
        return (
          <li
            key={person.id}
            className="flex items-center gap-3 rounded-md border border-line bg-card p-3"
          >
            <Avatar name={person.fullName} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-body-medium text-ink">{person.fullName}</p>
              <p className="truncate text-small text-ink-muted">
                {[detail.role, person.organisation].filter(Boolean).join(' · ') || 'No role recorded'}
              </p>
            </div>
            {detail.lastInteractionAt ? (
              <Chip tone="neutral">{relativeTime(detail.lastInteractionAt)}</Chip>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
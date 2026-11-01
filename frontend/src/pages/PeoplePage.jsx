import { useState } from 'react'
import { MagnifyingGlass, Plus, Users } from '@phosphor-icons/react'
import { PageHeader } from '@/components/layout/PageHeader'
import { PersonDialog } from '@/components/person/PersonDialog'
import { PersonRow } from '@/components/person/PersonRow'
import { Button } from '@/components/ui/Button'
import { EmptyState, LoadingState } from '@/components/ui/Feedback'
import { useDebounce } from '@/hooks/useDebounce'
import { usePeople } from '@/hooks/useData'
import { useNavigate } from 'react-router-dom'

/**
 * People directory (Feature 3).
 *
 * Searchable, alphabetically sorted list showing organisation, role, thread
 * count and open commitments per person.
 */
export function PeoplePage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const debouncedQuery = useDebounce(query, 250)
  const { people, isLoading, error, refresh } = usePeople({ query: debouncedQuery })

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        eyebrow="People"
        title="Your directory"
        description="Everyone you manage a relationship with, and every thread they belong to."
        actions={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus size={14} weight="bold" />
            New person
          </Button>
        }
      />

      <div className="relative mb-3">
        <MagnifyingGlass
          size={14}
          className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-subtle"
        />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, organisation or role…"
          aria-label="Search people"
          className="h-10 w-full rounded-md border border-line bg-overlay pr-3 pl-9 text-body text-ink placeholder:text-ink-subtle focus:border-primary focus:outline-none"
        />
      </div>

      {isLoading && people.length === 0 ? (
        <LoadingState label="Loading your directory…" />
      ) : error ? (
        <EmptyState
          title="Couldn't load your directory"
          description={error}
          action={<Button onClick={() => refresh()}>Try again</Button>}
        />
      ) : people.length === 0 ? (
        <EmptyState
          icon={<Users size={28} weight="duotone" />}
          title={query ? 'No matches' : 'No people yet'}
          description={
            query
              ? 'Try a different name, organisation or role.'
              : 'Add the people behind your threads so context always has a face.'
          }
          action={<Button onClick={() => setDialogOpen(true)}>Add a person</Button>}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {people.map((person) => (
            <PersonRow key={person.id} person={person} />
          ))}
        </ul>
      )}

      <PersonDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onViewExisting={(personId) => navigate(`/people/${personId}`)}
      />
    </div>
  )
}
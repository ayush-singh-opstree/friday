import { useState } from 'react'
import { MagnifyingGlass, Plus, Users } from '@/components/icons'
import { PageContainer, PageHeader } from '@/components/layout/PageHeader'
import { PersonDialog } from '@/components/person/PersonDialog'
import { PersonRow } from '@/components/person/PersonRow'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Controls'
import { StaggerGroup, StaggerItem, Toolbar } from '@/components/ui'
import { EmptyState, LoadingState } from '@/components/ui/Feedback'
import { useDebounce } from '@/hooks/useDebounce'
import { usePeople } from '@/hooks/useData'
import { useNavigate } from 'react-router-dom'

/**
 * People directory (Feature 3).
 */
export function PeoplePage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const debouncedQuery = useDebounce(query, 250)
  const { people, isLoading, error, refresh } = usePeople({ query: debouncedQuery })

  const openCommitmentTotal = people.reduce(
    (total, person) => total + (person.openCommitmentCount ?? 0),
    0,
  )
  const totalLabel = `${people.length === 1 ? '1 person' : `${people.length} people`}${
    openCommitmentTotal > 0 ? ` · ${openCommitmentTotal} open` : ''
  }`

  return (
    <PageContainer>
      <PageHeader
        eyebrow="People"
        title="Your directory"
        actions={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus size={14} weight="bold" />
            New person
          </Button>
        }
      />

      <Toolbar>
        <div className="relative min-w-0 flex-1 sm:max-w-md">
          <MagnifyingGlass
            size={15}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-subtle"
          />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, organisation or role…"
            aria-label="Search people"
            className="pl-10"
          />
        </div>

        <p className="shrink-0 text-small text-ink-muted">{totalLabel}</p>
      </Toolbar>

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
          icon={<Users size={24} weight="duotone" />}
          title={query ? 'No matches' : 'No people yet'}
          description={
            query
              ? 'Try a different name, organisation or role.'
              : 'Add the people behind your threads so context always has a face.'
          }
          action={<Button onClick={() => setDialogOpen(true)}>Add a person</Button>}
        />
      ) : (
        <StaggerGroup
          as="ul"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
        >
          {people.map((person) => (
            <StaggerItem as="li" key={person.id}>
              <PersonRow person={person} />
            </StaggerItem>
          ))}
        </StaggerGroup>
      )}

      <PersonDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onViewExisting={(personId) => navigate(`/people/${personId}`)}
      />
    </PageContainer>
  )
}

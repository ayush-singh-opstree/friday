import { useEffect, useMemo, useState } from 'react'
import { MagnifyingGlass, Plus, Users, X } from '@/components/icons'
import { usePeopleStore, useThreadStore, useUiStore } from '@/store'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Feedback'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'

/**
 * Manage the people associated with a thread (Feature 2). Lists the people
 * currently on the thread (removable) and adds more from the directory.
 * Backed by GET/POST/DELETE /threads/{id}/people* (backend routers/people.py).
 */
export function ThreadPeopleDialog({ open, onOpenChange, thread }) {
  const people = usePeopleStore((state) => state.people)
  const peopleStatus = usePeopleStore((state) => state.status)
  const fetchPeople = usePeopleStore((state) => state.fetchPeople)
  const addPerson = useThreadStore((state) => state.addPerson)
  const removePerson = useThreadStore((state) => state.removePerson)
  const pushToast = useUiStore((state) => state.pushToast)

  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState(null)

  useEffect(() => {
    if (open && peopleStatus === 'idle') fetchPeople({ query: '' })
  }, [open, peopleStatus, fetchPeople])

  const linkedIds = useMemo(
    () => new Set((thread?.people ?? []).map((person) => person.id)),
    [thread],
  )

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return people
      .filter((person) => !linkedIds.has(person.id))
      .filter((person) => {
        if (!q) return true
        const name = (person.fullName ?? '').toLowerCase()
        const org = (person.organisation ?? '').toLowerCase()
        return name.includes(q) || org.includes(q)
      })
      .slice(0, 40)
  }, [people, linkedIds, query])

  if (!thread) return null

  const run = async (personId, action, message) => {
    setBusyId(personId)
    try {
      await action(thread.id, personId)
      pushToast(message, 'success')
    } catch (error) {
      pushToast(error?.message ?? 'Something went wrong.', 'danger')
    } finally {
      setBusyId(null)
    }
  }

  const handleOpenChange = (next) => {
    if (!next) setQuery('')
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage people</DialogTitle>
          <DialogDescription>Add or remove the people associated with this thread.</DialogDescription>
        </DialogHeader>

        <section className="mt-1">
          <p className="mb-2 text-tiny font-semibold tracking-[0.08em] text-ink-subtle uppercase">On this thread</p>
          {thread.people?.length ? (
            <ul className="flex flex-col gap-1.5">
              {thread.people.map((person) => (
                <li key={person.id} className="flex items-center gap-2.5 rounded-lg border border-line/70 bg-card px-2.5 py-2">
                  <Avatar name={person.fullName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-small font-medium text-ink">{person.fullName}</p>
                    {person.organisation ? <p className="truncate text-tiny text-ink-subtle">{person.organisation}</p> : null}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 gap-1 px-2 text-tiny text-danger hover:bg-danger/10 hover:text-danger"
                    onClick={() => run(person.id, removePerson, 'Person removed from thread.')}
                    loading={busyId === person.id}
                  >
                    <X size={12} weight="bold" />
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="flex items-center gap-2 rounded-lg border border-dashed border-line px-3 py-3 text-small text-ink-subtle">
              <Users size={15} />
              No people on this thread yet.
            </p>
          )}
        </section>

        <section className="mt-3">
          <p className="mb-2 text-tiny font-semibold tracking-[0.08em] text-ink-subtle uppercase">Add people</p>
          <div className="relative">
            <MagnifyingGlass
              size={14}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-subtle"
            />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your directory..."
              disabled={peopleStatus === 'loading'}
              className="h-9 w-full rounded-lg border border-line/80 bg-surface/70 pr-3 pl-9 text-small text-ink placeholder:text-ink-subtle focus:border-primary focus:bg-card focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <div className="mt-2 max-h-60 overflow-y-auto" aria-busy={peopleStatus === 'loading'}>
            {peopleStatus === 'loading' && people.length === 0 ? (
              <div className="flex flex-col gap-1" role="status" aria-live="polite">
                <span className="sr-only">Loading people</span>
                {[0, 1, 2, 3, 4].map((row) => (
                  <div key={row} className="flex items-center gap-2.5 px-2 py-1.5">
                    <Skeleton className="size-8 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-2/5" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                    <Skeleton className="h-7 w-14 shrink-0 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : results.length ? (
              <ul className="flex flex-col gap-1">
                {results.map((person) => (
                  <li key={person.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-overlay">
                    <Avatar name={person.fullName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-small font-medium text-ink">{person.fullName}</p>
                      {person.organisation ? <p className="truncate text-tiny text-ink-subtle">{person.organisation}</p> : null}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 shrink-0 gap-1 px-2 text-tiny"
                      onClick={() => run(person.id, addPerson, 'Person added to thread.')}
                      loading={busyId === person.id}
                    >
                      <Plus size={12} weight="bold" />
                      Add
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-1 py-3 text-small text-ink-subtle">
                {query ? 'No matches found.' : 'Everyone in your directory is already on this thread.'}
              </p>
            )}
          </div>
        </section>
      </DialogContent>
    </Dialog>
  )
}
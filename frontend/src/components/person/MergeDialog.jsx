import { useMemo, useState } from 'react'
import { MagnifyingGlass } from '@/components/icons'
import { usePeopleStore, useUiStore } from '@/store'
import { normaliseName } from '@/lib/patterns'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { cn } from '@/lib/utils'

/**
 * Merge two person records (Feature 3 -> edge case: "Merging two person records
 * consolidates thread associations and appends notes with a separator").
 *
 * The currently-open person is always the surviving record.
 */
export function MergeDialog({ open, onOpenChange, person, onMerged }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Merge a duplicate</DialogTitle>
          <DialogDescription>
            Everything linked to the duplicate — threads, commitments, captures and notes — moves to{' '}
            <strong>{person?.fullName}</strong>. The duplicate is then removed.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <MergeForm
            key={person?.id ?? 'merge'}
            person={person}
            onOpenChange={onOpenChange}
            onMerged={onMerged}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function MergeForm({ person, onOpenChange, onMerged }) {
  const people = usePeopleStore((state) => state.people)
  const mergePeople = usePeopleStore((state) => state.mergePeople)
  const pushToast = useUiStore((state) => state.pushToast)

  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [merging, setMerging] = useState(false)

  const candidates = useMemo(() => {
    const needle = normaliseName(query)
    return people
      .filter((row) => row.id !== person?.id)
      .filter((row) => (needle ? normaliseName(row.fullName).includes(needle) : true))
      .slice(0, 8)
  }, [people, person?.id, query])

  const handleMerge = async () => {
    if (!selectedId) return
    setMerging(true)
    try {
      await mergePeople(person.id, selectedId)
      pushToast('Records merged.', 'success')
      onOpenChange(false)
      onMerged?.(person.id)
    } catch (error) {
      pushToast(error?.message ?? 'Could not merge those records.', 'danger')
    } finally {
      setMerging(false)
    }
  }

  return (
    <>
      <div className="relative mb-2">
        <MagnifyingGlass
          size={13}
          className="absolute top-1/2 left-2.5 -translate-y-1/2 text-ink-subtle"
        />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find the duplicate…"
          aria-label="Find the duplicate to merge"
          className="h-9 w-full rounded-sm border border-line bg-overlay pr-2 pl-7 text-small focus:border-primary focus:outline-none"
        />
      </div>

      <ul className="flex max-h-60 flex-col gap-1 overflow-y-auto scroll-slim">
        {candidates.length === 0 ? (
          <li className="py-3 text-center text-small text-ink-subtle">No other people found.</li>
        ) : (
          candidates.map((candidate) => (
            <li key={candidate.id}>
              <button
                type="button"
                onClick={() => setSelectedId(candidate.id)}
                aria-pressed={selectedId === candidate.id}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-sm px-2 py-2 text-left transition-colors',
                  selectedId === candidate.id
                    ? 'bg-primary-light text-primary'
                    : 'hover:bg-overlay',
                )}
              >
                <Avatar name={candidate.fullName} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-small font-medium">
                    {candidate.fullName}
                  </span>
                  <span className="block truncate text-tiny text-ink-muted">
                    {[candidate.role, candidate.organisation].filter(Boolean).join(' · ') ||
                      'No role recorded'}
                  </span>
                </span>
              </button>
            </li>
          ))
        )}
      </ul>

      <DialogFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleMerge} loading={merging} disabled={!selectedId}>
          Merge into {person?.fullName?.split(' ')[0]}
        </Button>
      </DialogFooter>
    </>
  )
}

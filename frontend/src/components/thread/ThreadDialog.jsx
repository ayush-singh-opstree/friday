import { useMemo, useState } from 'react'
import { MagnifyingGlass } from '@/components/icons'
import { DEFAULT_GOING_COLD_DAYS } from '@/config/constants'
import { usePeople } from '@/hooks/useData'
import { normaliseName } from '@/lib/patterns'
import { useThreadStore, useUiStore } from '@/store'
import { Button } from '@/components/ui/Button'
import { Avatar } from '@/components/ui/Avatar'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Field, Input, Textarea } from '@/components/ui/Controls'
import { cn } from '@/lib/utils'

/**
 * Create a new thread (Feature 2).
 */
export function ThreadDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>New thread</DialogTitle>
        </DialogHeader>
        {open ? <ThreadForm onOpenChange={onOpenChange} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function ThreadForm({ onOpenChange }) {
  const createThread = useThreadStore((state) => state.createThread)
  const pushToast = useUiStore((state) => state.pushToast)
  const { people } = usePeople()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [threshold, setThreshold] = useState(String(DEFAULT_GOING_COLD_DAYS))
  const [personIds, setPersonIds] = useState([])
  const [query, setQuery] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const filteredPeople = useMemo(() => {
    const term = normaliseName(query)
    if (!term) return people.slice(0, 6)
    return people.filter((person) => normaliseName(person.fullName).includes(term)).slice(0, 6)
  }, [people, query])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!title.trim()) {
      setError('Thread title is required.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await createThread({
        title: title.trim(),
        description: description.trim() || undefined,
        personIds,
        goingColdThresholdDays: Number(threshold) || DEFAULT_GOING_COLD_DAYS,
      })
      pushToast('Thread created.', 'success')
      onOpenChange(false)
    } catch (submitError) {
      setError(submitError?.message ?? 'Could not create that thread.')
    } finally {
      setSaving(false)
    }
  }

  const togglePerson = (personId) => {
    setPersonIds((current) =>
      current.includes(personId) ? current.filter((id) => id !== personId) : [...current, personId],
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Thread title" htmlFor="thread-title" error={error}>
        <Input
          id="thread-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Fintech Co. — Aditya"
          autoFocus
          maxLength={100}
          invalid={Boolean(error)}
        />
      </Field>

      <Field
        label="Description"
        htmlFor="thread-description"
        hint="Optional · up to 500 characters"
      >
        <Textarea
          id="thread-description"
          rows={2}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What is this relationship about?"
          maxLength={500}
        />
      </Field>

      <Field label="People" htmlFor="thread-people">
        <div className="rounded-xl border border-line bg-overlay p-2.5">
          <div className="relative mb-2">
            <MagnifyingGlass
              size={13}
              className="absolute top-1/2 left-2.5 -translate-y-1/2 text-ink-subtle"
            />
            <input
              id="thread-people"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search people…"
              className="h-9 w-full rounded-lg border border-line bg-card pr-2 pl-7 text-small transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/12"
            />
          </div>

          <ul className="max-h-36 space-y-0.5 overflow-y-auto scroll-slim">
            {filteredPeople.length === 0 ? (
              <li className="px-2 py-2 text-small text-ink-subtle">No people found.</li>
            ) : (
              filteredPeople.map((person) => {
                const selected = personIds.includes(person.id)
                return (
                  <li key={person.id}>
                    <button
                      type="button"
                      onClick={() => togglePerson(person.id)}
                      aria-pressed={selected}
                      className={cn(
                        'flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-small transition-colors',
                        selected ? 'bg-primary-light text-primary' : 'hover:bg-card',
                      )}
                    >
                      <Avatar name={person.fullName} size="xs" />
                      <span className="min-w-0 flex-1 truncate">{person.fullName}</span>
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      </Field>

      <Field
        label="Going-cold threshold (days)"
        htmlFor="thread-threshold"
        hint="Days without activity before this thread is flagged"
      >
        <Input
          id="thread-threshold"
          type="number"
          min={1}
          max={90}
          value={threshold}
          onChange={(event) => setThreshold(event.target.value)}
          className="w-28"
        />
      </Field>

      <DialogFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          Create thread
        </Button>
      </DialogFooter>
    </form>
  )
}

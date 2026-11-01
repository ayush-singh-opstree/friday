import { useMemo, useState } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { DEFAULT_GOING_COLD_DAYS } from '@/config/constants'
import { usePeople } from '@/hooks/useData'
import { normaliseName } from '@/lib/patterns'
import { useThreadStore, useUiStore } from '@/store'
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
import { Field, Input, Textarea } from '@/components/ui/Controls'
import { cn } from '@/lib/utils'

/**
 * Create a new thread (Feature 2 / docs/05_user_flows.md -> Flow 2):
 * title (required), associated people, description and an optional per-thread
 * going-cold threshold.
 */
export function ThreadDialog({ open, onOpenChange }) {
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

  const reset = () => {
    setTitle('')
    setDescription('')
    setThreshold(String(DEFAULT_GOING_COLD_DAYS))
    setPersonIds([])
    setQuery('')
    setError(null)
  }

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
      reset()
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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>New thread</DialogTitle>
          <DialogDescription>
            A thread is one ongoing relationship or context you are managing.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
            hint="Optional, up to 500 characters"
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

          <Field
            label="People"
            htmlFor="thread-people"
            hint="Associate anyone already in your directory"
          >
            <div className="rounded-md border border-line bg-overlay p-2">
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
                  className="h-8 w-full rounded-sm border border-line bg-card pr-2 pl-7 text-small focus:border-primary focus:outline-none"
                />
              </div>

              <ul className="max-h-36 space-y-0.5 overflow-y-auto scroll-slim">
                {filteredPeople.length === 0 ? (
                  <li className="px-1 py-2 text-small text-ink-subtle">No people found.</li>
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
                            'flex w-full items-center gap-2 rounded-sm px-1.5 py-1.5 text-left text-small transition-colors',
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
      </DialogContent>
    </Dialog>
  )
}
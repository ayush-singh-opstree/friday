  import { useEffect, useState } from 'react'
import { endOfDayIso, toDate } from '@/lib/date'
import { useCommitmentStore, usePeopleStore, useThreadStore, useUiStore } from '@/store'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Field, Input } from '@/components/ui/Controls'
import { DatePicker } from '@/components/ui/DatePicker'
import { SelectMenu } from '@/components/ui/SelectMenu'

/**
 * Create / edit a commitment (Feature 5).
 */
export function CommitmentDialog({
  open,
  onOpenChange,
  threadId = null,
  people = [],
  commitment = null,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:overflow-visible">
        <DialogHeader className="mb-5">
          <DialogTitle>{commitment ? 'Edit commitment' : 'New commitment'}</DialogTitle>
          <DialogDescription>
            {commitment
              ? 'Keep the details current so the next step stays clear.'
              : 'Capture a clear next step and give it a home.'}
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <CommitmentForm
            key={commitment?.id ?? `new-${threadId ?? 'all'}`}
            threadId={threadId}
            people={people}
            commitment={commitment}
            onOpenChange={onOpenChange}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function CommitmentForm({
  threadId = null,
  people = [],
  commitment = null,
  onOpenChange,
}) {
  const threads = useThreadStore((state) => state.threads)
  const storePeople = usePeopleStore((state) => state.people)
  const peopleStatus = usePeopleStore((state) => state.status)
  const fetchPeople = usePeopleStore((state) => state.fetchPeople)
  const createCommitment = useCommitmentStore((state) => state.createCommitment)
  const updateCommitment = useCommitmentStore((state) => state.updateCommitment)
  const pushToast = useUiStore((state) => state.pushToast)

  const editing = Boolean(commitment)

  // Callers may pass a scoped list (e.g. a thread's people). When they don't, we
  // fall back to the full people directory and make sure it is loaded, otherwise
  // the "Someone else" owner picker would render an empty list.
  const hasProvidedPeople = people.length > 0
  const directoryPeople = hasProvidedPeople ? people : storePeople
  const loadingPeople = !hasProvidedPeople && peopleStatus === 'loading'

  useEffect(() => {
    if (!hasProvidedPeople && peopleStatus === 'idle') fetchPeople({ query: '' })
  }, [hasProvidedPeople, peopleStatus, fetchPeople])

  const [description, setDescription] = useState(commitment?.description ?? '')
  const [ownerType, setOwnerType] = useState(commitment?.ownerType ?? 'me')
  const [ownerPersonId, setOwnerPersonId] = useState(commitment?.ownerPersonId ?? '')
  const [dueDate, setDueDate] = useState(() => toDate(commitment?.dueDate))
  const [targetThreadId, setTargetThreadId] = useState(commitment?.threadId ?? threadId ?? '')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const threadOptions = [
    { value: '', label: 'Select a thread…' },
    ...threads
      .filter((thread) => thread.status === 'active')
      .map((thread) => ({
        value: thread.id,
        label: thread.title,
      })),
  ]

  // A commitment is either my own promise ("Me") or someone else's.
  const ownerOptions = [
    { value: 'me', label: 'Me' },
    { value: 'person', label: 'Someone else' },
  ]

  const peopleOptions = [
    { value: '', label: 'Select a person…' },
    ...directoryPeople.map((person) => ({
      value: person.id,
      label: person.fullName,
    })),
  ]

  // Keep an already-assigned person selectable even if it isn't in the list.
  if (ownerPersonId && !peopleOptions.some((option) => option.value === ownerPersonId)) {
    peopleOptions.unshift({
      value: ownerPersonId,
      label: commitment?.ownerPerson?.fullName ?? 'Selected person',
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!description.trim()) {
      setError('A commitment needs a description.')
      return
    }
    if (!targetThreadId) {
      setError('Pick the thread this commitment belongs to.')
      return
    }
    if (ownerType === 'person' && !ownerPersonId) {
      setError('Select the person this commitment is with.')
      return
    }

    const payload = {
      description: description.trim(),
      threadId: targetThreadId,
      ownerType,
      ownerPersonId: ownerType === 'person' ? ownerPersonId || null : null,
      dueDate: dueDate ? endOfDayIso(dueDate) : null,
    }

    setSaving(true)
    setError(null)
    try {
      if (editing) await updateCommitment(commitment.id, payload)
      else await createCommitment(payload)
      pushToast(editing ? 'Commitment updated.' : 'Commitment created.', 'success')
      onOpenChange(false)
    } catch (submitError) {
      setError(submitError?.message ?? 'Could not save that commitment.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Commitment description" htmlFor="commitment-description" error={error}>
        <Input
          id="commitment-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="e.g. Send the updated delivery timeline"
          autoFocus
          maxLength={500}
          invalid={Boolean(error)}
        />
      </Field>

      <Field label="Thread" hint="Link this promise to the conversation where it started.">
        <SelectMenu
          value={targetThreadId}
          onChange={setTargetThreadId}
          options={threadOptions}
          disabled={Boolean(threadId)}
          placeholder="Select a thread…"
        />
      </Field>

      <Field label="Owner" hint="Is this your promise, or someone else's?">
        <SelectMenu value={ownerType} onChange={setOwnerType} options={ownerOptions} />
      </Field>

      {ownerType === 'person' ? (
        <Field
          label="Person"
          hint={
            !loadingPeople && directoryPeople.length === 0
              ? 'No people in your directory yet — add someone from the People page.'
              : 'Whom is this commitment with?'
          }
        >
          <SelectMenu
            value={ownerPersonId}
            onChange={setOwnerPersonId}
            options={peopleOptions}
            placeholder={loadingPeople ? 'Loading people...' : 'Select a person...'}
          />
        </Field>
      ) : null}

      <Field label="Due date" htmlFor="commitment-due">
        <DatePicker
          id="commitment-due"
          value={dueDate}
          onChange={setDueDate}
          aria-label="Due date"
        />
      </Field>

      <DialogFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {editing ? 'Save changes' : 'Create commitment'}
        </Button>
      </DialogFooter>
    </form>
  )
}

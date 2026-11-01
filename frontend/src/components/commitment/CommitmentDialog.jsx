import { useState } from 'react'
import { endOfTodayIso, fromDateInputValue, toDateInputValue } from '@/lib/date'
import { useCommitmentStore, useThreadStore, useUiStore } from '@/store'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Field, Input } from '@/components/ui/Controls'
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
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{commitment ? 'Edit commitment' : 'New commitment'}</DialogTitle>
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
  const createCommitment = useCommitmentStore((state) => state.createCommitment)
  const updateCommitment = useCommitmentStore((state) => state.updateCommitment)
  const pushToast = useUiStore((state) => state.pushToast)

  const editing = Boolean(commitment)

  const [description, setDescription] = useState(commitment?.description ?? '')
  const [ownerType, setOwnerType] = useState(commitment?.ownerType ?? 'me')
  const [ownerPersonId, setOwnerPersonId] = useState(commitment?.ownerPersonId ?? '')
  const [dueDate, setDueDate] = useState(toDateInputValue(commitment?.dueDate))
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

  const ownerOptions = [
    { value: 'me', label: 'Me' },
    { value: 'person', label: 'Someone else' },
  ]

  const peopleOptions = [
    { value: '', label: 'Select a person…' },
    ...people.map((person) => ({
      value: person.id,
      label: person.fullName,
    })),
  ]

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

    const payload = {
      description: description.trim(),
      threadId: targetThreadId,
      ownerType,
      ownerPersonId: ownerType === 'person' ? ownerPersonId || null : null,
      dueDate: dueDate ? fromDateInputValue(dueDate) : null,
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
      <Field label="What was promised?" htmlFor="commitment-description" error={error}>
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

      <Field label="Thread">
        <SelectMenu
          value={targetThreadId}
          onChange={setTargetThreadId}
          options={threadOptions}
          disabled={Boolean(threadId)}
          placeholder="Select a thread…"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Owner">
          <SelectMenu
            value={ownerType}
            onChange={setOwnerType}
            options={ownerOptions}
          />
        </Field>

        <Field label="Due date" htmlFor="commitment-due">
          <Input
            id="commitment-due"
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </Field>
      </div>

      {ownerType === 'person' ? (
        <Field label="Who owns it?">
          <SelectMenu
            value={ownerPersonId}
            onChange={setOwnerPersonId}
            options={peopleOptions}
            placeholder="Select a person…"
          />
        </Field>
      ) : null}

      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setDueDate(toDateInputValue(endOfTodayIso()))}
        >
          Due today
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setDueDate('')}>
          Clear date
        </Button>
      </div>

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

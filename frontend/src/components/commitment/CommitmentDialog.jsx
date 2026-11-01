import { useState } from 'react'
import { endOfTodayIso, fromDateInputValue, toDateInputValue } from '@/lib/date'
import { useCommitmentStore, useThreadStore, useUiStore } from '@/store'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Field, Input, Select } from '@/components/ui/Controls'

/**
 * Create / edit a commitment (Feature 5 / docs/05_user_flows.md -> Flow 4).
 *
 * Fields: description (required), owner (Me or one of the thread's people),
 * due date and the linked thread.
 */
export function CommitmentDialog({
  open,
  onOpenChange,
  threadId = null,
  people = [],
  commitment = null,
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit commitment' : 'New commitment'}</DialogTitle>
          <DialogDescription>
            {editing
              ? 'Update the promise, owner or due date.'
              : 'Track a promise with an owner and a due date.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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

          <Field label="Thread" htmlFor="commitment-thread">
            <Select
              id="commitment-thread"
              value={targetThreadId}
              onChange={(event) => setTargetThreadId(event.target.value)}
              disabled={Boolean(threadId)}
            >
              <option value="">Select a thread…</option>
              {threads
                .filter((thread) => thread.status === 'active')
                .map((thread) => (
                  <option key={thread.id} value={thread.id}>
                    {thread.title}
                  </option>
                ))}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Owner" htmlFor="commitment-owner">
              <Select
                id="commitment-owner"
                value={ownerType}
                onChange={(event) => setOwnerType(event.target.value)}
              >
                <option value="me">Me</option>
                <option value="person">Someone else</option>
              </Select>
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
            <Field label="Who owns it?" htmlFor="commitment-owner-person">
              <Select
                id="commitment-owner-person"
                value={ownerPersonId}
                onChange={(event) => setOwnerPersonId(event.target.value)}
              >
                <option value="">Select a person…</option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.fullName}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          <div className="flex items-center gap-2">
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
      </DialogContent>
    </Dialog>
  )
}
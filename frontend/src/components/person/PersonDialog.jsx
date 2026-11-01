import { useMemo, useState } from 'react'
import { Warning } from '@/components/icons'
import { usePeopleStore, useUiStore } from '@/store'
import { normaliseName } from '@/lib/patterns'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Field, Input, Textarea } from '@/components/ui/Controls'

/**
 * Create / edit a person (Feature 3).
 * Duplicate detection: typing a name that already exists surfaces a warning.
 */
export function PersonDialog({ open, onOpenChange, person = null, onViewExisting }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>{person ? 'Edit person' : 'New person'}</DialogTitle>
        </DialogHeader>
        {open ? (
          <PersonForm
            key={person?.id ?? 'new-person'}
            person={person}
            onOpenChange={onOpenChange}
            onViewExisting={onViewExisting}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function PersonForm({ person = null, onOpenChange, onViewExisting }) {
  const people = usePeopleStore((state) => state.people)
  const createPerson = usePeopleStore((state) => state.createPerson)
  const updatePerson = usePeopleStore((state) => state.updatePerson)
  const pushToast = useUiStore((state) => state.pushToast)

  const editing = Boolean(person)

  const [fullName, setFullName] = useState(person?.fullName ?? '')
  const [organisation, setOrganisation] = useState(person?.organisation ?? '')
  const [role, setRole] = useState(person?.role ?? '')
  const [email, setEmail] = useState(person?.email ?? '')
  const [phone, setPhone] = useState(person?.phone ?? '')
  const [linkedInUrl, setLinkedInUrl] = useState(person?.linkedInUrl ?? '')
  const [notes, setNotes] = useState(person?.notes ?? '')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  const duplicates = useMemo(() => {
    const needle = normaliseName(fullName)
    if (!needle || editing) return []
    return people.filter((row) => normaliseName(row.fullName) === needle).slice(0, 3)
  }, [fullName, people, editing])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!fullName.trim()) {
      setError('A person needs at least a full name.')
      return
    }

    const payload = {
      fullName: fullName.trim(),
      organisation: organisation.trim() || null,
      role: role.trim() || null,
      email: email.trim() || null,
      phone: phone.trim() || null,
      linkedInUrl: linkedInUrl.trim() || null,
      notes: notes.trim() || null,
    }

    setSaving(true)
    setError(null)
    try {
      if (editing) await updatePerson(person.id, payload)
      else await createPerson(payload)
      pushToast(editing ? 'Person updated.' : 'Person added to your directory.', 'success')
      onOpenChange(false)
    } catch (submitError) {
      setError(submitError?.message ?? 'Could not save that person.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Full name" htmlFor="person-name" error={error}>
        <Input
          id="person-name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="e.g. Aditya Rao"
          autoFocus
          maxLength={120}
          invalid={Boolean(error)}
        />
      </Field>

      {duplicates.length > 0 ? (
        <div className="rounded-xl border border-warning/40 bg-warning/8 px-4 py-3">
          <p className="flex items-center gap-1.5 text-small font-semibold text-[#8a5a06]">
            <Warning size={14} weight="bold" />
            This name already exists
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {duplicates.map((duplicate) => (
              <li key={duplicate.id}>
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false)
                    onViewExisting?.(duplicate.id)
                  }}
                  className="text-small font-medium text-primary underline underline-offset-2"
                >
                  View {duplicate.fullName}
                  {duplicate.organisation ? ` · ${duplicate.organisation}` : ''}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Organisation" htmlFor="person-org">
          <Input
            id="person-org"
            value={organisation}
            onChange={(event) => setOrganisation(event.target.value)}
            placeholder="Fintech Co."
          />
        </Field>
        <Field label="Role" htmlFor="person-role">
          <Input
            id="person-role"
            value={role}
            onChange={(event) => setRole(event.target.value)}
            placeholder="Head of Product"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Email" htmlFor="person-email">
          <Input
            id="person-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@company.com"
          />
        </Field>
        <Field label="Phone" htmlFor="person-phone">
          <Input
            id="person-phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Optional"
          />
        </Field>
      </div>

      <Field
        label="LinkedIn URL"
        htmlFor="person-linkedin"
        hint="Used to match on the LinkedIn companion"
      >
        <Input
          id="person-linkedin"
          value={linkedInUrl}
          onChange={(event) => setLinkedInUrl(event.target.value)}
          placeholder="https://www.linkedin.com/in/…"
        />
      </Field>

      <Field label="Notes" htmlFor="person-notes" hint="Anything worth remembering">
        <Textarea
          id="person-notes"
          rows={3}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Prefers async updates. Decision maker for Q3 scope."
        />
      </Field>

      <DialogFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {editing ? 'Save changes' : 'Add person'}
        </Button>
      </DialogFooter>
    </form>
  )
}

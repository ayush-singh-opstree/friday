import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  EnvelopeSimple,
  LinkedinLogo,
  NotePencil,
  Phone,
  Trash,
  UsersThree,
} from '@phosphor-icons/react'
import { CommitmentRow } from '@/components/commitment/CommitmentRow'
import { MergeDialog } from '@/components/person/MergeDialog'
import { PersonDialog } from '@/components/person/PersonDialog'
import { AttentionScoreBadge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card, SectionHeader } from '@/components/ui/Card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { EmptyState, LoadingState } from '@/components/ui/Feedback'
import { relativeTime } from '@/lib/date'
import { usePeopleStore, useUiStore } from '@/store'

/**
 * Person profile (Feature 3 -> "contact details, associated threads, personal notes").
 */
export function PersonDetailPage() {
  const { personId } = useParams()
  const navigate = useNavigate()

  const person = usePeopleStore((state) => state.person)
  const threads = usePeopleStore((state) => state.personThreads)
  const commitments = usePeopleStore((state) => state.personCommitments)
  const selectPerson = usePeopleStore((state) => state.selectPerson)
  const deletePerson = usePeopleStore((state) => state.deletePerson)
  const pushToast = useUiStore((state) => state.pushToast)

  const [editOpen, setEditOpen] = useState(false)
  const [mergeOpen, setMergeOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    selectPerson(personId)
  }, [personId, selectPerson])

  if (!person) return <LoadingState label="Opening person…" />

  const open = commitments.filter((row) => row.status === 'open')
  const contactRows = [
    {
      icon: EnvelopeSimple,
      value: person.email,
      href: person.email ? `mailto:${person.email}` : null,
    },
    { icon: Phone, value: person.phone, href: person.phone ? `tel:${person.phone}` : null },
    {
      icon: LinkedinLogo,
      value: person.linkedInUrl ? 'LinkedIn profile' : null,
      href: person.linkedInUrl,
      external: true,
    },
  ].filter((row) => row.value)

  return (
    <div className="mx-auto w-full max-w-3xl">
      <button
        type="button"
        onClick={() => navigate('/people')}
        className="mb-2 inline-flex items-center gap-1 text-small text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={13} weight="bold" />
        Directory
      </button>

      <div className="mb-2 flex items-start gap-3">
        <Avatar name={person.fullName} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-heading-1 text-ink">{person.fullName}</h1>
          <p className="mt-0.5 text-body text-ink-muted">
            {[person.role, person.organisation].filter(Boolean).join(' · ') || 'No role recorded'}
          </p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <Button size="sm" variant="outline" onClick={() => setEditOpen(true)}>
          <NotePencil size={13} />
          Edit
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setMergeOpen(true)}>
          <UsersThree size={13} />
          Merge duplicate
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)}>
          <Trash size={13} />
          Delete
        </Button>
      </div>

      {contactRows.length > 0 ? (
        <Card className="mb-4">
          <SectionHeader label="Contact" />
          <ul className="flex flex-col gap-1.5">
            {contactRows.map((row) => {
              const Icon = row.icon
              return (
                <li key={`${row.icon}-${row.value}`} className="flex items-center gap-2 text-small">
                  <Icon size={14} className="shrink-0 text-ink-subtle" />
                  {row.href ? (
                    <a
                      href={row.href}
                      {...(row.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                      className="truncate text-primary hover:underline"
                    >
                      {row.value}
                    </a>
                  ) : (
                    <span className="truncate text-ink">{row.value}</span>
                  )}
                </li>
              )
            })}
          </ul>
        </Card>
      ) : null}

      <section className="mb-4">
        <SectionHeader label={`Threads · ${threads.length}`} />
        {threads.length === 0 ? (
          <EmptyState
            title="Not linked to a thread yet"
            description="Link this person to a thread so their conversations and commitments stay together."
            className="py-8"
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {threads.map((thread) => (
              <li key={thread.id}>
                <Link
                  to={`/threads/${thread.id}`}
                  className="flex items-center gap-2.5 rounded-md border border-line bg-card p-3 transition-shadow hover:shadow-md"
                >
                  <AttentionScoreBadge score={thread.attentionScore ?? 0} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-medium text-ink">{thread.title}</p>
                    <p className="truncate text-small text-ink-muted">
                      {relativeTime(thread.lastInteractionAt)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {open.length > 0 ? (
        <section className="mb-4">
          <SectionHeader label={`Open commitments · ${open.length}`} />
          <Card className="p-1">
            {open.map((commitment) => (
              <CommitmentRow key={commitment.id} commitment={commitment} showThread={false} />
            ))}
          </Card>
        </section>
      ) : null}

      {person.notes ? (
        <Card>
          <SectionHeader label="Personal notes" />
          <p className="whitespace-pre-line text-small text-ink">{person.notes}</p>
        </Card>
      ) : null}

      <PersonDialog open={editOpen} onOpenChange={setEditOpen} person={person} />
      <MergeDialog
        open={mergeOpen}
        onOpenChange={setMergeOpen}
        person={person}
        onMerged={(id) => selectPerson(id)}
      />

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent aria-describedby={undefined} showHandle={false}>
          <DialogHeader>
            <DialogTitle>Delete {person.fullName}?</DialogTitle>
            <DialogDescription>
              This removes them from your directory. Threads and captures they are linked to are kept.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                await deletePerson(person.id)
                pushToast('Person removed.', 'success')
                navigate('/people')
              }}
            >
              Delete person
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
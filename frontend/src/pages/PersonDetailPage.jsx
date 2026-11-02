import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Briefcase,
  Buildings,
  Check,
  Clock,
  CopySimple,
  EnvelopeSimple,
  LinkedinLogo,
  NotePencil,
  Phone,
  Trash,
  UsersThree,
} from '@/components/icons'
import { CommitmentRow } from '@/components/commitment/CommitmentRow'
import { PageContainer } from '@/components/layout/PageHeader'
import { MergeDialog } from '@/components/person/MergeDialog'
import { PersonDialog } from '@/components/person/PersonDialog'
import { AttentionScoreBadge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { EmptyState, LoadingState } from '@/components/ui/Feedback'
import { relativeTime } from '@/lib/date'
import { usePeopleStore, useUiStore } from '@/store'

/**
 * Person profile (Feature 3).
 * Streamlined, compact hero card with integrated back navigation,
 * inline contact details (including email with copy action), and clean two-column layout.
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
  const [copiedEmail, setCopiedEmail] = useState(false)

  useEffect(() => {
    selectPerson(personId)
  }, [personId, selectPerson])

  if (!person) return <LoadingState label="Opening profile…" />

  const openCommitments = commitments.filter((row) => row.status === 'open')
  const completedCommitments = commitments.filter((row) => row.status === 'completed')

  const copyEmail = async (email) => {
    try {
      await navigator.clipboard.writeText(email)
      setCopiedEmail(true)
      pushToast('Email copied to clipboard', 'success')
      setTimeout(() => setCopiedEmail(false), 2000)
    } catch {
      pushToast('Could not copy email', 'danger')
    }
  }

  return (
    <PageContainer>
      {/* Streamlined Hero Header Card with Integrated Back Button */}
      <div className="mb-5 rounded-2xl border border-line/80 bg-card p-4 sm:p-5 shadow-xs">
        {/* Top Bar: Back Button on Left, Actions on Right */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => navigate('/people')}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-tiny font-medium text-ink-muted transition-colors hover:bg-overlay hover:text-ink cursor-pointer"
          >
            <ArrowLeft size={13} weight="bold" />
            <span>Directory</span>
          </button>

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditOpen(true)}
              className="h-8 gap-1.5 px-2.5 text-tiny font-medium"
            >
              <NotePencil size={13} />
              <span>Edit details</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setMergeOpen(true)}
              className="h-8 gap-1.5 px-2.5 text-tiny font-medium"
            >
              <UsersThree size={13} />
              <span>Merge</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2 text-tiny font-medium text-danger hover:bg-danger/10 hover:text-danger"
              onClick={() => setConfirmDelete(true)}
              title="Delete person"
            >
              <Trash size={13} />
            </Button>
          </div>
        </div>

        {/* Profile Details Block */}
        <div className="flex items-start gap-4">
          <Avatar
            name={person.fullName}
            size="lg"
            className="size-13 sm:size-14 text-heading-3 ring-2 ring-primary/20 shrink-0"
          />

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-heading-2 font-bold text-ink sm:text-heading-1">
              {person.fullName}
            </h1>

            {/* Role & Organisation */}
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-ink-muted">
              {person.role ? (
                <span className="inline-flex items-center gap-1 font-medium text-ink">
                  <Briefcase size={13} className="text-ink-subtle" />
                  {person.role}
                </span>
              ) : null}
              {person.role && person.organisation ? <span className="text-line">·</span> : null}
              {person.organisation ? (
                <span className="inline-flex items-center gap-1">
                  <Buildings size={13} className="text-ink-subtle" />
                  {person.organisation}
                </span>
              ) : null}
            </div>

            {/* Inline Contact Strip: Email, Phone, LinkedIn */}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-small">
              {person.email ? (
                <div className="inline-flex items-center gap-1.5">
                  <EnvelopeSimple size={13} className="text-primary shrink-0" />
                  <a
                    href={`mailto:${person.email}`}
                    className="font-medium text-ink hover:text-primary hover:underline"
                  >
                    {person.email}
                  </a>
                  <button
                    type="button"
                    onClick={() => copyEmail(person.email)}
                    title="Copy email"
                    className="inline-flex size-5 items-center justify-center rounded text-ink-subtle hover:bg-overlay hover:text-ink transition-colors"
                  >
                    {copiedEmail ? (
                      <Check size={11} className="text-emerald-500" />
                    ) : (
                      <CopySimple size={11} />
                    )}
                  </button>
                </div>
              ) : null}

              {person.phone ? (
                <div className="inline-flex items-center gap-1.5">
                  <Phone size={13} className="text-ink-subtle shrink-0" />
                  <a
                    href={`tel:${person.phone}`}
                    className="font-medium text-ink hover:text-primary hover:underline"
                  >
                    {person.phone}
                  </a>
                </div>
              ) : null}

              {person.linkedInUrl ? (
                <div className="inline-flex items-center gap-1.5">
                  <LinkedinLogo size={13} className="text-[#0077b5] shrink-0" />
                  <a
                    href={person.linkedInUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    LinkedIn Profile
                  </a>
                </div>
              ) : null}

              {person.lastInteractionAt ? (
                <span className="inline-flex items-center gap-1 text-tiny text-ink-subtle ml-auto">
                  <Clock size={11} />
                  Active {relativeTime(person.lastInteractionAt)}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Compact Quick Metrics Bar */}
        <div className="mt-4.5 grid grid-cols-2 gap-3 border-t border-line/70 pt-3.5 sm:grid-cols-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-ink-subtle uppercase tracking-wider">
              Threads
            </span>
            <span className="mt-0.5 text-heading-3 font-bold text-ink">{threads.length}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-ink-subtle uppercase tracking-wider">
              Open Promises
            </span>
            <span className="mt-0.5 text-heading-3 font-bold text-primary">
              {openCommitments.length}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-ink-subtle uppercase tracking-wider">
              Completed
            </span>
            <span className="mt-0.5 text-heading-3 font-bold text-emerald-600">
              {completedCommitments.length}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold text-ink-subtle uppercase tracking-wider">
              Relationship Status
            </span>
            <span className="mt-0.5 text-small font-medium text-ink">Active relationship</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Responsive Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
        {/* Left Column: Personal Notes */}
        <div className="flex flex-col gap-6 lg:col-span-5 xl:col-span-4">
          <Card className="rounded-2xl border-line/80 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-line/60">
              <h2 className="text-tiny font-semibold tracking-wider text-ink-subtle uppercase">
                Personal Notes
              </h2>
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="text-tiny font-semibold text-primary hover:underline"
              >
                Edit
              </button>
            </div>
            <div className="pt-3">
              {person.notes ? (
                <div className="rounded-xl bg-overlay/60 p-3.5 border border-line/60">
                  <p className="whitespace-pre-line text-small leading-relaxed text-ink">
                    {person.notes}
                  </p>
                </div>
              ) : (
                <p className="py-4 text-center text-small text-ink-subtle">
                  No personal notes yet. Add details about preferences, quirks, or background.
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Associated Threads & Commitments */}
        <div className="flex flex-col gap-6 lg:col-span-7 xl:col-span-8">
          {/* Associated Threads */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-heading-3 font-semibold text-ink">
                Threads <span className="ml-1 text-ink-muted font-normal">({threads.length})</span>
              </h2>
            </div>

            {threads.length === 0 ? (
              <EmptyState
                title="No threads associated yet"
                description="Link this person when creating a thread, or add them from within a thread's People tab."
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {threads.map((thread) => (
                  <Link
                    key={thread.id}
                    to={`/threads/${thread.id}`}
                    className="group flex flex-col justify-between rounded-2xl border border-line/80 bg-card p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate text-body-medium font-semibold text-ink group-hover:text-primary transition-colors">
                          {thread.title}
                        </h3>
                        <AttentionScoreBadge score={thread.attentionScore ?? 0} />
                      </div>
                      <p className="mt-1 line-clamp-2 text-tiny text-ink-muted">
                        {thread.description || 'Ongoing relationship thread'}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-line/50 pt-2.5 text-tiny text-ink-subtle">
                      <span>Active {relativeTime(thread.lastInteractionAt)}</span>
                      {thread.openCommitmentCount > 0 ? (
                        <span className="font-semibold text-primary">
                          {thread.openCommitmentCount} open
                        </span>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Open Commitments */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-heading-3 font-semibold text-ink">
                Open Commitments{' '}
                <span className="ml-1 text-ink-muted font-normal">({openCommitments.length})</span>
              </h2>
            </div>

            {openCommitments.length === 0 ? (
              <div className="flex items-center justify-center rounded-2xl border border-line/60 bg-card/60 p-8 text-center shadow-xs">
                <p className="text-small text-ink-muted">
                  No open commitments with {person.fullName}. All caught up!
                </p>
              </div>
            ) : (
              <Card className="rounded-2xl border-line/80 p-2 divide-y divide-line/60 shadow-xs">
                {openCommitments.map((commitment) => (
                  <CommitmentRow key={commitment.id} commitment={commitment} showThread={true} />
                ))}
              </Card>
            )}
          </section>
        </div>
      </div>

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
          </DialogHeader>
          <p className="text-small text-ink-muted">
            This will permanently remove them from your directory. Threads and historical captures linked to them will remain intact.
          </p>
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
    </PageContainer>
  )
}

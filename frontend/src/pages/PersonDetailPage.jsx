import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Briefcase,
  Buildings,
  ChatCircleDots,
  Check,
  CheckSquare,
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
import { EmptyState, Skeleton } from '@/components/ui/Feedback'
import { StaggerGroup, StaggerItem } from '@/components/ui'
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
  const [loadedId, setLoadedId] = useState(null)

  useEffect(() => {
    let active = true
    Promise.resolve(selectPerson(personId)).finally(() => {
      if (active) setLoadedId(personId)
    })
    return () => {
      active = false
    }
  }, [personId, selectPerson])

  if (loadedId !== personId) return <PersonDetailSkeleton />

  if (!person) {
    return (
      <PageContainer>
        <EmptyState
          icon={<UsersThree size={24} weight="duotone" />}
          title="Person not found"
          description="This profile may have been removed or merged into another contact."
          action={
            <Button onClick={() => navigate('/people')}>
              <ArrowLeft size={14} weight="bold" />
              Back to directory
            </Button>
          }
        />
      </PageContainer>
    )
  }

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
      {/* Top row: hero + personal notes */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        {/* Hero: identity, quick actions, and contact details */}
        <div className="tw-rise w-full lg:w-2/3 lg:shrink-0 xl:w-[56rem]">
          <div className="max-w-4xl rounded-2xl border border-line/80 bg-card p-4 shadow-xs">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-start gap-3.5">
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
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-ink-muted">
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

                  {/* Inline contact strip: email, phone, LinkedIn */}
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-small">
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
                          LinkedIn
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

              {/* Actions + quick metrics */}
              <div className="flex shrink-0 flex-col gap-2.5 sm:items-end">
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditOpen(true)}
                    className="h-8 gap-1.5 px-2.5 text-tiny font-medium"
                  >
                    <NotePencil size={13} />
                    <span className="hidden sm:inline">Edit details</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setMergeOpen(true)}
                    className="h-8 gap-1.5 px-2.5 text-tiny font-medium"
                    title="Merge with another person"
                  >
                    <UsersThree size={13} />
                    <span className="hidden sm:inline">Merge</span>
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

                <div className="flex flex-col gap-1 sm:items-end">
                  <span className="flex items-baseline gap-1.5 text-tiny">
                    <span className="font-semibold text-ink-subtle uppercase tracking-wider">
                      Commitments
                    </span>
                    <span className="font-bold text-emerald-600">
                      {completedCommitments.length} completed
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Personal notes (right) */}
        <div className="tw-rise w-full lg:flex-1" style={{ animationDelay: '70ms' }}>
          <Card className="rounded-2xl border-line/80 p-5 shadow-xs">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <NotePencil size={15} weight="bold" />
                </span>
                <h2 className="text-heading-3 font-semibold tracking-tight text-ink">Personal notes</h2>
              </div>
              <button
                type="button"
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-line/80 bg-surface/80 px-2.5 py-1 text-tiny font-medium text-ink-muted transition-all duration-150 hover:border-primary/40 hover:bg-card hover:text-primary hover:shadow-xs active:scale-95"
              >
                <NotePencil size={11} weight="bold" />
                <span>Edit</span>
              </button>
            </div>

            {person.notes ? (
              <div className="rounded-xl border border-line/60 bg-overlay/40 p-3.5">
                <p className="whitespace-pre-line text-small leading-relaxed text-ink">{person.notes}</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-card/50 px-4 py-7 text-center">
                <span className="flex size-9 items-center justify-center rounded-full bg-overlay text-ink-subtle">
                  <NotePencil size={16} />
                </span>
                <p className="text-small font-medium text-ink">No notes yet</p>
                <p className="max-w-[15rem] text-tiny text-ink-subtle">
                  Capture preferences, quirks, or background worth remembering.
                </p>
                <button
                  type="button"
                  onClick={() => setEditOpen(true)}
                  className="mt-1 inline-flex items-center gap-1.5 text-tiny font-semibold text-primary hover:underline"
                >
                  <NotePencil size={11} weight="bold" />
                  Add a note
                </button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Below: threads + commitments */}
      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        {/* Associated Threads */}
        <section className="tw-rise" style={{ animationDelay: '120ms' }}>
          <div className="mb-3 flex items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ChatCircleDots size={14} weight="bold" />
            </span>
            <h2 className="text-heading-3 font-semibold tracking-tight text-ink">Threads</h2>
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary/10 text-tiny font-bold text-primary">
              {threads.length}
            </span>
          </div>

          {threads.length === 0 ? (
            <EmptyState
              icon={<ChatCircleDots size={22} weight="duotone" />}
              title="No threads yet"
              description="Link this person to a thread to start tracking the relationship here."
            />
          ) : (
            <StaggerGroup as="ul" className="flex flex-col gap-3">
              {threads.map((thread) => (
                <StaggerItem as="li" key={thread.id}>
                  <Link
                    to={`/threads/${thread.id}`}
                    className="group flex h-full flex-col justify-between rounded-2xl border border-line/80 bg-card p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="truncate text-body-medium font-semibold text-ink transition-colors group-hover:text-primary">
                          {thread.title}
                        </h3>
                        <AttentionScoreBadge score={thread.attentionScore ?? 0} />
                      </div>
                      <p className="mt-1 line-clamp-2 text-tiny text-ink-muted">
                        {thread.description || 'Ongoing relationship thread'}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-line/50 pt-2.5">
                      <span className="inline-flex items-center gap-1 rounded-md bg-overlay/70 px-1.5 py-0.5 text-tiny font-medium text-ink-muted">
                        <Clock size={11} weight="bold" className="text-ink-subtle" />
                        Active {relativeTime(thread.lastInteractionAt)}
                      </span>
                      {thread.openCommitmentCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-tiny font-semibold text-primary">
                          <CheckSquare size={11} weight="bold" />
                          {thread.openCommitmentCount} open
                        </span>
                      ) : null}
                    </div>
                  </Link>
                </StaggerItem>
              ))}
            </StaggerGroup>
          )}
        </section>

        {/* Open Commitments */}
        <section className="tw-rise" style={{ animationDelay: '160ms' }}>
          <div className="mb-3 flex items-center gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
              <CheckSquare size={14} weight="bold" />
            </span>
            <h2 className="text-heading-3 font-semibold tracking-tight text-ink">Open commitments</h2>
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-emerald-500/10 text-tiny font-bold text-emerald-600">
              {openCommitments.length}
            </span>
            <span className="text-tiny font-medium text-ink-subtle">
              {completedCommitments.length} completed
            </span>
          </div>

          {openCommitments.length === 0 ? (
            <EmptyState
              icon={<Check size={22} weight="bold" />}
              title="All caught up"
              description={`No open commitments with ${person.fullName}.`}
            />
          ) : (
            <StaggerGroup
              as="div"
              className="divide-y divide-line/60 overflow-hidden rounded-2xl border border-line/80 bg-card shadow-xs"
            >
              {openCommitments.map((commitment) => (
                <StaggerItem key={commitment.id}>
                  <CommitmentRow commitment={commitment} showThread={true} />
                </StaggerItem>
              ))}
            </StaggerGroup>
          )}
        </section>
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

function PersonDetailSkeleton() {
  return (
    <PageContainer>
      <div className="flex flex-col gap-6" role="status" aria-live="polite" aria-busy="true">
        <span className="sr-only">Loading profile</span>

        {/* Top row: hero + notes */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="w-full lg:w-2/3 lg:shrink-0 xl:w-[56rem]">
            <div className="max-w-4xl rounded-2xl border border-line/80 bg-card p-4 shadow-xs">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3.5">
                  <Skeleton className="size-13 shrink-0 rounded-full sm:size-14" />
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-6 w-52" />
                    <Skeleton className="mt-2 h-3.5 w-40" />
                    <div className="mt-2 flex flex-wrap gap-3">
                      <Skeleton className="h-4 w-44" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-2.5 sm:items-end">
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="h-8 w-24 rounded-lg" />
                    <Skeleton className="h-8 w-16 rounded-lg" />
                  </div>
                  <div className="flex flex-col gap-1.5 sm:items-end">
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full lg:flex-1">
            <div className="rounded-2xl border border-line/80 bg-card p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <div className="mt-4 flex flex-col gap-2.5">
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-11/12" />
                <Skeleton className="h-3.5 w-4/5" />
              </div>
            </div>
          </div>
        </div>

        {/* Below: threads + commitments */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
          <div>
            <Skeleton className="mb-3 h-5 w-24" />
            <div className="flex flex-col gap-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-line/80 bg-card p-4 shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <Skeleton className="h-4 w-3/5" />
                    <Skeleton className="size-7 shrink-0 rounded-full" />
                  </div>
                  <Skeleton className="mt-2 h-3 w-4/5" />
                  <div className="mt-4 flex items-center justify-between border-t border-line/50 pt-2.5">
                    <Skeleton className="h-5 w-24 rounded-md" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Skeleton className="mb-3 h-5 w-40" />
            <div className="overflow-hidden rounded-2xl border border-line/80 bg-card shadow-xs">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 border-b border-line/60 px-4 py-3.5 last:border-b-0">
                  <Skeleton className="mt-0.5 size-6 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="mt-2 h-3 w-40" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
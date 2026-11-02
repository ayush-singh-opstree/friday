import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Archive,
  ArrowCounterClockwise,
  CaretDown,
  Clock,
  NotePencil,
  PushPin,
  Trash,
  Users,
} from '@/components/icons'
import { SNOOZE_PRESETS } from '@/config/constants'
import { useThreadStore, useUiStore } from '@/store'
import { AttentionScoreBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { AvatarGroup } from '@/components/ui/Avatar'
import { ThreadPeopleDialog } from '@/components/thread/ThreadPeopleDialog'
import { ColdChip } from '@/components/ui/Chip'
import { Spinner } from '@/components/ui/Feedback'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Controls'
import { daysSince, relativeTime } from '@/lib/date'
import { cn } from '@/lib/utils'

/**
 * Thread detail header (Feature 2):
 * Compact, streamlined header with title, people, attention score, and actions.
 */
export function ThreadHeader({ thread, tabBar }) {
  const navigate = useNavigate()
  const updateThread = useThreadStore((state) => state.updateThread)
  const togglePin = useThreadStore((state) => state.togglePin)
  const snoozeThread = useThreadStore((state) => state.snoozeThread)
  const archiveThread = useThreadStore((state) => state.archiveThread)
  const restoreThread = useThreadStore((state) => state.restoreThread)
  const deleteThread = useThreadStore((state) => state.deleteThread)
  const pushToast = useUiStore((state) => state.pushToast)

  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(thread?.title ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [peopleOpen, setPeopleOpen] = useState(false)
  const [pinBusy, setPinBusy] = useState(false)
  const [snoozeBusy, setSnoozeBusy] = useState(false)

  if (!thread) return null

  const archived = thread.status === 'archived'

  const startEditing = () => {
    setTitleDraft(thread.title)
    setEditingTitle(true)
  }

  const saveTitle = async () => {
    const next = titleDraft.trim()
    setEditingTitle(false)
    if (!next || next === thread.title) {
      setTitleDraft(thread.title)
      return
    }
    await updateThread(thread.id, { title: next })
    pushToast('Thread renamed.', 'success')
  }

  const handleTogglePin = async () => {
    if (pinBusy) return
    setPinBusy(true)
    try {
      await togglePin(thread.id, !thread.isPinned)
    } catch {
      pushToast('Could not update pin. Try again.', 'danger')
    } finally {
      setPinBusy(false)
    }
  }

  const handleSnooze = async (days) => {
    if (snoozeBusy) return
    setSnoozeBusy(true)
    try {
      await snoozeThread(thread.id, days)
      pushToast(`Snoozed for ${days} day${days === 1 ? '' : 's'}.`, 'info')
    } catch {
      pushToast('Could not snooze this thread.', 'danger')
    } finally {
      setSnoozeBusy(false)
    }
  }

  return (
    <div className="tw-rise mb-5 rounded-2xl border border-line/80 bg-card p-4 shadow-sm sm:p-5">
      {/* Title + actions: title now reclaims the space freed up in the navbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Title */}
        <div className="min-w-0 flex-1">
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <Input
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
                onBlur={saveTitle}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') saveTitle()
                  if (event.key === 'Escape') {
                    setTitleDraft(thread.title)
                    setEditingTitle(false)
                  }
                }}
                maxLength={100}
                autoFocus
                aria-label="Thread agenda"
                className="h-9 text-heading-2 font-bold"
              />
              <Button size="sm" onClick={saveTitle}>
                Save
              </Button>
            </div>
          ) : (
            <div className="group flex items-center gap-2">
              <h1
                role="button"
                tabIndex={0}
                onClick={startEditing}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') startEditing()
                }}
                className="cursor-text truncate text-[25px] font-bold leading-tight tracking-[-0.03em] text-ink transition-colors hover:text-primary sm:text-[30px]"
                title="Click to rename"
              >
                {thread.title}
              </h1>
              <button
                type="button"
                onClick={startEditing}
                className="opacity-0 group-hover:opacity-100 transition-opacity rounded-md p-1 text-ink-subtle hover:text-ink cursor-pointer"
                title="Rename thread"
              >
                <NotePencil size={15} />
              </button>
            </div>
          )}
        </div>

        {/* Action Controls & Score */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTogglePin}
            disabled={pinBusy}
            aria-pressed={thread.isPinned}
            title={thread.isPinned ? 'Unpin thread' : 'Pin thread'}
            className={cn(
              'h-8 gap-1.5 px-2.5 text-tiny font-medium transition-all',
              thread.isPinned
                ? 'border-accent/40 bg-accent/10 text-accent hover:border-accent/50 hover:bg-accent/15 hover:text-accent'
                : 'text-ink-muted hover:border-accent/40 hover:text-accent',
            )}
          >
            {pinBusy ? (
              <Spinner className="size-3.5" />
            ) : (
              <PushPin size={13} weight={thread.isPinned ? 'fill' : 'regular'} />
            )}
            <span>{thread.isPinned ? 'Pinned' : 'Pin'}</span>
          </Button>

          {/* Snooze Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={snoozeBusy}
                title="Snooze thread"
                className="h-8 gap-1.5 px-2.5 text-tiny font-medium transition-all hover:border-primary/40 hover:text-primary"
              >
                {snoozeBusy ? <Spinner className="size-3.5" /> : <Clock size={13} />}
                <span>Snooze</span>
                <CaretDown size={11} className="text-ink-subtle" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuLabel>Snooze this thread</DropdownMenuLabel>
              <p className="px-2.5 pb-1.5 text-[11px] leading-snug text-ink-subtle">
                Hides it from Today until the snooze ends.
              </p>
              {SNOOZE_PRESETS.map((preset) => (
                <DropdownMenuItem
                  key={preset.value}
                  disabled={snoozeBusy}
                  onSelect={() => handleSnooze(Number(preset.value))}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Clock size={13} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-small font-medium text-ink">{preset.label}</span>
                    <span className="text-[11px] text-ink-subtle">
                      {preset.value} {preset.value === 1 ? 'day' : 'days'}
                    </span>
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              if (archived) await restoreThread(thread.id)
              else await archiveThread(thread.id)
              pushToast(archived ? 'Thread restored.' : 'Thread archived.', 'success')
              navigate('/threads')
            }}
            className="h-8 gap-1 px-2.5 text-tiny font-medium"
          >
            {archived ? <ArrowCounterClockwise size={13} /> : <Archive size={13} />}
            <span>{archived ? 'Restore' : 'Archive'}</span>
          </Button>

          <div className="ml-0.5 border-l border-line/70 pl-1.5">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1 px-2 text-tiny font-medium text-danger hover:bg-danger/10 hover:text-danger"
              onClick={() => setConfirmDelete(true)}
              title="Delete thread"
            >
              <Trash size={13} />
            </Button>
          </div>

          <div className="ml-1 border-l border-line/70 pl-1.5">
            <AttentionScoreBadge score={thread.attentionScore ?? 0} className="size-8 text-tiny font-bold" />
          </div>
        </div>
      </div>

      {/* Metadata + section tabs (bottom-right) */}
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-tiny text-ink-muted">
            <button
              type="button"
              onClick={() => setPeopleOpen(true)}
              title="Manage people"
              className="inline-flex items-center gap-1.5 rounded-full border border-line/70 bg-surface/60 px-2 py-1 font-medium text-ink-muted transition-colors hover:border-primary/40 hover:text-primary cursor-pointer"
            >
              {thread.people?.length ? (
                <>
                  <AvatarGroup people={thread.people} size="xs" />
                  <span className="max-w-[240px] truncate text-ink">
                    {thread.people.map((p) => p.fullName).join(', ')}
                  </span>
                </>
              ) : (
                <>
                  <Users size={12} />
                  <span>Add people</span>
                </>
              )}
            </button>
            <span className="flex items-center gap-1 text-ink-subtle">
              <Clock size={11} />
              Active {relativeTime(thread.lastInteractionAt)}
            </span>
            {thread.isGoingCold ? <ColdChip days={daysSince(thread.lastInteractionAt)} /> : null}
            {archived ? (
              <span className="rounded-full bg-overlay px-2 py-0.5 font-medium text-ink-subtle">
                Archived
              </span>
            ) : null}
          </div>

          {thread.description ? (
            <p className="mt-2 max-w-4xl text-small text-ink-muted leading-relaxed line-clamp-2">
              {thread.description}
            </p>
          ) : null}
        </div>

        {tabBar ? <div className="w-full shrink-0 sm:w-auto sm:self-end">{tabBar}</div> : null}
      </div>

      <ThreadPeopleDialog open={peopleOpen} onOpenChange={setPeopleOpen} thread={thread} />

      {/* Delete Confirmation Modal */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent aria-describedby={undefined} showHandle={false}>
          <DialogHeader>
            <DialogTitle>Delete thread?</DialogTitle>
          </DialogHeader>
          <p className="text-small text-ink-muted">
            Delete &ldquo;{thread.title}&rdquo; and all of its associated captures and timeline history? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                await deleteThread(thread.id)
                pushToast('Thread deleted.', 'success')
                navigate('/threads')
              }}
            >
              Delete thread
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

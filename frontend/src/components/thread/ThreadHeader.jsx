import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Archive,
  ArrowCounterClockwise,
  CaretDown,
  Clock,
  NotePencil,
  PushPin,
  Trash,
} from '@/components/icons'
import { SNOOZE_PRESETS } from '@/config/constants'
import { useThreadStore, useUiStore } from '@/store'
import { AttentionScoreBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { AvatarGroup } from '@/components/ui/Avatar'
import { ColdChip } from '@/components/ui/Chip'
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

/**
 * Thread detail header (Feature 2):
 * Compact, streamlined header with title, people, attention score, and actions.
 */
export function ThreadHeader({ thread }) {
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

  return (
    <div className="mb-4 rounded-2xl border border-line/80 bg-card p-4 sm:p-5 shadow-xs">
      {/* Top Navigation & Actions Bar */}
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => navigate('/threads')}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-tiny font-medium text-ink-muted transition-colors hover:bg-overlay hover:text-ink cursor-pointer"
        >
          <ArrowLeft size={13} weight="bold" />
          <span>All threads</span>
        </button>

        {/* Action Controls & Score */}
        <div className="flex items-center gap-1.5">
          <Button
            variant={thread.isPinned ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => togglePin(thread.id, !thread.isPinned)}
            className="h-8 gap-1.5 px-2.5 text-tiny font-medium"
          >
            <PushPin size={13} weight={thread.isPinned ? 'fill' : 'regular'} />
            <span>{thread.isPinned ? 'Pinned' : 'Pin'}</span>
          </Button>

          {/* Snooze Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1 px-2.5 text-tiny font-medium">
                <Clock size={13} />
                <span>Snooze</span>
                <CaretDown size={11} className="text-ink-subtle" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Snooze this thread</DropdownMenuLabel>
              {SNOOZE_PRESETS.map((preset) => (
                <DropdownMenuItem
                  key={preset.value}
                  onSelect={async () => {
                    const days = Number(preset.value)
                    await snoozeThread(thread.id, days)
                    pushToast(`Snoozed for ${days} day${days === 1 ? '' : 's'}.`, 'info')
                  }}
                >
                  {preset.label}
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

          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-tiny font-medium text-danger hover:bg-danger/10 hover:text-danger"
            onClick={() => setConfirmDelete(true)}
            title="Delete thread"
          >
            <Trash size={13} />
          </Button>

          <div className="ml-1 pl-1.5 border-l border-line/70">
            <AttentionScoreBadge score={thread.attentionScore ?? 0} className="size-8 text-tiny font-bold" />
          </div>
        </div>
      </div>

      {/* Title & Metadata */}
      <div>
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
              className="cursor-text truncate text-heading-2 font-bold text-ink hover:text-primary transition-colors sm:text-heading-1"
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

        {/* Subtitle Details: People & Activity */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-tiny text-ink-muted">
          {thread.people?.length ? (
            <div className="flex items-center gap-1.5">
              <AvatarGroup people={thread.people} size="xs" />
              <span className="font-medium text-ink">
                {thread.people.map((p) => p.fullName).join(', ')}
              </span>
            </div>
          ) : null}
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

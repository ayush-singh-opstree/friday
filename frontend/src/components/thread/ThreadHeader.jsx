import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Archive, ArrowCounterClockwise, PushPin, Trash } from '@phosphor-icons/react'
import { SNOOZE_PRESETS } from '@/config/constants'
import { useThreadStore, useUiStore } from '@/store'
import { AttentionScoreBadge } from '@/components/ui/Badge'
import { Button, IconButton } from '@/components/ui/Button'
import { AvatarGroup } from '@/components/ui/Avatar'
import { ColdChip } from '@/components/ui/Chip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { Input } from '@/components/ui/Controls'
import { daysSince, relativeTime } from '@/lib/date'

/**
 * Thread detail header (Feature 2 -> Thread Detail, items 1 + 7):
 * editable title, people chips, attention badge, pin / snooze / archive / delete.
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
    <div className="mb-4">
      <button
        type="button"
        onClick={() => navigate('/threads')}
        className="mb-2 inline-flex items-center gap-1 text-small text-ink-muted hover:text-ink"
      >
        <ArrowLeft size={13} weight="bold" />
        All threads
      </button>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editingTitle ? (
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
              aria-label="Thread title"
              className="h-10 text-heading-2"
            />
          ) : (
            <h1
              role="button"
              tabIndex={0}
              onClick={startEditing}
              onKeyDown={(event) => {
                if (event.key === 'Enter') startEditing()
              }}
              className="cursor-text truncate text-heading-1 text-ink hover:text-primary"
              title="Click to rename"
            >
              {thread.title}
            </h1>
          )}

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-ink-muted">
            {thread.people?.length ? <AvatarGroup people={thread.people} size="xs" /> : null}
            <span>{relativeTime(thread.lastInteractionAt)}</span>
            {thread.isGoingCold ? <ColdChip days={daysSince(thread.lastInteractionAt)} /> : null}
            {archived ? <span className="text-tiny text-ink-subtle">· Archived</span> : null}
          </div>

          {thread.description ? (
            <p className="mt-1.5 text-body text-ink-muted">{thread.description}</p>
          ) : null}
        </div>

        <AttentionScoreBadge score={thread.attentionScore ?? 0} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <IconButton
          label={thread.isPinned ? 'Unpin thread' : 'Pin thread'}
          size="sm"
          variant={thread.isPinned ? 'secondary' : 'ghost'}
          onClick={() => togglePin(thread.id, !thread.isPinned)}
        >
          <PushPin size={14} weight={thread.isPinned ? 'fill' : 'regular'} />
        </IconButton>

        <label htmlFor="thread-snooze" className="sr-only">
          Snooze thread
        </label>
        <select
          id="thread-snooze"
          value=""
          onChange={async (event) => {
            const days = Number(event.target.value)
            if (!days) return
            await snoozeThread(thread.id, days)
            pushToast(`Snoozed for ${days} day${days === 1 ? '' : 's'}.`, 'info')
            event.target.value = ''
          }}
          className="h-8 rounded-sm border border-line bg-card px-2 text-small text-ink-muted hover:text-ink focus:border-primary focus:outline-none"
        >
          <option value="">Snooze…</option>
          {SNOOZE_PRESETS.map((preset) => (
            <option key={preset.value} value={preset.value}>
              {preset.label}
            </option>
          ))}
        </select>

        <Button
          variant="ghost"
          size="sm"
          onClick={async () => {
            if (archived) await restoreThread(thread.id)
            else await archiveThread(thread.id)
            pushToast(archived ? 'Thread restored.' : 'Thread archived.', 'success')
            navigate('/threads')
          }}
        >
          {archived ? <ArrowCounterClockwise size={14} /> : <Archive size={14} />}
          {archived ? 'Restore' : 'Archive'}
        </Button>

        <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
          <Trash size={14} />
          Delete
        </Button>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent aria-describedby={undefined} showHandle={false}>
          <DialogHeader>
            <DialogTitle>Delete thread?</DialogTitle>
            <DialogDescription>
              Delete “{thread.title}” and all of its content? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
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
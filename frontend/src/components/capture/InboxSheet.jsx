import { useEffect, useState } from 'react'
import { ArrowRight, Trash, Tray } from '@/components/icons'
import { relativeTime } from '@/lib/date'
import { useCaptureStore, useThreadStore, useUiStore } from '@/store'
import { Button } from '@/components/ui/Button'
import { CaptureTypeChip } from '@/components/ui/Chip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { StaggerGroup, StaggerItem } from '@/components/ui'
import { EmptyState, Skeleton } from '@/components/ui/Feedback'

export function InboxSheet({ open, onOpenChange }) {
  const inbox = useCaptureStore((state) => state.inbox)
  const status = useCaptureStore((state) => state.status)
  const fetchInbox = useCaptureStore((state) => state.fetchInbox)
  const assignCapture = useCaptureStore((state) => state.assignCapture)
  const deleteCapture = useCaptureStore((state) => state.deleteCapture)
  const threads = useThreadStore((state) => state.threads)
  const fetchThreads = useThreadStore((state) => state.fetchThreads)
  const pushToast = useUiStore((state) => state.pushToast)

  const [filingId, setFilingId] = useState(null)
  const [selectedThreads, setSelectedThreads] = useState({})

  useEffect(() => {
    if (open) {
      fetchInbox()
      if (threads.length === 0) {
        fetchThreads()
      }
    }
  }, [open, fetchInbox, fetchThreads, threads.length])

  const handleAssign = async (captureId) => {
    const threadId = selectedThreads[captureId]
    if (!threadId) {
      pushToast('Please select a thread to file into.', 'warning')
      return
    }
    const targetThread = threads.find((t) => t.id === threadId)
    setFilingId(captureId)
    try {
      await assignCapture(captureId, threadId)
      pushToast(`Capture filed into "${targetThread?.title ?? 'thread'}".`, 'success')
    } catch (err) {
      pushToast(err?.message ?? 'Failed to file capture.', 'danger')
    } finally {
      setFilingId(null)
    }
  }

  const handleDelete = async (captureId) => {
    try {
      await deleteCapture(captureId)
      pushToast('Capture removed from inbox.', 'info')
    } catch (err) {
      pushToast(err?.message ?? 'Failed to delete capture.', 'danger')
    }
  }

  const activeThreads = threads.filter((t) => t.status === 'active')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-5" aria-describedby={undefined}>
        <DialogHeader className="mb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
              <Tray size={18} weight="duotone" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-heading-3 font-semibold tracking-tight text-ink">
                  Inbox
                </DialogTitle>
                {inbox.length > 0 ? (
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {inbox.length}
                  </span>
                ) : null}
              </div>
              <p className="text-tiny text-ink-muted">
                {inbox.length === 0
                  ? 'No unfiled captures'
                  : `${inbox.length} unassigned capture${inbox.length === 1 ? '' : 's'} waiting to be filed`}
              </p>
            </div>
          </div>
        </DialogHeader>

        {status === 'loading' && inbox.length === 0 ? (
          <div className="flex flex-col gap-2" role="status" aria-live="polite" aria-busy="true">
            <span className="sr-only">Loading inbox</span>
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="rounded-lg border border-line/70 bg-card p-2.5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-3 w-10" />
                </div>
                <Skeleton className="mt-2 h-3 w-4/5" />
                <div className="mt-2 flex items-center gap-2">
                  <Skeleton className="h-7 flex-1 rounded-lg" />
                  <Skeleton className="h-7 w-14 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : inbox.length === 0 ? (
          <div className="py-8">
            <EmptyState
              icon={<Tray size={32} weight="duotone" className="text-primary" />}
              title="Your inbox is clear"
              description="Every note, commitment, decision, and question has been assigned to a thread."
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto pr-1 scroll-slim">
            <StaggerGroup as="ul" className="flex flex-col gap-2">
              {inbox.map((capture) => (
                <StaggerItem
                  as="li"
                  key={capture.id}
                  className="group relative flex flex-col gap-2 rounded-lg border border-line/70 bg-card p-2.5 transition-colors hover:border-line"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <CaptureTypeChip type={capture.type} />
                      <span className="text-tiny text-ink-subtle">
                        {relativeTime(capture.capturedAt || capture.createdAt)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(capture.id)}
                      className="rounded-md p-1 text-ink-subtle opacity-0 transition-all hover:bg-danger/10 hover:text-danger focus-visible:opacity-100 group-hover:opacity-100"
                      title="Delete capture"
                      aria-label="Delete capture"
                    >
                      <Trash size={14} />
                    </button>
                  </div>

                  <p className="text-small leading-relaxed text-ink whitespace-pre-wrap">
                    {capture.content}
                  </p>

                  <div className="flex items-center gap-2 border-t border-line/40 pt-2">
                    <select
                      value={selectedThreads[capture.id] || ''}
                      onChange={(e) =>
                        setSelectedThreads((prev) => ({
                          ...prev,
                          [capture.id]: e.target.value,
                        }))
                      }
                      className="tw-input h-8 text-tiny flex-1 rounded-lg bg-card"
                    >
                      <option value="">Assign to a thread...</option>
                      {activeThreads.map((thread) => (
                        <option key={thread.id} value={thread.id}>
                          {thread.title}
                        </option>
                      ))}
                    </select>

                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 gap-1 text-tiny px-2.5 shrink-0"
                      disabled={filingId === capture.id || !selectedThreads[capture.id]}
                      onClick={() => handleAssign(capture.id)}
                    >
                      <span>{filingId === capture.id ? 'Filing...' : 'File'}</span>
                      <ArrowRight size={12} weight="bold" />
                    </Button>
                  </div>
                </StaggerItem>
              ))}
            </StaggerGroup>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

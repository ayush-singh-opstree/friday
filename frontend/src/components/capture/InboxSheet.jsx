import { useEffect, useState } from 'react'
import { ArrowRight, Trash, Tray } from '@/components/icons'
import { relativeTime } from '@/lib/date'
import { useCaptureStore, useThreadStore, useUiStore } from '@/store'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/Feedback'

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
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-6" aria-describedby={undefined}>
        <DialogHeader className="mb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Tray size={18} weight="duotone" />
            </span>
            <div>
              <DialogTitle className="text-heading-3 font-semibold text-ink">Inbox</DialogTitle>
              <p className="text-tiny text-ink-muted">
                {inbox.length === 0
                  ? 'No unfiled captures'
                  : `${inbox.length} unassigned capture${inbox.length === 1 ? '' : 's'} waiting to be filed`}
              </p>
            </div>
          </div>
        </DialogHeader>

        {status === 'loading' && inbox.length === 0 ? (
          <div className="py-12 text-center text-small text-ink-muted">Loading inbox...</div>
        ) : inbox.length === 0 ? (
          <div className="py-8">
            <EmptyState
              icon={<Tray size={32} weight="duotone" className="text-primary" />}
              title="Your inbox is clear"
              description="Every note, commitment, decision, and question has been assigned to a thread."
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 scroll-slim">
            {inbox.map((capture) => {
              const typeTone =
                capture.type === 'commitment'
                  ? 'commitment'
                  : capture.type === 'decision'
                    ? 'decision'
                    : capture.type === 'question'
                      ? 'question'
                      : 'neutral'

              return (
                <div
                  key={capture.id}
                  className="group relative flex flex-col gap-2.5 rounded-xl border border-line/70 bg-surface/60 p-3.5 transition-all duration-150 hover:border-line hover:bg-card"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Chip tone={typeTone} className="capitalize">
                        {capture.type}
                      </Chip>
                      <span className="text-tiny text-ink-subtle">
                        {relativeTime(capture.capturedAt || capture.createdAt)}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(capture.id)}
                      className="text-ink-subtle hover:text-danger p-1 rounded-md transition-colors"
                      title="Delete capture"
                      aria-label="Delete capture"
                    >
                      <Trash size={14} />
                    </button>
                  </div>

                  <p className="text-small text-ink whitespace-pre-wrap leading-relaxed">
                    {capture.content}
                  </p>

                  <div className="mt-1 flex items-center gap-2 pt-2 border-t border-line/40">
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
                </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

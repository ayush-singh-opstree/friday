import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Snowflake, X } from '@phosphor-icons/react'
import {
  clearColdAlert,
  coldDismissalCount,
  dismissColdAlert,
  visibleColdThreads,
} from '@/lib/coldAlerts'
import { daysSince, relativeTime } from '@/lib/date'
import { useThreadStore, useUiStore } from '@/store'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/Card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'

/**
 * Going Cold section (Feature 10).
 *
 * Each card offers "Re-engage" (context prompt + capture) and "Dismiss"
 * (suppresses the alert for 7 days). Dismissing the same thread three times in a
 * row offers to archive it, exactly as the spec requires.
 */
export function GoingColdRail({ threads = [], onChanged }) {
  const [dismissed, setDismissed] = useState([])
  const [archivePrompt, setArchivePrompt] = useState(null)

  const visible = visibleColdThreads(threads).filter((thread) => !dismissed.includes(thread.id))
  if (visible.length === 0) return null

  const handleDismiss = (thread) => {
    const result = dismissColdAlert(thread.id)
    setDismissed((current) => [...current, thread.id])
    if (result.shouldOfferArchive) setArchivePrompt(thread)
  }

  return (
    <section aria-labelledby="cold-heading">
      <SectionHeader
        label="Going cold"
        action={
          <Link
            to="/threads?filter=goingCold"
            className="flex items-center gap-1 text-tiny font-medium text-primary"
          >
            View all <ArrowRight size={11} weight="bold" />
          </Link>
        }
      />

      <div className="snap-rail no-scrollbar -mx-4 px-4 pb-1">
        {visible.map((thread) => (
          <div key={thread.id} className="w-64 rounded-md border border-line bg-card p-3.5 shadow-sm">
            <div className="flex items-center gap-1.5">
              <Snowflake size={13} weight="bold" className="text-cold" />
              <span className="text-tiny font-semibold tracking-wide text-[#1565C0] uppercase">
                {daysSince(thread.lastInteractionAt)} days quiet
              </span>
            </div>

            <Link to={`/threads/${thread.id}`} className="mt-1.5 block">
              <p className="truncate text-body-medium text-ink hover:text-primary">{thread.title}</p>
            </Link>
            <p className="mt-0.5 line-clamp-2 text-small text-ink-muted">
              {thread.attentionReason || `Last contact ${relativeTime(thread.lastInteractionAt)}`}
            </p>

            <div className="mt-2.5 flex items-center gap-1">
              <ReengageButton thread={thread} onDone={onChanged} />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDismiss(thread)}
                title={`Dismiss for 7 days (dismissed ${coldDismissalCount(thread.id)}×)`}
              >
                <X size={13} />
                Dismiss
              </Button>
            </div>
          </div>
        ))}
      </div>

      <ArchivePromptDialog
        thread={archivePrompt}
        onOpenChange={(next) => {
          if (!next) setArchivePrompt(null)
        }}
        onChanged={onChanged}
      />
    </section>
  )
}

/** "Reach out to X — it's been Y days. Here's what you last discussed." */
function ReengageButton({ thread, onDone }) {
  const [open, setOpen] = useState(false)
  const openQuickCapture = useUiStore((state) => state.openQuickCapture)

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Re-engage
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle>Re-engage {thread.title}</DialogTitle>
            <DialogDescription>
              It&apos;s been {daysSince(thread.lastInteractionAt)} days. Here&apos;s where you left
              off:
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-md bg-overlay p-3">
            <p className="text-body text-ink">
              {thread.attentionReason || 'No recent captures recorded for this thread.'}
            </p>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Not now
            </Button>
            <Button
              onClick={() => {
                clearColdAlert(thread.id)
                setOpen(false)
                onDone?.()
                openQuickCapture(thread.id)
              }}
            >
              Log an outreach
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

/** Offered after three consecutive dismissals. */
function ArchivePromptDialog({ thread, onOpenChange, onChanged }) {
  const archiveThread = useThreadStore((state) => state.archiveThread)
  const pushToast = useUiStore((state) => state.pushToast)

  if (!thread) return null

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} showHandle={false}>
        <DialogHeader>
          <DialogTitle>Archive this thread?</DialogTitle>
          <DialogDescription>
            You&apos;ve dismissed “{thread.title}” three times without acting. Archiving keeps its
            history but removes it from your attention list.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Keep it
          </Button>
          <Button
            onClick={async () => {
              await archiveThread(thread.id)
              clearColdAlert(thread.id)
              pushToast('Thread archived.', 'success')
              onOpenChange(false)
              onChanged?.()
            }}
          >
            Archive thread
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
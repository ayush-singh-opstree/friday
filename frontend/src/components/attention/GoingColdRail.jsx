import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Snowflake, X } from '@/components/icons'
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
            className="group/btn inline-flex items-center gap-1.5 rounded-full border border-line/80 bg-surface/80 px-2.5 py-1 text-tiny font-medium text-ink-muted transition-all duration-150 hover:border-primary/40 hover:bg-card hover:text-primary hover:shadow-xs active:scale-95"
          >
            <span>View all</span>
            <ArrowRight size={11} weight="bold" className="transition-transform duration-150 group-hover/btn:translate-x-0.5" />
          </Link>
        }
      />

      <div className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scroll-padding-inline:1rem] [&>*]:flex-none [&>*]:snap-start">
        {visible.map((thread) => (
          <div
            key={thread.id}
            className="w-64 rounded-xl border border-cold/30 bg-card p-3.5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-1.5">
              <Snowflake size={13} weight="bold" className="text-cold" />
              <span className="text-tiny font-semibold tracking-wide text-cold uppercase">
                {daysSince(thread.lastInteractionAt)}d quiet
              </span>
            </div>

            <Link to={`/threads/${thread.id}`} className="mt-1.5 block">
              <p className="truncate text-body-medium font-semibold text-ink hover:text-primary transition-colors">
                {thread.title}
              </p>
            </Link>
            <p className="mt-0.5 line-clamp-2 text-small text-ink-muted">
              {thread.attentionReason || `Last contact ${relativeTime(thread.lastInteractionAt)}`}
            </p>

            <div className="mt-3 flex items-center gap-1">
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
              {daysSince(thread.lastInteractionAt)} days since last contact.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-xl bg-overlay p-4">
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
            You&apos;ve dismissed &ldquo;{thread.title}&rdquo; three times without acting.
            Archiving keeps its history but removes it from your attention list.
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

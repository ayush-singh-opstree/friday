import { useState } from 'react'
import { ArrowRight, Brain, Check, Trash, X } from '@/components/icons'
import { inferCaptureType, stripCommand } from '@/lib/patterns'
import { useCaptureStore, useThreadStore, useUiStore } from '@/store'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { cn, uid } from '@/lib/utils'

/**
 * Brain Dump (Feature 7).
 *
 * Rapid multi-line entry: one thought per line. On review each line becomes a
 * capture with an inferred type and a suggested thread, then the whole session
 * is filed in one batch.
 */
export function BrainDumpDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        {open ? <BrainDumpContent onOpenChange={onOpenChange} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function BrainDumpContent({ onOpenChange }) {
  const threads = useThreadStore((state) => state.threads)
  const createCapture = useCaptureStore((state) => state.createCapture)
  const pushToast = useUiStore((state) => state.pushToast)

  const [step, setStep] = useState('dump')
  const [text, setText] = useState('')
  const [entries, setEntries] = useState([])
  const [saving, setSaving] = useState(false)

  /** Cheap local matcher; /ai/classify supersedes this on the server. */
  const suggestThreadId = (content) => {
    const needle = content.toLowerCase()
    const scored = threads
      .filter((thread) => thread.status === 'active')
      .map((thread) => {
        const words = thread.title
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter((word) => word.length > 3)
        return { thread, score: words.filter((word) => needle.includes(word)).length }
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
    return scored[0]?.thread.id ?? null
  }

  const startReview = () => {
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    if (lines.length === 0) {
      pushToast('Type at least one line to dump.', 'warning')
      return
    }

    setEntries(
      lines.map((line) => ({
        id: uid('dump'),
        content: stripCommand(line),
        type: inferCaptureType(line),
        threadId: suggestThreadId(line),
        include: true,
      })),
    )
    setStep('review')
  }

  const fileAll = async () => {
    const included = entries.filter((entry) => entry.include && entry.content.trim())
    if (included.length === 0) {
      pushToast('Nothing selected to file.', 'warning')
      return
    }

    setSaving(true)
    let saved = 0
    for (const entry of included) {
      try {
        await createCapture({
          content: entry.content,
          type: entry.type,
          threadId: entry.threadId,
          source: 'brain_dump',
        })
        saved += 1
      } catch {
        // One failed line must not discard the whole session.
      }
    }
    setSaving(false)

    pushToast(
      `${saved} of ${included.length} lines filed.`,
      saved === included.length ? 'success' : 'warning',
    )
    onOpenChange(false)
  }

  const updateEntry = (id, patch) => {
    setEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    )
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          <span className="flex items-center gap-1.5">
            <Brain size={17} weight="duotone" className="text-primary" />
            Brain dump
          </span>
        </DialogTitle>
        <DialogDescription>
          {step === 'dump'
            ? 'One thought per line. Keep typing, then review before filing.'
            : 'Check the type and thread for each line, then file them all at once.'}
        </DialogDescription>
      </DialogHeader>

      {step === 'dump' ? (
        <div>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={9}
            autoFocus
            placeholder={
              'Call Priya about design handoff\nAditya wants the API spec by Monday\nInvestor call — ask about the Series A intro'
            }
            className="w-full resize-none rounded-md border border-line bg-overlay px-3 py-2.5 text-body leading-relaxed focus:border-primary focus:outline-none"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={startReview}>
              Review
              <ArrowRight size={14} weight="bold" />
            </Button>
          </DialogFooter>
        </div>
      ) : (
        <div>
          <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto scroll-slim">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className={cn(
                  'rounded-md border p-2.5',
                  entry.include ? 'border-line bg-card' : 'border-line bg-overlay opacity-60',
                )}
              >
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => updateEntry(entry.id, { include: !entry.include })}
                    aria-pressed={entry.include}
                    aria-label={entry.include ? 'Exclude line' : 'Include line'}
                    className={cn(
                      'mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full border',
                      entry.include
                        ? 'border-primary bg-primary text-white'
                        : 'border-line bg-card',
                    )}
                  >
                    {entry.include ? <Check size={11} weight="bold" /> : null}
                  </button>
                  <p className="min-w-0 flex-1 text-small text-ink">{entry.content}</p>
                  <button
                    type="button"
                    onClick={() =>
                      setEntries((current) => current.filter((row) => row.id !== entry.id))
                    }
                    aria-label="Remove line"
                    className="rounded-sm p-0.5 text-ink-subtle hover:text-danger"
                  >
                    <Trash size={13} />
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-6">
                  <Chip tone={entry.type}>{entry.type}</Chip>
                  <select
                    value={entry.threadId ?? ''}
                    onChange={(event) =>
                      updateEntry(entry.id, { threadId: event.target.value || null })
                    }
                    aria-label="Assign thread"
                    className="h-7 flex-1 rounded-sm border border-line bg-card px-1.5 text-tiny text-ink focus:border-primary focus:outline-none"
                  >
                    <option value="">Inbox (unassigned)</option>
                    {threads
                      .filter((thread) => thread.status === 'active')
                      .map((thread) => (
                        <option key={thread.id} value={thread.id}>
                          {thread.title}
                        </option>
                      ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setStep('dump')}>
              <X size={13} />
              Back
            </Button>
            <Button onClick={fileAll} loading={saving}>
              File {entries.filter((entry) => entry.include).length} lines
            </Button>
          </DialogFooter>
        </div>
      )}
    </>
  )
}

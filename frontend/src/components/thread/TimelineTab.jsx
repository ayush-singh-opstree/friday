import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, NoteBlank } from '@phosphor-icons/react'
import { CaptureTypeChip } from '@/components/ui/Chip'
import { SyncBadge } from '@/components/ui/SyncBadge'
import { EmptyState } from '@/components/ui/Feedback'
import { Button } from '@/components/ui/Button'
import { clockTime, fullDate } from '@/lib/date'

/**
 * Timeline tab (Feature 2 -> Thread Detail, item 2).
 *
 * A chronological feed of every capture, commitment and system event for the
 * thread. Oldest-first by default with a toggle to newest-first.
 */
export function TimelineTab({ timeline = [], captures = [] }) {
  const [newestFirst, setNewestFirst] = useState(false)

  const captureById = useMemo(
    () => new Map(captures.map((capture) => [capture.id, capture])),
    [captures],
  )

  const events = useMemo(() => {
    const sorted = [...timeline].sort(
      (a, b) => new Date(a.occurredAt) - new Date(b.occurredAt),
    )
    return newestFirst ? sorted.reverse() : sorted
  }, [timeline, newestFirst])

  if (events.length === 0) {
    return (
      <EmptyState
        icon={<NoteBlank size={26} weight="duotone" />}
        title="Nothing captured yet"
        description="Add your first capture to start building the history of this relationship."
      />
    )
  }

  const groups = []
  for (const event of events) {
    const day = fullDate(event.occurredAt)
    const last = groups[groups.length - 1]
    if (last && last.day === day) last.events.push(event)
    else groups.push({ day, events: [event] })
  }

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setNewestFirst((value) => !value)}
          aria-label={newestFirst ? 'Show oldest first' : 'Show newest first'}
        >
          {newestFirst ? <ArrowDown size={13} /> : <ArrowUp size={13} />}
          {newestFirst ? 'Newest first' : 'Oldest first'}
        </Button>
      </div>

      <div className="flex flex-col gap-5">
        {groups.map((group) => (
          <section key={group.day}>
            <h3 className="mb-1.5 text-tiny font-semibold tracking-[0.08em] text-ink-subtle uppercase">
              {group.day}
            </h3>
            <ol className="flex flex-col gap-2 border-l border-line pl-4">
              {group.events.map((event) => (
                <TimelineItem key={event.id} event={event} capture={captureById.get(event.referenceId)} />
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  )
}

function TimelineItem({ event, capture }) {
  const time = clockTime(event.occurredAt)

  if (event.type === 'capture_added') {
    return (
      <li className="relative">
        <span className="absolute top-2.5 -left-[21px] size-2 rounded-full border-2 border-card bg-primary" />
        <div className="rounded-md border border-line bg-card p-3">
          <div className="mb-1 flex items-center gap-2">
            {capture ? <CaptureTypeChip type={capture.type} /> : null}
            <span className="text-tiny text-ink-subtle">{time}</span>
            <SyncBadge status={capture?.syncStatus} className="ml-auto" />
          </div>
          <p className="text-body text-ink">{capture?.content ?? 'Capture removed'}</p>
        </div>
      </li>
    )
  }

  const meta = {
    commitment_created: { text: 'Commitment created', className: 'text-ink-muted' },
    commitment_completed: { text: 'Commitment completed', className: 'text-success' },
    person_added: { text: 'Person added', className: 'text-ink-muted' },
    person_removed: { text: 'Person removed', className: 'text-ink-muted' },
    thread_created: { text: 'Thread created', className: 'text-ink-muted' },
    summary_generated: { text: 'AI summary generated', className: 'text-primary' },
    brief_opened: { text: 'Pre-meeting brief opened', className: 'text-primary' },
  }[event.type] ?? { text: event.type, className: 'text-ink-muted' }

  return (
    <li className="relative flex items-baseline gap-2 text-small">
      <span className="absolute top-2 -left-[21px] size-2 rounded-full border-2 border-card bg-line" />
      <span className={meta.className}>{meta.text}</span>
      {event.metadata?.description ? (
        <span className="truncate text-ink-subtle">{event.metadata.description}</span>
      ) : null}
      <span className="ml-auto shrink-0 text-tiny text-ink-subtle">{time}</span>
    </li>
  )
}
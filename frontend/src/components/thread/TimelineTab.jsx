import { useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  CalendarBlank,
  Check,
  CheckCircle,
  CheckSquare,
  Clock,
  Lightning,
  MagnifyingGlass,
  Note,
  NoteBlank,
  Plus,
  Question,
  Robot,
  Sparkle,
  Users,
  UsersThree,
  X,
} from '@/components/icons'
import { capturesApi, clubsApi } from '@/apis'
import { CaptureTypeChip } from '@/components/ui/Chip'
import { SyncBadge } from '@/components/ui/SyncBadge'
import { EmptyState } from '@/components/ui/Feedback'
import { Button } from '@/components/ui/Button'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/Popover'
import { CommitmentDialog } from '@/components/commitment/CommitmentDialog'
import { clockTime, fullDate } from '@/lib/date'
import { useUiStore } from '@/store'
import { cn } from '@/lib/utils'

const FILTER_OPTIONS = [
  { key: 'all', label: 'All Activity' },
  { key: 'note', label: 'Notes' },
  { key: 'decision', label: 'Decisions' },
  { key: 'question', label: 'Questions' },
  { key: 'commitment', label: 'Commitments' },
  { key: 'system', label: 'System' },
]

const COMPOSER_TYPES = [
  { key: 'note', label: 'Note', icon: Note },
  { key: 'commitment', label: 'Commitment', icon: Lightning },
  { key: 'decision', label: 'Decision', icon: Sparkle },
  { key: 'question', label: 'Question', icon: Question },
]

/**
 * Restrained session accents. The session surface stays neutral and premium;
 * the accent only identifies the session in the spine and header.
 */
const SESSION_TONES = [
  {
    rail: 'bg-primary',
    label: 'text-primary',
  },
  {
    rail: 'bg-violet-500',
    label: 'text-violet-700',
  },
  {
    rail: 'bg-teal-600',
    label: 'text-teal-700',
  },
  {
    rail: 'bg-rose-500',
    label: 'text-rose-700',
  },
]

/** Stable display order for the capture groups shown inside a session. */
const SESSION_TYPE_ORDER = ['decision', 'commitment', 'follow_up', 'question', 'note']

/** Bullet colour per capture type inside a session group card. */
const SESSION_TYPE_DOTS = {
  note: 'bg-[#4F6AF5]',
  action: 'bg-[#E67E22]',
  follow_up: 'bg-[#E67E22]',
  commitment: 'bg-[#E67E22]',
  decision: 'bg-[#27AE60]',
  question: 'bg-[#E91E63]',
}

/**
 * Modern Interactive Timeline Feed (Feature 2 -> Thread Detail).
 * Displays a chronological feed of notes, actions, decisions, commitments,
 * and system events with filtering, search, and inline quick capture.
 */
export function TimelineTab({
  timeline = [],
  captures = [],
  commitments = [],
  clubs = [],
  threadId,
  onRefresh,
}) {
  const [newestFirst, setNewestFirst] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Inline Composer State
  const [composerOpen, setComposerOpen] = useState(false)
  const [composerText, setComposerText] = useState('')
  const [composerType, setComposerType] = useState('note')
  const [composerStep, setComposerStep] = useState('type')
  const [commitmentOpen, setCommitmentOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const pushToast = useUiStore((state) => state.pushToast)

  // Map of captures for fast lookup
  const captureById = useMemo(
    () => new Map(captures.map((capture) => [capture.id, capture])),
    [captures],
  )

  // Map of commitments for fast lookup
  const commitmentById = useMemo(
    () => new Map(commitments.map((c) => [c.id, c])),
    [commitments],
  )

  // Map of clubs (meeting / capture sessions) for fast lookup
  const clubById = useMemo(() => new Map(clubs.map((club) => [club.id, club])), [clubs])

  // Merge timeline events with any captures/commitments not yet in the timeline
  const mergedEvents = useMemo(() => {
    const existingRefIds = new Set(
      timeline.filter((e) => e.referenceId).map((e) => e.referenceId),
    )
    const synthesized = []

    for (const c of captures) {
      if (!existingRefIds.has(c.id)) {
        synthesized.push({
          id: `syn_cap_${c.id}`,
          type: 'subthread_added',
          referenceId: c.id,
          occurredAt: c.capturedAt || c.createdAt || new Date().toISOString(),
          metadata: { type: c.type, club_id: c.clubId ?? null },
        })
      }
    }

    for (const com of commitments) {
      if (!existingRefIds.has(com.id)) {
        synthesized.push({
          id: `syn_com_${com.id}`,
          type: com.status === 'completed' ? 'commitment_completed' : 'commitment_created',
          referenceId: com.id,
          occurredAt: com.completedAt || com.createdAt || new Date().toISOString(),
          metadata: {
            description: com.description,
            ownerType: com.ownerType,
            club_id: com.clubId ?? null,
          },
        })
      }
    }

    return [...timeline, ...synthesized]
  }, [timeline, captures, commitments])

  // Filter and search
  const filteredEvents = useMemo(() => {
    return mergedEvents.filter((event) => {
      const capture = captureById.get(event.referenceId)
      const commitment = commitmentById.get(event.referenceId)

      // Category filter. Captures arrive as `subthread_added`; older data used
      // `capture_added`. The type can come from the capture row or the metadata
      // (so filtering still works when the captures endpoint is unavailable).
      const isCapture = event.type === 'subthread_added' || event.type === 'capture_added'
      const captureType = capture?.type ?? event.metadata?.type
      if (filter === 'note' && (!isCapture || captureType !== 'note')) return false
      if (filter === 'follow_up' && (!isCapture || captureType !== 'follow_up')) return false
      if (filter === 'decision' && (!isCapture || captureType !== 'decision')) return false
      if (filter === 'question' && (!isCapture || captureType !== 'question')) return false
      if (
        filter === 'commitment' &&
        event.type !== 'commitment_created' &&
        event.type !== 'commitment_completed'
      )
        return false
      if (
        filter === 'system' &&
        (isCapture || event.type === 'commitment_created' || event.type === 'commitment_completed')
      )
        return false

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const captureContent = capture?.content?.toLowerCase() ?? ''
        const commitmentDesc = commitment?.description?.toLowerCase() ?? ''
        const metaDesc = (
          event.metadata?.description ||
          event.metadata?.title ||
          event.metadata?.content_snippet ||
          ''
        ).toLowerCase()
        if (
          !captureContent.includes(query) &&
          !commitmentDesc.includes(query) &&
          !metaDesc.includes(query)
        ) {
          return false
        }
      }

      return true
    })
  }, [mergedEvents, filter, searchQuery, captureById, commitmentById])

  // Group events into club blocks (a meeting session + its captures) and loose
  // events, then order them chronologically. A club block renders as a single
  // timeline item that contains all captures recorded during that session.
  const timelineItems = useMemo(() => {
    const clubIdFor = (event) => {
      if (event.type === 'club_started' || event.type === 'club_ended') {
        return event.referenceId ?? event.metadata?.club_id ?? null
      }
      const capture = captureById.get(event.referenceId)
      if (capture?.clubId) return capture.clubId
      const commitment = commitmentById.get(event.referenceId)
      if (commitment?.clubId) return commitment.clubId
      return event.metadata?.club_id ?? null
    }

    const buckets = new Map()
    const loose = []

    // Show every known club in the unfiltered view, even when its timeline
    // events are unavailable, so a meeting session still surfaces (with its
    // captures once they load). Active filters/search only show clubs that
    // actually contain matching events.
    if (filter === 'all' && !searchQuery.trim()) {
      for (const club of clubs) {
        buckets.set(club.id, {
          kind: 'club',
          id: `club_${club.id}`,
          clubId: club.id,
          club,
          events: [],
          at: club.startedAt,
        })
      }
    }

    for (const event of filteredEvents) {
      const clubId = clubIdFor(event)
      if (!clubId) {
        loose.push({ kind: 'event', id: event.id, at: event.occurredAt, event })
        continue
      }
      if (!buckets.has(clubId)) {
        buckets.set(clubId, {
          kind: 'club',
          id: `club_${clubId}`,
          clubId,
          club: clubById.get(clubId) ?? null,
          events: [],
        })
      }
      buckets.get(clubId).events.push(event)
    }

    const clubItems = [...buckets.values()].map((bucket) => {
      const times = bucket.events
        .map((event) => event.occurredAt)
        .filter(Boolean)
        .sort()
      return {
        ...bucket,
        at: bucket.club?.startedAt ?? times[0] ?? new Date().toISOString(),
      }
    })

    const items = [...clubItems, ...loose].sort((a, b) => new Date(a.at) - new Date(b.at))
    for (const item of items) {
      if (item.kind === 'club') {
        item.events.sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt))
      }
    }

    // Alternate the palette per session in chronological order so consecutive
    // sessions are easy to tell apart (and the colour stays stable when the
    // user flips newest/oldest).
    let sessionTone = 0
    for (const item of items) {
      if (item.kind === 'club') {
        item.tone = SESSION_TONES[sessionTone % SESSION_TONES.length]
        sessionTone += 1
      }
    }

    if (newestFirst) {
      items.reverse()
      for (const item of items) {
        if (item.kind === 'club') item.events.reverse()
      }
    }

    return items
  }, [filteredEvents, newestFirst, captureById, commitmentById, clubById, clubs, filter, searchQuery])

  // Date groups (a club is one timeline item anchored at its start time)
  const groups = useMemo(() => {
    const res = []
    for (const item of timelineItems) {
      const day = fullDate(item.at)
      const last = res[res.length - 1]
      if (last && last.day === day) last.items.push(item)
      else res.push({ day, items: [item] })
    }
    return res
  }, [timelineItems])

  // Handle Quick Note Submit
  const handleQuickSubmit = async (e) => {
    e?.preventDefault()
    if (!composerText.trim() || submitting || !threadId) return

    setSubmitting(true)
    try {
      await capturesApi.create({
        content: composerText.trim(),
        type: composerType,
        threadId,
      })
      pushToast('Posted to timeline', 'success')
      setComposerText('')
      setComposerOpen(false)
      setComposerStep('type')
      onRefresh?.()
    } catch {
      pushToast('Failed to post entry', 'danger')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex w-full flex-col gap-4 font-sans">
      {/* ── Add to timeline: circular + opens a quick-add popover ── */}
      <div className="flex">
        <Popover
          open={composerOpen}
          onOpenChange={(next) => {
            setComposerOpen(next)
            if (!next) {
              setComposerStep('type')
              setComposerText('')
            }
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Add to timeline"
              title="Add to timeline"
              className="group inline-flex size-12 items-center justify-center rounded-full bg-primary text-ink-inverse shadow-lg shadow-primary/30 ring-1 ring-primary/20 transition-all hover:-translate-y-0.5 hover:bg-primary-dark hover:shadow-xl active:translate-y-0 active:scale-95 cursor-pointer"
            >
              <Plus size={22} weight="bold" className="transition-transform group-hover:rotate-90" />
            </button>
          </PopoverTrigger>

          <PopoverContent align="start" sideOffset={10} className="w-[340px] max-w-[92vw] overflow-hidden p-0">
            {composerStep === 'type' ? (
              <div className="p-2">
                <p className="px-2.5 pt-1.5 pb-1 text-tiny font-semibold uppercase tracking-[0.1em] text-ink-subtle">
                  Add to timeline
                </p>
                {COMPOSER_TYPES.map((t) => {
                  const Icon = t.icon
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => {
                        if (t.key === 'commitment') {
                          setComposerOpen(false)
                          setCommitmentOpen(true)
                          return
                        }
                        setComposerType(t.key)
                        setComposerStep('details')
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-small font-medium text-ink transition-colors hover:bg-overlay cursor-pointer"
                    >
                      <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <Icon size={15} weight="bold" />
                      </span>
                      <span className="flex-1 text-left">{t.label}</span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <form onSubmit={handleQuickSubmit} className="flex flex-col gap-2.5 p-3">
                <button
                  type="button"
                  onClick={() => setComposerStep('type')}
                  className="inline-flex w-fit items-center gap-1.5 text-tiny font-semibold text-ink-muted transition-colors hover:text-ink cursor-pointer"
                >
                  <ArrowLeft size={13} weight="bold" />
                  {COMPOSER_TYPES.find((t) => t.key === composerType)?.label ?? 'Back'}
                </button>
                <textarea
                  value={composerText}
                  onChange={(e) => setComposerText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault()
                      handleQuickSubmit()
                    }
                  }}
                  autoFocus
                  rows={3}
                  placeholder={`Write a ${composerType} for this relationship...`}
                  className="w-full resize-none rounded-xl border border-line/70 bg-surface/60 p-3 text-[14px] leading-relaxed text-ink placeholder:text-ink-subtle focus:border-primary focus:bg-card focus:outline-none"
                />
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-ink-subtle">
                    <kbd className="font-mono font-medium">Ctrl+Enter</kbd> to add
                  </p>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => {
                      setComposerOpen(false)
                      setComposerStep('type')
                      setComposerText('')
                    }}>
                      Cancel
                    </Button>
                    <Button type="submit" size="sm" disabled={!composerText.trim() || submitting} loading={submitting} className="gap-1.5">
                      <Plus size={14} weight="bold" />
                      Add
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </PopoverContent>
        </Popover>
      </div>

      <CommitmentDialog
        open={commitmentOpen}
        onOpenChange={(next) => {
          setCommitmentOpen(next)
          if (!next) onRefresh?.()
        }}
        threadId={threadId}
      />

      {/* ── Main Timeline Content ─────────────────────────── */}
      {mergedEvents.length === 0 && clubs.length === 0 ? (
        <EmptyState
          icon={<NoteBlank size={26} weight="duotone" />}
          title="No timeline history yet"
          description="Use the capture bar above to add your first note, commitment, or decision for this relationship."
        />
      ) : (
        <div className="relative pt-0 pb-8">
          {/* Continuous vertical spine */}
          <div
            className="absolute top-4 bottom-4 left-4.5 sm:left-5.5 w-0.5 bg-line/80"
            aria-hidden="true"
          />

          {/* Floating timeline filters — sticky, aligned with the latest date row on laptop+ */}
          <div className="flex justify-end sm:sticky sm:top-0 sm:z-30 sm:-mt-14 sm:mb-14 sm:h-0">
            <div className="flex w-full flex-col gap-2 sm:absolute sm:top-0 sm:right-0 sm:w-[65%] sm:flex-row sm:items-stretch sm:justify-between">
              {/* Category Filters */}
              <div className="scrollbar-none flex min-w-0 items-center gap-1 overflow-x-auto rounded-xl border border-line/80 bg-card p-2 shadow-sm">
                {FILTER_OPTIONS.map((opt) => {
                  const active = (filter || 'all') === opt.key
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setFilter(opt.key)}
                      className={cn(
                        'shrink-0 rounded-lg px-3 py-1 text-small font-medium transition-all cursor-pointer',
                        active
                          ? 'bg-primary/10 text-primary font-semibold shadow-xs'
                          : 'text-ink-muted hover:bg-overlay hover:text-ink',
                      )}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>

              {/* Search & Sort Actions */}
              <div className="flex shrink-0 items-center gap-2 rounded-xl border border-line/80 bg-card p-2 shadow-sm">
                <div className="relative flex-1 sm:w-44 sm:flex-initial">
                  <MagnifyingGlass
                    size={14}
                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-subtle"
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search timeline..."
                    className="h-8 w-full rounded-lg border border-line/80 bg-surface/70 pl-8 pr-8 text-small text-ink placeholder:text-ink-subtle focus:border-primary focus:bg-card focus:outline-none"
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute top-1/2 right-2.5 -translate-y-1/2 text-ink-subtle hover:text-ink"
                    >
                      <X size={13} />
                    </button>
                  ) : null}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewestFirst((val) => !val)}
                  className="h-8 gap-1.5 px-3 text-small font-medium shrink-0"
                  title={newestFirst ? 'Switch to oldest first' : 'Switch to newest first'}
                >
                  {newestFirst ? <ArrowDown size={13} /> : <ArrowUp size={13} />}
                  <span>{newestFirst ? 'Newest' : 'Oldest'}</span>
                </Button>
              </div>
            </div>
          </div>

          {timelineItems.length === 0 ? (
            <div className="pt-8 sm:pt-16">
              <EmptyState
                icon={<MagnifyingGlass size={24} weight="duotone" />}
                title="No matching events found"
                description={
                  searchQuery
                    ? `No timeline entries match "${searchQuery}".`
                    : 'No events found in this category.'
                }
                action={
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setFilter('all')
                      setSearchQuery('')
                    }}
                  >
                    Reset filters
                  </Button>
                }
              />
            </div>
          ) : null}

          <div className="flex flex-col gap-8">
            {groups.map((group) => (
              <section key={group.day} className="relative">
                {/* Left-Aligned Date Header */}
                <div className="sticky top-2 z-20 my-4 flex items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1.5 text-small font-semibold tracking-tight text-ink shadow-sm">
                    <CalendarBlank size={14} className="text-primary" />
                    {group.day}
                  </span>
                  <div className="h-px flex-1 bg-line/60" aria-hidden="true" />
                </div>

                {/* Day events list */}
                <ol className="flex flex-col gap-4">
                  {group.items.map((item) =>
                    item.kind === 'club' ? (
                      <ClubTimelineBlock
                        key={item.id}
                        club={item.club}
                        tone={item.tone}
                        events={item.events}
                        captureById={captureById}
                        commitmentById={commitmentById}
                        onRefresh={onRefresh}
                      />
                    ) : (
                      <TimelineRow
                        key={item.id}
                        event={item.event}
                        capture={captureById.get(item.event.referenceId)}
                        commitment={commitmentById.get(item.event.referenceId)}
                      />
                    ),
                  )}
                </ol>
              </section>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Individual Timeline Item Row with Spine Node.
 */
function TimelineRow({ event, capture, commitment, inSession = false }) {
  const time = clockTime(event.occurredAt)

  // 1. Capture / SubThread added (Note, Follow-up, Decision, Question)
  if (event.type === 'capture_added' || event.type === 'subthread_added') {
    const type = capture?.type || event.metadata?.type || 'note'
    const content =
      capture?.content ||
      event.metadata?.content ||
      event.metadata?.content_snippet ||
      'Note added to thread'

    const nodeStyles = {
      note: 'bg-[#EEF1FE] text-[#4F6AF5] border-[#4F6AF5]/25',
      action: 'bg-[#FFF3E0] text-[#E67E22] border-[#E67E22]/25',
      follow_up: 'bg-[#FFF3E0] text-[#E67E22] border-[#E67E22]/25',
      commitment: 'bg-[#FFF3E0] text-[#E67E22] border-[#E67E22]/25',
      decision: 'bg-[#E8F5E9] text-[#27AE60] border-[#27AE60]/25',
      question: 'bg-[#FCE4EC] text-[#E91E63] border-[#E91E63]/25',
    }[type] ?? 'bg-overlay text-ink-muted border-line'

    const NodeIcon = {
      note: Note,
      action: Lightning,
      follow_up: ArrowUp,
      commitment: Lightning,
      decision: Sparkle,
      question: Question,
    }[type] ?? Note

    // Decisions get a bold, boxed treatment on the main timeline. Inside a
    // session the card is already nested, so a second box looks noisy - fall
    // back to a slim accent rule there instead.
    const contentClass =
      type === 'decision'
        ? inSession
          ? 'border-l-2 border-[#27AE60]/70 pl-3 font-medium text-ink'
          : 'rounded-xl border-l-3 border-[#27AE60] bg-[#E8F5E9]/30 p-3 font-medium text-ink'
        : type === 'action' || type === 'follow_up'
          ? 'rounded-xl border-l-3 border-[#E67E22] bg-[#FFF3E0]/30 p-3 font-medium text-ink'
          : 'text-ink font-normal'

    return (
      <li className="relative flex items-start gap-3 pl-11 sm:pl-13 group">
        {/* Node on Spine */}
        <span
          className={cn(
            'absolute top-3 left-1.5 sm:left-2 flex size-6.5 sm:size-7 items-center justify-center rounded-full border-2 border-card shadow-xs transition-transform group-hover:scale-110',
            nodeStyles,
          )}
        >
          <NodeIcon size={13} weight="bold" />
        </span>

        {/* Capture Event Card */}
        {inSession ? (
          // Inside a session the type/time live in the group header, so each row
          // is a compact tile with the copy action revealed on hover.
          <div className="group/row flex w-full items-start gap-2 rounded-xl border border-line/70 bg-card px-3 py-2.5 transition-colors hover:border-line">
            <div className={cn('min-w-0 flex-1 text-[14px] leading-relaxed', contentClass)}>
              {content}
            </div>
          </div>
        ) : (
          <div className="w-full rounded-xl border border-line/75 bg-card px-3.5 py-3 shadow-xs transition-colors hover:border-line">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <CaptureTypeChip type={type} />
                <span className="flex items-center gap-1 text-tiny text-ink-subtle">
                  <Clock size={11} />
                  {time}
                </span>
              </div>
              {capture ? <SyncBadge status={capture.syncStatus} /> : null}
            </div>

            <p className="whitespace-pre-wrap text-small leading-relaxed text-ink">{content}</p>
          </div>
        )}
      </li>
    )
  }

  // 2. Commitment Created
  if (event.type === 'commitment_created') {
    const desc =
      commitment?.description || event.metadata?.description || 'Commitment created'
    if (inSession) {
      return (
        <li className="group/row flex items-start gap-3 border-t border-line/60 px-4 py-3.5 first:border-t-0">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-line bg-overlay text-accent">
            <CheckSquare size={14} weight="bold" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-tiny font-semibold uppercase tracking-[0.06em] text-accent">Commitment</span>
              {inSession ? null : <span className="text-tiny tabular-nums text-ink-subtle">{time}</span>}
            </div>
            <p className="mt-1 text-[15px] leading-relaxed tracking-[-0.01em] text-ink">{desc}</p>
          </div>
        </li>
      )
    }
    return (
      <li className="relative flex items-start gap-3 pl-11 sm:pl-13 group">
        <span className="absolute top-2.5 left-1.5 sm:left-2 flex size-6.5 sm:size-7 items-center justify-center rounded-full border-2 border-card bg-primary/15 text-primary shadow-xs">
          <CheckSquare size={13} weight="bold" />
        </span>
        <div className="w-full rounded-xl border border-line/75 bg-card px-3.5 py-2.5 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-tiny font-semibold text-primary">
              Commitment
            </span>
            <p className="truncate text-small font-medium text-ink">{desc}</p>
          </div>
          <span className="shrink-0 text-tiny text-ink-subtle">{time}</span>
        </div>
      </li>
    )
  }

  // 3. Commitment Completed
  if (event.type === 'commitment_completed') {
    const desc =
      commitment?.description || event.metadata?.description || 'Commitment completed'
    if (inSession) {
      return (
        <li className="group/row flex items-start gap-3 border-t border-line/60 px-4 py-3.5 first:border-t-0">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-success/25 bg-success/10 text-success">
            <CheckCircle size={14} weight="bold" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-tiny font-semibold uppercase tracking-[0.06em] text-success">Completed commitment</span>
              {inSession ? null : <span className="text-tiny tabular-nums text-ink-subtle">{time}</span>}
            </div>
            <p className="mt-1 text-[15px] leading-relaxed tracking-[-0.01em] text-ink line-through decoration-success/40">{desc}</p>
          </div>
        </li>
      )
    }
    return (
      <li className="relative flex items-start gap-3 pl-11 sm:pl-13 group">
        <span className="absolute top-2.5 left-1.5 sm:left-2 flex size-6.5 sm:size-7 items-center justify-center rounded-full border-2 border-card bg-emerald-500 text-white shadow-xs">
          <CheckCircle size={14} weight="bold" />
        </span>
        <div className="w-full rounded-xl border border-emerald-500/25 bg-emerald-50/40 px-3.5 py-2.5 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600/15 px-2 py-0.5 text-tiny font-semibold text-emerald-700">
              <Check size={11} weight="bold" />
              Completed
            </span>
            <p className="truncate text-small font-semibold text-ink line-through opacity-80">
              {desc}
            </p>
          </div>
          <span className="shrink-0 text-tiny text-ink-subtle">{time}</span>
        </div>
      </li>
    )
  }

  // 4. People changes (Person Added / Removed)
  if (event.type === 'person_added' || event.type === 'person_removed') {
    const isAdded = event.type === 'person_added'
    const name = event.metadata?.name || event.metadata?.person_name || 'Contact'
    return (
      <li className="relative flex items-start gap-3 pl-11 sm:pl-13 group">
        <span className="absolute top-2 left-1.5 sm:left-2 flex size-6.5 sm:size-7 items-center justify-center rounded-full border-2 border-card bg-surface text-ink-muted shadow-xs">
          <Users size={13} />
        </span>
        <div className="w-full rounded-xl border border-line/60 bg-surface/70 px-3 py-2 text-tiny text-ink-muted flex items-center justify-between gap-2">
          <span className="truncate">
            <strong className="font-semibold text-ink">{name}</strong>{' '}
            {isAdded ? 'was linked to this thread' : 'was removed from this thread'}
          </span>
          {inSession ? null : <span className="shrink-0 text-ink-subtle">{time}</span>}
        </div>
      </li>
    )
  }

  // 5. System & AI Summaries
  const meta = {
    thread_created: { label: 'Thread initialized', icon: NoteBlank, color: 'text-ink-muted' },
    summary_generated: { label: 'AI summary compiled', icon: Robot, color: 'text-primary' },
    brief_opened: { label: 'Pre-meeting brief reviewed', icon: Sparkle, color: 'text-accent' },
    club_started: { label: 'Meeting session started', icon: Users, color: 'text-primary' },
    club_ended: { label: 'Meeting session ended', icon: Users, color: 'text-ink-muted' },
  }[event.type] ?? { label: event.type, icon: NoteBlank, color: 'text-ink-muted' }

  const MetaIcon = meta.icon
  return (
    <li className="relative flex items-start gap-3 pl-11 sm:pl-13 group">
      <span className="absolute top-2 left-1.5 sm:left-2 flex size-6.5 sm:size-7 items-center justify-center rounded-full border-2 border-card bg-surface text-ink-subtle shadow-xs">
        <MetaIcon size={13} />
      </span>
      <div className="w-full rounded-xl border border-line/60 bg-surface/60 px-3 py-1.5 text-tiny text-ink-muted flex items-center justify-between gap-2">
        <span className={cn('font-medium truncate', meta.color)}>{meta.label}</span>
        {inSession ? null : <span className="shrink-0 text-ink-subtle">{time}</span>}
      </div>
    </li>
  )
}

/**
 * A Club (meeting / capture session) rendered as one grouped timeline card so
 * every capture recorded during that session reads as belonging together.
 */
function ClubTimelineBlock({
  club,
  events,
  tone,
  captureById,
  commitmentById,
  onRefresh,
}) {
  const pushToast = useUiStore((state) => state.pushToast)
  const [acting, setActing] = useState(false)
  // Each session gets a restrained accent so adjacent sessions remain easy to
  // distinguish without turning the timeline into a collection of colored cards.
  const palette = tone ?? SESSION_TONES[0]
  const endEvent = events.find((event) => event.type === 'club_ended')
  const endedAt = club?.endedAt ?? endEvent?.occurredAt ?? null
  const isActive = !endedAt

  const handleDiscard = async () => {
    if (!club?.id) return
    setActing(true)
    try {
      await clubsApi.discard(club.id)
      pushToast('Session discarded.', 'success')
      onRefresh?.()
    } catch {
      pushToast('Failed to discard session.', 'danger')
    } finally {
      setActing(false)
    }
  }

  const handleEnd = async () => {
    if (!club?.id) return
    setActing(true)
    try {
      await clubsApi.end(club.id)
      pushToast('Session ended.', 'success')
      onRefresh?.()
    } catch {
      pushToast('Failed to end session.', 'danger')
    } finally {
      setActing(false)
    }
  }

  // Session boundaries are summarised in the header, so the nested list only
  // holds the actual captures / commitments logged during the session.
  const contentEvents = events.filter(
    (event) => event.type !== 'club_started' && event.type !== 'club_ended',
  )
  const captureCount = contentEvents.filter(
    (event) =>
      event.type === 'subthread_added' ||
      event.type === 'capture_added' ||
      event.type === 'commitment_created' ||
      event.type === 'commitment_completed',
  ).length

  // Group the session's captures by type so e.g. three notes render together in a
  // single card. Non-capture events (rare inside a session) fall back to rows.
  const captureEvents = contentEvents.filter(
    (event) => event.type === 'subthread_added' || event.type === 'capture_added',
  )
  const otherEvents = contentEvents.filter(
    (event) =>
      event.type !== 'subthread_added' &&
      event.type !== 'capture_added' &&
      event.type !== 'commitment_created' &&
      event.type !== 'commitment_completed',
  )

  const groupedContent = (() => {
    const byType = new Map()
    for (const event of [
      ...captureEvents,
      ...contentEvents.filter(
        (event) => event.type === 'commitment_created' || event.type === 'commitment_completed',
      ),
    ]) {
      const capture = captureById.get(event.referenceId)
      const type =
        event.type === 'commitment_created' || event.type === 'commitment_completed'
          ? 'commitment'
          : capture?.type || event.metadata?.type || 'note'
      if (!byType.has(type)) byType.set(type, [])
      byType.get(type).push(event)
    }
    const known = SESSION_TYPE_ORDER.filter((type) => byType.has(type))
    const extras = [...byType.keys()].filter((type) => !SESSION_TYPE_ORDER.includes(type))
    return [...known, ...extras].map((type) => ({ type, events: byType.get(type) }))
  })()

  return (
    <li className="relative flex items-start gap-3 pl-11 sm:pl-13">
      <span
        className={cn(
          'absolute top-4 left-1.5 z-10 flex size-7 items-center justify-center rounded-full border-2 border-card shadow-xs sm:left-2',
          palette.rail,
        )}
        aria-hidden="true"
      >
        <UsersThree size={14} weight="bold" className="text-ink-inverse" />
      </span>
      <div className="relative w-full overflow-hidden rounded-2xl border border-line/80 bg-card shadow-md">
        {/* A quiet accent rail keeps the session anchored without coloring the surface. */}
        <span className={cn('absolute inset-y-0 left-0 w-1', palette.rail)} aria-hidden="true" />

        {/* Session header */}
        <header className="flex flex-wrap items-center gap-3 border-b border-line/80 bg-card px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className={cn('flex items-center gap-1.5 text-tiny font-semibold uppercase tracking-[0.12em]', palette.label)}>
              <UsersThree size={13} weight="bold" />
              Session
            </p>
            <p className="mt-1 text-small text-ink-muted">
              {captureCount} {captureCount === 1 ? 'capture' : 'captures'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isActive ? (
              <>
                <span className="flex items-center gap-1.5 rounded-full border border-danger/30 bg-danger/10 px-2.5 py-1 text-tiny font-semibold text-danger animate-pulse">
                  <span className="size-1.5 rounded-full bg-danger" />
                  Live
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDiscard}
                  disabled={acting}
                  className="h-7 px-2 text-tiny font-medium text-ink-muted hover:text-danger hover:bg-danger/10 cursor-pointer"
                  title="Discard this session"
                >
                  Discard
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEnd}
                  disabled={acting}
                  className="h-7 px-2.5 text-tiny font-medium text-ink border-line/80 hover:bg-surface cursor-pointer"
                  title="End and close this session"
                >
                  End Session
                </Button>
              </>
            ) : (
              <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-tiny font-semibold text-ink-muted">
                Ended
              </span>
            )}
          </div>
        </header>

        {/* Captures recorded during this session, one card per capture type */}
        <div className="px-5 py-4">
          {contentEvents.length === 0 ? (
            <p className="text-small text-ink-subtle">No captures in this session.</p>
          ) : (
            <div className="grid gap-x-8 gap-y-4 lg:grid-cols-2">
              {groupedContent.map((group) => (
                <section key={group.type} className="min-w-0 border-t border-line/80 pt-3 first:border-t-0 first:pt-0 lg:[&:nth-child(2)]:border-t-0 lg:[&:nth-child(2)]:pt-0">
                  <header className="flex items-center justify-between gap-2 pb-2">
                    <div className="flex items-center gap-2">
                      <CaptureTypeChip type={group.type} className="h-5 px-2 text-[10px]" />
                      <span className="text-tiny font-medium text-ink-muted">
                        {group.events.length} {group.events.length === 1 ? 'entry' : 'entries'}
                      </span>
                    </div>
                  </header>

                  <ul>
                    {group.events.map((event) => {
                      const capture = captureById.get(event.referenceId)
                      const commitment = commitmentById.get(event.referenceId)
                      const content =
                        capture?.content ||
                        commitment?.description ||
                        event.metadata?.content ||
                        event.metadata?.content_snippet ||
                        'Note added to thread'

                      return (
                        <li key={event.id} className="flex items-start gap-2.5 py-2">
                          <span
                            className={cn(
                              'mt-[7px] size-1.5 shrink-0 rounded-full',
                              event.type === 'commitment_completed'
                                ? 'bg-success'
                                : SESSION_TYPE_DOTS[group.type] ?? 'bg-ink-subtle',
                            )}
                            aria-hidden="true"
                          />
                          <div className="min-w-0 flex-1">
                            <p
                              className={cn(
                                'text-[14px] leading-relaxed tracking-[-0.005em] text-ink',
                                group.type === 'decision' && 'font-medium',
                                event.type === 'commitment_completed' && 'line-through decoration-success/40',
                              )}
                            >
                              {content}
                            </p>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))}

              {otherEvents.length > 0 ? (
                <ol className="relative flex flex-col gap-2">
                  {otherEvents.map((event) => (
                    <TimelineRow
                      key={event.id}
                      event={event}
                      capture={captureById.get(event.referenceId)}
                      commitment={commitmentById.get(event.referenceId)}
                      inSession
                    />
                  ))}
                </ol>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

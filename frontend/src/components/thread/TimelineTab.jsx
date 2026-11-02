import { useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  CalendarBlank,
  Check,
  CheckCircle,
  CheckSquare,
  Clock,
  CopySimple,
  Lightning,
  MagnifyingGlass,
  Note,
  NoteBlank,
  Plus,
  Question,
  Robot,
  Sparkle,
  Users,
  X,
} from '@/components/icons'
import { capturesApi } from '@/apis'
import { CaptureTypeChip } from '@/components/ui/Chip'
import { SyncBadge } from '@/components/ui/SyncBadge'
import { EmptyState } from '@/components/ui/Feedback'
import { Button } from '@/components/ui/Button'
import { clockTime, fullDate } from '@/lib/date'
import { useUiStore } from '@/store'
import { cn } from '@/lib/utils'

const FILTER_OPTIONS = [
  { key: 'all', label: 'All Activity' },
  { key: 'note', label: 'Notes' },
  { key: 'follow_up', label: 'Follow-ups' },
  
  { key: 'decision', label: 'Decisions' },
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
 * Alternating accent palettes so back-to-back meeting sessions are visually
 * distinct in the timeline. Sessions cycle through these in chronological order.
 */
const SESSION_TONES = [
  {
    rail: 'bg-primary/70',
    card: 'border-primary/25 bg-primary/5',
    header: 'border-primary/15 bg-primary/10',
    badge: 'bg-primary text-ink-inverse',
    label: 'text-primary/80',
    connector: 'bg-primary/20',
  },
  {
    rail: 'bg-[#8B5CF6]/70',
    card: 'border-[#8B5CF6]/25 bg-[#8B5CF6]/5',
    header: 'border-[#8B5CF6]/15 bg-[#8B5CF6]/10',
    badge: 'bg-[#8B5CF6] text-white',
    label: 'text-[#8B5CF6]/80',
    connector: 'bg-[#8B5CF6]/20',
  },
  {
    rail: 'bg-[#0D9488]/70',
    card: 'border-[#0D9488]/25 bg-[#0D9488]/5',
    header: 'border-[#0D9488]/15 bg-[#0D9488]/10',
    badge: 'bg-[#0D9488] text-white',
    label: 'text-[#0D9488]/80',
    connector: 'bg-[#0D9488]/20',
  },
  {
    rail: 'bg-[#DB2777]/70',
    card: 'border-[#DB2777]/25 bg-[#DB2777]/5',
    header: 'border-[#DB2777]/15 bg-[#DB2777]/10',
    badge: 'bg-[#DB2777] text-white',
    label: 'text-[#DB2777]/80',
    connector: 'bg-[#DB2777]/20',
  },
]

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
  const [copiedId, setCopiedId] = useState(null)

  // Inline Composer State
  const [composerOpen, setComposerOpen] = useState(false)
  const [composerText, setComposerText] = useState('')
  const [composerType, setComposerType] = useState('note')
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
      const startMeta = bucket.events.find((event) => event.type === 'club_started')?.metadata
      return {
        ...bucket,
        at: bucket.club?.startedAt ?? times[0] ?? new Date().toISOString(),
        fallbackName: startMeta?.club_name ?? null,
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
      onRefresh?.()
    } catch {
      pushToast('Failed to post entry', 'danger')
    } finally {
      setSubmitting(false)
    }
  }

  // Copy capture text
  const handleCopy = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      pushToast('Copied to clipboard', 'success')
      setTimeout(() => setCopiedId(null), 2000)
    } catch {
      pushToast('Failed to copy', 'danger')
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── Inline Quick Capture Box ─────────────────────── */}
      <div className="rounded-2xl border border-line/80 bg-card p-4 shadow-xs transition-all focus-within:border-primary/40 focus-within:shadow-sm">
        {!composerOpen && !composerText ? (
          <button
            type="button"
            onClick={() => setComposerOpen(true)}
            className="flex w-full items-center justify-between rounded-xl border border-line/60 bg-overlay/50 px-3.5 py-2.5 text-left text-small text-ink-muted transition-colors hover:bg-overlay hover:text-ink cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Plus size={15} className="text-primary" weight="bold" />
              Add a note, decision, commitment, or takeaway to this timeline...
            </span>
            <kbd className="hidden sm:inline-block rounded border border-line bg-card px-1.5 py-0.5 text-[10px] font-mono text-ink-subtle">
              Quick post
            </kbd>
          </button>
        ) : (
          <form onSubmit={handleQuickSubmit} className="flex flex-col gap-3">
            {/* Type selector chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {COMPOSER_TYPES.map((t) => {
                const Icon = t.icon
                const active = composerType === t.key
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setComposerType(t.key)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-tiny font-medium transition-all cursor-pointer',
                      active
                        ? 'bg-primary text-ink-inverse shadow-xs'
                        : 'border border-line/80 bg-surface text-ink-muted hover:bg-overlay hover:text-ink',
                    )}
                  >
                    <Icon size={12} weight={active ? 'bold' : 'regular'} />
                    {t.label}
                  </button>
                )
              })}
            </div>

            {/* Input textarea */}
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
              rows={2}
              placeholder={`Write a ${composerType} for this relationship… (Ctrl+Enter to post)`}
              className="w-full resize-none rounded-xl border border-line/70 bg-surface/60 p-3 text-small text-ink leading-relaxed placeholder:text-ink-subtle focus:border-primary focus:bg-card focus:outline-none"
            />

            {/* Composer Footer Actions */}
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-ink-subtle">
                Press <kbd className="font-mono font-medium">Ctrl+Enter</kbd> to post
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setComposerOpen(false)
                    setComposerText('')
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={!composerText.trim() || submitting}
                  loading={submitting}
                  className="gap-1.5 shadow-xs"
                >
                  <Plus size={14} weight="bold" />
                  Post to timeline
                </Button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* ── Toolbar: Filters & Search ─────────────────────── */}
      <div className="flex flex-col gap-3 rounded-xl border border-line/80 bg-card p-3 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        {/* Category Filters */}
        <div className="scrollbar-none flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {FILTER_OPTIONS.map((opt) => {
            const active = filter === opt.key
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => setFilter(opt.key)}
                className={cn(
                  'shrink-0 rounded-lg px-2.5 py-1 text-tiny font-medium transition-all cursor-pointer',
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
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-48 sm:flex-initial">
            <MagnifyingGlass
              size={13}
              className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-ink-subtle"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search timeline…"
              className="h-8 w-full rounded-lg border border-line/80 bg-surface/70 pl-7 pr-7 text-tiny text-ink placeholder:text-ink-subtle focus:border-primary focus:bg-card focus:outline-none"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute top-1/2 right-2 -translate-y-1/2 text-ink-subtle hover:text-ink"
              >
                <X size={12} />
              </button>
            ) : null}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setNewestFirst((val) => !val)}
            className="h-8 gap-1.5 px-2.5 text-tiny font-medium shrink-0"
            title={newestFirst ? 'Switch to oldest first' : 'Switch to newest first'}
          >
            {newestFirst ? <ArrowDown size={12} /> : <ArrowUp size={12} />}
            <span>{newestFirst ? 'Newest' : 'Oldest'}</span>
          </Button>
        </div>
      </div>

      {/* ── Main Timeline Content ─────────────────────────── */}
      {mergedEvents.length === 0 && clubs.length === 0 ? (
        <EmptyState
          icon={<NoteBlank size={26} weight="duotone" />}
          title="No timeline history yet"
          description="Use the capture bar above to add your first note, commitment, or decision for this relationship."
        />
      ) : timelineItems.length === 0 ? (
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
      ) : (
        <div className="relative pt-2 pb-6">
          {/* Continuous vertical spine */}
          <div
            className="absolute top-4 bottom-4 left-4.5 sm:left-5.5 w-0.5 bg-line/80"
            aria-hidden="true"
          />

          <div className="flex flex-col gap-7">
            {groups.map((group) => (
              <section key={group.day} className="relative">
                {/* Left-Aligned Date Header */}
                <div className="sticky top-2 z-10 my-3.5 flex items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 rounded-lg border border-line/90 bg-card/95 px-2.5 py-1 text-tiny font-semibold text-ink shadow-xs backdrop-blur-md">
                    <CalendarBlank size={12} className="text-primary" />
                    {group.day}
                  </span>
                  <div className="h-px flex-1 bg-line/60" aria-hidden="true" />
                </div>

                {/* Day events list */}
                <ol className="flex flex-col gap-3.5">
                  {group.items.map((item) =>
                    item.kind === 'club' ? (
                      <ClubTimelineBlock
                        key={item.id}
                        club={item.club}
                        clubId={item.clubId}
                        tone={item.tone}
                        fallbackName={item.fallbackName}
                        events={item.events}
                        captureById={captureById}
                        commitmentById={commitmentById}
                        copiedId={copiedId}
                        onCopy={handleCopy}
                      />
                    ) : (
                      <TimelineRow
                        key={item.id}
                        event={item.event}
                        capture={captureById.get(item.event.referenceId)}
                        commitment={commitmentById.get(item.event.referenceId)}
                        isCopied={
                          copiedId ===
                          (captureById.get(item.event.referenceId)?.id ?? item.event.id)
                        }
                        onCopy={handleCopy}
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
function TimelineRow({ event, capture, commitment, isCopied, onCopy, inSession = false }) {
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
        <div className="w-full rounded-2xl border border-line/80 bg-card p-4 shadow-xs transition-all hover:border-primary/40 hover:shadow-sm">
          {/* Header Row */}
          <div className="mb-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <CaptureTypeChip type={type} />
              <span className="flex items-center gap-1 text-tiny text-ink-subtle">
                <Clock size={11} />
                {time}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {capture ? <SyncBadge status={capture.syncStatus} /> : null}
              <button
                type="button"
                onClick={() => onCopy(content, capture?.id ?? event.id)}
                title="Copy note content"
                className="inline-flex size-6 items-center justify-center rounded-md text-ink-subtle opacity-70 transition-all hover:bg-overlay hover:text-ink hover:opacity-100"
              >
                {isCopied ? <Check size={12} className="text-emerald-500" /> : <CopySimple size={12} />}
              </button>
            </div>
          </div>

          {/* Content Body */}
          <div className={cn('text-[14px] leading-relaxed', contentClass)}>
            {content}
          </div>
        </div>
      </li>
    )
  }

  // 2. Commitment Created
  if (event.type === 'commitment_created') {
    const desc =
      commitment?.description || event.metadata?.description || 'Commitment created'
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
          <span className="shrink-0 text-ink-subtle">{time}</span>
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
        <span className="shrink-0 text-ink-subtle">{time}</span>
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
  fallbackName,
  events,
  tone,
  captureById,
  commitmentById,
  copiedId,
  onCopy,
}) {
  // Each session cycles through SESSION_TONES so adjacent sessions differ.
  const palette = tone ?? SESSION_TONES[0]
  const startEvent = events.find((event) => event.type === 'club_started')
  const endEvent = events.find((event) => event.type === 'club_ended')
  const startedAt = club?.startedAt ?? startEvent?.occurredAt ?? events[0]?.occurredAt
  const endedAt = club?.endedAt ?? endEvent?.occurredAt ?? null
  const isActive = !endedAt

  // Session boundaries are summarised in the header, so the nested list only
  // holds the actual captures / commitments logged during the session.
  const contentEvents = events.filter(
    (event) => event.type !== 'club_started' && event.type !== 'club_ended',
  )
  const captureCount = contentEvents.filter(
    (event) => event.type === 'subthread_added' || event.type === 'capture_added',
  ).length

  const rawName = club?.name || fallbackName || ''
  const name = rawName && !/^undefined\b/i.test(rawName) ? rawName : 'Meeting session'

  const rangeText = startedAt
    ? `${clockTime(startedAt)}${endedAt ? ` – ${clockTime(endedAt)}` : ' – now'}`
    : null

  const durationText = (() => {
    if (!startedAt || !endedAt) return null
    const minutes = Math.max(
      0,
      Math.round((new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60000),
    )
    if (minutes < 1) return '<1 min'
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const rest = minutes % 60
    return rest ? `${hours}h ${rest}m` : `${hours}h`
  })()

  return (
    <li className="relative">
      <div className={cn('relative overflow-hidden rounded-2xl border shadow-xs', palette.card)}>
        {/* Session accent rail - visually binds the captures into one session */}
        <span className={cn('absolute inset-y-0 left-0 w-1', palette.rail)} aria-hidden="true" />

        {/* Session header */}
        <header
          className={cn(
            'flex flex-wrap items-center gap-x-2 gap-y-1 border-b py-2.5 pr-3 pl-4',
            palette.header,
          )}
        >
          <span
            className={cn(
              'inline-flex size-6 items-center justify-center rounded-lg shadow-xs',
              palette.badge,
            )}
          >
            <Users size={13} weight="bold" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-small font-semibold text-ink">{name}</p>
            <p className="flex flex-wrap items-center gap-x-1.5 text-[11px] text-ink-muted">
              <span className={cn('font-semibold tracking-[0.06em] uppercase', palette.label)}>
                Session
              </span>
              {rangeText ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock size={10} />
                    {rangeText}
                  </span>
                </>
              ) : null}
              {durationText ? (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{durationText}</span>
                </>
              ) : null}
              <span aria-hidden="true">·</span>
              <span className="font-medium">
                {captureCount} {captureCount === 1 ? 'capture' : 'captures'}
              </span>
            </p>
          </div>
          {isActive ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
              <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
              Live
            </span>
          ) : (
            <span className="rounded-full bg-overlay px-2 py-0.5 text-[10px] font-semibold text-ink-muted">
              Ended
            </span>
          )}
        </header>

        {/* Captures recorded during this session */}
        <div className="relative py-3 pr-3 pl-4">
          {contentEvents.length === 0 ? (
            <p className="text-tiny text-ink-subtle">No captures in this session.</p>
          ) : (
            <>
              {contentEvents.length > 1 ? (
                // Connector that threads the session's timeline nodes together.
                <span
                  className={cn(
                    'pointer-events-none absolute top-5 bottom-5 left-[35px] w-px -translate-x-1/2 sm:left-[38px]',
                    palette.connector,
                  )}
                  aria-hidden="true"
                />
              ) : null}
              <ol className="relative flex flex-col gap-3">
                {contentEvents.map((event) => (
                  <TimelineRow
                    key={event.id}
                    event={event}
                    capture={captureById.get(event.referenceId)}
                    commitment={commitmentById.get(event.referenceId)}
                    isCopied={copiedId === (captureById.get(event.referenceId)?.id ?? event.id)}
                    onCopy={onCopy}
                    inSession
                  />
                ))}
              </ol>
            </>
          )}
        </div>
      </div>
    </li>
  )
}

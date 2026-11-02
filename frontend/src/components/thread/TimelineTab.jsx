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
 * Modern Interactive Timeline Feed (Feature 2 -> Thread Detail).
 * Displays a chronological feed of notes, actions, decisions, commitments,
 * and system events with filtering, search, and inline quick capture.
 */
export function TimelineTab({
  timeline = [],
  captures = [],
  commitments = [],
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
          type: 'capture_added',
          referenceId: c.id,
          occurredAt: c.capturedAt || c.createdAt || new Date().toISOString(),
          metadata: { type: c.type },
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
          metadata: { description: com.description, ownerType: com.ownerType },
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

      // Category filter
      if (filter === 'note' && (event.type !== 'capture_added' || capture?.type !== 'note'))
        return false
      if (filter === 'action' && (event.type !== 'capture_added' || capture?.type !== 'action'))
        return false
      if (filter === 'decision' && (event.type !== 'capture_added' || capture?.type !== 'decision'))
        return false
      if (
        filter === 'commitment' &&
        event.type !== 'commitment_created' &&
        event.type !== 'commitment_completed'
      )
        return false
      if (
        filter === 'system' &&
        (event.type === 'capture_added' ||
          event.type === 'commitment_created' ||
          event.type === 'commitment_completed')
      )
        return false

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const captureContent = capture?.content?.toLowerCase() ?? ''
        const commitmentDesc = commitment?.description?.toLowerCase() ?? ''
        const metaDesc = (event.metadata?.description || event.metadata?.title || '').toLowerCase()
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

  // Chronological sort
  const sortedEvents = useMemo(() => {
    const list = [...filteredEvents].sort(
      (a, b) => new Date(a.occurredAt) - new Date(b.occurredAt),
    )
    return newestFirst ? list.reverse() : list
  }, [filteredEvents, newestFirst])

  // Date groups
  const groups = useMemo(() => {
    const res = []
    for (const event of sortedEvents) {
      const day = fullDate(event.occurredAt)
      const last = res[res.length - 1]
      if (last && last.day === day) last.events.push(event)
      else res.push({ day, events: [event] })
    }
    return res
  }, [sortedEvents])

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
      {mergedEvents.length === 0 ? (
        <EmptyState
          icon={<NoteBlank size={26} weight="duotone" />}
          title="No timeline history yet"
          description="Use the capture bar above to add your first note, commitment, or decision for this relationship."
        />
      ) : sortedEvents.length === 0 ? (
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
                  {group.events.map((event) => (
                    <TimelineRow
                      key={event.id}
                      event={event}
                      capture={captureById.get(event.referenceId)}
                      commitment={commitmentById.get(event.referenceId)}
                      isCopied={copiedId === (captureById.get(event.referenceId)?.id ?? event.id)}
                      onCopy={handleCopy}
                    />
                  ))}
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
function TimelineRow({ event, capture, commitment, isCopied, onCopy }) {
  const time = clockTime(event.occurredAt)

  // 1. Capture Added (Note, Action, Decision, Question)
  if (event.type === 'capture_added') {
    const type = capture?.type || event.metadata?.type || 'note'
    const content = capture?.content || event.metadata?.content || 'Note added to thread'

    const nodeStyles = {
      note: 'bg-[#EEF1FE] text-[#4F6AF5] border-[#4F6AF5]/25',
      action: 'bg-[#FFF3E0] text-[#E67E22] border-[#E67E22]/25',
      commitment: 'bg-[#FFF3E0] text-[#E67E22] border-[#E67E22]/25',
      decision: 'bg-[#E8F5E9] text-[#27AE60] border-[#27AE60]/25',
      question: 'bg-[#FCE4EC] text-[#E91E63] border-[#E91E63]/25',
    }[type] ?? 'bg-overlay text-ink-muted border-line'

    const NodeIcon = {
      note: Note,
      action: Lightning,
      commitment: Lightning,
      decision: Sparkle,
      question: Question,
    }[type] ?? Note

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
          <div
            className={cn(
              'text-[14px] leading-relaxed',
              type === 'decision'
                ? 'rounded-xl border-l-3 border-[#27AE60] bg-[#E8F5E9]/30 p-3 font-medium text-ink'
                : type === 'action'
                  ? 'rounded-xl border-l-3 border-[#E67E22] bg-[#FFF3E0]/30 p-3 font-medium text-ink'
                  : 'text-ink font-normal',
            )}
          >
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

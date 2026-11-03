import { useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  CaretDown,
  ChatCircleDots,
  CheckCircle,
  CheckSquare,
  Clock,
  Plus,
  UserCircle,
  Users,
  Warning,
} from '@/components/icons'
import { PageContainer } from '@/components/layout/PageHeader'
import { CommitmentDialog } from '@/components/commitment/CommitmentDialog'
import { CommitmentRow } from '@/components/commitment/CommitmentRow'
import { Button } from '@/components/ui/Button'
import { FilterPills, StaggerGroup, StaggerItem, Toolbar } from '@/components/ui'
import { EmptyState, Skeleton } from '@/components/ui/Feedback'
import { Switch } from '@/components/ui/Controls'
import { commitmentStatusMeta, DUE_BUCKET_LABELS, dueBucket } from '@/lib/date'
import { useCommitments, useThreads } from '@/hooks/useData'
import { useUiStore } from '@/store'
import { cn } from '@/lib/utils'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

const GROUP_BY_OPTIONS = [
  { value: 'dueDate', label: 'Due date' },
  { value: 'thread', label: 'Thread' },
  { value: 'owner', label: 'Owner' },
]

const VIEW_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This week' },
  { value: 'later', label: 'Later' },
  { value: 'no_date', label: 'No date' },
  { value: 'completed', label: 'Completed' },
]

// Owner filter: lets the user focus on their own promises ("Mine"), what others
// owe them ("Theirs"), or everything overdue. Mirrors the store's ownerFilter.
const OWNER_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'mine', label: 'Mine' },
  { value: 'theirs', label: 'Theirs' },
]


const GROUP_ORDER = ['overdue', 'today', 'this_week', 'later', 'no_date', 'completed']

const GROUP_META = {
  overdue: {
    icon: Warning,
    iconClass: 'bg-danger/10 text-danger',
    headingClass: 'text-danger',
  },
  today: {
    icon: CalendarDays,
    iconClass: 'bg-primary/10 text-primary',
    headingClass: 'text-ink',
  },
  this_week: {
    icon: Clock,
    iconClass: 'bg-warning/10 text-warning',
    headingClass: 'text-ink',
  },
  later: {
    icon: CalendarDays,
    iconClass: 'bg-overlay text-ink-muted',
    headingClass: 'text-ink',
  },
  no_date: {
    icon: Clock,
    iconClass: 'bg-overlay text-ink-muted',
    headingClass: 'text-ink',
  },
  completed: {
    icon: CheckCircle,
    iconClass: 'bg-success/10 text-success',
    headingClass: 'text-ink',
  },
}

/**
 * Unified commitments view (Feature 5).
 */
export function CommitmentsPage() {
  const {
    commitments,
    isLoading,
    error,
    ownerFilter,
    groupBy,
    showCompleted,
    setOwnerFilter,
    setGroupBy,
    toggleShowCompleted,
    complete,
    refresh,
  } = useCommitments()
  const { threads } = useThreads({ autoLoad: true })

  const threadTitleById = useMemo(() => {
    const map = new Map()
    for (const thread of threads) map.set(thread.id, thread.title)
    return map
  }, [threads])
  const reduceMotion = useReducedMotion()

  const pushToast = useUiStore((state) => state.pushToast)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewBucket, setViewBucket] = useState('all')
  const [openGroups, setOpenGroups] = useState({})

  // The "Completed" view needs completed rows fetched first.
  useEffect(() => {
    if (viewBucket === 'completed' && !showCompleted) toggleShowCompleted()
  }, [viewBucket, showCompleted, toggleShowCompleted])

  const visibleCommitments = useMemo(() => {
    let rows = commitments
    if (ownerFilter === 'mine') rows = rows.filter((row) => row.ownerType !== 'person')
    else if (ownerFilter === 'theirs') rows = rows.filter((row) => row.ownerType === 'person')
    else if (ownerFilter === 'overdue') {
      rows = rows.filter((row) => commitmentStatusMeta(row.dueDate, row.status).key === 'overdue')
    }

    if (viewBucket === 'all') return rows
    return rows.filter((row) => dueBucket(row.dueDate, row.status) === viewBucket)
  }, [commitments, viewBucket, ownerFilter])

  const isGroupOpen = (key) => openGroups[key] ?? (key === 'overdue' || key === viewBucket)
  const toggleGroup = (key) =>
    setOpenGroups((current) => ({
      ...current,
      [key]: !(current[key] ?? (key === 'overdue' || key === viewBucket)),
    }))


  const groups = useMemo(() => {
    if (groupBy === 'thread') {
      const buckets = new Map()
      for (const commitment of visibleCommitments) {
        const key = commitment.threadId ?? 'none'
        if (!buckets.has(key)) buckets.set(key, [])
        buckets.get(key).push(commitment)
      }
      return [...buckets.entries()].map(([key, rows]) => ({
        key,
        label: key === 'none' ? 'No thread' : threadTitleById.get(key) || 'Thread',
        rows,
        meta: { icon: ChatCircleDots, iconClass: 'bg-overlay text-primary', headingClass: 'text-ink' },
      }))
    }

    if (groupBy === 'owner') {
      const mine = visibleCommitments.filter((row) => row.ownerType !== 'person')
      const theirs = visibleCommitments.filter((row) => row.ownerType === 'person')
      return [
        {
          key: 'mine',
          label: 'Mine — I owe these',
          rows: mine,
          meta: { icon: UserCircle, iconClass: 'bg-primary/10 text-primary', headingClass: 'text-ink' },
        },
        {
          key: 'theirs',
          label: 'Theirs — they owe these',
          rows: theirs,
          meta: { icon: Users, iconClass: 'bg-overlay text-ink-muted', headingClass: 'text-ink' },
        },
      ].filter((group) => group.rows.length > 0)
    }

    const buckets = new Map()
    for (const commitment of visibleCommitments) {
      const key = dueBucket(commitment.dueDate, commitment.status)
      if (!buckets.has(key)) buckets.set(key, [])
      buckets.get(key).push(commitment)
    }
    return GROUP_ORDER.filter((key) => buckets.has(key)).map((key) => ({
      key,
      label: DUE_BUCKET_LABELS[key],
      rows: buckets.get(key),
      meta: GROUP_META[key] ?? GROUP_META.later,
    }))
  }, [visibleCommitments, groupBy, threadTitleById])

  const metrics = useMemo(() => {
    const completed = commitments.filter((commitment) => commitment.status === 'completed').length
    const overdue = commitments.filter(
      (commitment) => commitmentStatusMeta(commitment.dueDate, commitment.status).key === 'overdue',
    ).length
    const dueSoon = commitments.filter(
      (commitment) => commitmentStatusMeta(commitment.dueDate, commitment.status).key === 'soon',
    ).length

    return [
      { label: 'Showing', value: commitments.length, tone: 'primary' },
      { label: 'Overdue', value: overdue, tone: 'danger' },
      { label: 'Due soon', value: dueSoon, tone: 'warning' },
      { label: 'Completed', value: completed, tone: 'success' },
    ]
  }, [commitments])

  const renderGroup = (group) => {
    const meta = group.meta ?? GROUP_META.later
    const Icon = meta.icon
    const open = isGroupOpen(group.key)

    return (
      <StaggerItem as="section" key={group.key} className="min-w-0">
        <button
          type="button"
          onClick={() => toggleGroup(group.key)}
          aria-expanded={open}
          className="mb-2.5 flex w-full items-center justify-between gap-3 rounded-lg px-1 py-1 text-left transition-colors hover:bg-overlay/60 cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <span className={cn('flex size-7 items-center justify-center rounded-lg', meta.iconClass)}>
              <Icon size={14} weight="bold" />
            </span>
            <h2 className={cn('text-small font-semibold', meta.headingClass)}>{group.label}</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-overlay px-2 py-0.5 text-tiny font-semibold tabular-nums text-ink-muted">
              {group.rows.length}
            </span>
            <CaretDown size={14} className={cn('text-ink-subtle transition-transform', open && 'rotate-180')} />
          </div>
        </button>
        <AnimatePresence initial={false}>
          {open ? (
            <motion.div
              key="content"
              initial={reduceMotion ? false : { height: 0, opacity: 0 }}
              animate={reduceMotion ? {} : { height: 'auto', opacity: 1 }}
              exit={reduceMotion ? {} : { height: 0, opacity: 0 }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="overflow-hidden rounded-2xl border border-line/80 bg-card shadow-xs">
                {group.rows.map((commitment) => (
                  <CommitmentRow
                    key={commitment.id}
                    commitment={commitment}
                    onComplete={handleComplete}
                  />
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </StaggerItem>
    )
  }

  const listKey = groups.map((group) => group.key + ':' + group.rows.length).join('|')


  const handleComplete = async (commitment) => {
    await complete(commitment.id)
    pushToast('Commitment completed.', 'success')
    refresh()
  }

  return (
    <PageContainer>

      <section className="mb-5 rounded-xl border border-line/80 bg-card px-4 py-3 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink-muted">
            Commitment overview
          </h2>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:justify-end">
            <div className="grid grid-cols-4 divide-x divide-line/70">
              {metrics.map((metric) => (
                <div key={metric.label} className="px-3 first:pl-0 last:pr-0">
                  <p
                    className={cn(
                      'text-lg font-bold tracking-tight tabular-nums',
                      metric.tone === 'danger' && metric.value > 0 ? 'text-danger' : 'text-ink',
                    )}
                  >
                    {metric.value}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] font-semibold text-ink-muted">{metric.label}</p>
                </div>
              ))}
            </div>

            <Button size="sm" onClick={() => setDialogOpen(true)} className="shrink-0 gap-1.5 shadow-sm">
              <Plus size={14} weight="bold" />
              New commitment
            </Button>
          </div>
        </div>
      </section>


      <Toolbar className="mb-6 rounded-xl border border-line/80 bg-card p-2 shadow-xs sm:px-2.5">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="hidden shrink-0 px-1 text-tiny font-semibold tracking-[0.08em] text-ink-subtle uppercase sm:inline">View</span>
            <FilterPills
              label="View commitments by due bucket"
              options={VIEW_OPTIONS}
              value={viewBucket}
              onChange={(value) => {
                setViewBucket(value)
                setOpenGroups({})
              }}
              size="sm"
            />
          </div>

          <div className="flex min-w-0 items-center gap-2">
            <span className="hidden shrink-0 px-1 text-tiny font-semibold tracking-[0.08em] text-ink-subtle uppercase sm:inline">Owner</span>
            <FilterPills
              label="Filter commitments by owner"
              options={OWNER_FILTERS}
              value={ownerFilter}
              onChange={(value) => {
                setOwnerFilter(value)
                setOpenGroups({})
              }}
              size="sm"
            />
          </div>

          <div className="flex min-w-0 items-center gap-2">
            <span className="hidden shrink-0 px-1 text-tiny font-semibold tracking-[0.08em] text-ink-subtle uppercase sm:inline">Group by</span>
            <FilterPills
              label="Group commitments by"
              options={GROUP_BY_OPTIONS}
              value={groupBy}
              onChange={setGroupBy}
              size="sm"
            />
          </div>
        </div>

        <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-small font-medium text-ink-muted transition-colors hover:bg-overlay hover:text-ink">
          <Switch checked={showCompleted} onCheckedChange={toggleShowCompleted} id="show-completed" />
          <span>Show completed</span>
        </label>
      </Toolbar>

      {isLoading && commitments.length === 0 ? (
        <CommitmentsSkeleton />
      ) : error ? (
        <EmptyState
          title="Couldn't load commitments"
          description={error}
          action={<Button onClick={refresh}>Try again</Button>}
        />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<CheckSquare size={24} weight="duotone" />}
          title="Nothing outstanding"
          description="Every commitment you track will show up here."
          action={<Button onClick={() => setDialogOpen(true)}>Create a commitment</Button>}
        />
      ) : (
        <StaggerGroup key={listKey} className="flex flex-col gap-6">{groups.map(renderGroup)}</StaggerGroup>
      )}

      <CommitmentDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </PageContainer>
  )
}

function CommitmentsSkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading commitments</span>

      {/* Expanded group (mirrors the default open "Overdue" section) */}
      <section className="min-w-0">
        <div className="mb-2.5 flex items-center justify-between gap-3 px-1 py-1">
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-7 rounded-lg" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-7 rounded-full" />
            <Skeleton className="size-3.5 rounded" />
          </div>
        </div>
        <div className="overflow-hidden rounded-2xl border border-line/80 bg-card shadow-xs">
          {Array.from({ length: 3 }).map((_, ri) => (
            <div key={ri} className="flex items-start gap-3 border-b border-line/70 px-4 py-3.5 last:border-b-0">
              <Skeleton className="mt-0.5 size-6 rounded-full" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
                  <Skeleton className="h-4 w-1/2 min-w-[120px]" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Collapsed groups (header row only) */}
      {Array.from({ length: 2 }).map((_, gi) => (
        <div key={gi} className="flex items-center justify-between gap-3 px-1 py-1">
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-7 rounded-lg" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-7 rounded-full" />
            <Skeleton className="size-3.5 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

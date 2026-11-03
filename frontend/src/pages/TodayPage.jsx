import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Brain,
  Check,
  CheckSquare,
  Clock,
  Lightning,
  Plus,
  Snowflake,
  Sparkle,
  Tray,
} from '@/components/icons'
import { useAuth } from '@/auth'
import { GoingColdRail } from '@/components/attention/GoingColdRail'
import { BrainDumpDialog } from '@/components/capture/BrainDumpDialog'
import { CommitmentRow } from '@/components/commitment/CommitmentRow'
import { PageContainer, PageHeader } from '@/components/layout/PageHeader'
import { ThreadCard } from '@/components/thread/ThreadCard'
import { Button } from '@/components/ui/Button'
import { EmptyState, Skeleton, ThreadCardSkeleton } from '@/components/ui/Feedback'
import { useAttention, useCommitments } from '@/hooks/useData'
import { greetingFor, longDate } from '@/lib/date'
import { useThreadStore, useUiStore } from '@/store'
import { cn } from '@/lib/utils'

/**
 * Today view (Feature 1) — Executive Attention Dashboard.
 */
export function TodayPage() {
  const { user } = useAuth()
  const { topThreads, dueToday, overdue, goingCold, inboxCount, isLoading, error, refresh } =
    useAttention()
  const { complete } = useCommitments({ autoLoad: false })
  const openQuickCapture = useUiStore((state) => state.openQuickCapture)
  const openInbox = useUiStore((state) => state.openInbox)
  const pushToast = useUiStore((state) => state.pushToast)
  const [dumpOpen, setDumpOpen] = useState(false)

  const fetchThreads = useThreadStore((state) => state.fetchThreads)
  const threads = useThreadStore((state) => state.threads)

  useEffect(() => {
    if (threads.length === 0) {
      fetchThreads().catch(() => {})
    }
  }, [threads.length, fetchThreads])

  const handleComplete = async (commitment) => {
    await complete(commitment.id)
    pushToast('Commitment completed.', 'success')
    refresh()
  }

  const isEmpty =
    topThreads.length === 0 &&
    goingCold.length === 0 &&
    dueToday.length === 0 &&
    overdue.length === 0

  return (
    <PageContainer>
      <PageHeader
        eyebrow={longDate()}
        title={greetingFor(user?.fullName ?? '')}
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDumpOpen(true)}>
              <Brain size={14} weight="duotone" />
              Brain dump
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={openInbox}
              className="gap-1.5"
            >
              <Tray size={14} weight="duotone" />
              {inboxCount > 0 ? `Inbox · ${inboxCount}` : 'Inbox'}
            </Button>
            <Button size="sm" onClick={() => openQuickCapture(null)} className="gap-1.5 shadow-sm">
              <Plus size={14} weight="bold" />
              Quick capture
            </Button>
          </>
        }
      />

      {isLoading && topThreads.length === 0 ? (
        <TodaySkeleton />
      ) : error ? (
        <EmptyState
          title="Couldn't refresh your attention list"
          description={error}
          action={<Button onClick={refresh}>Try again</Button>}
        />
      ) : isEmpty ? (
        <EmptyState
          icon={<Sparkle size={24} weight="duotone" />}
          title="Welcome to Friday"
          description="Create your first thread to start tracking relationships and commitments."
          action={
            <Link to="/threads">
              <Button>Go to threads</Button>
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          {/* Enhanced KPI Metrics Grid */}
          <div className="tw-rise grid grid-cols-2 gap-3.5 sm:grid-cols-4">
            {/* Attention Card */}
            <div className="group flex flex-col justify-between rounded-2xl border border-line/75 bg-card bg-gradient-to-br from-card via-card to-overlay/25 p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-line/90 hover:shadow-md">
              <div className="flex items-center justify-between gap-2">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-accent">
                  <Lightning size={16} weight="fill" />
                </span>
                <span className="rounded-md bg-accent/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-accent uppercase">
                  Focus
                </span>
              </div>
              <div className="mt-3.5">
                <p className="text-[28px] font-bold tracking-tight text-ink tabular-nums leading-none">
                  {topThreads.length}
                </p>
                <p className="mt-1 text-tiny font-medium text-ink-muted">Needs Attention</p>
              </div>
            </div>

            {/* Due Today Card */}
            <div className="group flex flex-col justify-between rounded-2xl border border-line/75 bg-card bg-gradient-to-br from-card via-card to-overlay/25 p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-line/90 hover:shadow-md">
              <div className="flex items-center justify-between gap-2">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <CheckSquare size={16} weight="bold" />
                </span>
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-primary uppercase">
                  Today
                </span>
              </div>
              <div className="mt-3.5">
                <p className="text-[28px] font-bold tracking-tight text-ink tabular-nums leading-none">
                  {dueToday.length}
                </p>
                <p className="mt-1 text-tiny font-medium text-ink-muted">Due Today</p>
              </div>
            </div>

            {/* Overdue Card */}
            <div className="group flex flex-col justify-between rounded-2xl border border-line/75 bg-card bg-gradient-to-br from-card via-card to-overlay/25 p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-line/90 hover:shadow-md">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-xl border',
                    overdue.length > 0
                      ? 'border-danger/25 bg-danger/10 text-danger'
                      : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600',
                  )}
                >
                  <Clock size={16} weight="bold" />
                </span>
                <span
                  className={cn(
                    'rounded-md px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase',
                    overdue.length > 0
                      ? 'bg-danger/10 text-danger'
                      : 'bg-emerald-500/10 text-emerald-600',
                  )}
                >
                  {overdue.length > 0 ? 'Urgent' : 'Clear'}
                </span>
              </div>
              <div className="mt-3.5">
                <p
                  className={cn(
                    'text-[28px] font-bold tracking-tight tabular-nums leading-none',
                    overdue.length > 0 ? 'text-danger' : 'text-ink',
                  )}
                >
                  {overdue.length}
                </p>
                <p className="mt-1 text-tiny font-medium text-ink-muted">
                  {overdue.length > 0 ? 'Overdue Commitments' : 'Overdue Tasks'}
                </p>
              </div>
            </div>

            {/* Going Cold Card */}
            <div className="group flex flex-col justify-between rounded-2xl border border-line/75 bg-card bg-gradient-to-br from-card via-card to-overlay/25 p-4 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-line/90 hover:shadow-md">
              <div className="flex items-center justify-between gap-2">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-cold/25 bg-cold/15 text-cold">
                  <Snowflake size={16} weight="bold" />
                </span>
                <span className="rounded-md bg-cold/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-cold uppercase">
                  Quiet
                </span>
              </div>
              <div className="mt-3.5">
                <p className="text-[28px] font-bold tracking-tight text-ink tabular-nums leading-none">
                  {goingCold.length}
                </p>
                <p className="mt-1 text-tiny font-medium text-ink-muted">Going Cold</p>
              </div>
            </div>
          </div>

          {/* Main Content Layout */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8 items-start">
            {/* Left Column: Needs Attention + Going Cold */}
            <div className="tw-rise flex flex-col gap-6 lg:col-span-7 xl:col-span-8" style={{ animationDelay: '70ms' }}>
              {topThreads.length > 0 ? (
                <section>
                  <div className="mb-3.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-gradient-to-br from-accent/15 to-accent/5 text-accent shadow-xs">
                        <Lightning size={15} weight="fill" />
                      </span>
                      <h2 className="text-heading-3 font-semibold tracking-tight text-ink">
                        Needs your attention
                      </h2>
                      <span className="inline-flex items-center gap-1 rounded-full border border-accent/30 bg-gradient-to-r from-accent/15 to-accent/5 px-2.5 py-0.5 text-tiny font-semibold tracking-wide text-accent uppercase shadow-xs">
                        <Sparkle size={10} weight="fill" />
                        Ranked
                      </span>
                    </div>
                    <Link
                      to="/threads"
                      className="group/btn inline-flex items-center gap-1.5 rounded-full border border-line/80 bg-surface/80 px-2.5 py-1 text-tiny font-medium text-ink-muted transition-all duration-150 hover:border-primary/40 hover:bg-card hover:text-primary hover:shadow-xs active:scale-95"
                    >
                      <span>View all</span>
                      <ArrowRight
                        size={11}
                        weight="bold"
                        className="transition-transform duration-150 group-hover/btn:translate-x-0.5"
                      />
                    </Link>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    {topThreads.map((thread) => (
                      <ThreadCard
                        key={thread.id}
                        thread={thread}
                        to={`/threads/${thread.id}`}
                        variant="focus"
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              {/* Going Cold Watchlist */}
              <GoingColdRail threads={goingCold} onChanged={refresh} />
            </div>

            {/* Right Column: Action Items & Shortcuts */}
            <div className="tw-rise flex flex-col gap-5 lg:col-span-5 xl:col-span-4 sticky top-6" style={{ animationDelay: '140ms' }}>
              {/* Today's Commitments Card */}
              <section className="rounded-2xl border border-line/80 bg-card bg-gradient-to-br from-card via-card to-overlay/20 p-4.5 shadow-xs">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <CheckSquare size={14} weight="bold" />
                    </span>
                    <h2 className="text-heading-3 font-semibold tracking-tight text-ink">Today's Commitments</h2>
                    <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary/10 text-tiny font-bold text-primary">
                      {overdue.length + dueToday.length}
                    </span>
                  </div>
                  <Link
                    to="/commitments"
                    className="group/btn inline-flex items-center gap-1.5 rounded-full border border-line/80 bg-surface/80 px-2.5 py-1 text-tiny font-medium text-ink-muted transition-all duration-150 hover:border-primary/40 hover:bg-card hover:text-primary hover:shadow-xs active:scale-95"
                  >
                    <span>View all</span>
                    <ArrowRight
                      size={11}
                      weight="bold"
                      className="transition-transform duration-150 group-hover/btn:translate-x-0.5"
                    />
                  </Link>
                </div>

                {overdue.length > 0 || dueToday.length > 0 ? (
                  <div className="divide-y divide-line/60 overflow-hidden rounded-xl border border-line/70 bg-card">
                    {[...overdue, ...dueToday].slice(0, 6).map((commitment) => (
                      <CommitmentRow
                        key={commitment.id}
                        commitment={commitment}
                        onComplete={handleComplete}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                      <Check size={20} weight="bold" />
                    </div>
                    <p className="text-small font-semibold text-ink">All caught up!</p>
                    <p className="text-tiny text-ink-muted mt-0.5">
                      No commitments due or overdue today.
                    </p>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}

      <BrainDumpDialog open={dumpOpen} onOpenChange={setDumpOpen} />
    </PageContainer>
  )
}


function TodaySkeleton() {
  return (
    <div className="flex flex-col gap-6" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Loading your overview</span>

      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col justify-between rounded-2xl border border-line/75 bg-card p-4 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="size-8 rounded-lg" />
              <Skeleton className="h-4 w-12 rounded-md" />
            </div>
            <div className="mt-3.5">
              <Skeleton className="h-7 w-10" />
              <Skeleton className="mt-1.5 h-3 w-20" />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8 items-start">
        <div className="flex flex-col gap-6 lg:col-span-7 xl:col-span-8">
          <Skeleton className="h-4 w-40" />
          <div className="grid gap-4 sm:grid-cols-2">
            <ThreadCardSkeleton />
            <ThreadCardSkeleton />
          </div>
        </div>
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="rounded-2xl border border-line/80 bg-card p-4.5 shadow-xs">
            <div className="mb-3 flex items-center justify-between">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            <div className="overflow-hidden rounded-xl border border-line/70 bg-card">
              {Array.from({ length: 4 }).map((_, ri) => (
                <div key={ri} className="flex items-start gap-3 border-b border-line/70 px-4 py-3.5 last:border-b-0">
                  <Skeleton className="mt-0.5 size-6 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="mt-2 h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

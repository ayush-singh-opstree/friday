import { useState } from 'react'
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
} from '@/components/icons'
import { useAuth } from '@/auth'
import { GoingColdRail } from '@/components/attention/GoingColdRail'
import { BrainDumpDialog } from '@/components/capture/BrainDumpDialog'
import { CommitmentRow } from '@/components/commitment/CommitmentRow'
import { PageContainer, PageHeader } from '@/components/layout/PageHeader'
import { ThreadCard } from '@/components/thread/ThreadCard'
import { Button } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/Card'
import { EmptyState, ThreadListSkeleton } from '@/components/ui/Feedback'
import { useAttention, useCommitments } from '@/hooks/useData'
import { greetingFor, longDate } from '@/lib/date'
import { useUiStore } from '@/store'
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
  const pushToast = useUiStore((state) => state.pushToast)
  const [dumpOpen, setDumpOpen] = useState(false)

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
            {inboxCount > 0 ? (
              <Link to="/threads">
                <Button variant="outline" size="sm">
                  Inbox · {inboxCount}
                </Button>
              </Link>
            ) : null}
            <Button size="sm" onClick={() => openQuickCapture(null)} className="gap-1.5 shadow-sm">
              <Plus size={14} weight="bold" />
              Quick capture
            </Button>
          </>
        }
      />

      {isLoading && topThreads.length === 0 ? (
        <ThreadListSkeleton count={4} />
      ) : error ? (
        <EmptyState
          title="Couldn't refresh your attention list"
          description={error}
          action={<Button onClick={refresh}>Try again</Button>}
        />
      ) : isEmpty ? (
        <EmptyState
          icon={<Sparkle size={24} weight="duotone" />}
          title="Welcome to Threadwise"
          description="Create your first thread to start tracking relationships and promises."
          action={
            <Link to="/threads">
              <Button>Go to threads</Button>
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          {/* Enhanced KPI Metrics Grid */}
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
            {/* Attention Card */}
            <div className="group flex flex-col justify-between rounded-2xl border border-line/75 bg-card p-4 shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:border-line hover:shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-accent/10 text-accent">
                  <Lightning size={16} weight="fill" />
                </span>
                <span className="rounded-md bg-accent/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-accent uppercase">
                  Focus
                </span>
              </div>
              <div className="mt-3.5">
                <p className="text-[26px] font-bold tracking-tight text-ink tabular-nums leading-none">
                  {topThreads.length}
                </p>
                <p className="mt-1 text-tiny font-medium text-ink-muted">Needs Attention</p>
              </div>
            </div>

            {/* Due Today Card */}
            <div className="group flex flex-col justify-between rounded-2xl border border-line/75 bg-card p-4 shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:border-line hover:shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                  <CheckSquare size={16} weight="bold" />
                </span>
                <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-primary uppercase">
                  Today
                </span>
              </div>
              <div className="mt-3.5">
                <p className="text-[26px] font-bold tracking-tight text-ink tabular-nums leading-none">
                  {dueToday.length}
                </p>
                <p className="mt-1 text-tiny font-medium text-ink-muted">Due Today</p>
              </div>
            </div>

            {/* Overdue Card */}
            <div className="group flex flex-col justify-between rounded-2xl border border-line/75 bg-card p-4 shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:border-line hover:shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-lg border',
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
                    'text-[26px] font-bold tracking-tight tabular-nums leading-none',
                    overdue.length > 0 ? 'text-danger' : 'text-ink',
                  )}
                >
                  {overdue.length}
                </p>
                <p className="mt-1 text-tiny font-medium text-ink-muted">
                  {overdue.length > 0 ? 'Overdue Promises' : 'Overdue Tasks'}
                </p>
              </div>
            </div>

            {/* Going Cold Card */}
            <div className="group flex flex-col justify-between rounded-2xl border border-line/75 bg-card p-4 shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:border-line hover:shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-cold/25 bg-cold/15 text-cold">
                  <Snowflake size={16} weight="bold" />
                </span>
                <span className="rounded-md bg-cold/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-cold uppercase">
                  Quiet
                </span>
              </div>
              <div className="mt-3.5">
                <p className="text-[26px] font-bold tracking-tight text-ink tabular-nums leading-none">
                  {goingCold.length}
                </p>
                <p className="mt-1 text-tiny font-medium text-ink-muted">Going Cold</p>
              </div>
            </div>
          </div>

          {/* Main Content Layout */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8 items-start">
            {/* Left Column: Needs Attention + Going Cold */}
            <div className="flex flex-col gap-6 lg:col-span-7 xl:col-span-8">
              {topThreads.length > 0 ? (
                <section>
                  <div className="mb-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <SectionHeader label="Needs your attention" className="mb-0" />
                      <span className="rounded-md bg-accent/15 px-2 py-0.5 text-tiny font-semibold text-accent">
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
                      <ThreadCard key={thread.id} thread={thread} to={`/threads/${thread.id}`} />
                    ))}
                  </div>
                </section>
              ) : null}

              {/* Going Cold Watchlist */}
              <GoingColdRail threads={goingCold} onChanged={refresh} />
            </div>

            {/* Right Column: Action Items & Shortcuts */}
            <div className="flex flex-col gap-5 lg:col-span-5 xl:col-span-4 sticky top-6">
              {/* Today's Commitments Card */}
              <section className="rounded-2xl border border-line/80 bg-card p-4.5 shadow-xs">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h2 className="text-heading-3 font-semibold text-ink">Today's Promises</h2>
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
                  <div className="space-y-1">
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
                    <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-2">
                      <Check size={20} weight="bold" />
                    </div>
                    <p className="text-small font-semibold text-ink">All caught up!</p>
                    <p className="text-tiny text-ink-muted mt-0.5">
                      No commitments due or overdue today.
                    </p>
                  </div>
                )}
              </section>

              {/* Brain Dump Card */}
              <div className="rounded-2xl border border-line/70 bg-gradient-to-br from-surface to-overlay/80 p-4.5">
                <div className="flex items-start gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Brain size={18} weight="duotone" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-small font-semibold text-ink">Fast Brain Dump</h4>
                    <p className="mt-0.5 text-tiny text-ink-muted leading-relaxed">
                      Jot down unstructured notes, promised follow-ups, or meeting takeaways.
                    </p>
                    <button
                      type="button"
                      onClick={() => setDumpOpen(true)}
                      className="mt-3 inline-flex items-center gap-1.5 text-tiny font-semibold text-primary hover:underline"
                    >
                      Open brain dump <ArrowRight size={11} weight="bold" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <BrainDumpDialog open={dumpOpen} onOpenChange={setDumpOpen} />
    </PageContainer>
  )
}

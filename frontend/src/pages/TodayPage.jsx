import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Brain, Sparkle } from '@phosphor-icons/react'
import { useAuth } from '@/auth'
import { GoingColdRail } from '@/components/attention/GoingColdRail'
import { BrainDumpDialog } from '@/components/capture/BrainDumpDialog'
import { CommitmentRow } from '@/components/commitment/CommitmentRow'
import { PageHeader } from '@/components/layout/PageHeader'
import { ThreadCard } from '@/components/thread/ThreadCard'
import { Button } from '@/components/ui/Button'
import { Card, SectionHeader } from '@/components/ui/Card'
import { EmptyState, ThreadListSkeleton } from '@/components/ui/Feedback'
import { useAttention, useCommitments } from '@/hooks/useData'
import { greetingFor, longDate } from '@/lib/date'
import { useUiStore } from '@/store'

/**
 * Today view (Feature 1) - the home screen and attention dashboard.
 *
 * Sections: Needs your attention (top 5 by score), Due today, Going cold.
 * Every section hides itself when empty (documented edge cases).
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
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        eyebrow={longDate()}
        title={greetingFor(user?.fullName ?? '')}
        description={
          topThreads.length > 0
            ? `${topThreads.length} thread${topThreads.length === 1 ? '' : 's'} need your attention today.`
            : 'Nothing is on fire. Nice work.'
        }
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
            <Button size="sm" onClick={() => openQuickCapture(null)}>
              Quick capture
            </Button>
          </>
        }
      />

      {isLoading && topThreads.length === 0 ? (
        <ThreadListSkeleton count={3} />
      ) : error ? (
        <EmptyState
          title="Couldn't refresh your attention list"
          description={error}
          action={<Button onClick={refresh}>Try again</Button>}
        />
      ) : isEmpty ? (
        <EmptyState
          icon={<Sparkle size={28} weight="duotone" />}
          title="Welcome to Threadwise"
          description="Create your first thread to start tracking the relationships and promises that matter."
          action={
            <Link to="/threads">
              <Button>Go to threads</Button>
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          {topThreads.length > 0 ? (
            <section>
              <SectionHeader label="Needs your attention" />
              <div className="flex flex-col gap-2.5">
                {topThreads.map((thread) => (
                  <ThreadCard key={thread.id} thread={thread} to={`/threads/${thread.id}`} />
                ))}
              </div>
            </section>
          ) : null}

          {dueToday.length > 0 || overdue.length > 0 ? (
            <section>
              <SectionHeader label="Due today" />
              <Card className="p-2">
                {[...overdue, ...dueToday].slice(0, 6).map((commitment) => (
                  <CommitmentRow
                    key={commitment.id}
                    commitment={commitment}
                    onComplete={handleComplete}
                  />
                ))}
              </Card>
            </section>
          ) : null}

          <GoingColdRail threads={goingCold} onChanged={refresh} />
        </div>
      )}

      <BrainDumpDialog open={dumpOpen} onOpenChange={setDumpOpen} />
    </div>
  )
}
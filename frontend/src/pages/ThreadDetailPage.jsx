import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Plus } from '@/components/icons'
import { makePersonDetails } from '@/lib/people'
import { useThreadStore, useUiStore } from '@/store'
import { PageContainer } from '@/components/layout/PageHeader'
import { ThreadHeader } from '@/components/thread/ThreadHeader'
import { TimelineTab } from '@/components/thread/TimelineTab'
import { ThreadCommitmentsTab } from '@/components/thread/ThreadCommitmentsTab'
import { ThreadPeopleTab } from '@/components/thread/ThreadPeopleTab'
import { BriefTab } from '@/components/thread/BriefTab'
import { Button } from '@/components/ui/Button'
import { CountBadge } from '@/components/ui/Badge'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Feedback'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'

/**
 * Thread detail (Feature 2) - full-width primary workspace for a relationship.
 * Four tabs: Timeline (default), Commitments, People and Brief.
 */
export function ThreadDetailPage() {
  const { threadId } = useParams()
  const openQuickCapture = useUiStore((state) => state.openQuickCapture)

  const thread = useThreadStore((state) => state.thread)
  const captures = useThreadStore((state) => state.captures)
  const commitments = useThreadStore((state) => state.commitments)
  const timeline = useThreadStore((state) => state.timeline)
  const summaries = useThreadStore((state) => state.summaries)
  const status = useThreadStore((state) => state.detailStatus)
  const error = useThreadStore((state) => state.error)
  const selectThread = useThreadStore((state) => state.selectThread)
  const [tab, setTab] = useState('timeline')

  useEffect(() => {
    selectThread(threadId)
  }, [threadId, selectThread])

  if (status === 'loading' && !thread) return <LoadingState label="Opening thread…" />

  if (status === 'error') {
    return (
      <ErrorState
        title="Couldn't open this thread"
        description={error ?? 'It may have been deleted.'}
        action={<Button onClick={() => selectThread(threadId)}>Try again</Button>}
      />
    )
  }

  if (!thread) {
    return (
      <EmptyState
        title="Thread not found"
        description="This thread does not exist, or you no longer have access to it."
      />
    )
  }

  const openCount = commitments.filter((row) => row.status === 'open').length
  const personDetails = makePersonDetails(commitments)

  return (
    <PageContainer>
      <ThreadHeader thread={thread} />

      <Tabs value={tab} onValueChange={setTab}>
        {/* Navigation & Action Bar */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList aria-label="Thread sections" className="w-full sm:w-auto">
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="commitments">
              Commitments
              <CountBadge value={openCount} />
            </TabsTrigger>
            <TabsTrigger value="people">People</TabsTrigger>
            <TabsTrigger value="brief">Brief</TabsTrigger>
          </TabsList>

          <Button size="sm" onClick={() => openQuickCapture(thread.id)} className="shrink-0 gap-1.5 shadow-sm">
            <Plus size={15} weight="bold" />
            Add capture
          </Button>
        </div>

        <TabsContent value="timeline">
          <TimelineTab
            timeline={timeline}
            captures={captures}
            commitments={commitments}
            threadId={thread.id}
            onRefresh={() => selectThread(thread.id)}
          />
        </TabsContent>

        <TabsContent value="commitments">
          <ThreadCommitmentsTab
            thread={thread}
            commitments={commitments}
            people={thread.people ?? []}
            onChanged={() => selectThread(thread.id)}
          />
        </TabsContent>

        <TabsContent value="people">
          <ThreadPeopleTab people={thread.people ?? []} personDetails={personDetails} />
        </TabsContent>

        <TabsContent value="brief">
          <BriefTab
            thread={thread}
            summaries={summaries}
            captures={captures}
            commitments={commitments}
          />
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}

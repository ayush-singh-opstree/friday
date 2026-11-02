import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion, useMotionValue, useReducedMotion, useSpring } from 'motion/react'
import { useThreadStore } from '@/store'
import { PageContainer } from '@/components/layout/PageHeader'
import { ThreadHeader } from '@/components/thread/ThreadHeader'
import { TimelineTab } from '@/components/thread/TimelineTab'
import { ThreadCommitmentsTab } from '@/components/thread/ThreadCommitmentsTab'
import { BriefTab } from '@/components/thread/BriefTab'
import { Button } from '@/components/ui/Button'
import { CountBadge } from '@/components/ui/Badge'
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/Feedback'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'

const THREAD_TABS = [
  { value: 'timeline', label: 'Timeline' },
  { value: 'commitments', label: 'Commitments' },
  { value: 'brief', label: 'Brief' },
]

/**
 * Thread detail (Feature 2) - full-width primary workspace for a relationship.
 * Three tabs: Timeline (default), Commitments and Brief. People are managed
 * from the thread header.
 */
export function ThreadDetailPage() {
  const { threadId } = useParams()
  const thread = useThreadStore((state) => state.thread)
  const captures = useThreadStore((state) => state.captures)
  const commitments = useThreadStore((state) => state.commitments)
  const timeline = useThreadStore((state) => state.timeline)
  const clubs = useThreadStore((state) => state.clubs)
  const summaries = useThreadStore((state) => state.summaries)
  const status = useThreadStore((state) => state.detailStatus)
  const error = useThreadStore((state) => state.error)
  const selectThread = useThreadStore((state) => state.selectThread)
  const [tab, setTab] = useState('timeline')
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    selectThread(threadId)
  }, [threadId, selectThread])

  // Never render a thread whose id doesn't match the route (e.g. the frame right
  // after switching threads, before the store effect runs).
  const isStaleThread = Boolean(thread) && thread.id !== threadId

  if ((status === 'loading' && !thread) || isStaleThread) return <LoadingState label="Opening thread…" />

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

  return (
    <PageContainer>
      <ScrollProgress />
      <Tabs value={tab} onValueChange={setTab}>
        <ThreadHeader
          thread={thread}
          tabBar={
            <TabsList aria-label="Thread sections" className="relative w-full bg-overlay sm:w-auto">
              {THREAD_TABS.map((item) => {
                const active = tab === item.value
                return (
                  <TabsTrigger
                    key={item.value}
                    value={item.value}
                    className="relative data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                  >
                    {active ? (
                      <motion.span
                        layoutId="thread-tab-pill"
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 rounded-sm bg-card shadow-sm"
                        transition={
                          reduceMotion
                            ? { duration: 0 }
                            : { type: 'spring', stiffness: 420, damping: 34 }
                        }
                      />
                    ) : null}
                    <span className="relative z-10 inline-flex items-center gap-1.5">
                      {item.label}
                      {item.value === 'commitments' ? <CountBadge value={openCount} /> : null}
                    </span>
                  </TabsTrigger>
                )
              })}
            </TabsList>
          }
        />

        <TabsContent value="timeline" className="tw-rise">
          <TimelineTab
            timeline={timeline}
            captures={captures}
            commitments={commitments}
            clubs={clubs}
            threadId={thread.id}
            onRefresh={() => selectThread(thread.id)}
          />
        </TabsContent>

        <TabsContent value="commitments" className="tw-rise">
          <ThreadCommitmentsTab
            thread={thread}
            commitments={commitments}
            people={thread.people ?? []}
            onChanged={() => selectThread(thread.id)}
          />
        </TabsContent>

        <TabsContent value="brief" className="tw-rise">
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

/**
 * Thin scroll-progress line pinned to the top of the thread workspace.
 * Finds the nearest scroll container (the app's ScrollArea viewport) and fills
 * a spring-smoothed bar as the user scrolls. Snaps under reduced motion.
 */
function ScrollProgress() {
  const anchorRef = useRef(null)
  const reduceMotion = useReducedMotion()
  const raw = useMotionValue(0)
  const spring = useSpring(raw, { stiffness: 260, damping: 40, restDelta: 0.001 })
  const scaleX = reduceMotion ? raw : spring

  useEffect(() => {
    const anchor = anchorRef.current
    if (!anchor) return undefined

    let node = anchor.parentElement
    while (node && node !== document.body) {
      const { overflowY } = getComputedStyle(node)
      if (
        overflowY === 'auto' ||
        overflowY === 'scroll' ||
        overflowY === 'overlay' ||
        node.hasAttribute('data-radix-scroll-area-viewport')
      ) {
        break
      }
      node = node.parentElement
    }
    const scroller = node && node !== document.body ? node : null
    if (!scroller) return undefined

    const onScroll = () => {
      const max = scroller.scrollHeight - scroller.clientHeight
      raw.set(max > 0 ? Math.min(1, Math.max(0, scroller.scrollTop / max)) : 0)
    }
    onScroll()
    scroller.addEventListener('scroll', onScroll, { passive: true })
    return () => scroller.removeEventListener('scroll', onScroll)
  }, [raw])

  return (
    <>
      <span ref={anchorRef} aria-hidden="true" className="absolute size-0" />
      <div
        aria-hidden="true"
        className="sticky top-0 z-30 h-0.5 w-full overflow-hidden bg-transparent"
      >
        <motion.div
          className="h-full origin-left bg-gradient-to-r from-primary to-accent"
          style={{ scaleX }}
        />
      </div>
    </>
  )
}

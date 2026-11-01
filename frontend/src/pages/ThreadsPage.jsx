import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChatCircleDots, Plus } from '@/components/icons'
import { PageContainer, PageHeader } from '@/components/layout/PageHeader'
import { ThreadCard } from '@/components/thread/ThreadCard'
import { ThreadDialog } from '@/components/thread/ThreadDialog'
import { Button } from '@/components/ui/Button'
import { FilterPills, SelectMenu, StaggerGroup, StaggerItem, Toolbar } from '@/components/ui'
import { EmptyState, ThreadListSkeleton } from '@/components/ui/Feedback'
import { THREAD_FILTERS, THREAD_SORTS } from '@/config/constants'
import { useThreads } from '@/hooks/useData'
import { useUiStore } from '@/store'

/**
 * Threads list (Feature 2).
 */
export function ThreadsPage() {
  const { threads, isLoading, error, filter, sort, refresh, setFilter, setSort } = useThreads()
  const openQuickCapture = useUiStore((state) => state.openQuickCapture)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  const filterParam = searchParams.get('filter')
  useEffect(() => {
    if (filterParam && THREAD_FILTERS.some((option) => option.value === filterParam)) {
      setFilter(filterParam)
      setSearchParams({}, { replace: true })
    }
  }, [filterParam, setFilter, setSearchParams])

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Threads"
        title="Your relationships"
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => openQuickCapture(null)}>
              Quick capture
            </Button>
            <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5 shadow-sm">
              <Plus size={14} weight="bold" />
              New thread
            </Button>
          </>
        }
      />

      <Toolbar>
        <FilterPills
          label="Filter threads"
          options={THREAD_FILTERS}
          value={filter}
          onChange={setFilter}
        />

        <div className="flex items-center gap-2">
          <span className="shrink-0 text-tiny font-medium text-ink-muted">Sort by</span>
          <SelectMenu
            value={sort}
            onChange={setSort}
            options={THREAD_SORTS}
            size="sm"
            className="w-full sm:w-44"
          />
        </div>
      </Toolbar>

      {isLoading && threads.length === 0 ? (
        <ThreadListSkeleton count={4} />
      ) : error ? (
        <EmptyState
          title="Couldn't load your threads"
          description={error}
          action={<Button onClick={refresh}>Try again</Button>}
        />
      ) : threads.length === 0 ? (
        <EmptyState
          icon={<ChatCircleDots size={24} weight="duotone" />}
          title={filter === 'active' ? 'No threads here yet' : 'Nothing in this view'}
          description={
            filter === 'archived'
              ? 'Threads you archive land here, with their history intact.'
              : filter === 'snoozed'
                ? 'Threads you snooze stay here until they come back.'
                : "Start a thread for each relationship you're managing, then capture as you go."
          }
          action={<Button onClick={() => setDialogOpen(true)}>Create a thread</Button>}
        />
      ) : (
        <StaggerGroup as="ul" className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {threads.map((thread) => (
            <StaggerItem as="li" key={thread.id}>
              <ThreadCard thread={thread} to={`/threads/${thread.id}`} />
            </StaggerItem>
          ))}
        </StaggerGroup>
      )}

      <ThreadDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </PageContainer>
  )
}

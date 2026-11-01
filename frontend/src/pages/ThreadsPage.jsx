import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChatCircleDots, Plus } from '@phosphor-icons/react'
import { PageHeader } from '@/components/layout/PageHeader'
import { ThreadCard } from '@/components/thread/ThreadCard'
import { ThreadDialog } from '@/components/thread/ThreadDialog'
import { Button } from '@/components/ui/Button'
import { EmptyState, ThreadListSkeleton } from '@/components/ui/Feedback'
import { Select } from '@/components/ui/Controls'
import { THREAD_FILTERS, THREAD_SORTS } from '@/config/constants'
import { useThreads } from '@/hooks/useData'
import { useUiStore } from '@/store'
import { cn } from '@/lib/utils'

/**
 * Threads list (Feature 2).
 *
 * Filter + sort persist in `threadStore` for the session
 * (Requirement 1, criterion 8); `?filter=` deep-links from Today and elsewhere.
 */
export function ThreadsPage() {
  const { threads, isLoading, error, filter, sort, refresh, setFilter, setSort } = useThreads()
  const openQuickCapture = useUiStore((state) => state.openQuickCapture)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  // Deep link: /threads?filter=goingCold
  const filterParam = searchParams.get('filter')
  useEffect(() => {
    if (filterParam && THREAD_FILTERS.some((option) => option.value === filterParam)) {
      setFilter(filterParam)
      setSearchParams({}, { replace: true })
    }
  }, [filterParam, setFilter, setSearchParams])

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        eyebrow="Threads"
        title="Your relationships"
        description="Every conversation, capture and promise, grouped by relationship."
        actions={
          <>
            <Button variant="ghost" size="sm" onClick={() => openQuickCapture(null)}>
              Quick capture
            </Button>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus size={14} weight="bold" />
              New thread
            </Button>
          </>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter threads">
          {THREAD_FILTERS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={filter === option.value}
              onClick={() => setFilter(option.value)}
              className={cn(
                'h-8 rounded-full px-3 text-small font-medium transition-colors',
                filter === option.value
                  ? 'bg-primary text-ink-inverse'
                  : 'bg-overlay text-ink-muted hover:text-ink',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="thread-sort" className="text-tiny text-ink-muted">
            Sort
          </label>
          <Select
            id="thread-sort"
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            className="h-8 w-40"
          >
            {THREAD_SORTS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
      </div>

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
          icon={<ChatCircleDots size={28} weight="duotone" />}
          title={filter === 'active' ? 'No threads here yet' : 'Nothing in this view'}
          description={
            filter === 'archived'
              ? 'Threads you archive land here, with their history intact.'
              : filter === 'snoozed'
                ? 'Threads you snooze stay here until they come back.'
                : 'Start a thread for each relationship you are managing, then capture as you go.'
          }
          action={<Button onClick={() => setDialogOpen(true)}>Create a thread</Button>}
        />
      ) : (
        <div className="flex flex-col gap-2.5">
          {threads.map((thread) => (
            <ThreadCard key={thread.id} thread={thread} to={`/threads/${thread.id}`} />
          ))}
        </div>
      )}

      <ThreadDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
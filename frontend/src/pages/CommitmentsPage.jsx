import { useMemo, useState } from 'react'
import { CheckSquare, Plus } from '@/components/icons'
import { PageContainer, PageHeader } from '@/components/layout/PageHeader'
import { CommitmentDialog } from '@/components/commitment/CommitmentDialog'
import { CommitmentRow } from '@/components/commitment/CommitmentRow'
import { Button } from '@/components/ui/Button'
import { FilterPills, Toolbar } from '@/components/ui'
import { EmptyState, LoadingState } from '@/components/ui/Feedback'
import { Switch } from '@/components/ui/Controls'
import { DUE_BUCKET_LABELS, dueBucket } from '@/lib/date'
import { useCommitments, useThreads } from '@/hooks/useData'
import { useUiStore } from '@/store'
import { cn } from '@/lib/utils'

const OWNER_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'mine', label: 'Mine' },
  { value: 'theirs', label: 'Theirs' },
  { value: 'overdue', label: 'Overdue' },
]

const GROUP_ORDER = ['overdue', 'today', 'this_week', 'later', 'no_date', 'completed']

/**
 * Unified commitments view (Feature 5).
 */
export function CommitmentsPage() {
  const {
    commitments,
    isLoading,
    error,
    ownerFilter,
    showCompleted,
    setOwnerFilter,
    toggleShowCompleted,
    complete,
    refresh,
  } = useCommitments()
  useThreads({ autoLoad: true })

  const pushToast = useUiStore((state) => state.pushToast)
  const [dialogOpen, setDialogOpen] = useState(false)

  const groups = useMemo(() => {
    const buckets = new Map()
    for (const commitment of commitments) {
      const key = dueBucket(commitment.dueDate, commitment.status)
      if (!buckets.has(key)) buckets.set(key, [])
      buckets.get(key).push(commitment)
    }
    return GROUP_ORDER.filter((key) => buckets.has(key)).map((key) => ({
      key,
      label: DUE_BUCKET_LABELS[key],
      rows: buckets.get(key),
    }))
  }, [commitments])

  const handleComplete = async (commitment) => {
    await complete(commitment.id)
    pushToast('Commitment completed.', 'success')
    refresh()
  }

  return (
    <PageContainer>
      <PageHeader
        eyebrow="Commitments"
        title="Everything you've promised"
        actions={
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus size={14} weight="bold" />
            New commitment
          </Button>
        }
      />

      <Toolbar>
        <FilterPills
          label="Filter commitments by owner"
          options={OWNER_FILTERS}
          value={ownerFilter}
          onChange={setOwnerFilter}
        />

        <label className="flex cursor-pointer items-center gap-2 text-small text-ink-muted">
          <Switch checked={showCompleted} onCheckedChange={toggleShowCompleted} id="show-completed" />
          Show completed
        </label>
      </Toolbar>

      {isLoading && commitments.length === 0 ? (
        <LoadingState label="Loading commitments…" />
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
          description="Every promise you track will show up here, grouped by due date."
          action={<Button onClick={() => setDialogOpen(true)}>Create a commitment</Button>}
        />
      ) : (
        <div className="grid gap-5 xl:grid-cols-2 xl:items-start">
          {groups.map((group) => (
            <section key={group.key}>
              <h2
                className={cn(
                  'mb-2 text-tiny font-semibold tracking-[0.08em] uppercase',
                  group.key === 'overdue' ? 'text-danger' : 'text-ink-subtle',
                )}
              >
                {group.label} · {group.rows.length}
              </h2>
              <div className="rounded-xl border border-line bg-card p-1.5 shadow-sm">
                {group.rows.map((commitment) => (
                  <CommitmentRow
                    key={commitment.id}
                    commitment={commitment}
                    onComplete={handleComplete}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <CommitmentDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </PageContainer>
  )
}

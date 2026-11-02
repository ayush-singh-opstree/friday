import { useMemo, useState } from 'react'
import { Plus } from '@/components/icons'
import { CommitmentDialog } from '@/components/commitment/CommitmentDialog'
import { CommitmentRow } from '@/components/commitment/CommitmentRow'
import { Button } from '@/components/ui/Button'
import { CountBadge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/Feedback'
import { useCommitmentStore, useUiStore } from '@/store'
import { cn } from '@/lib/utils'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'mine', label: 'Mine' },
  { value: 'theirs', label: 'Theirs' },
]

/**
 * Commitments tab on a thread (Feature 2 -> Thread Detail, item 3).
 * Filter by owner; open and closed commitments are separated.
 */
export function ThreadCommitmentsTab({ thread, commitments = [], people = [], onChanged }) {
  const [ownerFilter, setOwnerFilter] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const completeCommitment = useCommitmentStore((state) => state.completeCommitment)
  const reopenCommitment = useCommitmentStore((state) => state.reopenCommitment)
  const pushToast = useUiStore((state) => state.pushToast)

  const { open, closed } = useMemo(() => {
    const filtered = commitments.filter((commitment) => {
      if (ownerFilter === 'mine') return commitment.ownerType === 'me'
      if (ownerFilter === 'theirs') return commitment.ownerType === 'person'
      return true
    })
    return {
      open: filtered.filter((row) => row.status === 'open'),
      closed: filtered
        .filter((row) => row.status === 'completed')
        .sort((a, b) => new Date(b.completedAt ?? 0) - new Date(a.completedAt ?? 0)),
    }
  }, [commitments, ownerFilter])

  const handleComplete = async (commitment) => {
    await completeCommitment(commitment.id)
    pushToast('Commitment completed.', 'success')
    onChanged?.()
  }

  const handleReopen = async (commitment) => {
    await reopenCommitment(commitment.id)
    pushToast('Commitment reopened.', 'info')
    onChanged?.()
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex gap-1.5">
          {FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setOwnerFilter(filter.value)}
              aria-pressed={ownerFilter === filter.value}
              className={cn(
                'h-7 rounded-full px-2.5 text-tiny font-medium transition-colors',
                ownerFilter === filter.value
                  ? 'bg-primary text-ink-inverse'
                  : 'bg-overlay text-ink-muted hover:text-ink',
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus size={13} weight="bold" />
          New
        </Button>
      </div>

      {open.length === 0 && closed.length === 0 ? (
        <EmptyState
          title="No commitments yet"
          description="Track what you promised, or what they promised you, so nothing slips."
          action={<Button onClick={() => setDialogOpen(true)}>Create commitment</Button>}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <CommitmentGroup
            label="Open"
            accent="bg-primary"
            rows={open}
            emptyText="Nothing outstanding. Nice."
            renderRow={(commitment) => (
              <CommitmentRow
                key={commitment.id}
                commitment={commitment}
                showThread={false}
                onComplete={handleComplete}
              />
            )}
          />

          {closed.length > 0 ? (
            <CommitmentGroup
              label="Completed"
              accent="bg-success"
              rows={closed}
              renderRow={(commitment) => (
                <CommitmentRow
                  key={commitment.id}
                  commitment={commitment}
                  showThread={false}
                  onReopen={handleReopen}
                />
              )}
            />
          ) : null}
        </div>
      )}

      <CommitmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        threadId={thread?.id ?? null}
        people={people}
      />
    </div>
  )
}

/**
 * Consistent group card used for both the open and completed buckets, so the
 * thread tab reads exactly like the global Commitments page.
 */
function CommitmentGroup({ label, accent, rows, emptyText, renderRow }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-line bg-card shadow-sm">
      <header className="flex items-center gap-2 border-b border-line/70 bg-overlay/40 px-4 py-2.5">
        <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', accent)} />
        <h3 className="text-small font-semibold text-ink">{label}</h3>
        <CountBadge value={rows.length} />
      </header>
      {rows.length === 0 ? (
        <p className="px-4 py-3 text-small text-ink-subtle">{emptyText}</p>
      ) : (
        <div className="divide-y divide-line/60">{rows.map(renderRow)}</div>
      )}
    </section>
  )
}
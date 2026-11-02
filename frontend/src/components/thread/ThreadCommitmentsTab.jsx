import { useMemo, useState } from 'react'
import { Plus } from '@/components/icons'
import { CommitmentDialog } from '@/components/commitment/CommitmentDialog'
import { CommitmentRow } from '@/components/commitment/CommitmentRow'
import { Button } from '@/components/ui/Button'
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
          <section>
            <h3 className="mb-1 text-tiny font-semibold tracking-[0.08em] text-ink-subtle uppercase">
              Open · {open.length}
            </h3>
            {open.length === 0 ? (
              <p className="py-2 text-small text-ink-subtle">Nothing outstanding. Nice.</p>
            ) : (
              <div className="rounded-md border border-line bg-card p-1">
                {open.map((commitment) => (
                  <CommitmentRow
                    key={commitment.id}
                    commitment={commitment}
                    showThread={false}
                    onComplete={handleComplete}
                  />
                ))}
              </div>
            )}
          </section>

          {closed.length > 0 ? (
            <section>
              <h3 className="mb-1 text-tiny font-semibold tracking-[0.08em] text-ink-subtle uppercase">
                Completed · {closed.length}
              </h3>
              <div className="rounded-md border border-line bg-card p-1">
                {closed.map((commitment) => (
                  <button
                    key={commitment.id}
                    type="button"
                    onClick={() => handleReopen(commitment)}
                    className="w-full text-left"
                    title="Reopen this commitment"
                  >
                    <CommitmentRow commitment={commitment} showThread={false} />
                  </button>
                ))}
              </div>
            </section>
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
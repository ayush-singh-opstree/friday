import { CloudArrowUp } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

/**
 * Sync state for a single record / the whole queue.
 *
 * docs/06_data_model.md -> "Pending Captures UI": offline captures show a grey
 * dot, and the indicator turns green once the server confirms.
 */
export function SyncBadge({ status = 'synced', className }) {
  if (status === 'synced' || !status) return null

  const pending = status === 'pending_sync'

  return (
    <span
      title={pending ? 'Waiting to sync' : 'Sync failed'}
      aria-label={pending ? 'Waiting to sync' : 'Sync failed'}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
        pending ? 'bg-warning/15 text-[#8a5a06]' : 'bg-danger/10 text-danger',
        className,
      )}
    >
      <CloudArrowUp size={10} weight="bold" />
      {pending ? 'Pending' : 'Failed'}
    </span>
  )
}
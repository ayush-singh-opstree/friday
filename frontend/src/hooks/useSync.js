import { useCallback } from 'react'
import { useSyncStore } from '@/store'

/**
 * Connectivity + offline queue.
 * @returns {{ online: boolean, pendingCount: number, failedCount: number,
 *             lastSyncedAt: string|null, syncing: boolean, flush: () => Promise<unknown> }}
 */
export function useSync() {
  const online = useSyncStore((state) => state.online)
  const pendingCount = useSyncStore((state) => state.pendingCount)
  const failedCount = useSyncStore((state) => state.failedCount)
  const lastSyncedAt = useSyncStore((state) => state.lastSyncedAt)
  const status = useSyncStore((state) => state.status)

  const flush = useCallback(() => useSyncStore.getState().flush(), [])

  return {
    online,
    pendingCount,
    failedCount,
    lastSyncedAt,
    syncing: status === 'syncing',
    flush,
  }
}
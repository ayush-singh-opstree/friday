import { create } from 'zustand'
import { countPendingOps, enqueueOp, flushOutbox, getLastSyncedAt, listFailedOps } from '@/offline'
import { pluralise } from '@/lib/utils'
import { useUiStore } from './uiStore'

/**
 * syncStore - connectivity, the outbox and replay state
 * (docs/08_system_architecture.md -> State Architecture -> syncStore).
 *
 * Single source of truth for "are we online" and "how many writes are queued",
 * so no component has to guess.
 */
export const useSyncStore = create((set, get) => ({
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  /** 'idle' | 'syncing' | 'error' */
  status: 'idle',
  pendingCount: 0,
  failedCount: 0,
  /** @type {string | null} */
  lastSyncedAt: null,

  /**
   * Attach connectivity listeners and hydrate the queue.
   * Returns a cleanup function (used by `AppProviders`).
   */
  async init() {
    const [lastSyncedAt, pendingCount, failed] = await Promise.all([
      getLastSyncedAt().catch(() => null),
      countPendingOps().catch(() => 0),
      listFailedOps().catch(() => []),
    ])

    set({ lastSyncedAt, pendingCount, failedCount: failed.length })

    if (typeof window === 'undefined') return () => {}

    const goOnline = () => {
      set({ online: true })
      get().flush()
    }
    const goOffline = () => set({ online: false })

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    set({ online: navigator.onLine })

    // Replay anything left over from a previous session.
    if (navigator.onLine && pendingCount > 0) get().flush()

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  },

  /** @param {boolean} online */
  setOnline(online) {
    set({ online })
    if (online) get().flush()
  },

  async refreshPending() {
    const pendingCount = await countPendingOps().catch(() => 0)
    set({ pendingCount })
    return pendingCount
  },

  /**
   * Queue a write for replay.
   * @param {string} kind One of `OP_KINDS`
   * @param {object} payload
   * @param {{ label?: string }} [meta]
   */
  async enqueue(kind, payload, meta) {
    await enqueueOp(kind, payload, meta)
    await get().refreshPending()
    return get().pendingCount
  },

  /** Drain the outbox. Safe to call concurrently - it self-guards. */
  async flush() {
    if (get().status === 'syncing' || !get().online) return { replayed: 0, remaining: get().pendingCount }

    set({ status: 'syncing' })
    try {
      const result = await flushOutbox()
      set({
        status: 'idle',
        pendingCount: result.remaining,
        lastSyncedAt: result.lastSyncedAt,
        failedCount: result.failed,
      })

      if (result.replayed > 0) {
        useUiStore
          .getState()
          .pushToast(`${pluralise(result.replayed, 'change')} synced.`, 'success')
      }
      return result
    } catch (error) {
      set({ status: 'error' })
      return { replayed: 0, remaining: get().pendingCount, error }
    }
  },
}))
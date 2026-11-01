import { create } from 'zustand'
import { STORAGE_KEYS } from '@/config/constants'
import { getValue, setValue } from '@/lib/storage'

/**
 * syncStore - connectivity and the offline write queue.
 *
 * Local-first reads with a pending-operations queue mirrors the sync strategy
 * in docs/06_data_model.md -> "Offline and Sync Strategy".
 */
export const useSyncStore = create((set, get) => ({
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
  /** @type {Array<{ id: string, label: string, run: () => Promise<unknown> }>} */
  queue: [],
  /** @type {string | null} */
  lastSyncedAt: null,
  syncing: false,

  async hydrate() {
    const lastSyncedAt = await getValue(STORAGE_KEYS.LAST_SYNC, null)
    set({ lastSyncedAt })
  },

  /** @param {boolean} online */
  setOnline(online) {
    set({ online })
    if (online) get().flush()
  },

  /**
   * Queue a write that failed while offline.
   * @param {string} label
   * @param {() => Promise<unknown>} run
   */
  enqueue(label, run) {
    set((state) => ({ queue: [...state.queue, { id: `${Date.now()}-${state.queue.length}`, label, run }] }))
  },

  /** Drain the queue in FIFO order with exponential backoff on failure. */
  async flush() {
    const { queue, syncing } = get()
    if (syncing || queue.length === 0) return

    set({ syncing: true })
    const remaining = []

    for (const operation of queue) {
      let attempt = 0
      let done = false
      while (attempt < 4 && !done) {
        try {
          await operation.run()
          done = true
        } catch {
          attempt += 1
          await new Promise((resolve) => setTimeout(resolve, 2 ** attempt * 500))
        }
      }
      if (!done) remaining.push(operation)
    }

    const syncedAt = new Date().toISOString()
    set({ queue: remaining, syncing: false, lastSyncedAt: syncedAt })
    await setValue(STORAGE_KEYS.LAST_SYNC, syncedAt)
  },
}))

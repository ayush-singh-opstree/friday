import { create } from 'zustand'
import { capturesApi } from '@/apis'
import { useSyncStore } from './syncStore'

/**
 * captureStore - the Inbox, the most recent captures and the Quick Capture
 * write path.
 *
 * Writes are optimistic: the capture appears immediately and, if the request
 * fails while offline, is queued in `syncStore` for the next reconnect
 * (docs/06_data_model.md -> Offline and Sync Strategy).
 */
export const useCaptureStore = create((set) => ({
  /** @type {any[]} Unassigned captures (threadId === null). */
  inbox: [],
  /** @type {any[]} */
  recent: [],
  status: 'idle',
  /** @type {string | null} */
  error: null,
  saving: false,

  async fetchInbox() {
    set({ status: 'loading' })
    try {
      const data = await capturesApi.list({ status: 'inbox' })
      set({ inbox: data?.captures ?? [], status: 'ready' })
      return data?.captures ?? []
    } catch (error) {
      set({ status: 'error', error: error?.message ?? 'Could not load your Inbox.' })
      return []
    }
  },

  /** @param {{ threadId?: string, personId?: string }} [params] */
  async fetchRecent(params = {}) {
    try {
      const data = await capturesApi.list(params)
      set({ recent: data?.captures ?? [] })
      return data?.captures ?? []
    } catch {
      return []
    }
  },

  /**
   * @param {{ content: string, type?: string, threadId?: string | null,
   *           personId?: string | null, source?: string }} payload
   */
  async createCapture(payload) {
    const content = String(payload?.content ?? '').trim()
    if (!content) throw new Error('Add something to capture.')

    set({ saving: true, error: null })

    const optimistic = {
      id: `local_${Date.now()}`,
      threadId: payload.threadId ?? null,
      personId: payload.personId ?? null,
      type: payload.type ?? 'note',
      content,
      source: payload.source ?? 'extension',
      status: payload.threadId ? 'filed' : 'inbox',
      capturedAt: new Date().toISOString(),
      syncStatus: 'pending_sync',
    }
    set((state) => ({ recent: [optimistic, ...state.recent] }))

    try {
      const data = await capturesApi.create({ ...payload, content })
      const capture = data?.capture
      set((state) => ({
        recent: state.recent.map((row) =>
          row.id === optimistic.id ? { ...capture, syncStatus: 'synced' } : row,
        ),
        inbox: capture && !capture.threadId ? [capture, ...state.inbox] : state.inbox,
        saving: false,
      }))
      return capture
    } catch (error) {
      set({ saving: false, error: error?.message ?? 'Could not save that capture.' })
      useSyncStore.getState().enqueue(`capture:${content.slice(0, 24)}`, () =>
        capturesApi.create({ ...payload, content }),
      )
      throw error
    }
  },

  /** File an Inbox capture into a thread. */
  async assignCapture(captureId, threadId) {
    const data = await capturesApi.assign(captureId, threadId)
    set((state) => ({ inbox: state.inbox.filter((row) => row.id !== captureId) }))
    return data?.capture
  },

  /** @param {string} captureId */
  async deleteCapture(captureId) {
    await capturesApi.remove(captureId)
    set((state) => ({
      inbox: state.inbox.filter((row) => row.id !== captureId),
      recent: state.recent.filter((row) => row.id !== captureId),
    }))
  },
}))

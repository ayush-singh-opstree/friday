import { create } from 'zustand'
import { capturesApi } from '@/apis'
import { mirrorCaptures } from '@/offline'
import { OP_KINDS } from '@/offline/outbox'
import { useSyncStore } from './syncStore'
import { useAttentionStore } from './attentionStore'

/**
 * captureStore - Inbox, recent captures and the Quick Capture write path
 * (Feature 4).
 *
 * Offline-first (Requirement 11): a capture is written optimistically, and when
 * the browser is offline the write is queued in the outbox and replayed on
 * reconnect instead of being lost.
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
      const list = data?.captures ?? []
      set({ inbox: list, status: 'ready' })
      useAttentionStore.setState({ inboxCount: list.length })
      await mirrorCaptures(list).catch(() => {})
      return list
    } catch (error) {
      set({ status: 'error', error: error?.message ?? 'Could not load your Inbox.' })
      return []
    }
  },

  /** @param {{ threadId?: string, personId?: string }} [params] */
  async fetchRecent(params = {}) {
    try {
      const data = await capturesApi.list(params)
      const list = data?.captures ?? []
      set({ recent: list })
      await mirrorCaptures(list).catch(() => {})
      return list
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
      source: payload.source ?? 'manual',
      status: payload.threadId ? 'filed' : 'inbox',
      capturedAt: new Date().toISOString(),
      syncStatus: 'pending_sync',
      isQueued: !useSyncStore.getState().online,
    }
    set((state) => ({ recent: [optimistic, ...state.recent] }))

    // Offline: queue the write and stop here. It replays on reconnect.
    if (!useSyncStore.getState().online) {
      await useSyncStore
        .getState()
        .enqueue(
          OP_KINDS.CAPTURE_CREATE,
          { ...payload, content },
          { label: `Capture · ${content.slice(0, 32)}` },
        )
      set({ saving: false, error: null })
      return optimistic
    }

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
      if (capture && !capture.threadId) {
        useAttentionStore.setState((s) => ({ inboxCount: s.inboxCount + 1 }))
      }
      return capture
    } catch {
      // Server unreachable or errored: keep the capture and queue a retry so the
      // user never loses what they typed.
      await useSyncStore
        .getState()
        .enqueue(
          OP_KINDS.CAPTURE_CREATE,
          { ...payload, content },
          { label: `Capture · ${content.slice(0, 32)}` },
        )
      set({ saving: false, error: null })
      return optimistic
    }
  },

  /** File an Inbox capture into a thread. */
  async assignCapture(captureId, threadId) {
    const data = await capturesApi.assign(captureId, threadId)
    set((state) => ({ inbox: state.inbox.filter((row) => row.id !== captureId) }))
    useAttentionStore.setState((s) => ({ inboxCount: Math.max(0, s.inboxCount - 1) }))
    return data?.capture
  },

  async deleteCapture(captureId) {
    await capturesApi.remove(captureId)
    set((state) => ({
      inbox: state.inbox.filter((row) => row.id !== captureId),
      recent: state.recent.filter((row) => row.id !== captureId),
    }))
    useAttentionStore.setState((s) => ({ inboxCount: Math.max(0, s.inboxCount - 1) }))
  },
}))

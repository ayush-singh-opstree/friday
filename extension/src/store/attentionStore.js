import { create } from 'zustand'
import { attentionApi } from '@/apis'

/**
 * attentionStore - the Today view payload produced by the Attention Engine:
 * top threads, due-today commitments, going-cold threads and the Inbox count.
 */
export const useAttentionStore = create((set) => ({
  /** @type {any[]} */
  topThreads: [],
  /** @type {any[]} */
  dueToday: [],
  /** @type {any[]} */
  overdue: [],
  /** @type {any[]} */
  goingCold: [],
  /** @type {any[]} */
  upcoming: [],
  inboxCount: 0,
  /** @type {string | null} */
  generatedAt: null,
  status: 'idle',
  /** @type {string | null} */
  error: null,

  async fetchToday() {
    set({ status: 'loading', error: null })
    try {
      const data = await attentionApi.today()
      set({
        topThreads: data?.topThreads ?? [],
        dueToday: data?.dueToday ?? [],
        overdue: data?.overdue ?? [],
        goingCold: data?.goingCold ?? [],
        upcoming: data?.upcoming ?? [],
        inboxCount: data?.inboxCount ?? 0,
        generatedAt: data?.generatedAt ?? null,
        status: 'ready',
      })
      return data
    } catch (error) {
      set({ status: 'error', error: error?.message ?? 'Could not refresh your attention list.' })
      return null
    }
  },

  /** Force a recompute for a single thread after an interaction. */
  async recompute(threadId) {
    try {
      const data = await attentionApi.recompute(threadId)
      const thread = data?.thread
      if (thread) {
        set((state) => ({
          topThreads: state.topThreads
            .map((row) => (row.id === thread.id ? { ...row, ...thread } : row))
            .sort((a, b) => b.attentionScore - a.attentionScore)
            .slice(0, 5),
        }))
      }
      return thread
    } catch {
      return null
    }
  },

  reset() {
    set({ topThreads: [], dueToday: [], overdue: [], goingCold: [], upcoming: [], inboxCount: 0 })
  },
}))

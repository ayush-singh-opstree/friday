import { create } from 'zustand'
import { attentionApi } from '@/apis'

/**
 * attentionStore - the Today view payload produced by the Attention Engine
 * (docs/08_system_architecture.md -> State Architecture).
 */
export const useAttentionStore = create((set) => ({
  /** @type {import('@/types/models').Thread[]} */
  topThreads: [],
  /** @type {import('@/types/models').Commitment[]} */
  dueToday: [],
  /** @type {import('@/types/models').Commitment[]} */
  overdue: [],
  /** @type {import('@/types/models').Thread[]} */
  goingCold: [],
  /** @type {Array<{id: string, title: string, startsAt: string, threadId?: string}>} */
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

  /** Recompute one thread after an interaction and re-rank the top 5. */
  async recompute(threadId) {
    try {
      const data = await attentionApi.recompute(threadId)
      const thread = data?.thread
      if (!thread) return null
      set((state) => ({
        topThreads: state.topThreads
          .map((row) => (row.id === thread.id ? { ...row, ...thread } : row))
          .sort((a, b) => b.attentionScore - a.attentionScore)
          .slice(0, 5),
      }))
      return thread
    } catch {
      return null
    }
  },
}))
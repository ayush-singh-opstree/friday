import { create } from 'zustand'
import { threadsApi } from '@/apis'

/**
 * threadStore - threads list, filters/sort and the selected thread detail.
 *
 * Filter/sort preference is kept for the session (Requirement 1, criterion 8).
 */
export const useThreadStore = create((set, get) => ({
  /** @type {import('@/types/models').Thread[]} */
  threads: [],
  /** 'idle' | 'loading' | 'ready' | 'error' */
  status: 'idle',
  /** @type {string | null} */
  error: null,

  filter: 'active',
  sort: 'lastInteraction',
  query: '',

  /** @type {string | null} */
  selectedThreadId: null,
  /** @type {any | null} */
  selectedThread: null,
  /** @type {any[]} */
  timeline: [],
  /** @type {any[]} */
  captures: [],
  /** @type {any[]} */
  commitments: [],
  /** @type {any[]} */
  clubs: [],
  /** @type {any[]} */
  summaries: [],
  detailStatus: 'idle',

  /**
   * @param {{ filter?: string, sort?: string, query?: string, personId?: string }} [overrides]
   */
  async fetchThreads(overrides = {}) {
    const filter = overrides.filter ?? get().filter
    const sort = overrides.sort ?? get().sort
    const query = overrides.query ?? get().query

    set({ status: 'loading', error: null, filter, sort, query })
    try {
      const data = await threadsApi.list({ filter, sort, query, personId: overrides.personId })
      set({ threads: data?.threads ?? [], status: 'ready' })
      return data?.threads ?? []
    } catch (error) {
      set({ status: 'error', error: error?.message ?? 'Could not load threads.' })
      return []
    }
  },

  /** @param {string} filter */
  async setFilter(filter) {
    set({ filter })
    return get().fetchThreads({ filter })
  },

  /** @param {string} sort */
  async setSort(sort) {
    set({ sort })
    return get().fetchThreads({ sort })
  },

  /** @param {string} query */
  setQuery(query) {
    set({ query })
  },

  /** @param {string | null} threadId */
  async selectThread(threadId) {
    if (!threadId) {
      set({ selectedThreadId: null, selectedThread: null, detailStatus: 'idle' })
      return null
    }
    const switching = get().selectedThreadId !== threadId
    set({
      selectedThreadId: threadId,
      detailStatus: 'loading',
      error: null,
      // Clear the previous thread's data on switch so the old thread never
      // renders while the new one loads.
      ...(switching
        ? {
            selectedThread: null,
            captures: [],
            commitments: [],
            timeline: [],
            clubs: [],
            summaries: [],
          }
        : {}),
    })
    try {
      const data = await threadsApi.detail(threadId)
      set({
        selectedThread: data?.thread ?? null,
        captures: data?.captures ?? [],
        commitments: data?.commitments ?? [],
        timeline: data?.timeline ?? [],
        clubs: data?.clubs ?? [],
        summaries: data?.summaries ?? [],
        detailStatus: 'ready',
      })
      return data
    } catch (error) {
      set({ detailStatus: 'error', error: error?.message ?? 'Could not load this thread.' })
      return null
    }
  },

  /** Re-fetch whichever view is currently open. */
  async refresh() {
    await get().fetchThreads()
    if (get().selectedThreadId) await get().selectThread(get().selectedThreadId)
  },

  /** @param {{ title: string, description?: string, personIds?: string[] }} payload */
  async createThread(payload) {
    const data = await threadsApi.create(payload)
    const thread = data?.thread
    if (thread) {
      const threads = [thread, ...get().threads]
      set({ threads, selectedThreadId: thread.id, selectedThread: thread })
    }
    return thread
  },

  /** @param {string} threadId @param {object} patch */
  async updateThread(threadId, patch) {
    const data = await threadsApi.update(threadId, patch)
    get().upsertThread(data?.thread)
    return data?.thread
  },

  async pinThread(threadId, isPinned) {
    return get().updateThread(threadId, { isPinned })
  },

  async archiveThread(threadId) {
    await threadsApi.archive(threadId)
    await get().fetchThreads()
  },

  async restoreThread(threadId) {
    await threadsApi.restore(threadId)
    await get().fetchThreads()
  },

  async snoozeThread(threadId, days) {
    await threadsApi.snooze(threadId, days)
    await get().fetchThreads()
  },

  async deleteThread(threadId) {
    await threadsApi.remove(threadId)
    set((state) => ({ threads: state.threads.filter((thread) => thread.id !== threadId) }))
    if (get().selectedThreadId === threadId) {
      set({ selectedThreadId: null, selectedThread: null })
    }
  },

  /** Merge a partial thread into the cached list. */
  upsertThread(thread) {
    if (!thread) return
    set((state) => {
      const exists = state.threads.some((row) => row.id === thread.id)
      return {
        threads: exists
          ? state.threads.map((row) => (row.id === thread.id ? { ...row, ...thread } : row))
          : [thread, ...state.threads],
        selectedThread:
          state.selectedThreadId === thread.id
            ? { ...state.selectedThread, ...thread }
            : state.selectedThread,
      }
    })
  },
}))

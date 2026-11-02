import { create } from 'zustand'
import { threadsApi } from '@/apis'
import { DEFAULT_THREAD_FILTER, DEFAULT_THREAD_SORT } from '@/config/constants'
import { mirrorThreads, readThreads } from '@/offline'

/**
 * threadStore - threads list, filter/sort preference and the open thread detail.
 *
 * Filter/sort is held for the session (Requirement 1, criterion 8).
 */
export const useThreadStore = create((set, get) => ({
  /** @type {import('@/types/models').Thread[]} */
  threads: [],
  status: 'idle', // idle | loading | ready | error
  /** @type {string | null} */
  error: null,

  filter: DEFAULT_THREAD_FILTER,
  sort: DEFAULT_THREAD_SORT,
  query: '',

  /* ------------------------------------------------------------ detail --- */
  /** @type {string | null} */
  selectedThreadId: null,
  /** @type {import('@/types/models').Thread | null} */
  thread: null,
  /** @type {any[]} */
  captures: [],
  /** @type {any[]} */
  commitments: [],
  /** @type {any[]} */
  timeline: [],
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
      const list = data?.threads ?? []
      set({ threads: list, status: 'ready' })
      // Keep the offline mirror warm for instant, offline reads.
      await mirrorThreads(list).catch(() => {})
      return list
    } catch (error) {
      // Local-first fallback: serve the mirrored list rather than an empty screen.
      const cached = await readThreads().catch(() => [])
      if (cached.length > 0) {
        set({ threads: cached, status: 'ready', error: null })
        return cached
      }
      set({ status: 'error', error: error?.message ?? 'Could not load your threads.' })
      return []
    }
  },

  async setFilter(filter) {
    set({ filter })
    return get().fetchThreads({ filter })
  },

  async setSort(sort) {
    set({ sort })
    return get().fetchThreads({ sort })
  },

  setQuery(query) {
    set({ query })
  },

  /* ------------------------------------------------------------ detail --- */

  /** @param {string | null} threadId */
  async selectThread(threadId) {
    if (!threadId) {
      set({
        selectedThreadId: null,
        thread: null,
        captures: [],
        commitments: [],
        timeline: [],
        clubs: [],
        summaries: [],
        detailStatus: 'idle',
      })
      return null
    }

    const switching = get().selectedThreadId !== threadId
    set({
      selectedThreadId: threadId,
      detailStatus: 'loading',
      error: null,
      // Clear the previous thread's data the moment we switch, otherwise the old
      // thread keeps rendering until the new fetch resolves (~1s stale flash).
      ...(switching
        ? {
            thread: null,
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
        thread: data?.thread ?? null,
        captures: data?.captures ?? [],
        commitments: data?.commitments ?? [],
        timeline: data?.timeline ?? [],
        clubs: data?.clubs ?? [],
        summaries: data?.summaries ?? [],
        detailStatus: 'ready',
      })
      return data
    } catch (error) {
      set({ detailStatus: 'error', error: error?.message ?? 'Could not open that thread.' })
      return null
    }
  },

  /** Re-fetch whichever view is currently open. */
  async refresh() {
    await get().fetchThreads()
    if (get().selectedThreadId) await get().selectThread(get().selectedThreadId)
  },

  /**
   * @param {{ title: string, description?: string, personIds?: string[] }} payload
   */
  async createThread(payload) {
    const data = await threadsApi.create(payload)
    const thread = data?.thread
    if (thread) set((state) => ({ threads: [thread, ...state.threads] }))
    return thread
  },

  /** @param {string} threadId @param {object} patch */
  async updateThread(threadId, patch) {
    const data = await threadsApi.update(threadId, patch)
    get().upsertThread(data?.thread)
    return data?.thread
  },

  async togglePin(threadId, isPinned) {
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

  /** Link a person to the thread, then refresh the detail (people + timeline). */
  async addPerson(threadId, personId) {
    await threadsApi.addPerson(threadId, personId)
    await get().selectThread(threadId)
  },

  /** Unlink a person from the thread, then refresh the detail. */
  async removePerson(threadId, personId) {
    await threadsApi.removePerson(threadId, personId)
    await get().selectThread(threadId)
  },

  async deleteThread(threadId) {
    await threadsApi.remove(threadId)
    set((state) => ({
      threads: state.threads.filter((row) => row.id !== threadId),
      selectedThreadId: state.selectedThreadId === threadId ? null : state.selectedThreadId,
      thread: state.selectedThreadId === threadId ? null : state.thread,
    }))
  },

  /** Merge a partial thread into the cached list + detail. */
  upsertThread(thread) {
    if (!thread) return
    set((state) => ({
      threads: state.threads.some((row) => row.id === thread.id)
        ? state.threads.map((row) => (row.id === thread.id ? { ...row, ...thread } : row))
        : [thread, ...state.threads],
      thread:
        state.selectedThreadId === thread.id ? { ...state.thread, ...thread } : state.thread,
    }))
  },
}))
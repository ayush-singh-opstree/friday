import { create } from 'zustand'
import { peopleApi } from '@/apis'

/** peopleStore - the people directory and inline search (Requirement 2). */
export const usePeopleStore = create((set, get) => ({
  /** @type {import('@/types/models').Person[]} */
  people: [],
  status: 'idle',
  /** @type {string | null} */
  error: null,
  query: '',
  /** @type {any | null} */
  selectedPerson: null,
  /** @type {any[]} */
  selectedPersonThreads: [],
  /** @type {any[]} */
  selectedPersonCommitments: [],
  /** @type {any[]} */
  selectedPersonCaptures: [],

  /** @param {{ query?: string, threadId?: string }} [overrides] */
  async fetchPeople(overrides = {}) {
    const query = overrides.query ?? get().query
    set({ status: 'loading', query })
    try {
      const data = await peopleApi.list({ query, threadId: overrides.threadId })
      set({ people: data?.people ?? [], status: 'ready' })
      return data?.people ?? []
    } catch (error) {
      set({ status: 'error', error: error?.message ?? 'Could not load people.' })
      return []
    }
  },

  /** @param {string} query */
  async search(query) {
    set({ query })
    return get().fetchPeople({ query })
  },

  /**
   * @param {string} personId
   */
  async selectPerson(personId) {
    if (!personId) {
      set({
        selectedPerson: null,
        selectedPersonThreads: [],
        selectedPersonCommitments: [],
        selectedPersonCaptures: [],
      })
      return null
    }
    try {
      const data = await peopleApi.detail(personId)
      set({
        selectedPerson: data?.person ?? null,
        selectedPersonThreads: data?.threads ?? [],
        selectedPersonCommitments: data?.commitments ?? [],
        selectedPersonCaptures: data?.captures ?? [],
      })
      return data
    } catch (error) {
      set({ error: error?.message ?? 'Could not load this person.' })
      return null
    }
  },

  /** @param {{ fullName: string } & Record<string, unknown>} payload */
  async createPerson(payload) {
    const data = await peopleApi.create(payload)
    if (data?.person) set((state) => ({ people: [data.person, ...state.people] }))
    return data
  },

  /** @param {string} primaryId @param {string} duplicateId */
  async mergePeople(primaryId, duplicateId) {
    await peopleApi.merge(primaryId, duplicateId)
    return get().fetchPeople()
  },
}))

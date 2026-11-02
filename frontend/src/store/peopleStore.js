import { create } from 'zustand'
import { peopleApi } from '@/apis'
import { mirrorPeople, readPeople } from '@/offline'

/** peopleStore - the people directory (Requirement 2 / Feature 3). */
export const usePeopleStore = create((set, get) => ({
  /** @type {import('@/types/models').Person[]} */
  people: [],
  status: 'idle',
  /** @type {string | null} */
  error: null,
  query: '',

  /** @type {import('@/types/models').Person | null} */
  person: null,
  /** @type {any[]} */
  personThreads: [],
  /** @type {any[]} */
  personCommitments: [],

  /** @param {{ query?: string, threadId?: string }} [overrides] */
  async fetchPeople(overrides = {}) {
    const query = overrides.query ?? get().query
    set({ status: 'loading', query })
    try {
      const data = await peopleApi.list({ query, threadId: overrides.threadId })
      const list = data?.people ?? []
      set({ people: list, status: 'ready' })
      await mirrorPeople(list).catch(() => {})
      return list
    } catch (error) {
      const cached = await readPeople().catch(() => [])
      if (cached.length > 0) {
        set({ people: cached, status: 'ready', error: null })
        return cached
      }
      set({ status: 'error', error: error?.message ?? 'Could not load your people.' })
      return []
    }
  },

  async setQuery(query) {
    set({ query })
    return get().fetchPeople({ query })
  },

  /** @param {string} personId */
  async selectPerson(personId) {
    if (!personId) {
      set({ person: null, personThreads: [], personCommitments: [] })
      return null
    }
    try {
      const data = await peopleApi.detail(personId)
      set({
        person: data?.person ?? null,
        personThreads: data?.threads ?? [],
        personCommitments: data?.commitments ?? [],
      })
      return data
    } catch (error) {
      set({ error: error?.message ?? 'Could not open that person.' })
      return null
    }
  },

  /** @param {object} payload Returns `{ person, possibleDuplicates }`. */
  async createPerson(payload) {
    const data = await peopleApi.create(payload)
    if (data?.person) set((state) => ({ people: [data.person, ...state.people] }))
    return data
  },

  /** @param {string} personId @param {object} patch */
  async updatePerson(personId, patch) {
    const data = await peopleApi.update(personId, patch)
    set((state) => ({
      people: state.people.map((row) => (row.id === personId ? { ...row, ...data?.person } : row)),
      person: state.person?.id === personId ? { ...state.person, ...data?.person } : state.person,
    }))
    return data?.person
  },

  /** @param {string} primaryId @param {string} duplicateId */
  async mergePeople(primaryId, duplicateId) {
    await peopleApi.merge(primaryId, duplicateId)
    return get().fetchPeople()
  },

  /** @param {string} personId */
  async deletePerson(personId) {
    await peopleApi.remove(personId)
    set((state) => ({
      people: state.people.filter((row) => row.id !== personId),
      person: state.person?.id === personId ? null : state.person,
      personThreads: state.person?.id === personId ? [] : state.personThreads,
      personCommitments: state.person?.id === personId ? [] : state.personCommitments,
    }))
  },
}))
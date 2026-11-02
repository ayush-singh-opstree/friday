import { create } from 'zustand'
import { commitmentsApi } from '@/apis'

/**
 * commitmentStore - every open commitment across threads (Requirement 4).
 * Filters mirror the unified Commitments view: All / Mine / Theirs / Overdue.
 */
export const useCommitmentStore = create((set, get) => ({
  /** @type {any[]} */
  commitments: [],
  status: 'idle',
  /** @type {string | null} */
  error: null,
  /** 'all' | 'mine' | 'theirs' | 'overdue' */
  ownerFilter: 'all',

  /** @param {{ threadId?: string, status?: string, owner?: string }} [overrides] */
  async fetchCommitments(overrides = {}) {
    const ownerFilter = overrides.owner ?? get().ownerFilter
    set({ status: 'loading', ownerFilter })
    try {
      const data = await commitmentsApi.list({
        status: 'open',
        threadId: overrides.threadId,
        owner: ownerFilter === 'all' || ownerFilter === 'overdue' ? undefined : ownerFilter,
      })
      let commitments = data?.commitments ?? []
      if (ownerFilter === 'overdue') {
        commitments = commitments.filter((row) => row.urgency === 'overdue')
      }
      set({ commitments, status: 'ready' })
      return commitments
    } catch (error) {
      set({ status: 'error', error: error?.message ?? 'Could not load commitments.' })
      return []
    }
  },

  /** @param {'all'|'mine'|'theirs'|'overdue'} ownerFilter */
  async setOwnerFilter(ownerFilter) {
    set({ ownerFilter })
    return get().fetchCommitments({ owner: ownerFilter })
  },

  /**
   * @param {{ threadId: string, description: string, ownerType?: string,
   *           ownerPersonId?: string | null, dueDate?: string | null }} payload
   */
  async createCommitment(payload) {
    const data = await commitmentsApi.create(payload)
    if (data?.commitment) {
      set((state) => ({ commitments: [data.commitment, ...state.commitments] }))
    }
    return data?.commitment
  },

  /** @param {string} commitmentId @param {string} [completionNote] */
  async completeCommitment(commitmentId, completionNote) {
    const data = await commitmentsApi.complete(commitmentId, completionNote)
    set((state) => ({
      commitments: state.commitments.map((row) =>
        row.id === commitmentId ? { ...row, ...data?.commitment } : row,
      ),
    }))
    return data?.commitment
  },

  /** @param {string} commitmentId @param {object} patch */
  async updateCommitment(commitmentId, patch) {
    const data = await commitmentsApi.update(commitmentId, patch)
    set((state) => ({
      commitments: state.commitments.map((row) =>
        row.id === commitmentId ? { ...row, ...data?.commitment } : row,
      ),
    }))
    return data?.commitment
  },
}))

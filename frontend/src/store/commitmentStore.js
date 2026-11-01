import { create } from 'zustand'
import { commitmentsApi } from '@/apis'
import { mirrorCommitments } from '@/offline'

/**
 * commitmentStore - the unified commitments view (Feature 5).
 * Owner filters: All / Mine / Theirs / Overdue.
 */
export const useCommitmentStore = create((set, get) => ({
  /** @type {any[]} */
  commitments: [],
  status: 'idle',
  /** @type {string | null} */
  error: null,
  /** 'all' | 'mine' | 'theirs' | 'overdue' */
  ownerFilter: 'all',
  /** 'dueDate' | 'thread' | 'owner' */
  groupBy: 'dueDate',
  showCompleted: false,

  /** @param {{ threadId?: string, owner?: string, status?: string }} [overrides] */
  async fetchCommitments(overrides = {}) {
    const ownerFilter = overrides.owner ?? get().ownerFilter
    const showCompleted = overrides.showCompleted ?? get().showCompleted
    set({ status: 'loading', ownerFilter, showCompleted })

    try {
      const data = await commitmentsApi.list({
        threadId: overrides.threadId,
        status: showCompleted ? undefined : 'open',
        owner: ownerFilter === 'all' || ownerFilter === 'overdue' ? undefined : ownerFilter,
      })

      let commitments = data?.commitments ?? []
      if (!showCompleted) commitments = commitments.filter((row) => row.status === 'open')
      if (ownerFilter === 'overdue') {
        commitments = commitments.filter((row) => row.urgency === 'overdue')
      }

      set({ commitments, status: 'ready' })
      await mirrorCommitments(commitments).catch(() => {})
      return commitments
    } catch (error) {
      set({
        status: 'error',
        error: error?.message ?? 'Could not load your commitments.',
      })
      return []
    }
  },

  async setOwnerFilter(ownerFilter) {
    set({ ownerFilter })
    return get().fetchCommitments({ owner: ownerFilter })
  },

  async setGroupBy(groupBy) {
    set({ groupBy })
  },

  async toggleShowCompleted() {
    const showCompleted = !get().showCompleted
    set({ showCompleted })
    return get().fetchCommitments({ showCompleted })
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
      commitments: get().showCompleted
        ? state.commitments.map((row) =>
            row.id === commitmentId ? { ...row, ...data?.commitment } : row,
          )
        : state.commitments.filter((row) => row.id !== commitmentId),
    }))
    return data?.commitment
  },

  async reopenCommitment(commitmentId) {
    const data = await commitmentsApi.reopen(commitmentId)
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
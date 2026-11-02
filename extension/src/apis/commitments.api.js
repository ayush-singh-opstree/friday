import { http } from './client'
import { ENDPOINTS } from './endpoints'
import { env } from '@/config/env'
import {
  commitmentListParams,
  toCommitment,
  toCommitmentPayload,
  toCommitmentUpdatePayload,
  toList,
} from './adapters'

/**
 * Commitment API (Requirement 4). Urgency bands (amber <= 48h, red = overdue)
 * are derived client-side from `due_date`/`status` (see adapters.js).
 * Dual mode: mock answers in camelCase; live maps to the snake_case contract.
 */
export const commitmentsApi = {
  /**
   * @param {{ threadId?: string, status?: 'open' | 'completed', owner?: 'mine' | 'theirs' }} [params]
   */
  list: async (params = {}) => {
    if (env.useMockApi) return http.get(ENDPOINTS.commitments.list(), { query: params })

    const payload = await http.get(ENDPOINTS.commitments.list(), {
      query: commitmentListParams({
        threadId: params.threadId,
        status: params.status,
        owner: params.owner,
        overdueOnly: params.owner === 'overdue' || params.overdueOnly,
      }),
    })
    const commitments = toList(payload).rows.map((row) => toCommitment(row))
    return { commitments, total: payload?.total ?? commitments.length }
  },

  /**
   * @param {{ threadId: string, description: string, ownerType?: 'me' | 'person',
   *           ownerPersonId?: string | null, dueDate?: string | null, captureId?: string }} payload
   */
  create: async (payload) => {
    if (env.useMockApi) return http.post(ENDPOINTS.commitments.create(), payload)
    const dto = await http.post(ENDPOINTS.commitments.create(), toCommitmentPayload(payload))
    return { commitment: toCommitment(dto) }
  },

  /** @param {string} commitmentId @param {object} patch */
  update: async (commitmentId, patch) => {
    if (env.useMockApi) return http.patch(ENDPOINTS.commitments.update(commitmentId), patch)
    const dto = await http.patch(
      ENDPOINTS.commitments.update(commitmentId),
      toCommitmentUpdatePayload(patch),
    )
    return { commitment: toCommitment(dto) }
  },

  /** @param {string} commitmentId @param {string} [completionNote] */
  complete: async (commitmentId, completionNote) => {
    if (env.useMockApi) {
      return http.post(ENDPOINTS.commitments.complete(commitmentId), { completionNote })
    }
    const dto = await http.post(ENDPOINTS.commitments.complete(commitmentId), {
      completion_note: completionNote ?? null,
    })
    return { commitment: toCommitment(dto) }
  },
}

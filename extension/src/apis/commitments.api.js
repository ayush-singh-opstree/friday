import { http } from './client'
import { ENDPOINTS } from './endpoints'

/**
 * Commitment API (Requirement 4). Urgency bands (amber <= 48h, red = overdue)
 * are computed by the API and surfaced on the `urgency` field.
 */
export const commitmentsApi = {
  /**
   * @param {{ threadId?: string, status?: 'open' | 'completed', owner?: 'mine' | 'theirs' }} [params]
   */
  list: (params = {}) => http.get(ENDPOINTS.commitments.list(), { query: params }),

  /**
   * @param {{ threadId: string, description: string, ownerType?: 'me' | 'person',
   *           ownerPersonId?: string | null, dueDate?: string | null, captureId?: string }} payload
   */
  create: (payload) => http.post(ENDPOINTS.commitments.create(), payload),

  /** @param {string} commitmentId @param {object} patch */
  update: (commitmentId, patch) =>
    http.patch(ENDPOINTS.commitments.update(commitmentId), patch),

  /** @param {string} commitmentId @param {string} [completionNote] */
  complete: (commitmentId, completionNote) =>
    http.post(ENDPOINTS.commitments.complete(commitmentId), { completionNote }),
}

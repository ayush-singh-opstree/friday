import { http } from './client'
import { ENDPOINTS } from './endpoints'

/**
 * Commitment API (Requirement 4).
 * The server computes the `urgency` band (amber <= 48h, red = overdue) so every
 * client renders the same colour without duplicating date logic.
 */
export const commitmentsApi = {
  /** @param {{ threadId?: string, status?: 'open'|'completed', owner?: 'mine'|'theirs' }} [params] */
  list: (params = {}) => http.get(ENDPOINTS.commitments.list(), { query: params }),

  /**
   * @param {{ threadId: string, description: string, ownerType?: 'me'|'person',
   *           ownerPersonId?: string|null, dueDate?: string|null, captureId?: string }} payload
   */
  create: (payload) => http.post(ENDPOINTS.commitments.create(), payload),

  /** @param {string} commitmentId @param {object} patch */
  update: (commitmentId, patch) => http.patch(ENDPOINTS.commitments.update(commitmentId), patch),

  /** @param {string} commitmentId @param {string} [completionNote] */
  complete: (commitmentId, completionNote) =>
    http.post(ENDPOINTS.commitments.complete(commitmentId), { completionNote }),

  reopen: (commitmentId) => http.post(ENDPOINTS.commitments.reopen(commitmentId)),
}

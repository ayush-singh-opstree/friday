import { http } from './client'
import { ENDPOINTS } from './endpoints'

/** People directory API (Requirement 2 in docs/02_prd.md). */
export const peopleApi = {
  /**
   * @param {{ query?: string, threadId?: string }} [params]
   */
  list: (params = {}) => http.get(ENDPOINTS.people.list(), { query: params }),

  /** @param {string} personId */
  detail: (personId) => http.get(ENDPOINTS.people.detail(personId)),

  /**
   * @param {{ fullName: string, organisation?: string, role?: string,
   *           email?: string, phone?: string, linkedInUrl?: string,
   *           notes?: string, threadIds?: string[] }} payload
   */
  create: (payload) => http.post(ENDPOINTS.people.create(), payload),

  /** @param {string} personId @param {object} patch */
  update: (personId, patch) => http.patch(ENDPOINTS.people.update(personId), patch),

  /** @param {string} personId */
  remove: (personId) => http.delete(ENDPOINTS.people.remove(personId)),

  /** @param {string} primaryId @param {string} duplicateId */
  merge: (primaryId, duplicateId) =>
    http.post(ENDPOINTS.people.merge(), { primaryId, duplicateId }),
}

import { http } from './client'
import { ENDPOINTS } from './endpoints'

/** People directory API (Requirement 2 / Feature 3). */
export const peopleApi = {
  /** @param {{ query?: string, threadId?: string }} [params] */
  list: (params = {}) => http.get(ENDPOINTS.people.list(), { query: params }),

  /** Person + their threads, commitments and captures. */
  detail: (personId) => http.get(ENDPOINTS.people.detail(personId)),

  /**
   * @param {{ fullName: string, organisation?: string, role?: string,
   *           email?: string, phone?: string, linkedInUrl?: string,
   *           notes?: string, threadIds?: string[] }} payload
   * Returns `{ person, possibleDuplicates, warning }` (Feature 3 -> duplicate detection).
   */
  create: (payload) => http.post(ENDPOINTS.people.create(), payload),

  /** @param {string} personId @param {object} patch */
  update: (personId, patch) => http.patch(ENDPOINTS.people.update(personId), patch),

  remove: (personId) => http.delete(ENDPOINTS.people.remove(personId)),

  /** Consolidate two records; notes are appended with a separator. */
  merge: (primaryId, duplicateId, options = {}) =>
    http.post(ENDPOINTS.people.merge(), { primaryId, duplicateId, ...options }),
}

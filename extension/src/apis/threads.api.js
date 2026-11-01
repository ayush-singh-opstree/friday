import { http } from './client'
import { ENDPOINTS } from './endpoints'

/**
 * Thread API. Supports the filters and sort orders from Requirement 1
 * (docs/02_prd.md): active, archived, goingCold, pinned and lastInteraction,
 * attentionScore, createdAt, title.
 */
export const threadsApi = {
  /**
   * @param {{ filter?: string, sort?: string, query?: string, personId?: string }} [params]
   */
  list: (params = {}) => http.get(ENDPOINTS.threads.list(), { query: params }),

  /** @param {string} threadId */
  detail: (threadId) => http.get(ENDPOINTS.threads.detail(threadId)),

  /** @param {{ title: string, description?: string, personIds?: string[], goingColdThresholdDays?: number }} payload */
  create: (payload) => http.post(ENDPOINTS.threads.create(), payload),

  /** @param {string} threadId @param {object} patch */
  update: (threadId, patch) => http.patch(ENDPOINTS.threads.update(threadId), patch),

  /** @param {string} threadId */
  remove: (threadId) => http.delete(ENDPOINTS.threads.remove(threadId)),

  /** @param {string} threadId */
  archive: (threadId) => http.post(ENDPOINTS.threads.archive(threadId)),

  /** @param {string} threadId */
  restore: (threadId) => http.post(ENDPOINTS.threads.restore(threadId)),

  /** @param {string} threadId @param {number} days 1 | 3 | 7 (max 30) */
  snooze: (threadId, days) => http.post(ENDPOINTS.threads.snooze(threadId), { days }),
}

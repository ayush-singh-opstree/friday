import { http } from './client'
import { ENDPOINTS } from './endpoints'

/**
 * Thread API.
 * Supports the filters and sort orders in Requirement 1: active, archived,
 * goingCold, pinned, snoozed / lastInteraction, attentionScore, createdAt, title.
 */
export const threadsApi = {
  /**
   * @param {{ filter?: string, sort?: string, query?: string, personId?: string }} [params]
   */
  list: (params = {}) => http.get(ENDPOINTS.threads.list(), { query: params }),

  /** Full thread payload: thread + captures + commitments + timeline + summaries. */
  detail: (threadId) => http.get(ENDPOINTS.threads.detail(threadId)),

  /**
   * @param {{ title: string, description?: string, personIds?: string[],
   *           goingColdThresholdDays?: number }} payload
   */
  create: (payload) => http.post(ENDPOINTS.threads.create(), payload),

  /** @param {string} threadId @param {object} patch */
  update: (threadId, patch) => http.patch(ENDPOINTS.threads.update(threadId), patch),

  remove: (threadId) => http.delete(ENDPOINTS.threads.remove(threadId)),

  archive: (threadId) => http.post(ENDPOINTS.threads.archive(threadId)),

  restore: (threadId) => http.post(ENDPOINTS.threads.restore(threadId)),

  /** @param {number} days 1 | 3 | 7, maximum 30 (Feature 11). */
  snooze: (threadId, days) => http.post(ENDPOINTS.threads.snooze(threadId), { days }),
}

/** Capture API - the write path behind Quick Capture everywhere in the app. */
export const capturesApi = {
  /** @param {{ threadId?: string, status?: 'inbox'|'filed', personId?: string }} [params] */
  list: (params = {}) => http.get(ENDPOINTS.captures.list(), { query: params }),

  /**
   * @param {{ content: string, type?: string, threadId?: string|null,
   *           personId?: string|null, source?: string, capturedAt?: string }} payload
   */
  create: (payload) => http.post(ENDPOINTS.captures.create(), payload),

  /** @param {string} captureId @param {{ content?: string, type?: string }} patch */
  update: (captureId, patch) => http.patch(ENDPOINTS.captures.update(captureId), patch),

  remove: (captureId) => http.delete(ENDPOINTS.captures.remove(captureId)),

  /** File an Inbox capture into a thread. */
  assign: (captureId, threadId) => http.post(ENDPOINTS.captures.assign(captureId), { threadId }),
}

import { http } from './client'
import { ENDPOINTS } from './endpoints'

/**
 * Capture API - the write path used by Quick Capture everywhere in the
 * extension (popup, side panel and the injected companion).
 */
export const capturesApi = {
  /**
   * @param {{ threadId?: string, status?: 'inbox' | 'filed', personId?: string }} [params]
   */
  list: (params = {}) => http.get(ENDPOINTS.captures.list(), { query: params }),

  /**
   * @param {{ content: string, type?: string, threadId?: string | null,
   *           personId?: string | null, source?: string, capturedAt?: string }} payload
   */
  create: (payload) => http.post(ENDPOINTS.captures.create(), payload),

  /** @param {string} captureId @param {{ content?: string, type?: string }} patch */
  update: (captureId, patch) => http.patch(ENDPOINTS.captures.update(captureId), patch),

  /** @param {string} captureId */
  remove: (captureId) => http.delete(ENDPOINTS.captures.remove(captureId)),

  /** File an Inbox capture into a thread. */
  assign: (captureId, threadId) =>
    http.post(ENDPOINTS.captures.assign(captureId), { threadId }),
}

import { http } from './client'
import { ENDPOINTS } from './endpoints'

/** Attention Engine API - powers the Today view (Feature 1 / Feature 5). */
export const attentionApi = {
  /** @returns {Promise<import('@/types/today').TodayPayload>} */
  today: () => http.get(ENDPOINTS.attention.today()),

  /** Force a recompute for one thread after an interaction. */
  recompute: (threadId) => http.post(ENDPOINTS.attention.recompute(threadId)),
}

/**
 * AI API.
 * "Where We Left Off" (Feature 8) and Pre-Meeting Brief (Feature 9) degrade
 * gracefully when the model is unavailable - the server returns its
 * capture-based fallback instead of failing.
 */
export const aiApi = {
  summarise: (threadId) => http.post(ENDPOINTS.ai.summarise(threadId)),
  brief: (threadId) => http.post(ENDPOINTS.ai.brief(threadId)),
  /** Classify free-form Brain Dump lines into thread assignments. */
  classify: (lines) => http.post(ENDPOINTS.ai.classify(), { lines }),
  draftFollowUp: (threadId) => http.post(ENDPOINTS.ai.draftFollowUp(threadId)),
}

/** Cross-entity search (Feature 12 / Requirement 9). */
export const searchApi = {
  /** @param {string} q @param {{ type?: string, threadId?: string }} [params] */
  query: (q, params = {}) => http.get(ENDPOINTS.search(), { query: { q, ...params } }),
}

/** Offline sync (Requirement 11). */
export const syncApi = {
  /** @param {string} since ISO timestamp of the last successful sync. */
  pull: (since) => http.get(ENDPOINTS.sync.pull(), { query: { since } }),
  push: (operations) => http.post(ENDPOINTS.sync.push(), { operations }),
}

/** Notifications (Requirement 10). */
export const notificationsApi = {
  list: () => http.get(ENDPOINTS.notifications.list()),
  markRead: (notificationId) => http.patch(ENDPOINTS.notifications.read(notificationId)),
  getPreferences: () => http.get(ENDPOINTS.notifications.preferences()),
  updatePreferences: (patch) => http.patch(ENDPOINTS.notifications.preferences(), patch),
  /** Register a Web Push subscription with the server. */
  subscribe: (subscription) => http.post(ENDPOINTS.notifications.subscribe(), subscription),
}

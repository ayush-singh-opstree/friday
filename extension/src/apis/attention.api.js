import { http } from './client'
import { ENDPOINTS } from './endpoints'

/** Attention Engine API - powers the Today view and the popup snapshot. */
export const attentionApi = {
  today: () => http.get(ENDPOINTS.attention.today()),

  /** @param {string} threadId */
  recompute: (threadId) => http.post(ENDPOINTS.attention.recompute(threadId)),
}

/** AI API - "Where We Left Off" summaries and Pre-Meeting Briefs (Feature 6/8). */
export const aiApi = {
  /** @param {string} threadId */
  summarise: (threadId) => http.post(ENDPOINTS.ai.summarise(threadId)),

  /** @param {string} threadId */
  brief: (threadId) => http.post(ENDPOINTS.ai.brief(threadId)),

  /** @param {string[]} lines Brain Dump entries to classify per thread. */
  classify: (lines) => http.post(ENDPOINTS.ai.classify(), { lines }),
}

/** Cross-entity search (Feature 12 / Requirement 9). */
export const searchApi = {
  /** @param {string} q @param {{ type?: string, threadId?: string }} [params] */
  query: (q, params = {}) => http.get(ENDPOINTS.search(), { query: { q, ...params } }),
}

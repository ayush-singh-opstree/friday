import { http } from './client'
import { ENDPOINTS } from './endpoints'
import { env } from '@/config/env'
import {
  groupSearchResults,
  toCommitment,
  toList,
  toSummary,
  toThread,
  toTodayPayload,
} from './adapters'

const ENTITY_FOR_TYPE = {
  threads: 'thread',
  people: 'person',
  captures: 'capture',
  commitments: 'commitment',
}

/** Attention Engine API - powers the Today view (Feature 1 / Feature 5). */
export const attentionApi = {
  /** @returns {Promise<import('@/types/today').TodayPayload>} */
  today: async () => {
    if (env.useMockApi) return http.get(ENDPOINTS.attention.today())

    // The backend returns top_threads / due_today / going_cold only; overdue and
    // the inbox count are composed from their own endpoints so the Today view
    // has the full payload the UI expects.
    const [today, overduePayload, inboxPayload] = await Promise.all([
      http.get(ENDPOINTS.attention.today()),
      http.get(ENDPOINTS.commitments.list(), {
        query: { status: 'open', overdue_only: true, limit: 50 },
      }),
      http.get(ENDPOINTS.captures.list(), { query: { status: 'inbox', limit: 1 } }),
    ])

    return toTodayPayload(today, {
      overdue: toList(overduePayload).rows.map((row) => toCommitment(row)),
      inboxCount: toList(inboxPayload).total ?? 0,
    })
  },

  /** Force a recompute for one thread after an interaction. */
  recompute: async (threadId) => {
    if (env.useMockApi) return http.post(ENDPOINTS.attention.recompute(threadId))

    const result = await http.post(ENDPOINTS.attention.recompute(threadId))
    const dto = await http.get(ENDPOINTS.threads.detail(threadId))
    const thread = toThread(dto)
    if (thread && result?.attention_score !== undefined) {
      thread.attentionScore = Math.round(result.attention_score)
    }
    return { thread }
  },
}

/**
 * AI API.
 * "Where We Left Off" (Feature 8) and Pre-Meeting Brief (Feature 9) degrade
 * gracefully when the model is unavailable - the server returns its
 * capture-based fallback instead of failing.
 */
export const aiApi = {
  summarise: async (threadId) => {
    if (env.useMockApi) return http.post(ENDPOINTS.ai.summarise(threadId))
    const res = await http.post(ENDPOINTS.ai.summarise(threadId), { force_refresh: true })
    return { summary: toSummary(res?.summary), wasCached: Boolean(res?.was_cached) }
  },
  brief: async (threadId) => {
    if (env.useMockApi) return http.post(ENDPOINTS.ai.brief(threadId))
    const res = await http.post(ENDPOINTS.ai.brief(threadId))
    // The UI's BriefTab reads `data.summary` for both summary kinds.
    return { summary: toSummary(res?.brief) }
  },
  /** Classify free-form Brain Dump lines into thread assignments. */
  classify: async (lines) => {
    if (env.useMockApi) return http.post(ENDPOINTS.ai.classify(), { lines })
    const content = Array.isArray(lines) ? lines.join('\n') : String(lines ?? '')
    const res = await http.post(ENDPOINTS.ai.classify(), { content })
    return {
      suggestedType: res?.suggested_type ?? 'note',
      suggestedThreadId: res?.suggested_thread_id ?? null,
      confidence: res?.confidence ?? 0,
      reasoning: res?.reasoning ?? '',
    }
  },
  draftFollowUp: (threadId) =>
    env.useMockApi
      ? http.post(ENDPOINTS.ai.draftFollowUp(threadId))
      : http.post(ENDPOINTS.ai.brief(threadId)),
}

/** Cross-entity search (Feature 12 / Requirement 9). */
export const searchApi = {
  /** @param {string} q @param {{ type?: string, threadId?: string }} [params] */
  query: async (q, params = {}) => {
    if (env.useMockApi) return http.get(ENDPOINTS.search(), { query: { q, ...params } })

    const query = { q }
    if (ENTITY_FOR_TYPE[params.type]) query.entity = ENTITY_FOR_TYPE[params.type]
    const response = await http.get(ENDPOINTS.search(), { query })
    return groupSearchResults(response)
  },
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

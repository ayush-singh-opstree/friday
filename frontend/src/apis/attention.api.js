import { http } from './client'
import { ENDPOINTS } from './endpoints'
import { env } from '@/config/env'
import {
  groupSearchResults,
  toCommitment,
  toList,
  toNotification,
  toNotificationList,
  toNotificationPreferences,
  toNotificationPreferencesPatch,
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
    const payload = env.useMockApi ? { lines } : { content: Array.isArray(lines) ? lines.join('\n') : String(lines ?? '') }
    const res = await http.post(ENDPOINTS.ai.classify(), payload)
    return {
      suggestedType: res?.suggestedType ?? res?.suggested_type ?? 'note',
      suggestedThreadId: res?.suggestedThreadId ?? res?.suggested_thread_id ?? null,
      confidence: res?.confidence ?? 0,
      reasoning: res?.reasoning ?? '',
    }
  },
  draftFollowUp: (threadId) => http.post(ENDPOINTS.ai.brief(threadId)),
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

/** Notifications (Feature 14 / Requirement 10). */
export const notificationsApi = {
  /**
   * List notifications plus the unread badge count.
   * @param {{ isRead?: boolean, type?: string, limit?: number, offset?: number }} [params]
   * @returns {Promise<{ items: any[], unreadCount: number, total: number }>}
   */
  list: async (params = {}) => {
    if (env.useMockApi) return http.get(ENDPOINTS.notifications.list(), { query: params })

    const query = {}
    if (params.isRead !== undefined) query.is_read = params.isRead
    if (params.type) query.type = params.type
    if (params.limit !== undefined) query.limit = params.limit
    if (params.offset !== undefined) query.offset = params.offset
    return toNotificationList(await http.get(ENDPOINTS.notifications.list(), { query }))
  },

  /** @param {{ type: string, title: string, body: string }} payload */
  create: async (payload) => {
    if (env.useMockApi) return http.post(ENDPOINTS.notifications.create(), payload)
    return toNotification(await http.post(ENDPOINTS.notifications.create(), payload))
  },

  markRead: async (notificationId) => {
    if (env.useMockApi) return http.patch(ENDPOINTS.notifications.read(notificationId))
    return toNotification(await http.patch(ENDPOINTS.notifications.read(notificationId)))
  },

  markAllRead: () => http.post(ENDPOINTS.notifications.readAll()),

  remove: (notificationId) => http.delete(ENDPOINTS.notifications.remove(notificationId)),

  /** @returns {Promise<import('@/types/today').NotificationPreferences & {digestTime:string, digestEnabled:boolean, emailDigestEnabled:boolean}>} */
  getPreferences: async () => {
    if (env.useMockApi) return http.get(ENDPOINTS.notifications.preferences())
    return toNotificationPreferences(await http.get(ENDPOINTS.notifications.preferences()))
  },

  /** @param {object} patch camelCase subset of the preference view model. */
  updatePreferences: async (patch) => {
    const body = toNotificationPreferencesPatch(patch)
    if (env.useMockApi) return http.patch(ENDPOINTS.notifications.preferences(), body)
    return toNotificationPreferences(await http.patch(ENDPOINTS.notifications.preferences(), body))
  },

  /**
   * Ask the server to evaluate background triggers (commitments due within 24h,
   * going-cold threads) and materialise any new in-app notifications.
   */
  checkTriggers: async () => {
    if (env.useMockApi) return http.post(ENDPOINTS.notifications.checkTriggers())
    const res = await http.post(ENDPOINTS.notifications.checkTriggers())
    return {
      generatedCount: res?.generated_count ?? 0,
      items: (res?.notifications ?? []).map(toNotification).filter(Boolean),
    }
  },
}

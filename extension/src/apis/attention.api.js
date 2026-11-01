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

/** Attention Engine API - powers the Today view and the popup snapshot. */
export const attentionApi = {
  today: async () => {
    if (env.useMockApi) return http.get(ENDPOINTS.attention.today())

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

  /** @param {string} threadId */
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

/** AI API - "Where We Left Off" summaries and Pre-Meeting Briefs (Feature 6/8). */
export const aiApi = {
  /** @param {string} threadId */
  summarise: async (threadId) => {
    if (env.useMockApi) return http.post(ENDPOINTS.ai.summarise(threadId))
    const res = await http.post(ENDPOINTS.ai.summarise(threadId), { force_refresh: true })
    return { summary: toSummary(res?.summary), wasCached: Boolean(res?.was_cached) }
  },

  /** @param {string} threadId */
  brief: async (threadId) => {
    if (env.useMockApi) return http.post(ENDPOINTS.ai.brief(threadId))
    const res = await http.post(ENDPOINTS.ai.brief(threadId))
    return { summary: toSummary(res?.brief) }
  },

  /** @param {string[]} lines Brain Dump entries to classify per thread. */
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

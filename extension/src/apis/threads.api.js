import { http } from './client'
import { ENDPOINTS } from './endpoints'
import { env } from '@/config/env'
import {
  applyThreadFilter,
  applyThreadQuery,
  snoozeUntilIso,
  threadListParams,
  toCapture,
  toCommitment,
  toList,
  toThread,
  toThreadCreatePayload,
  toThreadUpdatePayload,
  toTimelineEvent,
} from './adapters'

/**
 * Thread API. Supports the filters and sort orders from Requirement 1
 * (docs/02_prd.md): active, archived, goingCold, pinned and lastInteraction,
 * attentionScore, createdAt, title.
 *
 * Dual mode: the bundled mock answers in camelCase; the live FastAPI backend
 * answers in snake_case with a `{ data, total }` envelope (see adapters.js).
 */
export const threadsApi = {
  /**
   * @param {{ filter?: string, sort?: string, query?: string, personId?: string }} [params]
   */
  list: async (params = {}) => {
    if (env.useMockApi) return http.get(ENDPOINTS.threads.list(), { query: params })

    const payload = await http.get(ENDPOINTS.threads.list(), { query: threadListParams(params) })
    const threads = applyThreadQuery(
      applyThreadFilter(toList(payload).rows.map(toThread), params.filter),
      params,
    )
    return {
      threads,
      total: threads.length,
      filter: params.filter ?? 'active',
      sort: params.sort ?? 'lastInteraction',
    }
  },

  /** @param {string} threadId */
  detail: async (threadId) => {
    if (env.useMockApi) return http.get(ENDPOINTS.threads.detail(threadId))

    const [threadDto, capturesPayload, commitmentsPayload, timelinePayload] = await Promise.all([
      http.get(ENDPOINTS.threads.detail(threadId)),
      http.get(ENDPOINTS.captures.list(), { query: { thread_id: threadId, limit: 200 } }),
      http.get(ENDPOINTS.commitments.list(), { query: { thread_id: threadId, limit: 200 } }),
      http.get(ENDPOINTS.threads.timeline(threadId), { query: { limit: 200 } }),
    ])

    const thread = toThread(threadDto)
    const captures = toList(capturesPayload).rows.map(toCapture)
    const commitments = toList(commitmentsPayload).rows.map((row) =>
      toCommitment(row, thread?.title ?? null),
    )
    const timeline = (Array.isArray(timelinePayload) ? timelinePayload : []).map(toTimelineEvent)
    if (thread) thread.openCommitmentCount = commitments.filter((row) => row.status === 'open').length
    return { thread, captures, commitments, timeline, summaries: [] }
  },

  /** @param {{ title: string, description?: string, personIds?: string[], goingColdThresholdDays?: number }} payload */
  create: async (payload) => {
    if (env.useMockApi) return http.post(ENDPOINTS.threads.create(), payload)
    const dto = await http.post(ENDPOINTS.threads.create(), toThreadCreatePayload(payload))
    const thread = toThread(dto)
    if (thread && payload.personIds?.length) {
      await Promise.all(
        payload.personIds.map((personId) =>
          http.post(ENDPOINTS.threads.people(thread.id), { person_id: personId }).catch(() => null),
        ),
      )
    }
    return { thread }
  },

  /** @param {string} threadId @param {object} patch */
  update: async (threadId, patch) => {
    if (env.useMockApi) return http.patch(ENDPOINTS.threads.update(threadId), patch)
    const dto = await http.patch(ENDPOINTS.threads.update(threadId), toThreadUpdatePayload(patch))
    return { thread: toThread(dto) }
  },

  /** @param {string} threadId */
  remove: (threadId) => http.delete(ENDPOINTS.threads.remove(threadId)),

  /** @param {string} threadId */
  archive: async (threadId) => {
    const dto = await http.post(ENDPOINTS.threads.archive(threadId))
    return env.useMockApi ? dto : { thread: toThread(dto) }
  },

  /** @param {string} threadId */
  restore: async (threadId) => {
    const dto = await http.post(ENDPOINTS.threads.restore(threadId))
    return env.useMockApi ? dto : { thread: toThread(dto) }
  },

  /** @param {string} threadId @param {number} days 1 | 3 | 7 (max 30) */
  snooze: (threadId, days) =>
    http.post(
      ENDPOINTS.threads.snooze(threadId),
      env.useMockApi ? { days } : { snooze_until: snoozeUntilIso(days) },
    ),
}

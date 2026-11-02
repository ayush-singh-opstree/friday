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
  toCapturePayload,
} from './adapters'

/**
 * Thread API.
 * Supports the filters and sort orders in Requirement 1: active, archived,
 * goingCold, pinned, snoozed / lastInteraction, attentionScore, createdAt, title.
 *
 * Dual mode (docs/08_system_architecture.md):
 *  - mock -> the bundled demo router already answers in the UI's camelCase shape.
 *  - live -> the FastAPI backend answers in snake_case with a `{ data, total }`
 *            envelope, so requests/responses are translated through `adapters.js`.
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

  /** Full thread payload: thread + captures + commitments + timeline + summaries. */
  detail: async (threadId) => {
    if (env.useMockApi) return http.get(ENDPOINTS.threads.detail(threadId))

    // The backend exposes these as separate resources, so compose them here.
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

  /**
   * @param {{ title: string, description?: string, personIds?: string[],
   *           goingColdThresholdDays?: number }} payload
   */
  create: async (payload) => {
    if (env.useMockApi) return http.post(ENDPOINTS.threads.create(), payload)

    const dto = await http.post(ENDPOINTS.threads.create(), toThreadCreatePayload(payload))
    const thread = toThread(dto)
    // Link associated people (a separate resource on the backend).
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

  remove: (threadId) => http.delete(ENDPOINTS.threads.remove(threadId)),

  archive: async (threadId) => {
    const dto = await http.post(ENDPOINTS.threads.archive(threadId))
    return env.useMockApi ? dto : { thread: toThread(dto) }
  },

  restore: async (threadId) => {
    const dto = await http.post(ENDPOINTS.threads.restore(threadId))
    return env.useMockApi ? dto : { thread: toThread(dto) }
  },

  /** @param {number} days 1 | 3 | 7, maximum 30 (Feature 11). */
  snooze: (threadId, days) =>
    http.post(
      ENDPOINTS.threads.snooze(threadId),
      env.useMockApi ? { days } : { snooze_until: snoozeUntilIso(days) },
    ),
}

/** Capture API - the write path behind Quick Capture everywhere in the app. */
export const capturesApi = {
  /** @param {{ threadId?: string, status?: 'inbox'|'filed', personId?: string }} [params] */
  list: async (params = {}) => {
    if (env.useMockApi) return http.get(ENDPOINTS.captures.list(), { query: params })

    const query = { limit: 200 }
    if (params.threadId) query.thread_id = params.threadId
    if (params.status) query.status = params.status
    if (params.personId) query.person_id = params.personId

    const payload = await http.get(ENDPOINTS.captures.list(), { query })
    const captures = toList(payload).rows.map(toCapture)
    return { captures, total: payload?.total ?? captures.length }
  },

  /**
   * @param {{ content: string, type?: string, threadId?: string|null,
   *           personId?: string|null, source?: string, capturedAt?: string }} payload
   */
  create: async (payload) => {
    if (env.useMockApi) return http.post(ENDPOINTS.captures.create(), payload)
    const dto = await http.post(ENDPOINTS.captures.create(), toCapturePayload(payload))
    return { capture: toCapture(dto) }
  },

  /** @param {string} captureId @param {{ content?: string, type?: string }} patch */
  update: async (captureId, patch) => {
    if (env.useMockApi) return http.patch(ENDPOINTS.captures.update(captureId), patch)

    const body = {}
    if (patch.content !== undefined) body.content = patch.content
    if (patch.type !== undefined) body.type = patch.type
    if (patch.threadId !== undefined) body.thread_id = patch.threadId
    const dto = await http.patch(ENDPOINTS.captures.update(captureId), body)
    return { capture: toCapture(dto) }
  },

  remove: (captureId) => http.delete(ENDPOINTS.captures.remove(captureId)),

  /** File an Inbox capture into a thread. */
  assign: async (captureId, threadId) => {
    if (env.useMockApi) return http.post(ENDPOINTS.captures.assign(captureId), { threadId })
    const dto = await http.post(ENDPOINTS.captures.assign(captureId), { thread_id: threadId })
    return { capture: toCapture(dto) }
  },
}

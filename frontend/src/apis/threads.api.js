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
  toClubList,
  toList,
  toThread,
  toThreadCreatePayload,
  toThreadUpdatePayload,
  toThreadPeople,
  toTimelineEvent,
  toCapturePayload,
} from './adapters'

/**
 * Thread <-> person associations live on their own resource, and the backend's
 * ThreadResponse does not include them - so they are attached here. Without
 * this the People tab, the thread cards and the `personId` filter all render
 * empty even though the timeline shows the `person_added` events.
 */
async function attachPeople(threads, { max = 60 } = {}) {
  if (!Array.isArray(threads) || threads.length === 0) return threads ?? []

  // Capped so a large workspace can never fan out into hundreds of requests.
  const targets = threads.slice(0, max)
  const linkSets = await Promise.all(
    targets.map((thread) => http.get(ENDPOINTS.threads.people(thread.id)).catch(() => [])),
  )
  targets.forEach((thread, index) => {
    thread.people = toThreadPeople(linkSets[index])
  })
  return threads
}

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
    // People are attached before filtering: the cards render them and the
    // `personId` filter matches against them.
    const withPeople = await attachPeople(toList(payload).rows.map(toThread))
    const threads = applyThreadQuery(applyThreadFilter(withPeople, params.filter), params)
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
    // Sub-resources are best-effort: if one fails (e.g. a legacy record the
    // server cannot serialise) the thread must still open instead of the whole
    // page erroring out.
    const [
      threadResult,
      capturesResult,
      commitmentsResult,
      timelineResult,
      peopleResult,
      clubsResult,
    ] = await Promise.allSettled([
      http.get(ENDPOINTS.threads.detail(threadId)),
      http.get(ENDPOINTS.captures.list(), { query: { thread_id: threadId, limit: 200 } }),
      http.get(ENDPOINTS.commitments.list(), { query: { thread_id: threadId, limit: 200 } }),
      http.get(ENDPOINTS.threads.timeline(threadId), { query: { limit: 200 } }),
      http.get(ENDPOINTS.threads.people(threadId)),
      http.get(ENDPOINTS.threads.clubs(threadId), { query: { limit: 200 } }),
    ])

    // The thread itself is required - only its failure should surface.
    if (threadResult.status === 'rejected') {
      throw threadResult.reason ?? new Error('Could not open that thread.')
    }

    const settle = (result, fallback = null) =>
      result.status === 'fulfilled' ? result.value : fallback

    const threadDto = settle(threadResult)
    const capturesPayload = settle(capturesResult)
    const commitmentsPayload = settle(commitmentsResult)
    const timelinePayload = settle(timelineResult)
    const peopleLinks = settle(peopleResult, [])
    const clubsPayload = settle(clubsResult)

    const thread = toThread(threadDto)
    const captures = toList(capturesPayload).rows.map(toCapture)
    const commitments = toList(commitmentsPayload).rows.map((row) =>
      toCommitment(row, thread?.title ?? null),
    )
    const timeline = (Array.isArray(timelinePayload) ? timelinePayload : []).map(toTimelineEvent)
    const clubs = toClubList(clubsPayload)

    if (thread) {
      thread.people = toThreadPeople(peopleLinks)
      thread.openCommitmentCount = commitments.filter((row) => row.status === 'open').length
    }
    return { thread, captures, commitments, timeline, clubs, summaries: [] }
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

  /** Link a person to a thread (backend: POST /threads/{id}/people). */
  addPerson: (threadId, personId) =>
    http.post(ENDPOINTS.threads.people(threadId), { person_id: personId }),

  /** Unlink a person from a thread (backend: DELETE /threads/{id}/people/{personId}). */
  removePerson: (threadId, personId) =>
    http.delete(ENDPOINTS.threads.person(threadId, personId)),
}

/** Capture API - the write path behind Quick Capture everywhere in the app. */
export const capturesApi = {
  /** @param {{ threadId?: string, clubId?: string, status?: 'inbox'|'filed', personId?: string }} [params] */
  list: async (params = {}) => {
    if (env.useMockApi) return http.get(ENDPOINTS.captures.list(), { query: params })

    const query = { limit: 200 }
    if (params.threadId) query.thread_id = params.threadId
    if (params.clubId) query.club_id = params.clubId
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

  /** @param {string} captureId @param {{ content?: string, type?: string, threadId?: string, clubId?: string, deadline?: string }} patch */
  update: async (captureId, patch) => {
    if (env.useMockApi) return http.patch(ENDPOINTS.captures.update(captureId), patch)

    const body = {}
    if (patch.content !== undefined) body.content = patch.content
    if (patch.type !== undefined) body.type = patch.type
    if (patch.threadId !== undefined) body.thread_id = patch.threadId
    if (patch.clubId !== undefined) body.club_id = patch.clubId
    if (patch.deadline !== undefined) body.deadline = patch.deadline
    const dto = await http.patch(ENDPOINTS.captures.update(captureId), body)
    return { capture: toCapture(dto) }
  },

  remove: (captureId) => http.delete(ENDPOINTS.captures.remove(captureId)),

  /** File an Inbox capture into a thread (optionally into a club session). */
  assign: async (captureId, threadId, clubId = null) => {
    if (env.useMockApi) {
      return http.post(ENDPOINTS.captures.assign(captureId), { threadId, clubId })
    }
    const dto = await http.post(ENDPOINTS.captures.assign(captureId), {
      thread_id: threadId,
      club_id: clubId ?? null,
    })
    return { capture: toCapture(dto) }
  },
}

import { http } from './client'
import { ENDPOINTS } from './endpoints'
import { env } from '@/config/env'
import {
  derivePeopleStats,
  peopleListParams,
  toCommitment,
  toList,
  toPerson,
  toPersonPayload,
} from './adapters'

/**
 * The backend's PersonResponse carries no counts, but the directory cards show
 * "N threads" / "N open commitments" / last contact. Derive them once per list
 * load from the thread links and commitments (capped so a huge workspace can
 * never fan out into hundreds of requests).
 */
const MAX_THREADS_SCANNED = 60

const EMPTY_STATS = { threadCount: 0, openCommitmentCount: 0, lastInteractionAt: null }

async function withCounts(people) {
  if (people.length === 0) return people

  try {
    const [threadsPayload, commitmentsPayload] = await Promise.all([
      http.get(ENDPOINTS.threads.list(), { query: { limit: 200 } }),
      http.get(ENDPOINTS.commitments.list(), { query: { limit: 200 } }),
    ])

    const threads = toList(threadsPayload).rows.slice(0, MAX_THREADS_SCANNED)
    const linkSets = await Promise.all(
      threads.map((thread) => http.get(ENDPOINTS.threads.people(thread.id)).catch(() => [])),
    )

    const stats = derivePeopleStats(threads, linkSets, toList(commitmentsPayload).rows)
    return people.map((person) => ({ ...person, ...(stats.get(person.id) ?? EMPTY_STATS) }))
  } catch {
    // Counts are decoration - never fail the directory over them.
    return people
  }
}

/** People directory API (Requirement 2 / Feature 3). */
export const peopleApi = {
  /** @param {{ query?: string, threadId?: string }} [params] */
  list: async (params = {}) => {
    if (env.useMockApi) return http.get(ENDPOINTS.people.list(), { query: params })

    const payload = await http.get(ENDPOINTS.people.list(), {
      query: peopleListParams({ query: params.query }),
    })
    const people = await withCounts(toList(payload).rows.map(toPerson))
    return { people, total: payload?.total ?? people.length }
  },

  /** Person + their threads, commitments and captures. */
  detail: async (personId) => {
    if (env.useMockApi) return http.get(ENDPOINTS.people.detail(personId))

    // The backend exposes person, thread links and commitments separately.
    const [personDto, linksPayload, threadsPayload, commitmentsPayload] = await Promise.all([
      http.get(ENDPOINTS.people.detail(personId)),
      http.get(ENDPOINTS.people.threads(personId)),
      http.get(ENDPOINTS.threads.list(), { query: { limit: 200 } }),
      http.get(ENDPOINTS.commitments.list(), { query: { limit: 200 } }),
    ])

    const person = toPerson(personDto)
    const threadIds = new Set((Array.isArray(linksPayload) ? linksPayload : []).map((l) => l.thread_id))
    const threads = toList(threadsPayload)
      .rows.map((row) => ({ id: row.id, title: row.agenda ?? row.title, status: row.status }))
      .filter((row) => threadIds.has(row.id))
    const commitments = toList(commitmentsPayload)
      .rows.map((row) => toCommitment(row))
      .filter((row) => threadIds.has(row.threadId))
    return { person, threads, commitments, captures: [] }
  },

  /**
   * @param {{ fullName: string, organisation?: string, role?: string,
   *           email?: string, phone?: string, linkedInUrl?: string,
   *           notes?: string, threadIds?: string[] }} payload
   * Returns `{ person, possibleDuplicates, warning }` (Feature 3 -> duplicate detection).
   */
  create: async (payload) => {
    if (env.useMockApi) return http.post(ENDPOINTS.people.create(), payload)

    const body = toPersonPayload(payload)
    const res = await http.post(ENDPOINTS.people.create(), body)
    const person = toPerson(res?.data ?? res)
    const possibleDuplicates = (res?.duplicates ?? []).map(toPerson).filter(Boolean)

    // Link the person to any threads chosen at creation time.
    if (person && payload.threadIds?.length) {
      await Promise.all(
        payload.threadIds.map((threadId) =>
          http.post(ENDPOINTS.threads.people(threadId), { person_id: person.id }).catch(() => null),
        ),
      )
    }
    return {
      person,
      possibleDuplicates,
      warning: possibleDuplicates.length > 0 ? 'Possible duplicate records found.' : null,
    }
  },

  /** @param {string} personId @param {object} patch */
  update: async (personId, patch) => {
    if (env.useMockApi) return http.patch(ENDPOINTS.people.update(personId), patch)
    const dto = await http.patch(ENDPOINTS.people.update(personId), toPersonPayload(patch))
    return { person: toPerson(dto) }
  },

  remove: (personId) => http.delete(ENDPOINTS.people.remove(personId)),

  /** Consolidate two records; notes are appended with a separator. */
  merge: async (primaryId, duplicateId, options = {}) => {
    if (env.useMockApi) {
      return http.post(ENDPOINTS.people.merge(), { primaryId, duplicateId, ...options })
    }
    // Backend semantics: merge `source_id` INTO `target_id` (source is deleted).
    const dto = await http.post(ENDPOINTS.people.merge(), {
      source_id: duplicateId,
      target_id: primaryId,
    })
    return { person: toPerson(dto), mergedFrom: duplicateId }
  },
}

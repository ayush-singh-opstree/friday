import { http } from './client'
import { ENDPOINTS } from './endpoints'
import { env } from '@/config/env'
import { peopleListParams, toCommitment, toList, toPerson, toPersonPayload } from './adapters'

/** People directory API (Requirement 2 in docs/02_prd.md). */
export const peopleApi = {
  /**
   * @param {{ query?: string, threadId?: string }} [params]
   */
  list: async (params = {}) => {
    if (env.useMockApi) return http.get(ENDPOINTS.people.list(), { query: params })

    const payload = await http.get(ENDPOINTS.people.list(), {
      query: peopleListParams({ query: params.query }),
    })
    const people = toList(payload).rows.map(toPerson)
    return { people, total: payload?.total ?? people.length }
  },

  /** @param {string} personId */
  detail: async (personId) => {
    if (env.useMockApi) return http.get(ENDPOINTS.people.detail(personId))

    const [personDto, linksPayload, threadsPayload, commitmentsPayload] = await Promise.all([
      http.get(ENDPOINTS.people.detail(personId)),
      http.get(ENDPOINTS.people.threads(personId)),
      http.get(ENDPOINTS.threads.list(), { query: { limit: 200 } }),
      http.get(ENDPOINTS.commitments.list(), { query: { limit: 200 } }),
    ])

    const person = toPerson(personDto)
    const threadIds = new Set(
      (Array.isArray(linksPayload) ? linksPayload : []).map((l) => l.thread_id),
    )
    const threads = toList(threadsPayload)
      .rows.map((row) => ({ id: row.id, title: row.title, status: row.status }))
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
   */
  create: async (payload) => {
    if (env.useMockApi) return http.post(ENDPOINTS.people.create(), payload)

    const res = await http.post(ENDPOINTS.people.create(), toPersonPayload(payload))
    const person = toPerson(res?.data ?? res)
    const possibleDuplicates = (res?.duplicates ?? []).map(toPerson).filter(Boolean)
    if (person && payload.threadIds?.length) {
      await Promise.all(
        payload.threadIds.map((threadId) =>
          http.post(ENDPOINTS.threads.people(threadId), { person_id: person.id }).catch(() => null),
        ),
      )
    }
    return { person, possibleDuplicates }
  },

  /** @param {string} personId @param {object} patch */
  update: async (personId, patch) => {
    if (env.useMockApi) return http.patch(ENDPOINTS.people.update(personId), patch)
    const dto = await http.patch(ENDPOINTS.people.update(personId), toPersonPayload(patch))
    return { person: toPerson(dto) }
  },

  /** @param {string} personId */
  remove: (personId) => http.delete(ENDPOINTS.people.remove(personId)),

  /** @param {string} primaryId @param {string} duplicateId */
  merge: async (primaryId, duplicateId) => {
    if (env.useMockApi) return http.post(ENDPOINTS.people.merge(), { primaryId, duplicateId })
    const dto = await http.post(ENDPOINTS.people.merge(), {
      source_id: duplicateId,
      target_id: primaryId,
    })
    return { person: toPerson(dto), mergedFrom: duplicateId }
  },
}

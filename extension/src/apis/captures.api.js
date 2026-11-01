import { http } from './client'
import { ENDPOINTS } from './endpoints'
import { env } from '@/config/env'
import { toCapture, toCapturePayload, toList } from './adapters'

/**
 * Capture API - the write path used by Quick Capture everywhere in the
 * extension (popup, side panel and the injected companion).
 * Dual mode: mock returns camelCase; live maps the snake_case backend contract.
 */
export const capturesApi = {
  /**
   * @param {{ threadId?: string, status?: 'inbox' | 'filed', personId?: string }} [params]
   */
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
   * @param {{ content: string, type?: string, threadId?: string | null,
   *           personId?: string | null, source?: string, capturedAt?: string }} payload
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

  /** @param {string} captureId */
  remove: (captureId) => http.delete(ENDPOINTS.captures.remove(captureId)),

  /** File an Inbox capture into a thread. */
  assign: async (captureId, threadId) => {
    if (env.useMockApi) return http.post(ENDPOINTS.captures.assign(captureId), { threadId })
    const dto = await http.post(ENDPOINTS.captures.assign(captureId), { thread_id: threadId })
    return { capture: toCapture(dto) }
  },
}

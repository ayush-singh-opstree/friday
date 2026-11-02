import { http } from './client'
import { ENDPOINTS } from './endpoints'
import { env } from '@/config/env'

export const clubsApi = {
  /**
   * Start a meeting capture session (Club) for a thread.
   * @param {{ threadId: string, name?: string, source?: string }} payload
   */
  start: async ({ threadId, name, source = 'extension' }) => {
    if (env.useMockApi) {
      return {
        id: `club_${Date.now()}`,
        thread_id: threadId,
        name: name || undefined,
        started_at: new Date().toISOString(),
        source,
      }
    }
    return http.post(ENDPOINTS.clubs.start(), {
      thread_id: threadId,
      name: name || undefined,
      source,
    })
  },

  /**
   * End a meeting capture session (Club).
   * @param {string} clubId
   * @param {string} [endedAt]
   */
  end: async (clubId, endedAt = new Date().toISOString()) => {
    if (!clubId) return null
    if (env.useMockApi) {
      return { id: clubId, ended_at: endedAt }
    }
    return http.post(ENDPOINTS.clubs.end(clubId), { ended_at: endedAt })
  },

  /**
   * Get club session detail with grouped subthreads.
   * @param {string} clubId
   */
  detail: async (clubId) => {
    if (!clubId) return null
    if (env.useMockApi) return { id: clubId, subthreads: [] }
    return http.get(ENDPOINTS.clubs.detail(clubId))
  },

  /**
   * List all clubs for a thread.
   * @param {string} threadId
   */
  listByThread: async (threadId) => {
    if (!threadId) return []
    if (env.useMockApi) return []
    return http.get(ENDPOINTS.clubs.byThread(threadId))
  },
}


import { http } from './client'
import { ENDPOINTS } from './endpoints'
import { env } from '@/config/env'
import { ApiError } from '@/lib/errors'

/**
 * Authentication API.
 *
 * Phase 1 ships Clerk in production; the extension and the local session store
 * both exchange credentials for a bearer token through these same endpoints.
 *
 * Live + Phase 0 backend note: the hackathon backend is single-user with **no
 * auth** (backend/app/config.py -> DEMO_USER_ID). We still try `POST /auth/login`
 * first so a future auth-enabled backend works unchanged; if that route does not
 * exist (404/405) we fall back to a local session bound to the demo user.
 */
function demoSession(email) {
  const now = new Date().toISOString()
  return {
    accessToken: 'phase0-demo-session',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    user: {
      id: '00000000-0000-0000-0000-000000000001',
      email: email || 'meera@threadwise.app',
      fullName: 'Meera Krishnamurthy',
      plan: 'pro',
      role: 'owner',
      goingColdThresholdDays: 14,
      digestTime: '08:00',
      digestEnabled: true,
      emailDigestEnabled: false,
      notificationPreferences: {},
      createdAt: now,
      lastActiveAt: now,
    },
  }
}

export const authApi = {
  /** @param {{ email: string, password: string }} credentials */
  login: async (credentials) => {
    if (env.useMockApi) return http.post(ENDPOINTS.auth.login(), credentials, { auth: false })

    const email = String(credentials?.email ?? '').trim()
    if (!email || !credentials?.password) {
      throw new ApiError('Enter your email and password to continue.', {
        status: 422,
        code: 'validation_error',
      })
    }

    try {
      return await http.post(ENDPOINTS.auth.login(), credentials, { auth: false })
    } catch (error) {
      // The Phase 0 backend exposes no auth routes; connect as the demo user.
      if (error?.status === 404 || error?.status === 405) return demoSession(email)
      throw error
    }
  },

  logout: async () => {
    if (env.useMockApi) return http.post(ENDPOINTS.auth.logout())
    try {
      return await http.post(ENDPOINTS.auth.logout())
    } catch {
      return null
    }
  },

  me: async () => {
    if (env.useMockApi) return http.get(ENDPOINTS.auth.me())
    try {
      return await http.get(ENDPOINTS.auth.me())
    } catch {
      return null
    }
  },
}

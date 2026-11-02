import { http } from './client'
import { ENDPOINTS } from './endpoints'
import { env } from '@/config/env'
import { ApiError } from '@/lib/errors'

/**
 * Authentication API.
 *
 * The web app authenticates with Clerk; the extension exchanges credentials for
 * a bearer token via the same `/auth` endpoints documented in
 * docs/08_system_architecture.md.
 *
 * Live + Phase 0 backend note: the hackathon backend is single-user with no
 * auth. We still try `POST /auth/login` first so an auth-enabled backend works
 * unchanged; if the route does not exist (404/405) we fall back to a local
 * session bound to the demo user (mirrors the web app).
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

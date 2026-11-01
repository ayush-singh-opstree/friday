import { http } from './client'
import { ENDPOINTS } from './endpoints'

/**
 * Authentication API.
 *
 * Phase 1 ships Clerk in production; the extension and the local session store
 * both exchange credentials for a bearer token through these same endpoints.
 */
export const authApi = {
  /** @param {{ email: string, password: string }} credentials */
  login: (credentials) => http.post(ENDPOINTS.auth.login(), credentials, { auth: false }),

  logout: () => http.post(ENDPOINTS.auth.logout()),

  me: () => http.get(ENDPOINTS.auth.me()),
}

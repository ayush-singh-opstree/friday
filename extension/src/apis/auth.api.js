import { http } from './client'
import { ENDPOINTS } from './endpoints'

/**
 * Authentication API.
 *
 * The web app authenticates with Clerk; the extension exchanges credentials for
 * a bearer token via the same `/auth` endpoints documented in
 * docs/08_system_architecture.md.
 */
export const authApi = {
  /** @param {{ email: string, password: string }} credentials */
  login: (credentials) => http.post(ENDPOINTS.auth.login(), credentials, { auth: false }),

  logout: () => http.post(ENDPOINTS.auth.logout()),

  me: () => http.get(ENDPOINTS.auth.me()),
}

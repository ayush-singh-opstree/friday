/**
 * HTTP client for the Friday API.
 *
 * Responsibilities:
 *  - attach the bearer token from `src/auth/tokenStore`
 *  - serialise query strings, JSON bodies and timeouts
 *  - normalise failures into `ApiError`
 *  - route to the bundled mock implementation while no backend is configured
 *
 * Nothing here knows about React, so it is safe to import from the background
 * service worker and content scripts as well as the UI surfaces.
 */
import { getAccessToken, clearSession } from '@/auth/tokenStore'
import { env } from '@/config/env'
import { ApiError, toError } from '@/lib/errors'
import { handleMockRequest } from '@/mocks/handlers'

function toQueryString(query) {
  if (!query) return ''
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    params.append(key, String(value))
  }
  const serialised = params.toString()
  return serialised ? `?${serialised}` : ''
}

/**
 * @param {string} path
 * @param {{ method?: string, body?: unknown, query?: Record<string, unknown>,
 *           auth?: boolean, signal?: AbortSignal }} [options]
 * @returns {Promise<any>}
 */
export async function apiRequest(path, options = {}) {
  const { method = 'GET', body, query, auth = true, signal } = options

  // Demo mode: resolve locally, passing the session token so the router can bind
  // the caller's isolated workspace.
  if (env.useMockApi) {
    return handleMockRequest({ method, path, body, query, token: getAccessToken() })
  }

  if (!env.apiBaseUrl) {
    throw new ApiError(
      'No API base URL configured. Set VITE_API_BASE_URL or enable VITE_USE_MOCK_API.',
      { status: 0, code: 'config_error' },
    )
  }

  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const token = getAccessToken()
  if (auth && token) headers.Authorization = `Bearer ${token}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), env.apiTimeoutMs)
  if (signal) signal.addEventListener('abort', () => controller.abort(), { once: true })

  try {
    const response = await fetch(`${env.apiBaseUrl}${path}${toQueryString(query)}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
      credentials: 'omit',
    })

    if (response.status === 204) return null

    const isJson = (response.headers.get('content-type') ?? '').includes('application/json')
    const payload = isJson ? await response.json().catch(() => null) : await response.text()

    if (!response.ok) {
      const message =
        (payload && typeof payload === 'object' && (payload.message || payload.error)) ||
        `Request failed with status ${response.status}`

      if (response.status === 401) await clearSession()

      throw new ApiError(message, {
        status: response.status,
        code: payload?.code ?? 'http_error',
        details: payload,
      })
    }

    return payload
  } catch (error) {
    if (error instanceof ApiError) throw error
    if (error?.name === 'AbortError') {
      throw new ApiError('The request timed out. Check your connection and try again.', {
        status: 0,
        code: 'timeout',
      })
    }
    throw new ApiError(toError(error).message, { status: 0, code: 'network_error' })
  } finally {
    clearTimeout(timeout)
  }
}

export const http = {
  get: (path, options) => apiRequest(path, { ...options, method: 'GET' }),
  post: (path, body, options) => apiRequest(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => apiRequest(path, { ...options, method: 'PATCH', body }),
  put: (path, body, options) => apiRequest(path, { ...options, method: 'PUT', body }),
  delete: (path, options) => apiRequest(path, { ...options, method: 'DELETE' }),
}

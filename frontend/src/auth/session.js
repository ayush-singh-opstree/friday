/**
 * Session persistence.
 *
 * Phase 1 ships a local session store so the product works end-to-end before
 * Clerk is wired up. Swapping in Clerk later only changes this module and
 * `AuthProvider` - every consumer talks to `getAccessToken()`.
 *
 * Storage choice: `localStorage` (not a cookie) because the API client attaches
 * the token as a bearer header and the API keeps `credentials: 'omit'`.
 */
import { STORAGE_KEYS } from '@/config/constants'

/** @type {import('@/types/models').Session | null} */
let cache = null

function read() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.accessToken ? parsed : null
  } catch {
    return null
  }
}

/** Hydrate the in-memory cache. Safe to call repeatedly. */
export function loadSession() {
  cache = read()
  return cache
}

/** Synchronous cached session. */
export function getSession() {
  return cache
}

/** @param {import('@/types/models').Session} session */
export function saveSession(session) {
  cache = session
  try {
    localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session))
  } catch {
    // Private mode: keep the in-memory session for this tab.
  }
  return session
}

export function clearSession() {
  cache = null
  try {
    localStorage.removeItem(STORAGE_KEYS.SESSION)
  } catch {
    // ignore
  }
}

export function getAccessToken() {
  return cache?.accessToken ?? read()?.accessToken ?? null
}

export function isAuthenticated() {
  return Boolean(getAccessToken())
}

export function getCurrentUser() {
  return cache?.user ?? read()?.user ?? null
}

/**
 * Keep every open tab in sync when the session changes.
 * @param {(session: import('@/types/models').Session | null) => void} handler
 */
export function subscribeToSession(handler) {
  if (typeof window === 'undefined') return () => {}
  const onStorage = (event) => {
    if (event.key !== STORAGE_KEYS.SESSION) return
    cache = read()
    handler(cache)
  }
  window.addEventListener('storage', onStorage)
  return () => window.removeEventListener('storage', onStorage)
}
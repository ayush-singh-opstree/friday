/**
 * Session persistence for the extension.
 *
 * The web app uses Clerk (docs/08_system_architecture.md). For the extension we
 * persist the token pair + user profile returned by `POST /auth/login` in
 * `chrome.storage.local`, which is only readable by this extension.
 */
import { STORAGE_KEYS } from '@/config/constants'
import { onStorageChanged, getValue, removeValue, setValue } from '@/lib/storage'

/** @type {import('@/types/models').Session | null} */
let cache = null

/** Hydrate the in-memory cache from storage. Call once per surface. */
export async function loadSession() {
  const stored = await getValue(STORAGE_KEYS.SESSION, null)
  cache = stored && stored.accessToken ? stored : null
  return cache
}

/** Synchronous read of the cached session (after `loadSession`). */
export function getSession() {
  return cache
}

/** @param {import('@/types/models').Session} session */
export async function saveSession(session) {
  cache = session
  await setValue(STORAGE_KEYS.SESSION, session)
  return session
}

export async function clearSession() {
  cache = null
  await removeValue(STORAGE_KEYS.SESSION)
}

export function getAccessToken() {
  return cache?.accessToken ?? null
}

export function isAuthenticated() {
  return Boolean(cache?.accessToken)
}

export function getCurrentUser() {
  return cache?.user ?? null
}

/** Keep the cache in sync when another surface signs in or out. */
export function subscribeToSession(handler) {
  return onStorageChanged(STORAGE_KEYS.SESSION, (next) => {
    cache = next && next.accessToken ? next : null
    handler(cache)
  })
}

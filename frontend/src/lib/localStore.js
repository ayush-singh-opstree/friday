/**
 * Tiny typed localStorage helper.
 *
 * Used for small, non-critical client state (cold-alert dismissals, recent
 * searches, settings). Durable user data goes through the API and, from Phase
 * 1E, through Dexie.
 */

export function readJson(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    // Private mode / quota: the app keeps working without persistence.
    return false
  }
}

export function removeKey(key) {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

/** Read a plain record, defaulting to {}. */
export function readRecord(key) {
  const value = readJson(key, {})
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}
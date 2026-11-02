/**
 * Storage adapter.
 *
 * Uses `chrome.storage.local` in every extension surface (popup, side panel,
 * options page, content script, service worker) and transparently falls back to
 * `localStorage` so the UI can also be opened in a plain browser tab during
 * development.
 */

const memoryFallback = new Map()

function getChromeStorage() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return chrome.storage.local
  }
  return null
}

function hasLocalStorage() {
  try {
    return typeof localStorage !== 'undefined'
  } catch {
    return false
  }
}

/** Read a single key, returning `fallback` when unset. */
export async function getValue(key, fallback = null) {
  const store = getChromeStorage()
  if (store) {
    const result = await store.get(key)
    return result?.[key] ?? fallback
  }
  if (hasLocalStorage()) {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    try {
      return JSON.parse(raw)
    } catch {
      return fallback
    }
  }
  return memoryFallback.has(key) ? memoryFallback.get(key) : fallback
}

/** Persist a JSON-serialisable value. */
export async function setValue(key, value) {
  const store = getChromeStorage()
  if (store) {
    await store.set({ [key]: value })
    return
  }
  if (hasLocalStorage()) {
    localStorage.setItem(key, JSON.stringify(value))
    return
  }
  memoryFallback.set(key, value)
}

/** Remove a key. */
export async function removeValue(key) {
  const store = getChromeStorage()
  if (store) {
    await store.remove(key)
    return
  }
  if (hasLocalStorage()) {
    localStorage.removeItem(key)
    return
  }
  memoryFallback.delete(key)
}

/** Read several keys at once, resolved as an object. */
export async function getValues(keys, fallbacks = {}) {
  const entries = await Promise.all(
    keys.map(async (key) => [key, await getValue(key, fallbacks[key] ?? null)]),
  )
  return Object.fromEntries(entries)
}

/** Merge a partial patch into a stored object value. */
export async function mergeValue(key, patch) {
  const current = (await getValue(key, null)) ?? {}
  const next = { ...current, ...patch }
  await setValue(key, next)
  return next
}

/**
 * Subscribe to changes for a key. Returns an unsubscribe function.
 * Works in extension pages (chrome.storage.onChanged) and falls back to the
 * `storage` event for the plain-browser dev case.
 */
export function onStorageChanged(key, handler) {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    const listener = (changes, areaName) => {
      if (areaName !== 'local' || !(key in changes)) return
      handler(changes[key].newValue ?? null, changes[key].oldValue ?? null)
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }

  if (hasLocalStorage()) {
    const listener = (event) => {
      if (event.key !== key) return
      let newValue
      try {
        newValue = event.newValue === null ? null : JSON.parse(event.newValue)
      } catch {
        newValue = null
      }
      handler(newValue, null)
    }
    window.addEventListener('storage', listener)
    return () => window.removeEventListener('storage', listener)
  }

  return () => {}
}

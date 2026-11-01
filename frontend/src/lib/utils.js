import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Conditional + conflict-free class names. */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/** Unique id; prefers the platform UUID generator. */
export function uid(prefix = 'id') {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return `${prefix}_${random}`
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** "Meera Krishnamurthy" -> "MK". */
export function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function groupBy(items, keyFn) {
  const map = new Map()
  for (const item of items) {
    const key = keyFn(item)
    const bucket = map.get(key)
    if (bucket) bucket.push(item)
    else map.set(key, [item])
  }
  return map
}

/** Stable sort helper for ISO timestamp fields. */
export function sortBy(field, direction = 'desc') {
  const factor = direction === 'asc' ? 1 : -1
  return (a, b) => factor * (new Date(a[field] ?? 0) - new Date(b[field] ?? 0))
}

/** Case-insensitive "does this value contain the query" test. */
export function matchesQuery(value, query) {
  if (!query) return true
  return String(value ?? '')
    .toLowerCase()
    .includes(String(query).trim().toLowerCase())
}

/** Truncate with an ellipsis. */
export function truncate(text, max = 120) {
  const value = String(text ?? '')
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`
}

/** Pluralise a noun for count labels: pluralise(2, 'day') -> '2 days'. */
export function pluralise(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

/**
 * Wrap a promise so it can never reject: returns `[error, data]`.
 * @template T
 * @param {Promise<T>} promise
 * @returns {Promise<[Error, null] | [null, T]>}
 */
export async function settle(promise) {
  try {
    return [null, await promise]
  } catch (error) {
    return [error instanceof Error ? error : new Error(String(error)), null]
  }
}

/** Simple, dependency-free debounce for non-React call sites. */
export function debounce(fn, delay = 300) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

/** Sort a list of `{ label }`-ish objects alphabetically by a key. */
export function alphabetical(key = 'fullName') {
  return (a, b) => String(a[key] ?? '').localeCompare(String(b[key] ?? ''))
}

import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Conditional + conflict-free class name helper.
 * @param {...import('clsx').ClassValue} inputs
 * @returns {string}
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/** RFC4122-ish unique id. Prefers crypto.randomUUID when available. */
export function uid(prefix = 'id') {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  return `${prefix}_${random}`
}

/** Promise-based sleep, used by the mock API to simulate latency. */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** "Meera Krishnamurthy" -> "MK"; falls back to the first letter. */
export function initials(name = '') {
  const parts = String(name).trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

/** Clamp a number into an inclusive range. */
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

/** Group an array into a Map keyed by the result of `keyFn`. */
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

/** Sort helper: newest ISO timestamp first. */
export function byDateDesc(field) {
  return (a, b) => new Date(b[field] ?? 0) - new Date(a[field] ?? 0)
}

/** Sort helper: oldest ISO timestamp first. */
export function byDateAsc(field) {
  return (a, b) => new Date(a[field] ?? 0) - new Date(b[field] ?? 0)
}

/** Case-insensitive contains match on a nullable string field. */
export function matchesQuery(value, query) {
  if (!query) return true
  return String(value ?? '').toLowerCase().includes(query.trim().toLowerCase())
}

/**
 * Wrap a promise so it can never reject; returns `[error, data]`.
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

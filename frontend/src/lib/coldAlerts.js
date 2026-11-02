/**
 * Going-cold alert state (Feature 10).
 *
 * Behaviour from docs/03_feature_specs.md:
 *   - dismissing a cold alert hides it for 7 days
 *   - dismissing the same thread 3 times in a row offers to archive it
 *
 * Kept client-side because it is presentation state, not relationship data.
 */
import { COLD_DISMISSAL_DAYS, COLD_DISMISSALS_BEFORE_ARCHIVE_PROMPT, STORAGE_KEYS } from '@/config/constants'
import { readRecord, writeJson } from './localStore'

const WINDOW_MS = COLD_DISMISSAL_DAYS * 24 * 60 * 60 * 1000

function readAll() {
  return readRecord(STORAGE_KEYS.COLD_DISMISSALS)
}

/** True while an alert for this thread is suppressed. */
export function isColdAlertDismissed(threadId) {
  const entry = readAll()[threadId]
  if (!entry) return false
  return new Date(entry.suppressedUntil).getTime() > Date.now()
}

/** @returns {number} consecutive dismissals recorded for this thread. */
export function coldDismissalCount(threadId) {
  return readAll()[threadId]?.count ?? 0
}

/**
 * Record a dismissal. Returns the new consecutive count so the caller can offer
 * to archive once it reaches the documented threshold.
 */
export function dismissColdAlert(threadId) {
  const all = readAll()
  const previous = all[threadId]
  const count = (previous ? previous.count : 0) + 1

  all[threadId] = {
    count,
    suppressedUntil: new Date(Date.now() + WINDOW_MS).toISOString(),
    dismissedAt: new Date().toISOString(),
  }
  writeJson(STORAGE_KEYS.COLD_DISMISSALS, all)

  return {
    count,
    shouldOfferArchive: count >= COLD_DISMISSALS_BEFORE_ARCHIVE_PROMPT,
  }
}

/** Clear the record (after re-engaging or archiving). */
export function clearColdAlert(threadId) {
  const all = readAll()
  if (!(threadId in all)) return
  delete all[threadId]
  writeJson(STORAGE_KEYS.COLD_DISMISSALS, all)
}

/** Filter a going-cold list down to the alerts that should be visible. */
export function visibleColdThreads(threads = []) {
  return threads.filter((thread) => !isColdAlertDismissed(thread.id))
}
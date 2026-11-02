/**
 * Attention Engine.
 *
 * A faithful client-side port of the pseudocode in docs/06_data_model.md.
 * The server is the authority (it writes `thread.attentionScore` and
 * `thread.attentionReason`), but the same rules run locally so the app can:
 *   - score optimistic/offline records,
 *   - explain scores in the UI,
 *   - fall back gracefully when the API is unavailable.
 */
import { ATTENTION_BANDS, DEFAULT_GOING_COLD_DAYS, URGENCY } from '@/config/constants'
import { commitmentUrgency, daysSince, daysUntil } from '@/lib/date'
import { clamp, pluralise } from '@/lib/utils'

/** Band descriptor for a 0-100 score. */
export function attentionBand(score = 0) {
  const value = clamp(Number(score) || 0, 0, 100)
  return (
    ATTENTION_BANDS.find((band) => value >= band.min && value <= band.max) ??
    ATTENTION_BANDS[ATTENTION_BANDS.length - 1]
  )
}

/** True when a thread has crossed its going-cold threshold (Feature 10). */
export function isGoingCold(thread) {
  if (!thread || thread.status === 'archived') return false
  if (thread.snoozedUntil && new Date(thread.snoozedUntil) > new Date()) return false
  const threshold = thread.goingColdThresholdDays || DEFAULT_GOING_COLD_DAYS
  return daysSince(thread.lastInteractionAt) >= threshold
}

/** True while a snooze is still active (Feature 11). */
export function isSnoozed(thread) {
  return Boolean(thread?.snoozedUntil && new Date(thread.snoozedUntil) > new Date())
}

/**
 * Compute the 0-100 attention score for a thread.
 * @param {import('@/types/models').Thread} thread
 * @param {Array<import('@/types/models').Commitment>} [openCommitments]
 * @returns {number}
 */
export function computeAttentionScore(thread, openCommitments = []) {
  if (!thread) return 0
  if (thread.status === 'archived') return 0
  // Snoozed threads always score 0 until the snooze expires.
  if (isSnoozed(thread)) return 0

  const pinBonus = thread.isPinned ? 15 : 0

  // Base score from recency (0-50 points).
  const days = daysSince(thread.lastInteractionAt)
  const threshold = thread.goingColdThresholdDays || DEFAULT_GOING_COLD_DAYS
  const recencyScore = Math.min(50, Math.floor((days / threshold) * 50))

  // Commitment pressure (0-35 points).
  let commitmentScore = 0
  for (const commitment of openCommitments) {
    if (!commitment.dueDate) {
      commitmentScore += 5
      continue
    }
    const until = daysUntil(commitment.dueDate)
    if (until < 0) commitmentScore += 20
    else if (until <= 2) commitmentScore += 15
    else if (until <= 7) commitmentScore += 10
    else commitmentScore += 5
  }
  commitmentScore = Math.min(35, commitmentScore)

  // Going-cold indicator (0-15 points).
  let goingColdScore = 0
  if (days >= threshold) goingColdScore = 15
  else if (days >= threshold * 0.75) goingColdScore = 8

  return Math.round(clamp(recencyScore + commitmentScore + goingColdScore + pinBonus, 0, 100))
}

/**
 * Plain-language explanation shown under each attention card.
 * @returns {string} e.g. "No contact in 18 days · 1 overdue commitment"
 */
export function attentionReason(thread, openCommitments = []) {
  if (!thread) return ''
  const reasons = []
  const days = daysSince(thread.lastInteractionAt)
  const threshold = thread.goingColdThresholdDays || DEFAULT_GOING_COLD_DAYS

  if (days > threshold) reasons.push(`No contact in ${days} days`)

  const overdue = openCommitments.filter(
    (item) => commitmentUrgency(item.dueDate, item.status) === URGENCY.OVERDUE,
  ).length
  if (overdue > 0) reasons.push(`${pluralise(overdue, 'overdue commitment')}`)

  const imminent = openCommitments.filter(
    (item) => commitmentUrgency(item.dueDate, item.status) === URGENCY.SOON,
  ).length
  if (imminent > 0) {
    reasons.push(`${pluralise(imminent, 'commitment')} due within 48h`)
  }

  if (reasons.length === 0) {
    if (days >= threshold * 0.75) reasons.push(`Last contact ${days} days ago`)
    else if (openCommitments.length > 0) {
      reasons.push(`${pluralise(openCommitments.length, 'open commitment')}`)
    } else {
      reasons.push('Active recently')
    }
  }

  return reasons.join(' · ')
}

/** Rank threads for the Today view (top 5, snoozed excluded). */
export function rankForToday(threads = [], limit = 5) {
  return [...threads]
    .filter((thread) => thread.status === 'active' && !isSnoozed(thread))
    .sort((a, b) => (b.attentionScore ?? 0) - (a.attentionScore ?? 0))
    .slice(0, limit)
}

/** Attach computed score/reason to a thread the way the server would. */
export function decorateThread(thread, allCommitments = []) {
  const open = allCommitments.filter(
    (item) => item.threadId === thread.id && item.status === 'open',
  )
  return {
    ...thread,
    attentionScore: computeAttentionScore(thread, open),
    attentionReason: attentionReason(thread, open),
    openCommitmentCount: open.length,
    isGoingCold: isGoingCold(thread),
  }
}

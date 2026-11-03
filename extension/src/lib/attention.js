/**
 * Attention Engine (client mirror).
 *
 * A faithful port of the pseudocode in docs/06_data_model.md so the extension
 * can score, band and explain threads locally (needed for the side panel and
 * for ordering the popup snapshot). Once the backend exists these values are
 * simply read from `thread.attentionScore` / `thread.attentionReason`; the
 * local implementation keeps the extension useful offline.
 */
import { ATTENTION_BANDS, DEFAULT_GOING_COLD_DAYS, URGENCY } from '@/config/constants'
import { commitmentUrgency, daysSince, daysUntil, toDate } from '@/lib/date'
import { clamp } from '@/lib/utils'

/** Band descriptor for a 0-100 score. */
export function attentionBand(score = 0) {
  const value = clamp(Number(score) || 0, 0, 100)
  return (
    ATTENTION_BANDS.find((band) => value >= band.min && value <= band.max) ??
    ATTENTION_BANDS[ATTENTION_BANDS.length - 1]
  )
}

/** True when a thread has crossed its going-cold threshold. */
export function isGoingCold(thread, now = Date.now()) {
  if (!thread || thread.status === 'archived') return false
  const threshold = thread.goingColdThresholdDays || DEFAULT_GOING_COLD_DAYS
  const days = daysSince(thread.lastInteractionAt)
  void now
  return days >= threshold
}

/**
 * Compute the 0-100 attention score for a thread.
 * @param {import('@/types/models').Thread} thread
 * @param {import('@/types/models').Commitment[]} [openCommitments]
 * @returns {number}
 */
export function computeAttentionScore(thread, openCommitments = []) {
  if (!thread) return 0

  // Snoozed threads always score 0 until the snooze expires.
  const snoozedUntil = toDate(thread.snoozedUntil)
  if (snoozedUntil && snoozedUntil > new Date()) return 0
  if (thread.status === 'archived') return 0

  const pinBonus = thread.isPinned ? 15 : 0

  // Base score from recency (0-50 points).
  const days = daysSince(thread.lastInteractionAt)
  const threshold = thread.goingColdThresholdDays || DEFAULT_GOING_COLD_DAYS
  const recencyScore = Math.min(50, (days / threshold) * 50)

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

  const raw = recencyScore + commitmentScore + goingColdScore + pinBonus
  return Math.round(clamp(raw, 0, 100))
}

/**
 * Plain-language explanation shown under each thread card.
 * @returns {string} e.g. "No contact in 18 days · 1 overdue commitment"
 */
export function attentionReason(thread, openCommitments = []) {
  if (!thread) return ''
  const reasons = []
  const days = daysSince(thread.lastInteractionAt)
  const threshold = thread.goingColdThresholdDays || DEFAULT_GOING_COLD_DAYS

  if (days > threshold) reasons.push(`No contact in ${days} days`)

  const overdue = openCommitments.filter(
    (commitment) => commitmentUrgency(commitment.dueDate, commitment.status) === URGENCY.OVERDUE,
  ).length
  if (overdue > 0) reasons.push(`${overdue} overdue commitment${overdue === 1 ? '' : 's'}`)

  const imminent = openCommitments.filter(
    (commitment) => commitmentUrgency(commitment.dueDate, commitment.status) === URGENCY.SOON,
  ).length
  if (imminent > 0) {
    reasons.push(`${imminent} commitment${imminent === 1 ? '' : 's'} due within 48h`)
  }

  if (reasons.length === 0) {
    if (days >= threshold * 0.75) reasons.push(`Last contact ${days} days ago`)
    else if (openCommitments.length > 0) {
      reasons.push(`${openCommitments.length} open commitment${openCommitments.length === 1 ? '' : 's'}`)
    } else reasons.push(`Active ${toDate(thread.lastInteractionAt) ? `${days} day${days === 1 ? '' : 's'}` : 'recently'}`)
  }

  return reasons.join(' · ')
}

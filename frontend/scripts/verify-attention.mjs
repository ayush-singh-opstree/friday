/**
 * Verifies the Attention Engine against the three worked examples in
 * docs/06_data_model.md. Run with:
 *
 *   npm run verify:attention
 *
 * This is the doc's own acceptance data, so a regression here is a real bug.
 */
import { attentionBand, attentionReason, computeAttentionScore } from '../src/lib/attention.js'

const DAY = 24 * 60 * 60 * 1000
const now = Date.now()
const daysAgo = (n) => new Date(now - n * DAY).toISOString()
const daysAhead = (n) => new Date(now + n * DAY).toISOString()

let failures = 0

function check(label, actual, expected) {
  const pass = actual === expected
  if (!pass) failures += 1
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}\n      expected: ${expected}\n      actual:   ${actual}`)
}

/* ---------------------------------------------------------------------------
 * Example 1: urgent thread
 *   last interaction 10 days ago, threshold 14, pinned,
 *   commitments: one overdue, one due in 1 day  ->  expected score 85
 * ------------------------------------------------------------------------ */
const urgentThread = {
  id: 'thr_fintech',
  status: 'active',
  isPinned: true,
  goingColdThresholdDays: 14,
  lastInteractionAt: daysAgo(10),
}
const urgentCommitments = [
  { dueDate: daysAgo(1), status: 'open' },
  { dueDate: daysAhead(1), status: 'open' },
]

check('Example 1 score (urgent)', computeAttentionScore(urgentThread, urgentCommitments), 85)
check(
  'Example 1 reason',
  attentionReason(urgentThread, urgentCommitments),
  '1 overdue commitment · 1 commitment due within 48h',
)

/* ---------------------------------------------------------------------------
 * Example 2: cold thread
 *   last interaction 22 days ago, threshold 14, no open commitments
 *   -> expected score 65
 * ------------------------------------------------------------------------ */
const coldThread = {
  id: 'thr_investor',
  status: 'active',
  isPinned: false,
  goingColdThresholdDays: 14,
  lastInteractionAt: daysAgo(22),
}

check('Example 2 score (cold)', computeAttentionScore(coldThread, []), 65)
check('Example 2 reason', attentionReason(coldThread, []), 'No contact in 22 days')

/* ---------------------------------------------------------------------------
 * Example 3: active thread, no urgency
 *   last interaction 2 days ago, one commitment due in 10 days
 *   -> expected score 12
 * ------------------------------------------------------------------------ */
const warmThread = {
  id: 'thr_design',
  status: 'active',
  isPinned: false,
  goingColdThresholdDays: 14,
  lastInteractionAt: daysAgo(2),
}

check(
  'Example 3 score (warm)',
  computeAttentionScore(warmThread, [{ dueDate: daysAhead(10), status: 'open' }]),
  12,
)

/* ---------------------------------------------------------------------------
 * Documented edge cases (docs/09_release_plan.md -> key unit tests)
 * ------------------------------------------------------------------------ */
check(
  'Snoozed thread always scores 0',
  computeAttentionScore({ ...urgentThread, snoozedUntil: daysAhead(3) }, urgentCommitments),
  0,
)

const pinned = computeAttentionScore(urgentThread, [])
const unpinned = computeAttentionScore({ ...urgentThread, isPinned: false }, [])
check('Pinned thread scores 15 above an equivalent unpinned thread', pinned - unpinned, 15)

check(
  'Archived thread scores 0',
  computeAttentionScore({ ...urgentThread, status: 'archived' }, urgentCommitments),
  0,
)

check('Band for 85 is critical', attentionBand(85).key, 'critical')
check('Band for 65 is high', attentionBand(65).key, 'high')
check('Band for 12 is low', attentionBand(12).key, 'low')

console.log(failures === 0 ? '\nAll Attention Engine checks passed.' : `\n${failures} check(s) failed.`)
process.exit(failures === 0 ? 0 : 1)
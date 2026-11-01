/**
 * Natural-language helpers for Quick Capture smart detection
 * (docs/05_user_flows.md -> Flow 3, "Smart Detection (Commitment Pattern)").
 *
 * This is deliberately a small deterministic rule set: it runs instantly on the
 * client, and the server's `/ai/classify` endpoint remains the source of truth
 * for anything ambiguous.
 */

/** Promise/action phrasing that usually indicates a commitment. */
const COMMITMENT_PATTERN =
  /\b(i'?ll|i will|we'?ll|we will|you'?ll|they'?ll|send|share|email|follow[- ]?up|circle back|schedule|book|prepare|draft|review|get back|due|by (mon|tues|wednes|thurs|fri|satur|sun)day|by (today|tomorrow|end of (day|week))|next week|this week)\b/i

/** Returns true when a capture probably contains a promise. */
export function looksLikeCommitment(text) {
  const value = String(text ?? '').trim()
  if (value.length < 8) return false
  return COMMITMENT_PATTERN.test(value)
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

/**
 * Very small due-date parser: "today", "tomorrow", "in 3 days", "next week",
 * "by Friday". Returns an ISO date at 17:00 local, or null.
 * @param {string} text
 */
export function parseDueDate(text) {
  const value = String(text ?? '').toLowerCase()
  const at = (days) => {
    const date = new Date()
    date.setDate(date.getDate() + days)
    date.setHours(17, 0, 0, 0)
    return date.toISOString()
  }

  if (/\btoday\b|\bend of day\b|\beod\b/.test(value)) return at(0)
  if (/\btomorrow\b|\btmrw\b/.test(value)) return at(1)
  if (/\bnext week\b/.test(value)) return at(7)

  const inDays = value.match(/\bin (\d{1,2}) days?\b/)
  if (inDays) return at(Number(inDays[1]))

  for (let index = 0; index < WEEKDAYS.length; index += 1) {
    if (new RegExp(`\\b${WEEKDAYS[index]}\\b`).test(value)) {
      const today = new Date().getDay()
      let delta = (index - today + 7) % 7
      if (delta === 0) delta = 7
      return at(delta)
    }
  }

  return null
}

/** Derive a sensible capture type from the wording. */
export function inferCaptureType(text) {
  const value = String(text ?? '').toLowerCase()
  if (value.startsWith('/decision') || /\b(we (agreed|decided)|decision:)\b/.test(value)) {
    return 'decision'
  }
  if (value.startsWith('?') || value.endsWith('?') || /\b(question|ask|wonder)\b/.test(value)) {
    return 'question'
  }
  if (looksLikeCommitment(text)) return 'action'
  return 'note'
}

/** Strip a leading slash-command such as `/decision:` from capture text. */
export function stripCommand(text) {
  return String(text ?? '').replace(/^\/(note|action|decision|question)\s*:?\s*/i, '').trim()
}

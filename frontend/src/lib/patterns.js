/**
 * Quick Capture smart detection.
 *
 * Implements docs/05_user_flows.md -> Flow 3, "Smart Detection (Commitment
 * Pattern)": when the user types something that reads like a promise, the UI
 * offers to turn it into a tracked commitment with a parsed due date.
 *
 * Deliberately small and deterministic - it runs on every keystroke (debounced)
 * with no network. The server's `/ai/classify` endpoint stays authoritative for
 * Brain Dump assignment and anything ambiguous.
 */

const COMMITMENT_PATTERN =
  /\b(i'?ll|i will|we'?ll|we will|you'?ll|they'?ll|send|share|email|follow[- ]?up|circle back|schedule|book|prepare|draft|review|get back|due|by (mon|tues|wednes|thurs|fri|satur|sun)day|by (today|tomorrow|end of (day|week))|next week|this week)\b/i

const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

/** True when the text probably contains a promise. */
export function looksLikeCommitment(text) {
  const value = String(text ?? '').trim()
  if (value.length < 8) return false
  return COMMITMENT_PATTERN.test(value)
}

/**
 * Small due-date parser: "today", "tomorrow", "in 3 days", "next week",
 * "by Friday". Returns an ISO timestamp at 17:00 local, or null.
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

/** Strip a leading slash command such as `/decision:` from capture text. */
export function stripCommand(text) {
  return String(text ?? '')
    .replace(/^\/(note|action|decision|question)\s*:?\s*/i, '')
    .trim()
}

/** Turn a commitment-flavoured capture into a short commitment description. */
export function toCommitmentDescription(text) {
  const cleaned = stripCommand(text)
  const pattern = cleaned.match(/\b(?:i'?ll|i will|we'?ll|we will)\s+(.+)/i)
  const candidate = pattern ? pattern[1] : cleaned
  const withoutWhen = candidate.replace(
    /\b(?:by|on)?\s*(?:today|tomorrow|next week|this week|(?:mon|tues|wednes|thurs|fri|satur|sun)day)\b.*$/i,
    '',
  )
  return withoutWhen.trim().replace(/[.,;]$/, '') || cleaned
}

/** Lower-case, punctuation-free name used for fuzzy comparison. */
export function normaliseName(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[.,'"()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(mr|mrs|ms|miss|dr|prof|sir|madam)\.?\s+/, '')
}

export function nameTokens(value) {
  return normaliseName(value).split(' ').filter(Boolean)
}

/**
 * Normalise text for quoted-phrase-aware matching (Feature 12 -> search).
 * Returns the raw phrases to look for, lower-cased.
 */
export function searchTerms(query) {
  const value = String(query ?? '').trim()
  if (!value) return []
  const phrases = [...value.matchAll(/"([^"]+)"/g)].map((match) => match[1].trim())
  if (phrases.length > 0) return phrases.filter(Boolean).map((phrase) => phrase.toLowerCase())
  return [value.toLowerCase()]
}

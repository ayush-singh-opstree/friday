/**
 * Detection service - the DOM-free half of the companion's page matching.
 *
 * Feature 13 contract: the extension only ever reads a person's display name,
 * an optional email address and the page URL. It never stores page content.
 *
 * The DOM parsing lives in `src/content/detectors/*`; everything here is pure
 * and therefore reusable from the popup, side panel and service worker.
 */
import { APPROVED_DOMAINS } from '@/config/constants'

/** Bare, `www.`-stripped list of hosts the companion may run on. */
const ALLOWED_HOSTS = Array.from(
  new Set(APPROVED_DOMAINS.map((entry) => entry.pattern.replace(/^www\./, ''))),
)

const HONORIFICS = /^(mr|mrs|ms|miss|dr|prof|sir|madam)\.?\s+/

export function hostOf(url) {
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return null
  }
}

/** True when the URL is inside the approved domain list. */
export function isApprovedUrl(url) {
  const host = hostOf(url)
  if (!host) return false
  return ALLOWED_HOSTS.includes(host.replace(/^www\./, ''))
}

/** @returns {'linkedin' | 'gmail' | null} */
export function detectSource(url) {
  const host = hostOf(url)
  if (!host) return null
  const bare = host.replace(/^www\./, '')
  if (bare === 'linkedin.com') return 'linkedin'
  if (bare === 'mail.google.com') return 'gmail'
  return null
}

/** Lower-case, punctuation-free name used for fuzzy comparison. */
export function normaliseName(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[.,'"()[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(HONORIFICS, '')
}

export function nameTokens(value) {
  return normaliseName(value).split(' ').filter(Boolean)
}

/** Extract the slug from a LinkedIn profile URL. */
export function linkedInSlug(url) {
  const match = String(url ?? '').match(/linkedin\.com\/in\/([^/?#]+)/i)
  return match ? decodeURIComponent(match[1]).toLowerCase() : null
}

/**
 * Match a page context against the people directory.
 *
 * Precedence: exact email -> exact LinkedIn profile -> exact full name ->
 * surname + organisation. Confidence is surfaced so the UI can ask for
 * confirmation when the match is weak.
 *
 * @param {import('@/types/models').Person[]} people
 * @param {{ name?: string|null, email?: string|null, organisation?: string|null,
 *           linkedInUrl?: string|null, url?: string|null }} context
 * @returns {{ person: import('@/types/models').Person | null, confidence: number, reason: string }}
 */
export function findPersonMatch(people = [], context = {}) {
  const email = context.email ? String(context.email).toLowerCase().trim() : null
  if (email) {
    const person = people.find((row) => row.email && row.email.toLowerCase() === email)
    if (person) return { person, confidence: 1, reason: 'email match' }
  }

  const slug = linkedInSlug(context.linkedInUrl ?? context.url)
  if (slug) {
    const person = people.find((row) => linkedInSlug(row.linkedInUrl) === slug)
    if (person) return { person, confidence: 1, reason: 'LinkedIn profile match' }
  }

  const name = normaliseName(context.name)
  if (name) {
    const exact = people.find((row) => normaliseName(row.fullName) === name)
    if (exact) return { person: exact, confidence: 0.9, reason: 'name match' }

    const tokens = nameTokens(name)
    const surname = tokens[tokens.length - 1]
    const organisation = normaliseName(context.organisation)
    if (surname && organisation) {
      const person = people.find((row) => {
        const rowTokens = nameTokens(row.fullName)
        return (
          rowTokens[rowTokens.length - 1] === surname &&
          normaliseName(row.organisation) === organisation
        )
      })
      if (person) return { person, confidence: 0.7, reason: 'name + organisation match' }
    }
  }

  return { person: null, confidence: 0, reason: 'no match' }
}

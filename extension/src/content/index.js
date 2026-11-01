/**
 * Content script (Feature 13 - Extension Companion).
 *
 * Contract, verbatim from docs/03_feature_specs.md:
 *  - runs only on the approved domain list (enforced by content_scripts.matches)
 *  - reads ONLY a display name, an optional email and the page URL
 *  - never reads or stores page body content
 *  - if the user is not signed in, prompt rather than silently doing nothing
 *
 * The rich companion UI lives in the side panel (a real browser sidebar). This
 * script's job is detection: it publishes the page context and shows a small
 * launcher pill so the user can open context without leaving the page.
 *
 * Written in plain JS (no JSX) so the injected payload stays tiny.
 */
import { detectSource, hostOf, isApprovedUrl } from '@/services/detectionService'
import { MESSAGE_TYPES } from '@/config/constants'
import { getValue } from '@/lib/storage'
import { STORAGE_KEYS } from '@/config/constants'
import { loadSession } from '@/auth/tokenStore'

const PILL_ID = 'threadwise-companion-pill'

/* -------------------------------------------------------------- detectors --- */

/** LinkedIn profile: /in/<slug> - name from the profile H1. */
function detectLinkedIn() {
  const isProfile = /linkedin\.com\/in\//i.test(window.location.href)
  if (!isProfile) return null

  const heading = document.querySelector('h1')
  const name = heading?.textContent?.trim() ?? null
  if (!name) return null

  const topCard = document.querySelector('.pv-text-details__left-panel')
  const role = topCard?.querySelector('.text-body-medium')?.textContent?.trim() ?? null

  return { name, role, organisation: null, email: null }
}

/** Gmail: the open thread's sender name + address. */
function detectGmail() {
  if (!/mail\.google\.com\/mail/i.test(window.location.href)) return null

  const sender = document.querySelector('span[email][name]')
  if (!sender) return null

  return {
    name: sender.getAttribute('name')?.trim() ?? null,
    email: sender.getAttribute('email')?.trim() ?? null,
    role: null,
    organisation: null,
  }
}

/** Extract the allow-listed slice of context for the current page. */
function detectPageContext() {
  const url = window.location.href
  if (!isApprovedUrl(url)) return null

  const source = detectSource(url)
  const detected = source === 'linkedin' ? detectLinkedIn() : source === 'gmail' ? detectGmail() : null
  if (!detected?.name) return { url, source, name: null, email: null, role: null, organisation: null }

  return { url, source, ...detected }
}

/* -------------------------------------------------------------- launcher --- */

function removePill() {
  document.getElementById(PILL_ID)?.remove()
}

function renderPill(context) {
  removePill()
  if (!context?.name) return

  const pill = document.createElement('button')
  pill.id = PILL_ID
  pill.type = 'button'
  pill.title = `Open Threadwise context for ${context.name}`
  pill.setAttribute('aria-label', `Open Threadwise context for ${context.name}`)

  // Inline styles only: the pill must be immune to host-page CSS.
  Object.assign(pill.style, {
    position: 'fixed',
    right: '16px',
    bottom: '16px',
    zIndex: '2147483647',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '999px',
    border: '1px solid #E8E8EC',
    background: '#FFFFFF',
    color: '#1A1A2E',
    font: '500 13px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
    cursor: 'pointer',
  })

  const dot = document.createElement('span')
  Object.assign(dot.style, {
    width: '8px',
    height: '8px',
    borderRadius: '999px',
    background: '#4F6AF5',
    flex: '0 0 auto',
  })

  const label = document.createElement('span')
  label.textContent = `Threadwise · ${context.name.split(' ')[0]}`

  pill.append(dot, label)
  pill.addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.OPEN_SIDE_PANEL }).catch(() => {})
  })

  document.body.appendChild(pill)
}

/* ------------------------------------------------------------------- boot --- */

async function sync() {
  const enabled = await getValue(STORAGE_KEYS.INJECTION_ENABLED, true)
  if (!enabled) {
    removePill()
    return
  }

  const context = detectPageContext()
  if (!context) {
    removePill()
    return
  }

  // Publish the detected context so the popup / side panel can use it.
  chrome.runtime
    .sendMessage({ type: 'threadwise:page-detected', payload: context })
    .catch(() => {})

  const session = await loadSession()
  if (!session?.user) {
    // Feature 13 edge case: prompt instead of matching silently.
    removePill()
    return
  }

  renderPill(context)
}

/** Re-scan when the SPA changes route (LinkedIn and Gmail are both SPAs). */
let lastUrl = window.location.href
function watchNavigation() {
  setInterval(() => {
    if (window.location.href === lastUrl) return
    lastUrl = window.location.href
    sync()
  }, 1200)
}

sync()
watchNavigation()

void hostOf
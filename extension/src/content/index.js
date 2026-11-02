/**
 * Content script (Feature 13 - Extension Companion).
 *
 * Contract:
 *  - runs only on the approved domain list (enforced by content_scripts.matches)
 *  - reads ONLY a display name, an optional email and the page URL
 *  - never reads or stores page body content
 *  - if the user is not signed in, prompt rather than silently doing nothing
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
  pill.title = `Open Friday context for ${context.name}`
  pill.setAttribute('aria-label', `Open Friday context for ${context.name}`)

  // Inline styles only: immune to host-page CSS
  Object.assign(pill.style, {
    position: 'fixed',
    right: '20px',
    bottom: '20px',
    zIndex: '2147483647',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 14px',
    borderRadius: '999px',
    border: '1px solid rgba(79, 106, 245, 0.25)',
    background: '#FFFFFF',
    color: '#1A1A2E',
    font: '600 13px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    boxShadow: '0 8px 24px -4px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)',
    cursor: 'pointer',
    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
    outline: 'none',
  })

  pill.addEventListener('mouseenter', () => {
    pill.style.transform = 'translateY(-2px)'
    pill.style.boxShadow = '0 12px 28px -4px rgba(79, 106, 245, 0.3), 0 4px 10px rgba(0,0,0,0.08)'
    pill.style.borderColor = '#4F6AF5'
  })

  pill.addEventListener('mouseleave', () => {
    pill.style.transform = 'translateY(0)'
    pill.style.boxShadow = '0 8px 24px -4px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)'
    pill.style.borderColor = 'rgba(79, 106, 245, 0.25)'
  })

  pill.addEventListener('mousedown', () => {
    pill.style.transform = 'translateY(0) scale(0.96)'
  })

  pill.addEventListener('mouseup', () => {
    pill.style.transform = 'translateY(-2px) scale(1)'
  })

  const dot = document.createElement('span')
  Object.assign(dot.style, {
    width: '8px',
    height: '8px',
    borderRadius: '999px',
    background: '#4F6AF5',
    boxShadow: '0 0 8px rgba(79, 106, 245, 0.6)',
    flex: '0 0 auto',
  })

  const label = document.createElement('span')
  label.textContent = `Friday · ${context.name.split(' ')[0]}`

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
    removePill()
    return
  }

  renderPill(context)
}

/** Re-scan when the SPA changes route */
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

/**
 * MV3 background service worker.
 *
 * Responsibilities:
 *  - own the centred "Capture to Friday" context menu
 *  - answer PAGE_CONTEXT requests from content scripts and the side panel
 *  - keep the toolbar badge in sync with open commitments (hourly alarm)
 *
 * The worker must stay lean: it never imports React, and every storage access
 * goes through `chrome.storage` (localStorage is unavailable in service workers).
 */
import { attentionApi } from '@/apis'
import { MESSAGE_TYPES } from '@/config/constants'
import { loadSession } from '@/auth/tokenStore'
import { openSidePanel } from '@/lib/messaging'
import { getValue } from '@/lib/storage'
import { STORAGE_KEYS } from '@/config/constants'

const BADGE_ALARM = 'threadwise:badge'

/* ------------------------------------------------------------------ setup --- */

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'threadwise-capture',
    title: 'Capture to Friday',
    contexts: ['selection', 'page'],
  })

  chrome.alarms.create(BADGE_ALARM, { periodInMinutes: 60 })
  refreshBadge()
})

if (chrome.alarms?.onAlarm) {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === BADGE_ALARM) refreshBadge()
  })
}

chrome.contextMenus.onClicked.addListener(async (info) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (tab?.id) {
    // Stash the pending selection so the popup/side panel can prefill capture.
    await chrome.storage.session.set({
      'threadwise.pendingCapture': info.selectionText ?? '',
    })
    await openSidePanel()
  }
})

/* ----------------------------------------------------------------- badge --- */

async function refreshBadge() {
  try {
    await loadSession()
    const data = await attentionApi.today()
    const count = (data?.dueToday?.length ?? 0) + (data?.overdue?.length ?? 0)

    await chrome.action.setBadgeBackgroundColor({ color: count > 0 ? '#E74C3C' : '#27AE60' })
    await chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' })
  } catch {
    await chrome.action.setBadgeText({ text: '' })
  }
}

/* --------------------------------------------------------------- messages --- */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { type, payload } = message ?? {}

  // Fingerprint request from a content script: is this person in the directory?
  if (type === MESSAGE_TYPES.PAGE_CONTEXT) {
    respondToPageContext(payload).then(sendResponse)
    return true
  }

  if (type === MESSAGE_TYPES.GET_SESSION) {
    loadSession().then((session) => sendResponse({ session }))
    return true
  }

  if (type === MESSAGE_TYPES.REFRESH_BADGE) {
    refreshBadge().then(() => sendResponse({ ok: true }))
    return true
  }

  if (type === MESSAGE_TYPES.CAPTURE_CREATED) {
    refreshBadge().then(() => sendResponse({ ok: true }))
    return true
  }

  // Content scripts announce the detected page context here.
  if (type === 'threadwise:page-detected') {
    chrome.storage.session.set({ 'threadwise.pageContext': payload ?? null })
    sendResponse({ ok: true })
    return false
  }

  void sender
  return false
})

/**
 * The content script asks "who is on this page?"; the worker replies with the
 * stored page context. Matching against the directory happens in the caller
 * (popup / side panel) where the people store already lives.
 */
async function respondToPageContext() {
  const stored = await chrome.storage.session.get('threadwise.pageContext')
  const enabled = await getValue(STORAGE_KEYS.INJECTION_ENABLED, true)
  return { context: enabled ? (stored['threadwise.pageContext'] ?? null) : null }
}
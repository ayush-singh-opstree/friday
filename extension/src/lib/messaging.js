/**
 * Typed-ish wrappers around the extension runtime messaging APIs.
 *
 * Every surface (popup, side panel, options page, content script) and the
 * background service worker talk through the `MESSAGE_TYPES` contract in
 * `src/config/constants.js`. All helpers degrade to no-ops when the code is
 * executed outside an extension context (e.g. the Vite dev URL).
 */
import { MESSAGE_TYPES } from '@/config/constants'

export function isExtensionContext() {
  return (
    typeof chrome !== 'undefined' &&
    Boolean(chrome.runtime) &&
    typeof chrome.runtime.id === 'string'
  )
}

/**
 * Send a message to the background service worker.
 * Resolves to `null` when there is no receiver or the worker threw.
 */
export async function sendMessage(type, payload = {}) {
  if (!isExtensionContext()) return null
  try {
    return await chrome.runtime.sendMessage({ type, payload })
  } catch {
    return null
  }
}

/** Fire-and-forget broadcast to any listening surface. */
export function broadcast(type, payload = {}) {
  if (!isExtensionContext()) return
  chrome.runtime.sendMessage({ type, payload }).catch(() => {})
}

/**
 * Register a background/content listener.
 * @param {(message: { type: string, payload?: unknown }) => unknown} handler
 * @returns {() => void} unsubscribe
 */
export function onMessage(handler) {
  if (!isExtensionContext() || !chrome.runtime.onMessage) return () => {}
  const listener = (message, _sender, sendResponse) => {
    const result = handler(message ?? {})
    if (result !== undefined) {
      Promise.resolve(result).then(sendResponse)
      return true // keep the channel open for the async response
    }
    return false
  }
  chrome.runtime.onMessage.addListener(listener)
  return () => chrome.runtime.onMessage.removeListener(listener)
}

/** Ask the worker to recompute the toolbar badge. */
export function requestBadgeRefresh() {
  return sendMessage(MESSAGE_TYPES.REFRESH_BADGE)
}

/** Open the side panel on the active tab (requires a user gesture). */
export async function openSidePanel() {
  if (!isExtensionContext() || !chrome.sidePanel?.open) return null
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.id) return null
  return chrome.sidePanel.open({ windowId: tab.windowId })
}

/** Open the options page. */
export function openOptions() {
  if (!isExtensionContext() || !chrome.runtime.openOptionsPage) return null
  return chrome.runtime.openOptionsPage()
}

/** Message a specific tab's content script. */
export async function sendTabMessage(tabId, type, payload = {}) {
  if (!isExtensionContext()) return null
  try {
    return await chrome.tabs.sendMessage(tabId, { type, payload })
  } catch {
    return null
  }
}

import { useCallback, useEffect, useState } from 'react'
import { MESSAGE_TYPES } from '@/config/constants'
import { isExtensionContext, sendTabMessage } from '@/lib/messaging'
import { detectSource, isApprovedUrl } from '@/services'

/**
 * Reads the context of the active browser tab.
 *
 * Popup and side panel are extension pages, so they cannot touch the host page
 * DOM directly. Instead they ask the content script (which runs in the page)
 * for the small, allow-listed slice of context defined in Feature 13:
 * display name, optional email and the URL.
 *
 * @returns {{
 *   status: 'idle'|'loading'|'ready'|'unsupported',
 *   url: string | null,
 *   source: 'linkedin'|'gmail'|null,
 *   isApproved: boolean,
 *   context: import('@/types/models').PageContext | null,
 *   tabId: number | null,
 *   refresh: () => Promise<void>,
 * }}
 */
export function usePageContext() {
  const [state, setState] = useState({
    status: 'idle',
    url: null,
    source: null,
    isApproved: false,
    context: null,
    tabId: null,
  })

  const refresh = useCallback(async () => {
    if (!isExtensionContext() || !chrome.tabs?.query) {
      setState((previous) => ({ ...previous, status: 'unsupported' }))
      return
    }

    setState((previous) => ({ ...previous, status: 'loading' }))

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      const url = tab?.url ?? null
      const source = detectSource(url)
      const approved = isApprovedUrl(url)

      const context = {
        url,
        source,
        name: null,
        email: null,
        organisation: null,
        role: null,
      }

      if (tab?.id && source) {
        const response = await sendTabMessage(tab.id, MESSAGE_TYPES.PAGE_CONTEXT)
        if (response?.context) {
          Object.assign(context, response.context)
        }
      }

      setState({
        status: 'ready',
        url,
        source,
        isApproved: approved,
        context,
        tabId: tab?.id ?? null,
      })
    } catch {
      setState((previous) => ({ ...previous, status: 'idle' }))
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    // Kick off the first read without calling setState synchronously in the
    // effect body (avoids a cascading render).
    const run = async () => {
      await Promise.resolve()
      if (!cancelled) await refresh()
    }
    run()

    if (!isExtensionContext() || !chrome.tabs?.onActivated) {
      return () => {
        cancelled = true
      }
    }

    const onActivated = () => refresh()
    const onUpdated = (_tabId, changeInfo) => {
      if (changeInfo.status === 'complete') refresh()
    }
    chrome.tabs.onActivated.addListener(onActivated)
    chrome.tabs.onUpdated.addListener(onUpdated)
    return () => {
      cancelled = true
      chrome.tabs.onActivated.removeListener(onActivated)
      chrome.tabs.onUpdated.removeListener(onUpdated)
    }
  }, [refresh])

  return { ...state, refresh }
}

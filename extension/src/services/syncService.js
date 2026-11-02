import { env } from '@/config/env'
import { useSyncStore } from '@/store'

/**
 * Sync / connectivity service.
 *
 * - tracks online/offline and drains the pending write queue on reconnect
 * - subscribes to the server's SSE feed when `VITE_REALTIME_URL` is configured,
 *   so a capture made in the web app lights up in the companion within seconds
 *   (Feature 13 -> "syncs with the Threadwise account in real time").
 */

/** Attach connectivity listeners. Returns a cleanup function. */
export function initSyncService() {
  if (typeof window === 'undefined') return () => {}

  const goOnline = () => useSyncStore.getState().setOnline(true)
  const goOffline = () => useSyncStore.getState().setOnline(false)

  window.addEventListener('online', goOnline)
  window.addEventListener('offline', goOffline)

  // Reconcile the initial state (navigator.onLine is not always reliable).
  goOnline()

  return () => {
    window.removeEventListener('online', goOnline)
    window.removeEventListener('offline', goOffline)
  }
}

/**
 * Subscribe to real-time server events.
 * @param {(event: { type: string, payload?: unknown }) => void} handler
 * @returns {() => void} unsubscribe
 */
export function subscribeToRealtime(handler) {
  if (!env.realtimeUrl || typeof EventSource === 'undefined') return () => {}

  const source = new EventSource(env.realtimeUrl)

  const onMessage = (event) => {
    try {
      handler(JSON.parse(event.data))
    } catch {
      // Ignore malformed frames rather than tearing down the stream.
    }
  }

  source.addEventListener('message', onMessage)
  // EventSource retries automatically; we only need to swallow the error.
  source.onerror = () => {}

  return () => {
    source.removeEventListener('message', onMessage)
    source.close()
  }
}

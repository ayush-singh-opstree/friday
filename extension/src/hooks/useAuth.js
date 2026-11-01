import { useCallback, useEffect } from 'react'
import { isAuthenticated as hasToken } from '@/auth/tokenStore'
import { useSettingsStore, useSyncStore } from '@/store'
import { useAuth } from '@/auth/AuthContext'

/**
 * Auth facade for components. Thin re-export of `useAuth` plus token/session
 * status helpers so components never reach into the token store directly.
 */
export function useAuthState() {
  const { user, status, error, isAuthenticated, isPro, signIn, signOut, clearError } = useAuth()

  const hasValidToken = useCallback(() => hasToken(), [])

  return { user, status, error, isAuthenticated, isPro, signIn, signOut, clearError, hasValidToken }
}

/** Companion preferences (theme, detection toggles, notifications). */
export function useSettings() {
  const settings = useSettingsStore((state) => state.settings)
  const loaded = useSettingsStore((state) => state.loaded)

  useEffect(() => {
    if (!loaded) useSettingsStore.getState().hydrate()
  }, [loaded])

  const update = useCallback((patch) => useSettingsStore.getState().update(patch), [])
  const setNotificationPreference = useCallback(
    (key, value) => useSettingsStore.getState().setNotificationPreference(key, value),
    [],
  )
  const reset = useCallback(() => useSettingsStore.getState().reset(), [])

  return { settings, loaded, update, setNotificationPreference, reset }
}

/** Connectivity + pending write queue. */
export function useSync() {
  const online = useSyncStore((state) => state.online)
  const queue = useSyncStore((state) => state.queue)
  const syncing = useSyncStore((state) => state.syncing)
  const lastSyncedAt = useSyncStore((state) => state.lastSyncedAt)

  const flush = useCallback(() => useSyncStore.getState().flush(), [])

  return { online, pendingCount: queue.length, syncing, lastSyncedAt, flush }
}

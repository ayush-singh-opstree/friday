import { createContext, useContext, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/store'
import { subscribeToSession } from './tokenStore'

const AuthContext = createContext(null)

/**
 * AuthProvider - hydrates the persisted session once per surface and keeps it
 * in sync when another surface (popup, side panel, options) signs in or out.
 *
 * State lives in `authStore`; this provider only owns the lifecycle effects and
 * exposes a small, ergonomic API to components.
 */
export function AuthProvider({ children }) {
  const user = useAuthStore((state) => state.user)
  const status = useAuthStore((state) => state.status)
  const error = useAuthStore((state) => state.error)

  useEffect(() => {
    useAuthStore.getState().hydrate()
    return subscribeToSession((session) => {
      useAuthStore.getState().applySession(session)
    })
  }, [])

  const value = useMemo(
    () => ({
      user,
      status,
      error,
      isAuthenticated: status === 'authenticated',
      isPro: user?.plan === 'pro' || user?.plan === 'team',
      signIn: (credentials) => useAuthStore.getState().signIn(credentials),
      signOut: () => useAuthStore.getState().signOut(),
      clearError: () => useAuthStore.getState().clearError(),
    }),
    [user, status, error],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** Access the auth context. Throws when used outside `AuthProvider`. */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.')
  return context
}

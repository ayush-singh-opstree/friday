import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { authApi } from '@/apis'
import { clearOfflineData } from '@/offline'
import {
  useAttentionStore,
  useCaptureStore,
  useCommitmentStore,
  usePeopleStore,
  useThreadStore,
} from '@/store'
import {
  clearSession,
  loadSession,
  saveSession,
  subscribeToSession,
} from './session'

/**
 * Drop every cached record for the previous account.
 * Without this, the IndexedDB mirror and the in-memory stores would leak one
 * user's data into the next session (per-user data isolation).
 */
async function purgeUserData() {
  await clearOfflineData().catch(() => {})
  useThreadStore.setState({
    threads: [],
    thread: null,
    selectedThreadId: null,
    captures: [],
    commitments: [],
    timeline: [],
    summaries: [],
    detailStatus: 'idle',
    status: 'idle',
  })
  usePeopleStore.setState({
    people: [],
    person: null,
    personThreads: [],
    personCommitments: [],
    status: 'idle',
  })
  useCommitmentStore.setState({ commitments: [], status: 'idle' })
  useCaptureStore.setState({ inbox: [], recent: [], status: 'idle' })
  useAttentionStore.setState({
    topThreads: [],
    dueToday: [],
    overdue: [],
    goingCold: [],
    upcoming: [],
    inboxCount: 0,
    status: 'idle',
  })
}

const AuthContext = createContext(null)

/**
 * AuthProvider owns the session lifecycle for the whole app.
 *
 * State shape:
 *   status: 'idle' | 'loading' | 'authenticated' | 'anonymous'
 *
 * Everything else (guards, plan gates, UI) reads from this context, so the
 * underlying provider (local session store now, Clerk in production) can be
 * swapped without touching feature code.
 */
export function AuthProvider({ children }) {
  // Read the persisted session during the first render - no effect needed.
  const [state, setState] = useState(() => {
    const session = loadSession()
    return session?.user
      ? { status: 'authenticated', user: session.user, error: null }
      : { status: 'anonymous', user: null, error: null }
  })

  /** Re-read the session from storage (used by manual refresh, not on mount). */
  const refresh = useCallback(() => {
    const session = loadSession()
    setState(
      session?.user
        ? { status: 'authenticated', user: session.user, error: null }
        : { status: 'anonymous', user: null, error: null },
    )
    return session
  }, [])

  const signIn = useCallback(async (credentials) => {
    setState((previous) => ({ ...previous, status: 'loading', error: null }))
    try {
      const session = await authApi.login(credentials)
      // Never carry a previous account's cached records into a new session.
      await purgeUserData()
      saveSession(session)
      setState({ status: 'authenticated', user: session.user, error: null })
      return session
    } catch (error) {
      setState({
        status: 'anonymous',
        user: null,
        error: error?.message ?? 'Unable to sign in.',
      })
      throw error
    }
  }, [])

  const signOut = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // Signing out locally must succeed even if the API call fails.
    }
    clearSession()
    // Purge cached records so the next account starts clean.
    await purgeUserData()
    setState({ status: 'anonymous', user: null, error: null })
  }, [])

  const updateUser = useCallback((patch) => {
    setState((previous) => {
      if (!previous.user) return previous
      const user = { ...previous.user, ...patch }
      const session = { ...(loadSession() ?? {}), user }
      saveSession(session)
      return { ...previous, user }
    })
  }, [])

  useEffect(
    () =>
      subscribeToSession((session) => {
        if (session?.user) setState({ status: 'authenticated', user: session.user, error: null })
        else setState({ status: 'anonymous', user: null, error: null })
      }),
    [],
  )

  const value = useMemo(
    () => ({
      ...state,
      isAuthenticated: state.status === 'authenticated',
      isBootstrapping: state.status === 'idle' || state.status === 'loading',
      isPro: state.user?.plan === 'pro' || state.user?.plan === 'team',
      signIn,
      signOut,
      updateUser,
      refresh,
      clearError: () => setState((previous) => ({ ...previous, error: null })),
    }),
    [state, signIn, signOut, updateUser, refresh],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** Access the auth context. Throws when used outside `<AuthProvider>`. */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>.')
  return context
}
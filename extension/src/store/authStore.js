import { create } from 'zustand'
import { authApi } from '@/apis'
import { clearSession, loadSession, saveSession } from '@/auth/tokenStore'

/**
 * authStore - user session and profile
 * (docs/08_system_architecture.md -> State Architecture).
 */
const initialState = {
  /** @type {import('@/types/models').User | null} */
  user: null,
  accessToken: null,
  /** 'idle' | 'loading' | 'authenticated' | 'anonymous' */
  status: 'idle',
  /** @type {string | null} */
  error: null,
}

export const useAuthStore = create((set, get) => ({
  ...initialState,

  isAuthenticated: () => get().status === 'authenticated',

  /** Restore the persisted session. Called once per surface on mount. */
  async hydrate() {
    set({ status: 'loading', error: null })
    const session = await loadSession()
    if (session?.user) {
      set({
        user: session.user,
        accessToken: session.accessToken,
        status: 'authenticated',
      })
    } else {
      set({ ...initialState, status: 'anonymous' })
    }
    return session
  },

  /** @param {{ email: string, password: string }} credentials */
  async signIn(credentials) {
    set({ status: 'loading', error: null })
    try {
      const session = await authApi.login(credentials)
      await saveSession(session)
      set({ user: session.user, accessToken: session.accessToken, status: 'authenticated' })
      return session
    } catch (error) {
      set({ status: 'anonymous', error: error?.message ?? 'Unable to sign in.' })
      throw error
    }
  },

  async signOut() {
    try {
      await authApi.logout()
    } catch {
      // Signing out locally must succeed even if the network call fails.
    }
    await clearSession()
    set({ ...initialState, status: 'anonymous' })
  },

  /** Reflect a session change pushed by another extension surface. */
  applySession(session) {
    if (session?.user) {
      set({ user: session.user, accessToken: session.accessToken, status: 'authenticated' })
    } else {
      set({ ...initialState, status: 'anonymous' })
    }
  },

  /** @param {Partial<import('@/types/models').User>} patch */
  setUser(patch) {
    const user = get().user
    if (user) set({ user: { ...user, ...patch } })
  },

  clearError() {
    set({ error: null })
  },
}))

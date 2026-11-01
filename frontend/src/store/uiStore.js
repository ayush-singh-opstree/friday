import { create } from 'zustand'
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '@/config/constants'
import { uid } from '@/lib/utils'

/** Read persisted settings (synchronous so the first paint is correct). */
function readSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS)
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

/**
 * uiStore - transient UI state shared across the app: active theme, toast
 * queue, the Quick Capture sheet, the search overlay and user settings.
 */
export const useUiStore = create((set, get) => ({
  /* ------------------------------------------------------------ toasts --- */
  /** @type {Array<{id: string, tone: 'info'|'success'|'warning'|'danger', message: string}>} */
  toasts: [],
  /**
   * @param {string} message
   * @param {'info'|'success'|'warning'|'danger'} [tone]
   */
  pushToast(message, tone = 'info') {
    const id = uid('toast')
    set((state) => ({ toasts: [...state.toasts, { id, message, tone }] }))
    setTimeout(() => get().dismissToast(id), 4500)
    return id
  },
  dismissToast(id) {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
  },

  /* ------------------------------------------------------ quick capture --- */
  /** @type {{ open: boolean, threadId: string | null }} */
  quickCapture: { open: false, threadId: null },
  openQuickCapture(threadId = null) {
    set({ quickCapture: { open: true, threadId } })
  },
  closeQuickCapture() {
    set({ quickCapture: { open: false, threadId: null } })
  },

  /* ------------------------------------------------------------ search --- */
  searchOpen: false,
  openSearch() {
    set({ searchOpen: true })
  },
  closeSearch() {
    set({ searchOpen: false })
  },

  /* ---------------------------------------------------------- settings --- */
  settings: readSettings(),
  /**
   * @param {Partial<typeof DEFAULT_SETTINGS>} patch
   */
  updateSettings(patch) {
    const next = { ...get().settings, ...patch }
    set({ settings: next })
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(next))
    } catch {
      // Non-fatal: settings stay in memory for this session.
    }
    return next
  },
}))
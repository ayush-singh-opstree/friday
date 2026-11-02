import { create } from 'zustand'
import { toast } from 'sonner'
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '@/config/constants'

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
  /* ----------------------------------------------------------- toasts --- */
  /**
   * Push a notification. Routed into **sonner** (mounted by `<Toaster />`), so
   * the app gets stacking, swipe-to-dismiss and screen-reader announcements for
   * free while call sites keep the same simple API.
   *
   * @param {string} message
   * @param {'info'|'success'|'warning'|'danger'} [tone]
   */
  pushToast(message, tone = 'info') {
    const options = { duration: tone === 'danger' ? 6000 : 4500 }
    if (tone === 'success') toast.success(message, options)
    else if (tone === 'danger') toast.error(message, options)
    else if (tone === 'warning') toast.warning(message, options)
    else toast(message, options)
    return message
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

  /* ------------------------------------------------------------ inbox --- */
  inboxOpen: false,
  openInbox() {
    set({ inboxOpen: true })
  },
  closeInbox() {
    set({ inboxOpen: false })
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
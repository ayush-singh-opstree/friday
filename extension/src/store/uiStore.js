import { create } from 'zustand'
import { toast } from 'sonner'

/**
 * uiStore - transient UI state shared by every extension surface:
 * active view, notification toasts, quick capture and loading indicators.
 */
export const useUiStore = create((set, get) => ({
  /** Active view key per surface, e.g. { popup: 'today', sidepanel: 'context' }. */
  views: {},
  /** @type {{ open: boolean, threadId: string | null }} */
  quickCapture: { open: false, threadId: null },
  /** @type {string | null} */
  busyLabel: null,

  /** @param {string} surface 'popup' | 'sidepanel' | 'options' @param {string} view */
  setView(surface, view) {
    set((state) => ({ views: { ...state.views, [surface]: view } }))
  },

  getView(surface, fallback) {
    return get().views[surface] ?? fallback
  },

  /**
   * Push a notification through **sonner** (mounted by `<ToastViewport />`).
   * @param {string} message
   * @param {'info'|'success'|'warning'|'danger'} [tone]
   */
  pushToast(message, tone = 'info') {
    const options = { duration: tone === 'danger' ? 6000 : 4200 }
    if (tone === 'success') toast.success(message, options)
    else if (tone === 'danger') toast.error(message, options)
    else if (tone === 'warning') toast.warning(message, options)
    else toast(message, options)
    return message
  },

  /** @param {boolean} open @param {string | null} [threadId] */
  setQuickCapture(open, threadId = null) {
    set({ quickCapture: { open, threadId } })
  },

  setBusy(label) {
    set({ busyLabel: label })
  },

  /** Active capture session state for header display. */
  activeSession: null,
  setActiveSession(session) {
    set({ activeSession: session })
  },
  updateSessionElapsed(elapsed) {
    set((state) => ({
      activeSession: state.activeSession ? { ...state.activeSession, elapsed } : null,
    }))
  },
  clearActiveSession() {
    set({ activeSession: null })
  },
}))

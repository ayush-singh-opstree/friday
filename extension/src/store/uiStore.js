import { create } from 'zustand'
import { uid } from '@/lib/utils'

/**
 * uiStore - transient UI state shared by every extension surface:
 * active view, toast queue, theme preference and loading indicators.
 */
export const useUiStore = create((set, get) => ({
  /** Active view key per surface, e.g. { popup: 'today', sidepanel: 'context' }. */
  views: {},
  /** @type {Array<{ id: string, tone: 'info'|'success'|'warning'|'danger', message: string }>} */
  toasts: [],
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
   * @param {string} message
   * @param {'info'|'success'|'warning'|'danger'} [tone]
   */
  pushToast(message, tone = 'info') {
    const id = uid('toast')
    set((state) => ({ toasts: [...state.toasts, { id, message, tone }] }))
    setTimeout(() => get().dismissToast(id), 4200)
    return id
  },

  dismissToast(id) {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }))
  },

  /** @param {boolean} open @param {string | null} [threadId] */
  setQuickCapture(open, threadId = null) {
    set({ quickCapture: { open, threadId } })
  },

  setBusy(label) {
    set({ busyLabel: label })
  },
}))

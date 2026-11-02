import { create } from 'zustand'
import { notificationsApi } from '@/apis'
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/config/constants'

/**
 * notificationStore - the in-app notification inbox (Feature 14 / Requirement 10).
 *
 * Backed by the server's `/notifications` endpoints: the list + unread badge
 * count, per-notification read state, deletion, and the user's notification
 * preferences. Writes are applied optimistically and rolled back on failure so
 * the header bell always feels instant. `runTriggers` asks the server to
 * materialise due-soon / going-cold notifications on demand.
 */
export const useNotificationStore = create((set, get) => ({
  /** @type {Array<{id:string,type:string,title:string,body:string,deepLinkUrl:string,isRead:boolean,scheduledAt:string}>} */
  items: [],
  unreadCount: 0,
  total: 0,
  status: 'idle',
  /** @type {string | null} */
  error: null,
  generating: false,

  preferences: {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    digestTime: '08:00',
    digestEnabled: true,
    emailDigestEnabled: false,
  },
  preferencesStatus: 'idle',

  /** @param {{ isRead?: boolean, type?: string, limit?: number, offset?: number }} [params] */
  async fetchNotifications(params) {
    set({ status: 'loading', error: null })
    try {
      const data = await notificationsApi.list(params)
      set({
        items: data?.items ?? [],
        unreadCount: data?.unreadCount ?? 0,
        total: data?.total ?? 0,
        status: 'ready',
      })
      return data
    } catch (error) {
      set({ status: 'error', error: error?.message ?? 'Could not load notifications.' })
      return null
    }
  },

  async fetchPreferences() {
    set({ preferencesStatus: 'loading' })
    try {
      const prefs = await notificationsApi.getPreferences()
      const merged = { ...get().preferences, ...(prefs ?? {}) }
      set({ preferences: merged, preferencesStatus: 'ready' })
      return merged
    } catch {
      set({ preferencesStatus: 'error' })
      return null
    }
  },

  /** @param {object} patch camelCase subset of the preference view model. */
  async updatePreferences(patch) {
    const previous = get().preferences
    const optimistic = { ...previous, ...patch }
    set({ preferences: optimistic })
    try {
      const saved = await notificationsApi.updatePreferences(patch)
      const merged = { ...optimistic, ...(saved ?? {}) }
      set({ preferences: merged, preferencesStatus: 'ready' })
      return merged
    } catch (error) {
      set({ preferences: previous })
      throw error
    }
  },

  async markRead(notificationId) {
    const target = get().items.find((row) => row.id === notificationId)
    if (!target || target.isRead) return

    set((state) => ({
      items: state.items.map((row) =>
        row.id === notificationId ? { ...row, isRead: true } : row,
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }))

    try {
      await notificationsApi.markRead(notificationId)
    } catch {
      set((state) => ({
        items: state.items.map((row) =>
          row.id === notificationId ? { ...row, isRead: false } : row,
        ),
        unreadCount: state.unreadCount + 1,
      }))
    }
  },

  async markAllRead() {
    const previous = get().items
    set((state) => ({
      items: state.items.map((row) => ({ ...row, isRead: true })),
      unreadCount: 0,
    }))
    try {
      await notificationsApi.markAllRead()
    } catch {
      set({ items: previous, unreadCount: previous.filter((row) => !row.isRead).length })
    }
  },

  async removeNotification(notificationId) {
    const previous = get().items
    const removed = previous.find((row) => row.id === notificationId)
    set((state) => ({
      items: state.items.filter((row) => row.id !== notificationId),
      total: Math.max(0, state.total - 1),
      unreadCount:
        removed && !removed.isRead ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
    }))
    try {
      await notificationsApi.remove(notificationId)
    } catch {
      set({ items: previous })
    }
  },

  /** Evaluate server-side triggers, then refresh the inbox. */
  async runTriggers() {
    set({ generating: true })
    try {
      const result = await notificationsApi.checkTriggers()
      await get().fetchNotifications()
      return result
    } catch (error) {
      set({ error: error?.message ?? 'Could not check for new alerts.' })
      return null
    } finally {
      set({ generating: false })
    }
  },
}))

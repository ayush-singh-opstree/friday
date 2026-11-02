import { create } from 'zustand'
import { DEFAULT_SETTINGS, STORAGE_KEYS } from '@/config/constants'
import { getValue, mergeValue } from '@/lib/storage'

/**
 * settingsStore - companion preferences persisted in chrome.storage.local.
 * Backs the options page (detection toggles, theme, notifications).
 */
export const useSettingsStore = create((set, get) => ({
  /** @type {typeof DEFAULT_SETTINGS} */
  settings: { ...DEFAULT_SETTINGS },
  loaded: false,

  async hydrate() {
    const stored = await getValue(STORAGE_KEYS.SETTINGS, null)
    set({ settings: { ...DEFAULT_SETTINGS, ...(stored ?? {}) }, loaded: true })
    return get().settings
  },

  /**
   * @param {Partial<typeof DEFAULT_SETTINGS>} patch
   */
  async update(patch) {
    const next = await mergeValue(STORAGE_KEYS.SETTINGS, patch)
    set({ settings: { ...DEFAULT_SETTINGS, ...next } })
    return next
  },

  async setNotificationPreference(key, value) {
    const current = get().settings.notificationPreferences
    return get().update({ notificationPreferences: { ...current, [key]: value } })
  },

  async reset() {
    const next = await mergeValue(STORAGE_KEYS.SETTINGS, { ...DEFAULT_SETTINGS })
    set({ settings: { ...DEFAULT_SETTINGS, ...next } })
    return next
  },
}))

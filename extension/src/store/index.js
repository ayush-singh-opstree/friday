/**
 * Zustand store barrel.
 *
 * The store layout mirrors docs/08_system_architecture.md -> State
 * Architecture, with one addition: `settingsStore` for the companion's own
 * preferences (detection toggles, theme, notifications).
 */
export { useAuthStore } from './authStore'
export { useThreadStore } from './threadStore'
export { usePeopleStore } from './peopleStore'
export { useCaptureStore } from './captureStore'
export { useCommitmentStore } from './commitmentStore'
export { useAttentionStore } from './attentionStore'
export { useUiStore } from './uiStore'
export { useSyncStore } from './syncStore'
export { useSettingsStore } from './settingsStore'

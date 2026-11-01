/**
 * Store barrel.
 *
 * Layout follows docs/08_system_architecture.md -> State Architecture, with two
 * deliberate deviations, both documented:
 *   - `authStore` is replaced by the React `AuthProvider` context so there is a
 *     single source of truth for the session.
 *   - `syncStore` lands in Phase 1E together with the IndexedDB queue.
 */
export { useThreadStore } from './threadStore'
export { useAttentionStore } from './attentionStore'
export { useCommitmentStore } from './commitmentStore'
export { usePeopleStore } from './peopleStore'
export { useCaptureStore } from './captureStore'
export { useSyncStore } from './syncStore'
export { useUiStore } from './uiStore'
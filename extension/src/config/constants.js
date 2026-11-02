/**
 * Shared constants: storage keys, runtime message contract, capture/commitment
 * vocabularies and detection targets.
 *
 * These values intentionally mirror the data model in docs/06_data_model.md and
 * the design system vocabularies in docs/07_design_system.md.
 */

/** Keys used in chrome.storage.local. */
export const STORAGE_KEYS = Object.freeze({
  SESSION: 'threadwise.session',
  SETTINGS: 'threadwise.settings',
  MOCK_DB: 'threadwise.mockDb',
  PENDING_QUEUE: 'threadwise.pendingOps',
  RECENT_SEARCHES: 'threadwise.recentSearches',
  LAST_SYNC: 'threadwise.lastSyncedAt',
  INJECTION_ENABLED: 'threadwise.injectionEnabled',
})

/** Runtime message contract between UI surfaces, content scripts and the worker. */
export const MESSAGE_TYPES = Object.freeze({
  PING: 'threadwise:ping',
  GET_SESSION: 'threadwise:get-session',
  SIGN_IN: 'threadwise:sign-in',
  SIGN_OUT: 'threadwise:sign-out',
  CAPTURE_CREATED: 'threadwise:capture-created',
  SESSION_CHANGED: 'threadwise:session-changed',
  REFRESH_BADGE: 'threadwise:refresh-badge',
  OPEN_SIDE_PANEL: 'threadwise:open-side-panel',
  OPEN_OPTIONS: 'threadwise:open-options',
  PAGE_CONTEXT: 'threadwise:page-context',
  TOGGLE_COMPANION: 'threadwise:toggle-companion',
})

/** Capture type vocabulary (docs/06_data_model.md -> Entity: Capture). */
export const CAPTURE_TYPES = Object.freeze([
  {
    value: 'note',
    label: 'Note',
    icon: 'Note',
    chipClass: 'bg-[#EEF1FE] text-[#4F6AF5]',
  },
  {
    value: 'commitment',
    label: 'Commitment',
    icon: 'Lightning',
    chipClass: 'bg-[#FFF3E0] text-[#E67E22]',
  },
  {
    value: 'decision',
    label: 'Decision',
    icon: 'Checks',
    chipClass: 'bg-[#E8F5E9] text-[#27AE60]',
  },
  {
    value: 'question',
    label: 'Question',
    icon: 'Question',
    chipClass: 'bg-[#FCE4EC] text-[#E91E63]',
  },
])

export const CAPTURE_TYPE_MAP = Object.freeze(
  Object.fromEntries(CAPTURE_TYPES.map((type) => [type.value, type])),
)

/** Capture source vocabulary; `extension` is this client. */
export const CAPTURE_SOURCES = Object.freeze([
  'manual',
  'live_capture',
  'brain_dump',
  'extension',
])

/** Attention score bands (docs/06_data_model.md -> Score Bands). */
export const ATTENTION_BANDS = Object.freeze([
  { key: 'critical', min: 85, max: 100, label: 'Critical', token: 'text-danger', bar: 'bg-danger', ring: 'border-danger/40' },
  { key: 'very_high', min: 70, max: 84, label: 'Very High', token: 'text-danger', bar: 'bg-danger', ring: 'border-danger/30' },
  { key: 'high', min: 45, max: 69, label: 'High', token: 'text-accent', bar: 'bg-accent', ring: 'border-accent/40' },
  { key: 'medium', min: 20, max: 44, label: 'Medium', token: 'text-primary', bar: 'bg-primary', ring: 'border-primary/30' },
  { key: 'low', min: 0, max: 19, label: 'Low', token: 'text-ink-subtle', bar: 'bg-line', ring: 'border-line' },
])

/** Commitment urgency bands (docs/07_design_system.md -> Urgency Indicator). */
export const URGENCY = Object.freeze({
  OVERDUE: 'overdue',
  SOON: 'soon',
  OK: 'ok',
})

export const URGENCY_STYLES = Object.freeze({
  overdue: { dot: 'bg-danger', label: 'Overdue', animate: true },
  soon: { dot: 'bg-warning', label: 'Due soon', animate: false },
  ok: { dot: 'bg-success', label: 'On track', animate: false },
})

/** Thread list sort orders (Requirement 1 -> acceptance criterion 9). */
export const THREAD_SORTS = Object.freeze([
  { value: 'lastInteraction', label: 'Last interaction' },
  { value: 'attentionScore', label: 'Attention score' },
  { value: 'createdAt', label: 'Created date' },
  { value: 'title', label: 'Alphabetical' },
])

/** Thread list filters (Feature 2 -> Threads List behaviour). */
export const THREAD_FILTERS = Object.freeze([
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'goingCold', label: 'Going cold' },
  { value: 'pinned', label: 'Pinned' },
])

/** Smart Snooze presets (Feature 11); maximum window is 30 days. */
export const SNOOZE_PRESETS = Object.freeze([
  { value: 1, label: '1 day' },
  { value: 3, label: '3 days' },
  { value: 7, label: '7 days' },
])

export const MAX_SNOOZE_DAYS = 30

/** Global default for going-cold detection (docs -> User.goingColdThresholdDays). */
export const DEFAULT_GOING_COLD_DAYS = 14

/**
 * Domains the companion is allowed to run on (Feature 13 -> edge cases).
 * Keep in sync with `content_scripts.matches` in manifest.config.js.
 */
export const APPROVED_DOMAINS = Object.freeze([
  { pattern: 'www.linkedin.com', label: 'LinkedIn' },
  { pattern: 'linkedin.com', label: 'LinkedIn' },
  { pattern: 'mail.google.com', label: 'Gmail' },
])

/** Which page detectors run on which host. */
export const DETECTOR_TARGETS = Object.freeze({
  LINKEDIN: 'linkedin',
  GMAIL: 'gmail',
})

/** Notification preference defaults (docs/06_data_model.md -> User). */
export const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  dailyDigest: true,
  commitmentDue: true,
  goingCold: true,
  preMeetingBrief: true,
  reengagementDigest: true,
})

/** Default companion settings persisted in chrome.storage.local. */
export const DEFAULT_SETTINGS = Object.freeze({
  theme: 'system', // system | light | dark
  injectCompanion: true,
  autoOpenPanel: false,
  goingColdThresholdDays: DEFAULT_GOING_COLD_DAYS,
  digestTime: '08:00',
  emailDigestEnabled: false,
  notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
})

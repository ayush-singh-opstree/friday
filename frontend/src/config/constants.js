/**
 * Shared vocabularies and defaults.
 *
 * These mirror docs/06_data_model.md (data model), docs/07_design_system.md
 * (component vocabularies) and docs/03_feature_specs.md (feature behaviour).
 */

/** IndexedDB / localStorage keys. */
export const STORAGE_KEYS = Object.freeze({
  SESSION: 'threadwise.session',
  SETTINGS: 'threadwise.settings',
  ONBOARDING: 'threadwise.onboarding',
  RECENT_SEARCHES: 'threadwise.recentSearches',
  LAST_SYNCED_AT: 'threadwise.lastSyncedAt',
  PENDING_QUEUE: 'threadwise.pendingOps',
  COLD_DISMISSALS: 'threadwise.coldDismissals',
  THEME: 'threadwise.theme',
})

/** Capture type vocabulary. */
export const CAPTURE_TYPES = Object.freeze([
  { value: 'note', label: 'Note', icon: 'Note', chipClass: 'bg-[#EEF1FE] text-[#4F6AF5]' },
  { value: 'action', label: 'Action', icon: 'Lightning', chipClass: 'bg-[#FFF3E0] text-[#E67E22]' },
  { value: 'decision', label: 'Decision', icon: 'Checks', chipClass: 'bg-[#E8F5E9] text-[#27AE60]' },
  { value: 'question', label: 'Question', icon: 'Question', chipClass: 'bg-[#FCE4EC] text-[#E91E63]' },
])

export const CAPTURE_TYPE_MAP = Object.freeze(
  Object.fromEntries(CAPTURE_TYPES.map((type) => [type.value, type])),
)

export const CAPTURE_SOURCES = Object.freeze(['manual', 'live_capture', 'brain_dump', 'extension'])

/** Attention score bands (docs/06_data_model.md -> Score Bands). */
export const ATTENTION_BANDS = Object.freeze([
  { key: 'critical', min: 85, max: 100, label: 'Critical', surfacesInTop5: true, goingCold: true },
  { key: 'very_high', min: 70, max: 84, label: 'Very High', surfacesInTop5: true, goingCold: true },
  { key: 'high', min: 45, max: 69, label: 'High', surfacesInTop5: true, goingCold: false },
  { key: 'medium', min: 20, max: 44, label: 'Medium', surfacesInTop5: true, goingCold: false },
  { key: 'low', min: 0, max: 19, label: 'Low', surfacesInTop5: false, goingCold: false },
])

/** Commitment urgency bands (docs/07_design_system.md -> Urgency Indicator). */
export const URGENCY = Object.freeze({
  OVERDUE: 'overdue',
  SOON: 'soon',
  OK: 'ok',
})

export const URGENCY_STYLES = Object.freeze({
  overdue: { dot: 'bg-danger', label: 'Overdue', animate: true },
  soon: { dot: 'bg-warning', label: 'Due within 48h', animate: false },
  ok: { dot: 'bg-success', label: 'On track', animate: false },
})

/** Thread list sort orders (Requirement 1, criterion 9). */
export const THREAD_SORTS = Object.freeze([
  { value: 'lastInteraction', label: 'Last interaction' },
  { value: 'attentionScore', label: 'Attention score' },
  { value: 'createdAt', label: 'Created date' },
  { value: 'title', label: 'Alphabetical' },
])

export const DEFAULT_THREAD_SORT = 'lastInteraction'

/** Thread list filters (Feature 2 -> Threads List behaviour). */
export const THREAD_FILTERS = Object.freeze([
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
  { value: 'goingCold', label: 'Going cold' },
  { value: 'pinned', label: 'Pinned' },
  { value: 'snoozed', label: 'Snoozed' },
])

export const DEFAULT_THREAD_FILTER = 'active'

/** Smart Snooze presets (Feature 11). Maximum window is 30 days. */
export const SNOOZE_PRESETS = Object.freeze([
  { value: 1, label: 'Tomorrow' },
  { value: 3, label: 'In 3 days' },
  { value: 7, label: 'Next week' },
])

export const MAX_SNOOZE_DAYS = 30

/** Going-cold threshold default (docs -> User.goingColdThresholdDays). */
export const DEFAULT_GOING_COLD_DAYS = 14

/** Cold alerts are suppressed for this long after a dismissal (Feature 10). */
export const COLD_DISMISSAL_DAYS = 7

/** After this many consecutive dismissals the app offers to archive. */
export const COLD_DISMISSALS_BEFORE_ARCHIVE_PROMPT = 3

/** Days of inactivity before the re-engagement digest (Requirement 10). */
export const REENGAGEMENT_INACTIVITY_DAYS = 7

/** Notification preference defaults (docs -> User.notificationPreferences). */
export const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  dailyDigest: true,
  commitmentDue: true,
  goingCold: true,
  preMeetingBrief: true,
  reengagementDigest: true,
})

/** Default user preferences. */
export const DEFAULT_SETTINGS = Object.freeze({
  theme: 'system',
  defaultCaptureType: 'note',
  defaultThreadSort: DEFAULT_THREAD_SORT,
  goingColdThresholdDays: DEFAULT_GOING_COLD_DAYS,
  digestTime: '08:00',
  digestEnabled: true,
  emailDigestEnabled: false,
  doNotDisturb: false,
  pushEnabled: false,
  keyboardShortcutsEnabled: true,
  /**
   * Sidebar preference: 'auto' (narrow icon rail on laptops/tablets, labelled on
   * desktop) | 'expanded' | 'collapsed'. Persisted so the choice is remembered.
   */
  sidebar: 'auto',
  notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
})

/** Capture content limit (Feature 4 -> edge cases). */
export const CAPTURE_MAX_LENGTH = 2000

/** Primary navigation, shared by the desktop sidebar and mobile tab bar. */
export const NAV_ITEMS = Object.freeze([
  { to: '/today', label: 'Today', icon: 'HouseSimple' },
  { to: '/threads', label: 'Threads', icon: 'ChatCircleDots' },
  { to: '/people', label: 'People', icon: 'Users' },
  { to: '/commitments', label: 'Commitments', icon: 'CheckSquare' },
])

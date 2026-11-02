/**
 * verify-notifications.mjs
 *
 * Exercises the notification contract (Feature 14 - Digest and Notifications)
 * and the AI classifier end to end against the bundled demo router in
 * `src/mocks`, plus the DTO adapters that translate the FastAPI snake_case
 * payloads onto the camelCase view models the UI reads.
 *
 *   npm run verify:notifications
 */
// Minimal localStorage so the demo DB (which persists sessions/workspaces) runs
// under plain `node`. Set before the modules below are imported.
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map()
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  }
}

const { ENDPOINTS } = await import('@/apis/endpoints')
const {
  toNotification,
  toNotificationList,
  toNotificationPreferences,
  toNotificationPreferencesPatch,
} = await import('@/apis/adapters')
const db = await import('@/mocks/db')
const { handleMockRequest } = await import('@/mocks/handlers')

let passed = 0
let failed = 0

function check(name, ok, detail = '') {
  if (ok) {
    passed += 1
    console.log(`PASS  ${name}`)
  } else {
    failed += 1
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ''}`)
  }
}

const TOKEN = 'verify-notifications-token'
const USER = 'user_verify_notifications'

db.registerUser(USER, { email: 'verify@friday.app', fullName: 'Verify User' })
db.registerSession(TOKEN, USER)

const call = (method, path, options = {}) =>
  handleMockRequest({ method, path, ...options, token: TOKEN })

/* ---------------------------------------------------------------- adapters --- */

const backendRow = {
  id: 'n1',
  user_id: 'u1',
  type: 'going_cold',
  reference_type: 'thread',
  reference_id: 't1',
  title: 'Going Cold: Acme',
  body: 'No interaction for 21 days.',
  deep_link_url: '/threads/t1',
  scheduled_at: '2026-01-01T00:00:00Z',
  sent_at: null,
  is_read: false,
}

const mapped = toNotification(backendRow)
check('toNotification maps snake_case -> camelCase', mapped.deepLinkUrl === '/threads/t1')
check('toNotification coerces is_read', mapped.isRead === false)

const listMapped = toNotificationList({ data: [backendRow], total: 1, unread_count: 7 })
check(
  'toNotificationList unwraps data/unread_count',
  listMapped.unreadCount === 7 && listMapped.items.length === 1,
)

const prefsMapped = toNotificationPreferences({
  daily_digest: false,
  digest_time: '07:00',
  email_digest_enabled: true,
})
check(
  'toNotificationPreferences maps preferences',
  prefsMapped.dailyDigest === false &&
    prefsMapped.digestTime === '07:00' &&
    prefsMapped.emailDigestEnabled,
)

const patchMapped = toNotificationPreferencesPatch({ dailyDigest: false, digestTime: '09:00' })
check(
  'toNotificationPreferencesPatch emits snake_case',
  patchMapped.daily_digest === false && patchMapped.digest_time === '09:00',
)

/* ------------------------------------------------------------ list + flags --- */

check(
  'endpoint map has no dead /notifications/subscribe',
  ENDPOINTS.notifications.subscribe === undefined,
)

let list = await call('GET', ENDPOINTS.notifications.list())
check(
  'GET /notifications returns the inbox shape',
  Array.isArray(list.items) && typeof list.unreadCount === 'number',
)

/* ------------------------------------------------------------ AI classify --- */

const action = await call('POST', ENDPOINTS.ai.classify(), {
  body: { content: 'I will send the pricing deck by tomorrow' },
})
check('POST /ai/classify detects an action', action.suggestedType === 'action', JSON.stringify(action))

const decision = await call('POST', ENDPOINTS.ai.classify(), {
  body: { content: 'We decided to delay the launch to Q3' },
})
check('POST /ai/classify detects a decision', decision.suggestedType === 'decision')

/* -------------------------------------------------------------- preferences --- */

let prefs = await call('GET', ENDPOINTS.notifications.preferences())
check('GET /notifications/preferences has all toggles', typeof prefs.dailyDigest === 'boolean')

prefs = await call('PATCH', ENDPOINTS.notifications.preferences(), {
  body: toNotificationPreferencesPatch({ dailyDigest: false, digestTime: '09:00' }),
})
check(
  'PATCH /notifications/preferences persists changes',
  prefs.dailyDigest === false && prefs.digestTime === '09:00',
  JSON.stringify(prefs),
)

/* ---------------------------------------------------------- create + read --- */

const created = await call('POST', ENDPOINTS.notifications.create(), {
  body: { type: 'pre_meeting_brief', title: 'Brief ready', body: 'Tap to open.' },
})
check('POST /notifications creates an unread row', Boolean(created.id) && created.isRead === false)

const marked = await call('PATCH', ENDPOINTS.notifications.read(created.id))
check('PATCH /notifications/:id/read marks it read', marked.isRead === true)

list = await call('GET', ENDPOINTS.notifications.list())
check(
  'GET /notifications reflects the new row',
  list.items.some((row) => row.id === created.id),
)

/* ---------------------------------------------------------------- read-all --- */

await call('POST', ENDPOINTS.notifications.readAll())
list = await call('GET', ENDPOINTS.notifications.list())
check('POST /notifications/read-all clears the badge', list.unreadCount === 0)

/* ----------------------------------------------------------- check-trigger --- */

const triggers = await call('POST', ENDPOINTS.notifications.checkTriggers())
check(
  'POST /notifications/check-triggers returns a count',
  typeof triggers.generatedCount === 'number',
)

const afterTriggers = await call('GET', ENDPOINTS.notifications.list())
check(
  'check-triggers rows are unread with deep links',
  afterTriggers.unreadCount >= triggers.generatedCount &&
    afterTriggers.items.every((row) => typeof row.deepLinkUrl === 'string'),
)

const unreadOnly = await call('GET', ENDPOINTS.notifications.list(), { query: { isRead: false } })
check('GET /notifications?isRead=false filters', unreadOnly.items.every((row) => row.isRead === false))

/* ------------------------------------------------------------------ delete --- */

const before = (await call('GET', ENDPOINTS.notifications.list())).total
await call('DELETE', ENDPOINTS.notifications.remove(created.id))
const after = (await call('GET', ENDPOINTS.notifications.list())).total
check('DELETE /notifications/:id removes the row', after === before - 1)

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed === 0 ? 0 : 1)

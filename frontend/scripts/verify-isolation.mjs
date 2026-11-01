/**
 * Verifies per-user data isolation in the demo API.
 *
 *   npm run verify:isolation
 *
 * Requirement: docs/08_system_architecture.md -> Data Isolation
 *   "All database queries include userId; no shared data between users."
 *
 * Runs the real router against an in-memory localStorage shim, so it exercises
 * the same code path the browser uses.
 */
const store = new Map()
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
  clear: () => store.clear(),
}

const { handleMockRequest } = await import('../src/mocks/handlers.js')

let failures = 0

function check(label, actual, expected) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected)
  if (!pass) failures += 1
  console.log(
    `${pass ? 'PASS' : 'FAIL'}  ${label}${pass ? '' : `\n      expected: ${JSON.stringify(expected)}\n      actual:   ${JSON.stringify(actual)}`}`,
  )
}

const call = (token, method, path, body) => handleMockRequest({ token, method, path, body })

/* 1. Unauthenticated access is rejected. */
let status = null
try {
  await call(null, 'GET', '/threads')
} catch (error) {
  status = error.status
}
check('No token -> 401', status, 401)

/* 2. Two independent accounts sign in. */
const a = await call(null, 'POST', '/auth/login', {
  email: 'meera@demo.threadwise.app',
  password: 'threadwise',
})
const b = await call(null, 'POST', '/auth/login', {
  email: 'arjun@demo.threadwise.app',
  password: 'threadwise',
})

check('Two accounts get distinct tokens', a.accessToken !== b.accessToken, true)
check('Two accounts get distinct user ids', a.user.id !== b.user.id, true)

/* 3. Write to A's workspace only. */
const created = await call(a.accessToken, 'POST', '/threads', { title: 'ISOLATION-CANARY-A' })

/* 4. A sees their own data... */
const aThreads = await call(a.accessToken, 'GET', '/threads')
check(
  "A's list contains A's thread",
  aThreads.threads.some((thread) => thread.title === 'ISOLATION-CANARY-A'),
  true,
)

/* 5. ...and B does not. */
const bThreads = await call(b.accessToken, 'GET', '/threads')
check(
  "B's list does NOT contain A's thread",
  bThreads.threads.some((thread) => thread.title === 'ISOLATION-CANARY-A'),
  false,
)

/* 6. B cannot read A's thread by id. */
let lookupStatus = null
try {
  await call(b.accessToken, 'GET', `/threads/${created.thread.id}`)
} catch (error) {
  lookupStatus = error.status
}
check("B cannot fetch A's thread by id -> 404", lookupStatus, 404)

/* 7. B cannot mutate A's thread. */
let patchStatus = null
try {
  await call(b.accessToken, 'PATCH', `/threads/${created.thread.id}`, { title: 'hijacked' })
} catch (error) {
  patchStatus = error.status
}
check("B cannot patch A's thread -> 404", patchStatus, 404)

/* 8. A's thread is unchanged after B's attempt. */
const afterAttempt = await call(a.accessToken, 'GET', `/threads/${created.thread.id}`)
check("A's thread survived intact", afterAttempt.thread.title, 'ISOLATION-CANARY-A')

/* 9. Search is scoped too. */
const bSearch = await call(b.accessToken, 'GET', '/search', undefined)
void bSearch
const aSearch = await handleMockRequest({ token: a.accessToken, method: 'GET', path: '/search', query: { q: 'CANARY' } })
const bSearchScoped = await handleMockRequest({ token: b.accessToken, method: 'GET', path: '/search', query: { q: 'CANARY' } })
check('Search finds it for A', aSearch.total > 0, true)
check('Search hides it from B', bSearchScoped.total, 0)

/* 10. Logging out invalidates the token. */
await call(b.accessToken, 'POST', '/auth/logout')
let afterLogout = null
try {
  await call(b.accessToken, 'GET', '/threads')
} catch (error) {
  afterLogout = error.status
}
check('Logged-out token -> 401', afterLogout, 401)

console.log(failures === 0 ? '\nAll isolation checks passed.' : `\n${failures} check(s) failed.`)
process.exit(failures === 0 ? 0 : 1)
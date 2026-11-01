/**
 * verify-api-adapters.mjs
 *
 * Proves that `src/apis/adapters.js` maps the FastAPI (snake_case) contract onto
 * the camelCase view models the UI reads - the single boundary that lets the app
 * run against either the bundled demo router or the real backend.
 *
 *   npm run verify:adapters          # fixture based, no backend required
 *   npm run verify:adapters --live   # ALSO check the running backend
 *
 *   API_BASE=http://localhost:8000 npm run verify:adapters --live
 */
import {
  derivePeopleStats,
  groupSearchResults,
  toCapture,
  toCommitment,
  toList,
  toPerson,
  toThread,
  toTodayPayload,
} from '@/apis/adapters'

const LIVE = process.argv.includes('--live')
const BASE = (process.env.API_BASE ?? 'http://localhost:8000').replace(/\/+$/, '')

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

function assertShape(name, obj, fields) {
  const missing = fields.filter((field) => obj?.[field] === undefined)
  check(name, missing.length === 0, missing.length ? `missing: ${missing.join(', ')}` : '')
}

/* ------------------------------------------------------------- fixtures --- */

const THREAD_DTO = {
  id: 'thread-1',
  user_id: 'user-1',
  title: 'Q3 expansion',
  description: null,
  status: 'active',
  is_pinned: true,
  going_cold_threshold_days: 14,
  attention_score: 72.4,
  last_interaction_at: '2026-07-01T10:00:00',
  created_at: '2026-06-01T10:00:00',
  updated_at: '2026-07-01T10:00:00',
  archived_at: null,
}

function fixtureChecks() {
  console.log('-- adapters (fixtures) --')

  const thread = toThread(THREAD_DTO)
  assertShape('ThreadResponse -> Thread', thread, [
    'id',
    'userId',
    'title',
    'status',
    'isPinned',
    'goingColdThresholdDays',
    'attentionScore',
    'lastInteractionAt',
    'createdAt',
    'updatedAt',
  ])
  check('attention_score is rounded', thread.attentionScore === 72, `got ${thread.attentionScore}`)
  check('is_pinned -> boolean', thread.isPinned === true)

  const overdue = toCommitment({
    id: 'c1',
    user_id: 'user-1',
    thread_id: 'thread-1',
    description: 'Send timeline',
    owner_type: 'me',
    status: 'open',
    due_date: '2020-01-01T00:00:00',
    created_at: 'x',
    updated_at: 'x',
  })
  check('commitment urgency is derived (overdue)', overdue.urgency === 'overdue', overdue.urgency)

  const person = toPerson({
    id: 'p1',
    user_id: 'user-1',
    full_name: 'Meera Krishnamurthy',
    organisation: 'Acme',
    role: 'PM',
    email: null,
    phone: null,
    linked_in_url: null,
    notes: null,
    created_at: 'x',
    updated_at: 'x',
  })
  check('full_name -> fullName', person.fullName === 'Meera Krishnamurthy')

  const captured = toCapture({
    id: 'k1',
    user_id: 'user-1',
    thread_id: null,
    person_id: null,
    type: 'note',
    content: 'Budget approved',
    source: 'manual',
    status: 'inbox',
    captured_at: 'x',
    created_at: 'x',
    updated_at: 'x',
    is_edited: false,
  })
  check('thread_id null -> Inbox capture', captured.threadId === null && captured.status === 'inbox')

  const list = toList({ data: [THREAD_DTO], total: 1, limit: 50, offset: 0 })
  check('toList unwraps { data, total }', list.rows.length === 1 && list.total === 1)

  const today = toTodayPayload(
    {
      generated_at: 'now',
      top_threads: [
        {
          thread: THREAD_DTO,
          attention_score: 80,
          attention_reason: 'No contact in 18 days',
          days_since_interaction: 18,
          is_going_cold: true,
          open_commitments_count: 1,
          overdue_commitments_count: 0,
        },
      ],
      due_today: [],
      going_cold: [],
    },
    { overdue: [], inboxCount: 2 },
  )
  check(
    'today flattens top_threads + reasons',
    today.topThreads[0]?.id === 'thread-1' &&
      today.topThreads[0]?.attentionScore === 80 &&
      today.topThreads[0]?.attentionReason === 'No contact in 18 days',
  )
  check('today carries inboxCount', today.inboxCount === 2)

  const grouped = groupSearchResults({
    query: 'x',
    total: 2,
    results: [
      { entity_type: 'thread', entity_id: 'thread-1', title: 'T', snippet: 's', score: 1 },
      { entity_type: 'person', entity_id: 'p1', title: 'P', snippet: 'r', score: 1 },
    ],
  })
  check(
    'search groups by entity_type',
    grouped.threads.length === 1 && grouped.people.length === 1 && grouped.total === 2,
  )

  const stats = derivePeopleStats(
    [
      { id: 't1', last_interaction_at: '2026-07-01T00:00:00' },
      { id: 't2', last_interaction_at: '2026-07-05T00:00:00' },
    ],
    [[{ person_id: 'p1' }], [{ person_id: 'p1' }, { person_id: 'p2' }]],
    [
      { status: 'open', owner_person_id: 'p1' },
      { status: 'open', owner_person_id: 'p1' },
      { status: 'completed', owner_person_id: 'p2' },
    ],
  )
  check('derivePeopleStats counts threads per person', stats.get('p1')?.threadCount === 2)
  check(
    'derivePeopleStats keeps the most recent contact',
    stats.get('p1')?.lastInteractionAt === '2026-07-05T00:00:00',
  )
  check(
    'derivePeopleStats counts only open commitments',
    stats.get('p1')?.openCommitmentCount === 2 && stats.get('p2')?.openCommitmentCount === 0,
  )
}

/* ----------------------------------------------------------------- live --- */

async function get(path) {
  const response = await fetch(`${BASE}${path}`)
  if (!response.ok) throw new Error(`${path} -> HTTP ${response.status}`)
  return response.json()
}

async function liveChecks() {
  console.log(`\n-- live backend: ${BASE} --`)

  const health = await get('/health')
  check('/health is ok', health?.status === 'ok', JSON.stringify(health))

  const threads = toList(await get('/threads')).rows.map(toThread)
  check(
    '/threads -> UI threads',
    threads.length > 0 &&
      threads.every((t) => typeof t.title === 'string' && Number.isFinite(t.attentionScore)),
    `${threads.length} threads`,
  )

  const people = toList(await get('/people')).rows.map(toPerson)
  check('/people -> UI people', people.every((p) => typeof p.fullName === 'string'), `${people.length}`)

  const commitments = toList(await get('/commitments')).rows.map((row) => toCommitment(row))
  check(
    '/commitments -> urgency bands',
    commitments.every((c) => ['overdue', 'soon', 'ok'].includes(c.urgency)),
    `${commitments.length} commitments`,
  )

  const captures = toList(await get('/captures?limit=5')).rows.map(toCapture)
  check(
    '/captures -> UI captures',
    captures.every((c) => typeof c.content === 'string'),
    `${captures.length} captures`,
  )

  const timeline = await get(`/threads/${threads[0]?.id}/timeline`)
  check('/threads/:id/timeline is a list', Array.isArray(timeline), `${timeline?.length ?? 0} events`)

  const todayPayload = toTodayPayload(await get('/attention/today'), {})
  check(
    '/attention/today -> TodayPayload',
    todayPayload.topThreads.length > 0 && Boolean(todayPayload.topThreads[0].id),
    `${todayPayload.topThreads.length} top threads`,
  )

  const search = groupSearchResults(await get('/search?q=a'))
  const total =
    search.threads.length + search.people.length + search.captures.length + search.commitments.length
  check('/search -> grouped results', total > 0, `${total} results`)

  // Directory counts are derived client-side (PersonResponse has no counts).
  const threadRows = toList(await get('/threads')).rows
  const linkSets = await Promise.all(
    threadRows.map((thread) => get(`/threads/${thread.id}/people`).catch(() => [])),
  )
  const stats = derivePeopleStats(threadRows, linkSets, toList(await get('/commitments')).rows)
  const enriched = people.map((person) => ({ ...person, ...(stats.get(person.id) ?? {}) }))
  check(
    'directory counts resolve from live links',
    enriched.some((person) => (person.threadCount ?? 0) > 0),
    enriched.map((person) => `${person.fullName}:${person.threadCount ?? 0}`).join(', '),
  )
}

/* ----------------------------------------------------------------- main --- */

fixtureChecks()

if (LIVE) {
  try {
    await liveChecks()
  } catch (error) {
    check('live checks completed', false, error.message)
  }
} else {
  console.log('\n(skipping live checks - pass --live to test the running backend)')
}

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)

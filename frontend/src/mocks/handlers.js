/**
 * Demo API router.
 *
 * Implements the same REST contract as `src/apis/endpoints.js` against the
 * in-memory store. Thread cards are decorated here exactly as the real backend
 * would: the Attention Engine runs server-side, so clients just read
 * `attentionScore` / `attentionReason` / `urgency`.
 */
import { attentionReason, computeAttentionScore, isGoingCold } from '@/lib/attention'
import { commitmentUrgency, nowIso } from '@/lib/date'
import { ApiError } from '@/lib/errors'
import { sleep, uid } from '@/lib/utils'
import { getDb, loadDb, saveDb } from './db'
import {
  activate,
  endSession,
  registerSession,
  registerUser,
  resolveSession,
} from './db'
import { profileForEmail, userIdForEmail } from './seed'

const LATENCY_MS = 120

/* --------------------------------------------------------------- helpers --- */

function requireUser() {
  const db = getDb()
  if (!db.user) {
    throw new ApiError('Please sign in to continue.', { status: 401, code: 'unauthorized' })
  }
  return db.user
}

function openCommitmentsFor(db, threadId) {
  return db.commitments.filter((row) => row.threadId === threadId && row.status === 'open')
}

function peopleForThread(db, threadId) {
  const ids = db.threadPeople.filter((link) => link.threadId === threadId).map((l) => l.personId)
  return db.people.filter((person) => ids.includes(person.id))
}

function decorateThread(db, thread) {
  const open = openCommitmentsFor(db, thread.id)
  return {
    ...thread,
    attentionScore: computeAttentionScore(thread, open),
    attentionReason: attentionReason(thread, open),
    openCommitmentCount: open.length,
    isGoingCold: isGoingCold(thread),
    people: peopleForThread(db, thread.id).map((person) => ({
      id: person.id,
      fullName: person.fullName,
      organisation: person.organisation ?? null,
    })),
  }
}

function decorateCommitment(db, commitment) {
  const ownerPerson = commitment.ownerPersonId
    ? (db.people.find((person) => person.id === commitment.ownerPersonId) ?? null)
    : null
  const thread = db.threads.find((row) => row.id === commitment.threadId)
  return {
    ...commitment,
    ownerPerson: ownerPerson ? { id: ownerPerson.id, fullName: ownerPerson.fullName } : null,
    threadTitle: thread?.title ?? null,
    urgency: commitmentUrgency(commitment.dueDate, commitment.status),
  }
}

function matchesFilter(thread, filter) {
  const snoozed = Boolean(thread.snoozedUntil && new Date(thread.snoozedUntil) > new Date())
  switch (filter) {
    case 'archived':
      return thread.status === 'archived'
    case 'goingCold':
      return thread.status === 'active' && isGoingCold(thread)
    case 'pinned':
      return thread.status === 'active' && thread.isPinned
    case 'snoozed':
      return thread.status === 'active' && snoozed
    case 'all':
      return true
    case 'active':
    default:
      return thread.status === 'active'
  }
}

function sortThreads(threads, sort) {
  const list = [...threads]
  switch (sort) {
    case 'attentionScore':
      return list.sort((a, b) => b.attentionScore - a.attentionScore)
    case 'createdAt':
      return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    case 'title':
      return list.sort((a, b) => a.title.localeCompare(b.title))
    case 'lastInteraction':
    default:
      return list.sort((a, b) => new Date(b.lastInteractionAt) - new Date(a.lastInteractionAt))
  }
}

function touchThread(threadId, when = nowIso()) {
  const db = getDb()
  const thread = db.threads.find((row) => row.id === threadId)
  if (thread) {
    thread.lastInteractionAt = when
    thread.updatedAt = when
  }
  return thread
}

function addTimelineEvent(threadId, type, referenceId, metadata = {}, occurredAt = nowIso()) {
  const db = getDb()
  db.timeline.push({
    id: uid('tl'),
    threadId,
    userId: db.user?.id ?? null,
    type,
    referenceId,
    metadata,
    occurredAt,
  })
}

/* ----------------------------------------------------------------- router --- */

const routes = []

function route(method, pattern, handler) {
  routes.push({ method, pattern, handler })
}

/* auth ------------------------------------------------------------------- */

route('POST', /^\/auth\/login$/, async ({ body }) => {
  const email = String(body?.email ?? '').trim().toLowerCase()
  const password = String(body?.password ?? '')
  if (!email || !password) {
    throw new ApiError('Enter your email and password to continue.', {
      status: 422,
      code: 'validation_error',
    })
  }

  // Each account gets its own isolated workspace (per-user data isolation).
  const userId = userIdForEmail(email)
  const profile = { ...profileForEmail(email), email }

  registerUser(userId, profile)
  activate(userId)

  const db = loadDb()
  db.user.email = email
  db.user.lastActiveAt = nowIso()
  saveDb()

  const token = `demo_${uid('tok')}`
  registerSession(token, userId)

  return {
    accessToken: token,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    user: { ...db.user },
  }
})

route('POST', /^\/auth\/logout$/, async ({ token }) => {
  endSession(token)
  activate(null)
  return null
})

route('GET', /^\/auth\/me$/, async () => ({ user: requireUser() }))

/* people ----------------------------------------------------------------- */

route('GET', /^\/people$/, async ({ query }) => {
  requireUser()
  const db = getDb()
  const term = String(query?.query ?? '').trim().toLowerCase()

  let list = db.people
  if (term) {
    list = list.filter((person) =>
      [person.fullName, person.organisation, person.role, person.email].some((value) =>
        String(value ?? '').toLowerCase().includes(term),
      ),
    )
  }

  const decorated = list.map((person) => {
    const threadRows = db.threadPeople
      .filter((link) => link.personId === person.id)
      .map((link) => db.threads.find((thread) => thread.id === link.threadId))
      .filter(Boolean)
    const open = db.commitments.filter(
      (row) => row.status === 'open' && threadRows.some((thread) => thread.id === row.threadId),
    )
    return {
      ...person,
      threadCount: threadRows.length,
      openCommitmentCount: open.length,
      threads: threadRows.map((thread) => ({ id: thread.id, title: thread.title })),
      // Most recent contact across the person's threads (parity with live mode).
      lastInteractionAt:
        threadRows
          .map((thread) => thread.lastInteractionAt)
          .filter(Boolean)
          .sort()
          .at(-1) ?? null,
    }
  })

  const filtered = query?.threadId
    ? decorated.filter((person) => person.threads.some((t) => t.id === query.threadId))
    : decorated

  filtered.sort((a, b) => a.fullName.localeCompare(b.fullName))
  return { people: filtered, total: filtered.length }
})

route('POST', /^\/people$/, async ({ body }) => {
  const user = requireUser()
  const db = getDb()
  const fullName = String(body?.fullName ?? '').trim()
  if (!fullName) {
    throw new ApiError('A person needs at least a full name.', {
      status: 422,
      code: 'validation_error',
    })
  }

  const possibleDuplicates = db.people
    .filter((person) => person.fullName.toLowerCase() === fullName.toLowerCase())
    .map((person) => ({ id: person.id, fullName: person.fullName, email: person.email ?? null }))

  const person = {
    id: uid('per'),
    userId: user.id,
    fullName,
    organisation: body?.organisation ?? null,
    role: body?.role ?? null,
    email: body?.email ?? null,
    phone: body?.phone ?? null,
    linkedInUrl: body?.linkedInUrl ?? null,
    notes: body?.notes ?? null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
  db.people.push(person)

  for (const threadId of body?.threadIds ?? []) {
    db.threadPeople.push({ threadId, personId: person.id, addedAt: nowIso() })
  }

  saveDb()
  return { person, possibleDuplicates }
})

route('GET', /^\/people\/([^/]+)$/, async ({ params }) => {
  requireUser()
  const db = getDb()
  const person = db.people.find((row) => row.id === params[0])
  if (!person) throw new ApiError('Person not found.', { status: 404, code: 'not_found' })

  const threads = db.threadPeople
    .filter((link) => link.personId === person.id)
    .map((link) => db.threads.find((thread) => thread.id === link.threadId))
    .filter(Boolean)
    .map((thread) => decorateThread(db, thread))

  const threadIds = threads.map((thread) => thread.id)
  const commitments = db.commitments
    .filter((row) => threadIds.includes(row.threadId))
    .map((row) => decorateCommitment(db, row))
  const captures = db.captures.filter((row) => row.personId === person.id)

  return { person, threads, commitments, captures }
})

route('PATCH', /^\/people\/([^/]+)$/, async ({ params, body }) => {
  requireUser()
  const db = getDb()
  const person = db.people.find((row) => row.id === params[0])
  if (!person) throw new ApiError('Person not found.', { status: 404, code: 'not_found' })
  Object.assign(person, body ?? {}, { updatedAt: nowIso() })
  saveDb()
  return { person }
})

route('DELETE', /^\/people\/([^/]+)$/, async ({ params }) => {
  requireUser()
  const db = getDb()
  db.people = db.people.filter((row) => row.id !== params[0])
  db.threadPeople = db.threadPeople.filter((link) => link.personId !== params[0])
  saveDb()
  return null
})

route('POST', /^\/people\/merge$/, async ({ body }) => {
  requireUser()
  const db = getDb()
  const primary = db.people.find((row) => row.id === String(body?.primaryId ?? ''))
  const duplicate = db.people.find((row) => row.id === String(body?.duplicateId ?? ''))
  if (!primary || !duplicate) {
    throw new ApiError('Both records must exist to merge.', { status: 404, code: 'not_found' })
  }

  for (const link of db.threadPeople) {
    if (link.personId === duplicate.id) link.personId = primary.id
  }
  for (const commitment of db.commitments) {
    if (commitment.ownerPersonId === duplicate.id) commitment.ownerPersonId = primary.id
  }
  for (const capture of db.captures) {
    if (capture.personId === duplicate.id) capture.personId = primary.id
  }
  if (duplicate.notes) {
    primary.notes = [primary.notes, duplicate.notes].filter(Boolean).join('\n---\n')
  }
  db.people = db.people.filter((row) => row.id !== duplicate.id)
  primary.updatedAt = nowIso()

  saveDb()
  return { person: primary, mergedFrom: duplicate.id }
})

/* threads ---------------------------------------------------------------- */

route('GET', /^\/threads$/, async ({ query }) => {
  requireUser()
  const db = getDb()
  const filter = String(query?.filter ?? 'active')
  const sort = String(query?.sort ?? 'lastInteraction')
  const term = String(query?.query ?? '').trim().toLowerCase()

  let list = db.threads.filter((thread) => matchesFilter(thread, filter))

  if (query?.personId) {
    const threadIds = db.threadPeople
      .filter((link) => link.personId === query.personId)
      .map((link) => link.threadId)
    list = list.filter((thread) => threadIds.includes(thread.id))
  }

  if (term) {
    list = list.filter((thread) =>
      [thread.title, thread.description].some((value) =>
        String(value ?? '').toLowerCase().includes(term),
      ),
    )
  }

  const sorted = sortThreads(
    list.map((thread) => decorateThread(db, thread)),
    sort,
  )
  return { threads: sorted, total: sorted.length, filter, sort }
})

route('POST', /^\/threads$/, async ({ body }) => {
  const user = requireUser()
  const db = getDb()
  const title = String(body?.title ?? '').trim()
  if (!title) {
    throw new ApiError('Thread title is required.', { status: 422, code: 'validation_error' })
  }

  const timestamp = nowIso()
  const thread = {
    id: uid('thr'),
    userId: user.id,
    title: title.slice(0, 100),
    description: body?.description ? String(body.description).slice(0, 500) : null,
    status: 'active',
    isPinned: false,
    goingColdThresholdDays: Number(body?.goingColdThresholdDays) || user.goingColdThresholdDays,
    lastInteractionAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  db.threads.push(thread)
  addTimelineEvent(thread.id, 'thread_created', thread.id, { title: thread.title }, timestamp)

  for (const personId of body?.personIds ?? []) {
    db.threadPeople.push({ threadId: thread.id, personId, addedAt: timestamp })
    addTimelineEvent(thread.id, 'person_added', personId, {}, timestamp)
  }

  saveDb()
  return { thread: decorateThread(db, thread) }
})

route('GET', /^\/threads\/([^/]+)$/, async ({ params }) => {
  requireUser()
  const db = getDb()
  const thread = db.threads.find((row) => row.id === params[0])
  if (!thread) throw new ApiError('Thread not found.', { status: 404, code: 'not_found' })

  const captures = db.captures.filter((row) => row.threadId === thread.id)
  const commitments = db.commitments
    .filter((row) => row.threadId === thread.id)
    .map((row) => decorateCommitment(db, row))
  const timeline = db.timeline
    .filter((row) => row.threadId === thread.id)
    .sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt))
  const summaries = db.summaries.filter((row) => row.threadId === thread.id)

  return { thread: decorateThread(db, thread), captures, commitments, timeline, summaries }
})

route('PATCH', /^\/threads\/([^/]+)$/, async ({ params, body }) => {
  requireUser()
  const db = getDb()
  const thread = db.threads.find((row) => row.id === params[0])
  if (!thread) throw new ApiError('Thread not found.', { status: 404, code: 'not_found' })

  const patch = { ...(body ?? {}) }
  if (patch.title !== undefined) patch.title = String(patch.title).trim().slice(0, 100)
  if (patch.description !== undefined && patch.description !== null) {
    patch.description = String(patch.description).slice(0, 500)
  }
  Object.assign(thread, patch, { updatedAt: nowIso() })

  saveDb()
  return { thread: decorateThread(db, thread) }
})

route('DELETE', /^\/threads\/([^/]+)$/, async ({ params }) => {
  requireUser()
  const db = getDb()
  db.threads = db.threads.filter((row) => row.id !== params[0])
  db.captures = db.captures.filter((row) => row.threadId !== params[0])
  db.commitments = db.commitments.filter((row) => row.threadId !== params[0])
  db.timeline = db.timeline.filter((row) => row.threadId !== params[0])
  db.summaries = db.summaries.filter((row) => row.threadId !== params[0])
  db.threadPeople = db.threadPeople.filter((link) => link.threadId !== params[0])
  saveDb()
  return null
})

route('POST', /^\/threads\/([^/]+)\/archive$/, async ({ params }) => {
  requireUser()
  const db = getDb()
  const thread = db.threads.find((row) => row.id === params[0])
  if (!thread) throw new ApiError('Thread not found.', { status: 404, code: 'not_found' })
  thread.status = 'archived'
  thread.archivedAt = nowIso()
  thread.updatedAt = thread.archivedAt
  saveDb()
  return { thread: decorateThread(db, thread) }
})

route('POST', /^\/threads\/([^/]+)\/restore$/, async ({ params }) => {
  requireUser()
  const db = getDb()
  const thread = db.threads.find((row) => row.id === params[0])
  if (!thread) throw new ApiError('Thread not found.', { status: 404, code: 'not_found' })
  thread.status = 'active'
  delete thread.archivedAt
  thread.updatedAt = nowIso()
  saveDb()
  return { thread: decorateThread(db, thread) }
})

route('POST', /^\/threads\/([^/]+)\/snooze$/, async ({ params, body }) => {
  requireUser()
  const db = getDb()
  const thread = db.threads.find((row) => row.id === params[0])
  if (!thread) throw new ApiError('Thread not found.', { status: 404, code: 'not_found' })

  const days = Number(body?.days ?? 0)
  if (!days || days < 1 || days > 30) {
    throw new ApiError('Snoozes must be between 1 and 30 days.', {
      status: 422,
      code: 'validation_error',
    })
  }

  if (body?.clear) {
    delete thread.snoozedUntil
    saveDb()
    return { thread: decorateThread(db, thread), snoozeUntil: null }
  }

  const snoozeUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
  thread.snoozedUntil = snoozeUntil
  db.snoozes.push({
    id: uid('snz'),
    userId: db.user.id,
    targetType: 'thread',
    targetId: thread.id,
    snoozeUntil,
    createdAt: nowIso(),
  })

  saveDb()
  return { thread: decorateThread(db, thread), snoozeUntil }
})

/* captures --------------------------------------------------------------- */

route('GET', /^\/captures$/, async ({ query }) => {
  requireUser()
  const db = getDb()
  let list = [...db.captures]
  if (query?.threadId) list = list.filter((row) => row.threadId === query.threadId)
  if (query?.status) list = list.filter((row) => row.status === query.status)
  if (query?.personId) list = list.filter((row) => row.personId === query.personId)
  list.sort((a, b) => new Date(b.capturedAt) - new Date(a.capturedAt))
  return { captures: list, total: list.length }
})

route('POST', /^\/captures$/, async ({ body }) => {
  const user = requireUser()
  const db = getDb()
  const content = String(body?.content ?? '').trim()
  if (!content) {
    throw new ApiError('Add something to capture.', { status: 422, code: 'validation_error' })
  }

  const timestamp = nowIso()
  const threadId = body?.threadId ?? null
  const capture = {
    id: uid('cap'),
    userId: user.id,
    threadId,
    personId: body?.personId ?? null,
    type: body?.type ?? 'note',
    content: content.slice(0, 2000),
    source: body?.source ?? 'manual',
    status: threadId ? 'filed' : 'inbox',
    capturedAt: body?.capturedAt ?? timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
    isEdited: false,
    syncStatus: 'synced',
  }
  db.captures.push(capture)

  if (threadId) {
    touchThread(threadId, timestamp)
    addTimelineEvent(threadId, 'capture_added', capture.id, { captureType: capture.type }, timestamp)
  }

  saveDb()
  return { capture }
})

route('PATCH', /^\/captures\/([^/]+)$/, async ({ params, body }) => {
  requireUser()
  const db = getDb()
  const capture = db.captures.find((row) => row.id === params[0])
  if (!capture) throw new ApiError('Capture not found.', { status: 404, code: 'not_found' })

  if (body?.content !== undefined) capture.content = String(body.content).slice(0, 2000)
  if (body?.type !== undefined) capture.type = body.type
  capture.isEdited = true
  capture.editedAt = nowIso()
  capture.updatedAt = capture.editedAt

  saveDb()
  return { capture }
})

route('DELETE', /^\/captures\/([^/]+)$/, async ({ params }) => {
  requireUser()
  const db = getDb()
  db.captures = db.captures.filter((row) => row.id !== params[0])
  db.timeline = db.timeline.filter((row) => row.referenceId !== params[0])
  saveDb()
  return null
})

route('POST', /^\/captures\/([^/]+)\/assign$/, async ({ params, body }) => {
  requireUser()
  const db = getDb()
  const capture = db.captures.find((row) => row.id === params[0])
  if (!capture) throw new ApiError('Capture not found.', { status: 404, code: 'not_found' })

  const threadId = String(body?.threadId ?? '')
  const thread = db.threads.find((row) => row.id === threadId)
  if (!thread) throw new ApiError('Thread not found.', { status: 404, code: 'not_found' })

  const timestamp = nowIso()
  capture.threadId = threadId
  capture.status = 'filed'
  capture.updatedAt = timestamp
  touchThread(threadId, timestamp)
  addTimelineEvent(threadId, 'capture_added', capture.id, { captureType: capture.type }, timestamp)

  saveDb()
  return { capture }
})

/* commitments ------------------------------------------------------------ */

route('GET', /^\/commitments$/, async ({ query }) => {
  requireUser()
  const db = getDb()
  let list = [...db.commitments]
  if (query?.threadId) list = list.filter((row) => row.threadId === query.threadId)
  if (query?.status) list = list.filter((row) => row.status === query.status)
  if (query?.owner === 'mine') list = list.filter((row) => row.ownerType === 'me')
  if (query?.owner === 'theirs') list = list.filter((row) => row.ownerType === 'person')
  list.sort((a, b) => new Date(a.dueDate ?? a.createdAt) - new Date(b.dueDate ?? b.createdAt))

  const decorated = list.map((row) => decorateCommitment(db, row))
  return { commitments: decorated, total: decorated.length }
})

route('POST', /^\/commitments$/, async ({ body }) => {
  const user = requireUser()
  const db = getDb()
  const description = String(body?.description ?? '').trim()
  const threadId = String(body?.threadId ?? '')
  if (!description) {
    throw new ApiError('A commitment needs a description.', {
      status: 422,
      code: 'validation_error',
    })
  }
  const thread = db.threads.find((row) => row.id === threadId)
  if (!thread) {
    throw new ApiError('Commitments must belong to a thread.', {
      status: 422,
      code: 'validation_error',
    })
  }

  const timestamp = nowIso()
  const commitment = {
    id: uid('com'),
    userId: user.id,
    threadId,
    captureId: body?.captureId ?? null,
    description: description.slice(0, 500),
    ownerType: body?.ownerType ?? 'me',
    ownerPersonId: body?.ownerType === 'person' ? (body?.ownerPersonId ?? null) : null,
    status: 'open',
    dueDate: body?.dueDate ?? null,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  db.commitments.push(commitment)
  touchThread(threadId, timestamp)
  addTimelineEvent(
    threadId,
    'commitment_created',
    commitment.id,
    { description: commitment.description },
    timestamp,
  )

  saveDb()
  return { commitment: decorateCommitment(db, commitment) }
})

route('PATCH', /^\/commitments\/([^/]+)$/, async ({ params, body }) => {
  requireUser()
  const db = getDb()
  const commitment = db.commitments.find((row) => row.id === params[0])
  if (!commitment) throw new ApiError('Commitment not found.', { status: 404, code: 'not_found' })
  Object.assign(commitment, body ?? {}, { updatedAt: nowIso() })
  saveDb()
  return { commitment: decorateCommitment(db, commitment) }
})

route('POST', /^\/commitments\/([^/]+)\/complete$/, async ({ params, body }) => {
  requireUser()
  const db = getDb()
  const commitment = db.commitments.find((row) => row.id === params[0])
  if (!commitment) throw new ApiError('Commitment not found.', { status: 404, code: 'not_found' })

  const timestamp = nowIso()
  commitment.status = 'completed'
  commitment.completedAt = timestamp
  commitment.completionNote = body?.completionNote ?? null
  commitment.updatedAt = timestamp
  touchThread(commitment.threadId, timestamp)
  addTimelineEvent(
    commitment.threadId,
    'commitment_completed',
    commitment.id,
    { description: commitment.description },
    timestamp,
  )

  saveDb()
  return { commitment: decorateCommitment(db, commitment) }
})

route('POST', /^\/commitments\/([^/]+)\/reopen$/, async ({ params }) => {
  requireUser()
  const db = getDb()
  const commitment = db.commitments.find((row) => row.id === params[0])
  if (!commitment) throw new ApiError('Commitment not found.', { status: 404, code: 'not_found' })
  commitment.status = 'open'
  delete commitment.completedAt
  commitment.updatedAt = nowIso()
  saveDb()
  return { commitment: decorateCommitment(db, commitment) }
})

/* attention -------------------------------------------------------------- */

route('GET', /^\/attention\/today$/, async () => {
  requireUser()
  const db = getDb()
  const active = db.threads.filter((thread) => thread.status === 'active')
  const decorated = active.map((thread) => decorateThread(db, thread))

  const topThreads = [...decorated]
    .filter((thread) => !thread.snoozedUntil || new Date(thread.snoozedUntil) <= new Date())
    .sort((a, b) => b.attentionScore - a.attentionScore)
    .slice(0, 5)

  const today = new Date().toDateString()
  const dueToday = db.commitments
    .filter((row) => row.status === 'open' && row.dueDate)
    .filter((row) => new Date(row.dueDate).toDateString() === today)
    .map((row) => decorateCommitment(db, row))

  const overdue = db.commitments
    .filter((row) => row.status === 'open' && row.dueDate && new Date(row.dueDate) < new Date())
    .map((row) => decorateCommitment(db, row))

  return {
    generatedAt: nowIso(),
    topThreads,
    dueToday,
    overdue,
    goingCold: decorated.filter((thread) => thread.isGoingCold),
    upcoming: [],
    inboxCount: db.captures.filter((row) => row.status === 'inbox').length,
  }
})

route('POST', /^\/attention\/recompute\/([^/]+)$/, async ({ params }) => {
  requireUser()
  const db = getDb()
  const thread = db.threads.find((row) => row.id === params[0])
  if (!thread) throw new ApiError('Thread not found.', { status: 404, code: 'not_found' })
  return { thread: decorateThread(db, thread) }
})

/* AI (deterministic stand-in for the server's GPT-4o calls) ------------- */

function buildSummaryContent(db, thread) {
  const captures = db.captures
    .filter((row) => row.threadId === thread.id)
    .sort((a, b) => new Date(b.capturedAt) - new Date(a.capturedAt))
  const open = openCommitmentsFor(db, thread.id)
  const people = peopleForThread(db, thread.id)

  const topics = captures
    .filter((row) => row.type === 'decision' || row.type === 'note')
    .slice(0, 3)
    .map((row) => row.content.slice(0, 48))

  return {
    lastContactDate: thread.lastInteractionAt,
    lastContactSummary: captures[0]
      ? `${people[0]?.fullName ?? 'Contact'}: ${captures[0].content}`
      : 'No captures recorded yet for this thread.',
    keyTopics: topics.length ? topics : ['No topics captured yet'],
    openCommitments: open.map((row) => row.description),
    nextSteps: open.slice(0, 2).map((row) => `Close out: ${row.description}`),
    talkingPoints: [
      ...open.slice(0, 2).map((row) => `Confirm the status of "${row.description}"`),
      ...captures.filter((row) => row.type === 'question').slice(0, 1).map((row) => row.content),
    ],
  }
}

function persistSummary(db, thread, type) {
  const summary = {
    id: uid('sum'),
    threadId: thread.id,
    userId: db.user.id,
    type,
    content: buildSummaryContent(db, thread),
    sourceCaptures: db.captures
      .filter((row) => row.threadId === thread.id)
      .slice(0, 10)
      .map((row) => row.id),
    generatedAt: nowIso(),
    isStale: false,
  }
  db.summaries = db.summaries.filter((row) => !(row.threadId === thread.id && row.type === type))
  db.summaries.push(summary)
  return summary
}

route('POST', /^\/ai\/summarise\/([^/]+)$/, async ({ params }) => {
  requireUser()
  const db = getDb()
  const thread = db.threads.find((row) => row.id === params[0])
  if (!thread) throw new ApiError('Thread not found.', { status: 404, code: 'not_found' })
  const summary = persistSummary(db, thread, 'where_we_left_off')
  saveDb()
  return { summary }
})

route('POST', /^\/ai\/brief\/([^/]+)$/, async ({ params }) => {
  requireUser()
  const db = getDb()
  const thread = db.threads.find((row) => row.id === params[0])
  if (!thread) throw new ApiError('Thread not found.', { status: 404, code: 'not_found' })
  const summary = persistSummary(db, thread, 'pre_meeting_brief')
  saveDb()
  return { summary }
})

/* search ---------------------------------------------------------------- */

route('GET', /^\/search$/, async ({ query }) => {
  requireUser()
  const db = getDb()
  const term = String(query?.q ?? '').trim()
  if (term.length < 2) {
    return { query: term, threads: [], people: [], captures: [], commitments: [], total: 0 }
  }

  const needle = term.toLowerCase().replace(/^"|"$/g, '')
  const type = query?.type ? String(query.type) : null
  const includes = (value) => String(value ?? '').toLowerCase().includes(needle)

  const threads = db.threads
    .filter((row) => includes(row.title) || includes(row.description))
    .map((row) => decorateThread(db, row))
  const people = db.people.filter(
    (row) =>
      includes(row.fullName) ||
      includes(row.organisation) ||
      includes(row.role) ||
      includes(row.email),
  )
  const captures = db.captures.filter((row) => includes(row.content))
  const commitments = db.commitments
    .filter((row) => includes(row.description))
    .map((row) => decorateCommitment(db, row))

  const result = {
    query: term,
    threads: type && type !== 'threads' ? [] : threads,
    people: type && type !== 'people' ? [] : people,
    captures: type && type !== 'captures' ? [] : captures,
    commitments: type && type !== 'commitments' ? [] : commitments,
  }

  return {
    ...result,
    total:
      result.threads.length +
      result.people.length +
      result.captures.length +
      result.commitments.length,
  }
})

/* notifications --------------------------------------------------------- */

route('GET', /^\/notifications\/preferences$/, async () => {
  const user = requireUser()
  return { preferences: user.notificationPreferences, digestTime: user.digestTime }
})

route('PATCH', /^\/notifications\/preferences$/, async ({ body }) => {
  const user = requireUser()
  if (body?.notificationPreferences) {
    user.notificationPreferences = {
      ...user.notificationPreferences,
      ...body.notificationPreferences,
    }
  }
  if (body?.digestTime) user.digestTime = body.digestTime
  if (body?.emailDigestEnabled !== undefined) user.emailDigestEnabled = body.emailDigestEnabled
  saveDb()
  return { preferences: user.notificationPreferences, digestTime: user.digestTime }
})

/* ----------------------------------------------------------------- router */

/** Resolve a request against the demo router. */
export async function handleMockRequest({ method = 'GET', path, body, query, token }) {
  await sleep(LATENCY_MS)

  const isLogin = method === 'POST' && path === '/auth/login'

  if (isLogin) {
    activate(null)
  } else {
    // Every non-login endpoint requires a session token that maps to a user.
    // The workspace is bound to that user, so no cross-user reads are possible.
    const userId = resolveSession(token)
    if (!userId) {
      throw new ApiError('Please sign in to continue.', { status: 401, code: 'unauthorized' })
    }
    activate(userId)
    loadDb()
  }

  const match = routes.find((entry) => entry.method === method && entry.pattern.test(path))
  if (!match) {
    throw new ApiError(`The API does not define ${method} ${path}.`, {
      status: 404,
      code: 'not_found',
    })
  }

  const params = path.match(match.pattern)?.slice(1) ?? []
  return match.handler({ params, query: query ?? {}, body: body ?? {}, token })
}
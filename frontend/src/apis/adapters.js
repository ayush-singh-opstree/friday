/**
 * DTO adapters: FastAPI (snake_case) <-> the camelCase view models the UI uses.
 *
 * The backend in `backend/` is Python/FastAPI, so every payload is snake_case
 * and list endpoints wrap results in `{ data, total, limit, offset }`. Rather
 * than leak that into stores and components, everything is translated here.
 *
 * Keeping the mapping in one place means the UI is backend-agnostic and each
 * shape difference is explicit and testable (see scripts/verify-api-adapters.mjs).
 */
import { commitmentUrgency } from '@/lib/date'
import { isGoingCold, isSnoozed } from '@/lib/attention'

/* ------------------------------------------------------------- primitives --- */

/** ThreadResponse -> Thread */
export function toThread(dto) {
  if (!dto) return null
  return {
    id: dto.id,
    userId: dto.user_id ?? null,
    // The backend renamed the thread `title` field to `agenda`; read either key
    // so both the demo mocks and the live backend hydrate the view model.
    title: dto.agenda ?? dto.title,
    description: dto.description ?? null,
    status: dto.status ?? 'active',
    isPinned: Boolean(dto.is_pinned),
    goingColdThresholdDays: dto.going_cold_threshold_days ?? 14,
    attentionScore: Math.round(dto.attention_score ?? 0),
    attentionReason: null,
    openCommitmentCount: 0,
    isGoingCold: false,
    people: [],
    snoozedUntil: null,
    lastInteractionAt: dto.last_interaction_at,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    archivedAt: dto.archived_at ?? null,
  }
}

/** AttentionThreadItem -> Thread (flattened, exactly what the Today view reads) */
export function toAttentionThread(item) {
  if (!item) return null
  const thread = toThread(item.thread)
  if (!thread) return null
  return {
    ...thread,
    attentionScore: Math.round(item.attention_score ?? 0),
    attentionReason: item.attention_reason ?? null,
    isGoingCold: Boolean(item.is_going_cold),
    openCommitmentCount: item.open_commitments_count ?? 0,
    overdueCommitmentCount: item.overdue_commitments_count ?? 0,
    daysSinceInteraction: item.days_since_interaction ?? null,
  }
}

/**
 * TodayViewResponse -> TodayPayload (docs/08_system_architecture.md).
 *
 * The backend returns `{ top_threads, due_today, going_cold, generated_at }`.
 * `overdue`, `upcoming` and `inboxCount` are not part of that response, so the
 * caller supplies them from the commitments/captures endpoints (the server
 * wires them at the same time the UI reads them).
 */
export function toTodayPayload(dto, { overdue = [], inboxCount = 0, upcoming = [] } = {}) {
  const today = dto ?? {}
  return {
    generatedAt: today.generated_at ?? new Date().toISOString(),
    topThreads: (today.top_threads ?? []).map(toAttentionThread).filter(Boolean),
    dueToday: (today.due_today ?? [])
      .map((item) => toCommitment(item?.commitment, item?.thread_title ?? null))
      .filter(Boolean),
    goingCold: (today.going_cold ?? []).map(toAttentionThread).filter(Boolean),
    overdue: overdue.map((item) => (item && item.id ? item : toCommitment(item))).filter(Boolean),
    upcoming,
    inboxCount,
  }
}

/**
 * Derive the directory counts the backend's PersonResponse does not carry:
 * threads per person, open commitments they own, and their last contact.
 *
 * Pure so it can be unit-verified (scripts/verify-api-adapters.mjs).
 *
 * @param {Array<{id: string, last_interaction_at?: string}>} threads
 * @param {Array<Array<{person_id: string}>>} linkSets thread-people links, aligned with `threads`
 * @param {Array<{status?: string, owner_person_id?: string|null}>} commitments
 * @returns {Map<string, {threadCount: number, openCommitmentCount: number, lastInteractionAt: string|null}>}
 */
export function derivePeopleStats(threads = [], linkSets = [], commitments = []) {
  const stats = new Map()

  const entryFor = (personId) => {
    if (!stats.has(personId)) {
      stats.set(personId, { threadCount: 0, openCommitmentCount: 0, lastInteractionAt: null })
    }
    return stats.get(personId)
  }

  linkSets.forEach((links, index) => {
    const at = threads[index]?.last_interaction_at ?? null
    for (const link of Array.isArray(links) ? links : []) {
      if (!link?.person_id) continue
      const entry = entryFor(link.person_id)
      entry.threadCount += 1
      if (at && (!entry.lastInteractionAt || at > entry.lastInteractionAt)) {
        entry.lastInteractionAt = at
      }
    }
  })

  for (const row of commitments) {
    if (row?.status !== 'open' || !row.owner_person_id) continue
    entryFor(row.owner_person_id).openCommitmentCount += 1
  }

  return stats
}

/** PersonResponse -> Person */
export function toPerson(dto) {
  if (!dto) return null
  return {
    id: dto.id,
    userId: dto.user_id ?? null,
    fullName: dto.full_name,
    organisation: dto.organisation ?? null,
    role: dto.role ?? null,
    email: dto.email ?? null,
    phone: dto.phone ?? null,
    linkedInUrl: dto.linked_in_url ?? null,
    notes: dto.notes ?? null,
    threadCount: 0,
    openCommitmentCount: 0,
    threads: [],
    /** Filled in by the People API once thread links are known. */
    lastInteractionAt: null,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  }
}

/**
 * ThreadPersonResponse[] -> the compact people list a thread carries.
 *
 * `{ id, fullName, organisation }` is exactly what the thread cards, the People
 * tab and the `personId` list filter read, and matches what the demo router
 * returns, so both data sources stay interchangeable.
 */
export function toThreadPeople(links) {
  return (Array.isArray(links) ? links : [])
    .map((link) => (link?.person ? toPerson(link.person) : null))
    .filter(Boolean)
    .map((person) => ({
      id: person.id,
      fullName: person.fullName,
      organisation: person.organisation ?? null,
    }))
}

/** ClubResponse -> Club (a meeting / capture session under a thread). */
export function toClub(dto) {
  if (!dto) return null
  return {
    id: dto.id,
    userId: dto.user_id ?? null,
    threadId: dto.thread_id,
    name: dto.name ?? null,
    startedAt: dto.started_at,
    endedAt: dto.ended_at ?? null,
    source: dto.source ?? 'manual',
    /** A club with no `ended_at` is still capturing. */
    isActive: !dto.ended_at,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  }
}

/** ClubDetailResponse -> Club plus its grouped subthreads (captures). */
export function toClubDetail(dto) {
  const club = toClub(dto)
  if (!club) return null
  return { ...club, subthreads: (dto.subthreads ?? []).map(toCapture) }
}

/** ClubResponse[] -> Club[] (accepts a bare array or a `{ data }` envelope). */
export function toClubList(payload) {
  return toList(payload).rows.map(toClub).filter(Boolean)
}

/** CaptureResponse -> Capture */
export function toCapture(dto) {
  if (!dto) return null
  return {
    id: dto.id,
    userId: dto.user_id ?? null,
    threadId: dto.thread_id ?? null,
    clubId: dto.club_id ?? null,
    personId: dto.person_id ?? null,
    type: dto.type ?? 'note',
    content: dto.content,
    deadline: dto.deadline ?? null,
    dueDate: dto.deadline ?? null,
    source: dto.source ?? 'manual',
    status: dto.status ?? 'filed',
    capturedAt: dto.captured_at,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    isEdited: Boolean(dto.is_edited),
    editedAt: dto.edited_at ?? null,
    syncStatus: 'synced',
  }
}

/**
 * CommitmentResponse -> Commitment.
 * The backend does not compute urgency, so it is derived with the same rules the
 * design system documents (amber <= 48h, red = overdue).
 */
export function toCommitment(dto, threadTitle = null) {
  if (!dto) return null
  // The backend commitment is now always tied to a person: it exposes `person_id`
  // (not `owner_person_id`), `deadline` (not `due_date`), plus optional
  // `club_id` / `subthread_id`.
  const deadline = dto.deadline ?? dto.due_date ?? null
  const personId = dto.person_id ?? dto.owner_person_id ?? null
  const status = dto.status ?? 'open'
  return {
    id: dto.id,
    userId: dto.user_id ?? null,
    threadId: dto.thread_id,
    clubId: dto.club_id ?? null,
    captureId: dto.subthread_id ?? dto.capture_id ?? null,
    description: dto.description,
    ownerType: dto.owner_type ?? (personId ? 'person' : 'me'),
    ownerPersonId: personId,
    ownerPerson: null,
    status,
    dueDate: deadline,
    deadline,
    completedAt: dto.completed_at ?? null,
    completionNote: dto.completion_note ?? null,
    urgency: commitmentUrgency(deadline, status),
    threadTitle,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  }
}

/** TimelineEventResponse -> TimelineEvent */
export function toTimelineEvent(dto) {
  if (!dto) return null
  return {
    id: dto.id,
    threadId: dto.thread_id,
    userId: dto.user_id ?? null,
    type: dto.type,
    referenceId: dto.reference_id ?? null,
    metadata: dto.event_metadata ?? {},
    occurredAt: dto.occurred_at,
  }
}

/** SummaryResponse -> Summary */
export function toSummary(dto) {
  if (!dto) return null
  return {
    id: dto.id,
    threadId: dto.thread_id,
    userId: dto.user_id ?? null,
    type: dto.type,
    content: toSummaryContent(dto.content),
    sourceCaptures: dto.source_captures ?? [],
    generatedAt: dto.generated_at,
    isStale: Boolean(dto.is_stale),
  }
}

/**
 * Normalise `Summary.content` onto the camelCase keys the UI reads.
 *
 * The backend stores this blob in snake_case (`last_contact_summary`,
 * `key_topics`, `open_commitments`, `next_steps`, `talking_points`) while the
 * Brief tab reads camelCase. Without this translation every field lookup is
 * `undefined`, so the card renders its header/footer but no content. Already
 * camelCase payloads (the demo mock) pass straight through, and any extra keys
 * are preserved so the model can add fields without breaking the client.
 */
export function toSummaryContent(content) {
  const source = content ?? {}
  const first = (...keys) => {
    for (const key of keys) {
      if (source[key] !== undefined && source[key] !== null) return source[key]
    }
    return undefined
  }
  const asList = (value) => {
    if (Array.isArray(value)) return value
    if (value === undefined || value === null || value === '') return []
    return [value]
  }

  return {
    ...source,
    lastContactDate: first('lastContactDate', 'last_contact_date') ?? null,
    lastContactSummary: first('lastContactSummary', 'last_contact_summary') ?? '',
    keyTopics: asList(first('keyTopics', 'key_topics')),
    openCommitments: asList(first('openCommitments', 'open_commitments')),
    nextSteps: asList(first('nextSteps', 'next_steps')),
    talkingPoints: asList(first('talkingPoints', 'talking_points')),
  }
}

/** UserResponse -> User */
export function toUser(dto) {
  if (!dto) return null
  return {
    id: dto.id,
    email: dto.email,
    fullName: dto.full_name,
    avatarUrl: dto.avatar_url ?? null,
    plan: 'pro',
    role: 'owner',
    goingColdThresholdDays: dto.going_cold_threshold_days ?? 14,
    digestTime: dto.digest_time ?? '08:00',
    digestEnabled: Boolean(dto.digest_enabled),
    emailDigestEnabled: Boolean(dto.email_digest_enabled),
    notificationPreferences: dto.notification_preferences ?? {},
    createdAt: dto.created_at,
    lastActiveAt: dto.last_active_at,
  }
}

/** Unwrap `{ data, total, limit, offset }`. */
export function toList(payload) {
  if (!payload) return { rows: [], total: 0 }
  if (Array.isArray(payload)) return { rows: payload, total: payload.length }
  return { rows: payload.data ?? [], total: payload.total ?? (payload.data?.length ?? 0) }
}

/* ---------------------------------------------------- request payloads --- */

/** UI thread draft -> ThreadCreate */
export function toThreadCreatePayload({ title, description, isPinned, goingColdThresholdDays }) {
  // The backend's ThreadCreate field is `agenda` (it replaced `title`).
  const payload = { agenda: title }
  if (description) payload.description = description
  if (isPinned !== undefined) payload.is_pinned = isPinned
  if (goingColdThresholdDays) payload.going_cold_threshold_days = goingColdThresholdDays
  return payload
}

/** UI patch -> ThreadUpdate (only keys actually provided) */
export function toThreadUpdatePayload(patch = {}) {
  const map = {
    title: 'agenda',
    description: 'description',
    isPinned: 'is_pinned',
    goingColdThresholdDays: 'going_cold_threshold_days',
    status: 'status',
  }
  const payload = {}
  for (const [from, to] of Object.entries(map)) {
    if (patch[from] !== undefined) payload[to] = patch[from]
  }
  return payload
}

/** UI person draft -> PersonCreate / PersonUpdate */
export function toPersonPayload(person = {}) {
  const map = {
    fullName: 'full_name',
    organisation: 'organisation',
    role: 'role',
    email: 'email',
    phone: 'phone',
    linkedInUrl: 'linked_in_url',
    notes: 'notes',
  }
  const payload = {}
  for (const [from, to] of Object.entries(map)) {
    if (person[from] !== undefined) payload[to] = person[from]
  }
  return payload
}

/** UI capture draft -> CaptureCreate */
export function toCapturePayload(capture = {}) {
  const payload = { content: capture.content }
  if (capture.type) payload.type = capture.type
  if (capture.threadId !== undefined) payload.thread_id = capture.threadId
  if (capture.personId) payload.person_id = capture.personId
  if (capture.source) payload.source = capture.source
  if (capture.clubId) payload.club_id = capture.clubId
  if (capture.capturedAt) payload.captured_at = capture.capturedAt
  if (capture.deadline || capture.dueDate) payload.deadline = capture.deadline || capture.dueDate
  return payload
}

/** UI commitment draft -> CommitmentCreate */
export function toCommitmentPayload(commitment = {}) {
  const payload = {
    thread_id: commitment.threadId,
    description: commitment.description,
  }
  if (commitment.personId || commitment.ownerPersonId) {
    payload.person_id = commitment.personId || commitment.ownerPersonId
  }
  if (commitment.clubId) payload.club_id = commitment.clubId
  if (commitment.subthreadId || commitment.captureId) {
    payload.subthread_id = commitment.subthreadId || commitment.captureId
  }
  if (commitment.deadline || commitment.dueDate) {
    payload.deadline = commitment.deadline || commitment.dueDate
    payload.due_date = commitment.deadline || commitment.dueDate
  }
  if (commitment.ownerType) payload.owner_type = commitment.ownerType
  if (commitment.ownerPersonId !== undefined) payload.owner_person_id = commitment.ownerPersonId
  if (commitment.dueDate !== undefined) payload.due_date = commitment.dueDate
  if (commitment.captureId) payload.capture_id = commitment.captureId
  return payload
}

/** UI commitment patch -> CommitmentUpdate */
export function toCommitmentUpdatePayload(patch = {}) {
  const map = {
    description: 'description',
    personId: 'person_id',
    ownerPersonId: 'person_id',
    ownerType: 'owner_type',
    deadline: 'deadline',
    dueDate: 'deadline',
    status: 'status',
  }
  const payload = {}
  for (const [from, to] of Object.entries(map)) {
    if (patch[from] !== undefined) payload[to] = patch[from]
  }
  return payload
}

/* ------------------------------------------------------- query mapping --- */

/** UI owner filter -> backend `owner_type` value. */
export const COMMITMENT_OWNER_PARAMS = Object.freeze({
  mine: 'me',
  theirs: 'person',
})

/**
 * UI commitment filters -> Commitment list query params.
 * The backend understands thread_id / club_id / status / overdue_only; the
 * owner filter is applied client-side (commitments now always carry a person).
 */
export function commitmentListParams({ threadId, clubId, status, overdueOnly } = {}) {
  const params = { limit: 200 }
  if (threadId) params.thread_id = threadId
  if (clubId) params.club_id = clubId
  if (status) params.status = status
  if (overdueOnly) params.overdue_only = true
  return params
}

/** The backend people endpoint uses `search` (not `query`) and cursor params. */
export function peopleListParams({ query } = {}) {
  const params = { limit: 200, sort_by: 'full_name', sort_dir: 'asc' }
  if (query) params.search = query
  return params
}

/** UI sort key -> backend `sort_by` value. */
export const THREAD_SORT_PARAMS = Object.freeze({
  lastInteraction: 'last_interaction_at',
  attentionScore: 'attention_score',
  createdAt: 'created_at',
  title: 'title',
})

/**
 * The backend only understands `status` and `is_pinned`; the other UI filters are
 * applied client-side from the rows we already fetched.
 */
export function threadListParams({ filter = 'active', sort = 'lastInteraction' } = {}) {
  const params = {
    sort_by: THREAD_SORT_PARAMS[sort] ?? 'attention_score',
    sort_dir: sort === 'title' ? 'asc' : 'desc',
    limit: 200,
  }

  if (filter === 'archived') params.status = 'archived'
  else if (filter !== 'all') params.status = 'active'

  if (filter === 'pinned') params.is_pinned = true

  return params
}

/** Apply the UI-only filters that have no backend equivalent. */
export function applyThreadFilter(threads, filter) {
  if (filter === 'goingCold') return threads.filter((thread) => isGoingCold(thread))
  // Snooze state is not exposed on ThreadResponse yet (Phase 1 backend work).
  if (filter === 'snoozed') {
    return threads.filter((thread) => isSnoozed(thread))
  }
  return threads
}

/** Apply the UI-only free-text / person filters the list endpoint cannot express. */
export function applyThreadQuery(threads, { query, personId } = {}) {
  let list = threads
  const term = String(query ?? '').trim().toLowerCase()
  if (term) {
    list = list.filter((thread) =>
      [thread.title, thread.description].some((value) =>
        String(value ?? '').toLowerCase().includes(term),
      ),
    )
  }
  if (personId) {
    list = list.filter((thread) =>
      (thread.people ?? []).some((person) => person.id === personId),
    )
  }
  return list
}

/**
 * Smart Snooze (Feature 11): the UI speaks in whole days, the backend expects an
 * absolute `snooze_until` datetime.
 * @param {number} days
 * @returns {string} ISO timestamp
 */
export function snoozeUntilIso(days) {
  const n = Math.min(30, Math.max(1, Number(days) || 1))
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString()
}

/* -------------------------------------------------------------- search --- */

/**
 * SearchResponse is a FLAT list of { entity_type, entity_id, title, snippet }.
 * The UI groups results by entity, so reshape here.
 */
export function groupSearchResults(response) {
  const results = response?.results ?? []
  const grouped = {
    query: response?.query ?? '',
    total: response?.total ?? results.length,
    threads: [],
    people: [],
    captures: [],
    commitments: [],
  }

  for (const item of results) {
    switch (item.entity_type) {
      case 'thread':
        grouped.threads.push({ id: item.entity_id, title: item.title, attentionReason: item.snippet })
        break
      case 'person':
        grouped.people.push({ id: item.entity_id, fullName: item.title, role: item.snippet })
        break
      case 'capture':
        grouped.captures.push({
          id: item.entity_id,
          content: item.title,
          type: 'note',
          threadId: null,
          threadTitle: item.snippet,
        })
        break
      case 'commitment':
        grouped.commitments.push({
          id: item.entity_id,
          description: item.title,
          threadId: null,
          threadTitle: item.snippet,
          status: 'open',
          dueDate: null,
        })
        break
      default:
        break
    }
  }

  return grouped
}

/* ------------------------------------------------------- notifications --- */

/**
 * NotificationResponse -> Notification (camelCase view model).
 *
 * Every notification carries a `deepLinkUrl` into the app (Feature 14 edge case:
 * "Each notification includes a deep link to the relevant thread or commitment").
 */
export function toNotification(dto) {
  if (!dto) return null
  return {
    id: dto.id,
    type: dto.type,
    title: dto.title,
    body: dto.body,
    referenceType: dto.reference_type ?? null,
    referenceId: dto.reference_id ?? null,
    deepLinkUrl: dto.deep_link_url ?? '',
    scheduledAt: dto.scheduled_at ?? null,
    sentAt: dto.sent_at ?? null,
    isRead: Boolean(dto.is_read),
  }
}

/**
 * GET /notifications wraps its payload as
 * `{ data, total, unread_count, limit, offset }`.
 * @returns {{ items: any[], unreadCount: number, total: number }}
 */
export function toNotificationList(response) {
  const rows = Array.isArray(response) ? response : (response?.data ?? [])
  return {
    items: rows.map(toNotification).filter(Boolean),
    unreadCount: response?.unread_count ?? 0,
    total: response?.total ?? rows.length,
  }
}

/** camelCase preference key -> the snake_case key the backend persists. */
const NOTIFICATION_PREF_KEYS = {
  dailyDigest: 'daily_digest',
  commitmentDue: 'commitment_due',
  goingCold: 'going_cold',
  preMeetingBrief: 'pre_meeting_brief',
  reengagementDigest: 'reengagement_digest',
}

/**
 * `/notifications/preferences` -> the flat preference view model.
 * Tolerates both the backend's snake_case keys and an already-camelCase payload
 * (the demo mock returns camelCase), so this adapter is safe for either source.
 */
export function toNotificationPreferences(dto) {
  const source = dto?.preferences ?? dto ?? {}
  return {
    dailyDigest: source.daily_digest ?? source.dailyDigest ?? true,
    commitmentDue: source.commitment_due ?? source.commitmentDue ?? true,
    goingCold: source.going_cold ?? source.goingCold ?? true,
    preMeetingBrief: source.pre_meeting_brief ?? source.preMeetingBrief ?? true,
    reengagementDigest: source.reengagement_digest ?? source.reengagementDigest ?? true,
    digestTime: source.digest_time ?? source.digestTime ?? '08:00',
    digestEnabled: source.digest_enabled ?? source.digestEnabled ?? true,
    emailDigestEnabled: source.email_digest_enabled ?? source.emailDigestEnabled ?? false,
  }
}

/** camelCase preference patch -> the snake_case body PATCH /preferences expects. */
export function toNotificationPreferencesPatch(patch = {}) {
  const body = {}
  for (const [camel, snake] of Object.entries(NOTIFICATION_PREF_KEYS)) {
    if (patch[camel] !== undefined) body[snake] = Boolean(patch[camel])
  }
  if (patch.digestTime !== undefined) body.digest_time = patch.digestTime
  if (patch.digestEnabled !== undefined) body.digest_enabled = Boolean(patch.digestEnabled)
  if (patch.emailDigestEnabled !== undefined) {
    body.email_digest_enabled = Boolean(patch.emailDigestEnabled)
  }
  return body
}
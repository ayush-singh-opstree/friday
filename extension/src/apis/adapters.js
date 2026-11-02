/**
 * DTO adapters: FastAPI (snake_case) <-> the camelCase view models the UI uses.
 *
 * The extension shares ONE contract with the web app: the REST API in
 * docs/08_system_architecture.md. The backend is Python/FastAPI, so every
 * payload is snake_case and list endpoints wrap results in
 * `{ data, total, limit, offset }`. Rather than leak that into stores and
 * components, everything is translated here (mirrors frontend/src/apis/adapters.js).
 */
import { commitmentUrgency } from '@/lib/date'
import { isGoingCold } from '@/lib/attention'

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
 * TodayViewResponse -> TodayPayload. The backend returns top_threads /
 * due_today / going_cold / generated_at; overdue + inboxCount are supplied by
 * the caller from the commitments/captures endpoints.
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
    overdue: overdue.map((item) => toCommitment(item)).filter(Boolean),
    upcoming,
    inboxCount,
  }
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
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  }
}

/**
 * ThreadPersonResponse[] -> the compact people list a thread carries.
 *
 * `{ id, fullName, organisation }` is what the thread cards, the thread detail
 * panel and the `personId` list filter read, and it matches the demo router, so
 * both data sources stay interchangeable.
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

/** CommitmentResponse -> Commitment (urgency is derived client-side). */
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
    content: dto.content ?? {},
    sourceCaptures: dto.source_captures ?? [],
    generatedAt: dto.generated_at,
    isStale: Boolean(dto.is_stale),
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
  const payload = { thread_id: commitment.threadId, description: commitment.description }
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
export const COMMITMENT_OWNER_PARAMS = Object.freeze({ mine: 'me', theirs: 'person' })

/**
 * UI commitment filters -> Commitment list query params.
 * The backend understands thread_id / club_id / status / overdue_only.
 */
export function commitmentListParams({ threadId, clubId, status, overdueOnly } = {}) {
  const params = { limit: 200 }
  if (threadId) params.thread_id = threadId
  if (clubId) params.club_id = clubId
  if (status) params.status = status
  if (overdueOnly) params.overdue_only = true
  return params
}

/** The backend people endpoint uses `search` (not `query`). */
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

/** UI filter/sort -> backend Thread list query params. */
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
  if (filter === 'snoozed') {
    return threads.filter(
      (thread) => thread.snoozedUntil && new Date(thread.snoozedUntil) > new Date(),
    )
  }
  return threads
}

/** Apply the free-text / person filters the list endpoint cannot express. */
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
    list = list.filter((thread) => (thread.people ?? []).some((person) => person.id === personId))
  }
  return list
}

/** The UI speaks in whole days; the backend expects an absolute datetime. */
export function snoozeUntilIso(days) {
  const n = Math.min(30, Math.max(1, Number(days) || 1))
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString()
}

/* -------------------------------------------------------------- search --- */

/** Group the backend's flat SearchResponse into the UI's entity buckets. */
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

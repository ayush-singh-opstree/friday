/**
 * Offline store (IndexedDB via Dexie).
 *
 * docs/08_system_architecture.md -> "The local store is the read source; the
 * server is the sync target." This database holds:
 *   - a mirror of the last known server state (threads, people, captures,
 *     commitments) so reads work instantly and while offline
 *   - an **outbox**: writes made while offline, replayed in FIFO order on
 *     reconnect (Requirement 11)
 *   - a `meta` table for bookkeeping (lastSyncedAt, schema notes)
 */
import Dexie from 'dexie'

export const offlineDb = new Dexie('friday-offline')

offlineDb.version(1).stores({
  threads: 'id, status, lastInteractionAt, attentionScore, isPinned',
  people: 'id, fullName, organisation, role',
  captures: 'id, threadId, status, capturedAt, syncStatus',
  commitments: 'id, threadId, status, dueDate, urgency',
  outbox: 'id, createdAt, status, kind',
  meta: 'key',
})

/** Table accessors, kept explicit so call sites stay readable. */
export const tables = {
  threads: offlineDb.threads,
  people: offlineDb.people,
  captures: offlineDb.captures,
  commitments: offlineDb.commitments,
  outbox: offlineDb.outbox,
  meta: offlineDb.meta,
}

/* ------------------------------------------------------------------- meta --- */

export async function setMeta(key, value) {
  await tables.meta.put({ key, value })
}

export async function getMeta(key, fallback = null) {
  const row = await tables.meta.get(key)
  return row ? row.value : fallback
}

/**
 * Replace a mirror table with a fresh snapshot from the API.
 * Bulk-replace in a transaction so readers never see a half-written state.
 */
export async function replaceAll(table, rows = []) {
  await offlineDb.transaction('rw', table, async () => {
    await table.clear()
    if (rows.length > 0) await table.bulkPut(rows)
  })
}

/** Wipe every mirror + the outbox (used by "restore defaults" / sign-out). */
export async function clearOfflineData() {
  await offlineDb.transaction(
    'rw',
    [tables.threads, tables.people, tables.captures, tables.commitments, tables.outbox, tables.meta],
    async () => {
      await Promise.all([
        tables.threads.clear(),
        tables.people.clear(),
        tables.captures.clear(),
        tables.commitments.clear(),
        tables.outbox.clear(),
        tables.meta.clear(),
      ])
    },
  )
}

/** Approximate size/health info for the Settings screen. */
export async function offlineStats() {
  const [threads, people, captures, commitments, pending] = await Promise.all([
    tables.threads.count(),
    tables.people.count(),
    tables.captures.count(),
    tables.commitments.count(),
    tables.outbox.where('status').equals('pending').count(),
  ])
  return { threads, people, captures, commitments, pending }
}
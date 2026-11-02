/**
 * Sync engine.
 *
 * Two responsibilities, both from docs/06_data_model.md -> Sync Protocol:
 *
 *  1. **Mirror** server responses into IndexedDB so reads are local-first.
 *  2. **Replay** the outbox in FIFO order on reconnect, with exponential
 *     backoff of 1s → 2s → 4s → 8s (capped at 60s) and a capped attempt count.
 */
import { capturesApi, commitmentsApi, peopleApi, threadsApi } from '@/apis'
import { getMeta, replaceAll, setMeta, tables } from './db'
import {
  countPendingOps,
  listPendingOps,
  markOpFailed,
  OP_KINDS,
  recordFailure,
  removeOp,
} from './outbox'

const BACKOFF_BASE_MS = 1000
const MAX_BACKOFF_MS = 60000
const MAX_ATTEMPTS = 5

/* ---------------------------------------------------------------- mirror --- */

export async function mirrorThreads(threads) {
  if (!Array.isArray(threads)) return
  await replaceAll(tables.threads, threads)
}

export async function mirrorPeople(people) {
  if (!Array.isArray(people)) return
  await replaceAll(tables.people, people)
}

export async function mirrorCaptures(captures) {
  if (!Array.isArray(captures)) return
  await replaceAll(tables.captures, captures)
}

export async function mirrorCommitments(commitments) {
  if (!Array.isArray(commitments)) return
  await replaceAll(tables.commitments, commitments)
}

/* ------------------------------------------------------------ offline read --- */

/** Local fallbacks used when a request fails and the cache is warm. */
export async function readThreads() {
  return tables.threads.toArray()
}

export async function readPeople() {
  return tables.people.orderBy('fullName').toArray()
}

export async function readCaptures(threadId) {
  const all = await tables.captures.toArray()
  const rows = threadId ? all.filter((row) => row.threadId === threadId) : all
  return rows.sort((a, b) => new Date(b.capturedAt) - new Date(a.capturedAt))
}

export async function readCommitments(threadId) {
  const all = await tables.commitments.toArray()
  return threadId ? all.filter((row) => row.threadId === threadId) : all
}

/* ----------------------------------------------------------------- replay --- */

/** How each queued operation is replayed against the API. */
const REPLAY = {
  [OP_KINDS.CAPTURE_CREATE]: (payload) => capturesApi.create(payload),
  [OP_KINDS.THREAD_CREATE]: (payload) => threadsApi.create(payload),
  [OP_KINDS.THREAD_UPDATE]: (payload) => threadsApi.update(payload.id, payload.patch),
  [OP_KINDS.COMMITMENT_CREATE]: (payload) => commitmentsApi.create(payload),
  [OP_KINDS.COMMITMENT_COMPLETE]: (payload) =>
    commitmentsApi.complete(payload.id, payload.completionNote),
  [OP_KINDS.PERSON_CREATE]: (payload) => peopleApi.create(payload),
}

/** Attempt 1 → 1s, 2 → 2s, 3 → 4s, 4 → 8s, capped at 60s. */
export function backoffDelay(attempts) {
  return Math.min(MAX_BACKOFF_MS, BACKOFF_BASE_MS * 2 ** Math.max(0, attempts - 1))
}

/** Permanent failures must not be retried forever. */
function isPermanent(error) {
  return error?.status === 404 || error?.status === 422 || error?.status === 401
}

/**
 * Drain the outbox.
 * @param {{ wait?: (ms:number) => Promise<void> }} [options]
 * @returns {Promise<{ replayed: number, failed: number, remaining: number, lastSyncedAt: string }>}
 */
export async function flushOutbox({ wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  const ops = await listPendingOps()
  let replayed = 0
  let failed = 0

  for (const op of ops) {
    const handler = REPLAY[op.kind]
    if (!handler) {
      await markOpFailed(op.id, new Error(`No replay handler for ${op.kind}`))
      failed += 1
      continue
    }

    try {
      await handler(op.payload)
      await removeOp(op.id)
      replayed += 1
    } catch (error) {
      const attempts = (op.attempts ?? 0) + 1
      if (isPermanent(error) || attempts >= MAX_ATTEMPTS) {
        await markOpFailed(op.id, error)
        failed += 1
      } else {
        await recordFailure(op.id, error)
        failed += 1
        await wait(backoffDelay(attempts))
      }
    }
  }

  const lastSyncedAt = new Date().toISOString()
  await setMeta('lastSyncedAt', lastSyncedAt)
  const remaining = await countPendingOps()

  return { replayed, failed, remaining, lastSyncedAt }
}

export async function getLastSyncedAt() {
  return getMeta('lastSyncedAt', null)
}

export { countPendingOps }
/**
 * Outbox - the queue of writes made while offline (or that failed).
 *
 * Requirements (docs/06_data_model.md -> Sync Protocol):
 *   - operations replay in FIFO order on reconnect
 *   - each op records its attempt count so the engine can back off
 *   - ops survive a page reload because they live in IndexedDB
 */
import { uid } from '@/lib/utils'
import { tables } from './db'

/** Supported operations and their replay handlers live in `syncEngine`. */
export const OP_KINDS = Object.freeze({
  CAPTURE_CREATE: 'capture.create',
  THREAD_CREATE: 'thread.create',
  THREAD_UPDATE: 'thread.update',
  COMMITMENT_CREATE: 'commitment.create',
  COMMITMENT_COMPLETE: 'commitment.complete',
  PERSON_CREATE: 'person.create',
})

/**
 * Queue an operation for replay.
 * @param {string} kind One of `OP_KINDS`
 * @param {object} payload Arguments for the replay handler
 * @param {{ label?: string }} [meta]
 */
export async function enqueueOp(kind, payload, meta = {}) {
  const op = {
    id: uid('op'),
    kind,
    payload,
    label: meta.label ?? kind,
    status: 'pending',
    attempts: 0,
    createdAt: new Date().toISOString(),
    lastError: null,
  }
  await tables.outbox.add(op)
  return op
}

/** Oldest-first pending operations. */
export function listPendingOps() {
  return tables.outbox.where('status').equals('pending').sortBy('createdAt')
}

export function countPendingOps() {
  return tables.outbox.where('status').equals('pending').count()
}

/** Record a failed attempt and the reason. */
export async function recordFailure(opId, error) {
  const op = await tables.outbox.get(opId)
  if (!op) return
  await tables.outbox.put({
    ...op,
    attempts: (op.attempts ?? 0) + 1,
    lastError: String(error?.message ?? error ?? 'Unknown error'),
  })
}

/** Remove a successfully replayed operation. */
export async function removeOp(opId) {
  await tables.outbox.delete(opId)
}

/** Give up permanently on an operation (e.g. deleted parent). */
export async function markOpFailed(opId, error) {
  const op = await tables.outbox.get(opId)
  if (!op) return
  await tables.outbox.put({
    ...op,
    status: 'failed',
    lastError: String(error?.message ?? error ?? 'Unknown error'),
  })
}

/** Failed operations, for a "couldn't sync" surface. */
export function listFailedOps() {
  return tables.outbox.where('status').equals('failed').toArray()
}
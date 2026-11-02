/**
 * Demo database with **per-user isolation**.
 *
 * docs/08_system_architecture.md -> Data Isolation:
 *   "All database queries include userId in WHERE clause; no shared data between
 *    users at the application layer."
 *
 * Instead of bolting a `userId` filter onto every handler, each account gets its
 * own isolated workspace keyed by `userId`. A request can only open the
 * workspace belonging to the session that authenticated it, so cross-user reads
 * are impossible by construction - the same guarantee RLS gives on the server.
 */
import { STORAGE_KEYS } from '@/config/constants'
import { createSeedData, profileForEmail } from './seed'

const EMPTY = {
  user: null,
  people: [],
  threads: [],
  threadPeople: [],
  captures: [],
  commitments: [],
  timeline: [],
  summaries: [],
  snoozes: [],
  notifications: [],
}

/** userId -> hydrated workspace */
const cache = new Map()
let activeUserId = null

const keyFor = (suffix) => `${STORAGE_KEYS.SESSION}.${suffix}`

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Private mode: keep everything in memory for this tab.
  }
}

/* ----------------------------------------------------------- user registry --- */

export function registerUser(userId, profile) {
  const users = readJson(keyFor('demoUsers'), {})
  users[userId] = { ...users[userId], ...profile, userId }
  writeJson(keyFor('demoUsers'), users)
  return users[userId]
}

export function getUser(userId) {
  return readJson(keyFor('demoUsers'), {})[userId] ?? null
}

/* --------------------------------------------------------------- sessions --- */

export function registerSession(token, userId) {
  const sessions = readJson(keyFor('demoSessions'), {})
  sessions[token] = { userId, createdAt: new Date().toISOString() }
  writeJson(keyFor('demoSessions'), sessions)
}

/** @returns {string | null} the userId that owns this token */
export function resolveSession(token) {
  if (!token) return null
  return readJson(keyFor('demoSessions'), {})[token]?.userId ?? null
}

export function endSession(token) {
  const sessions = readJson(keyFor('demoSessions'), {})
  if (!token || !(token in sessions)) return
  delete sessions[token]
  writeJson(keyFor('demoSessions'), sessions)
}

/* ------------------------------------------------------------- workspaces --- */

/** Bind the active workspace. Called once per request by the mock router. */
export function activate(userId) {
  activeUserId = userId
}

function readPersisted(userId) {
  const stored = readJson(keyFor(`demoDb.${userId}`), null)
  return stored && Array.isArray(stored.threads) ? stored : null
}

function persist() {
  if (!activeUserId || !cache.has(activeUserId)) return
  writeJson(keyFor(`demoDb.${activeUserId}`), cache.get(activeUserId))
}

/**
 * Load the active user's workspace, seeding it on first use.
 * Returns an empty graph when no workspace is active (unauthenticated).
 */
export function loadDb(force = false) {
  if (!activeUserId) return { ...EMPTY }

  if (!force && cache.has(activeUserId)) return cache.get(activeUserId)

  const userId = activeUserId
  const stored = force ? null : readPersisted(userId)
  const profile = getUser(userId) ?? profileForEmail('')
  const state = stored ?? createSeedData({ userId, profile })

  cache.set(userId, { ...EMPTY, ...state })
  persist()
  return cache.get(userId)
}

/** Synchronous active workspace; an empty graph when unauthenticated. */
export function getDb() {
  if (!activeUserId) return { ...EMPTY }
  return cache.get(activeUserId) ?? loadDb()
}

export function saveDb() {
  persist()
  return getDb()
}

/** Restore the active user's workspace to the seed template. */
export function resetDb() {
  if (!activeUserId) return { ...EMPTY }
  const profile = getUser(activeUserId) ?? profileForEmail('')
  const state = createSeedData({ userId: activeUserId, profile })
  cache.set(activeUserId, state)
  persist()
  return state
}

/** WIpe a workspace entirely (account deletion). */
export function deleteWorkspace(userId) {
  cache.delete(userId)
  try {
    localStorage.removeItem(keyFor(`demoDb.${userId}`))
  } catch {
    // ignore
  }
}
/**
 * Demo database with **per-user isolation** (chrome.storage backed).
 *
 * docs/08_system_architecture.md -> Data Isolation: no shared data between users
 * at the application layer. Each account therefore gets its own workspace keyed
 * by `userId`; a request can only open the workspace belonging to its session.
 *
 * This is *not* the product backend - it exists so the companion is demoable
 * before the API lands. Point `VITE_API_BASE_URL` at the real backend to bypass
 * it entirely (the router is never called in that mode).
 */
import { STORAGE_KEYS } from '@/config/constants'
import { getValue, setValue } from '@/lib/storage'
import { createSeedData } from './seed'

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

/** userId -> workspace */
const cache = new Map()
let activeUserId = null

const usersKey = () => `${STORAGE_KEYS.MOCK_DB}.users`
const sessionsKey = () => `${STORAGE_KEYS.MOCK_DB}.sessions`
const dbKey = (userId) => `${STORAGE_KEYS.MOCK_DB}.${userId}`

/* ----------------------------------------------------------- user registry --- */

export async function registerUser(userId, profile) {
  const users = (await getValue(usersKey(), {})) ?? {}
  users[userId] = { ...users[userId], ...profile, userId }
  await setValue(usersKey(), users)
  return users[userId]
}

export async function getUser(userId) {
  const users = (await getValue(usersKey(), {})) ?? {}
  return users[userId] ?? null
}

/* --------------------------------------------------------------- sessions --- */

export async function registerSession(token, userId) {
  const sessions = (await getValue(sessionsKey(), {})) ?? {}
  sessions[token] = { userId, createdAt: new Date().toISOString() }
  await setValue(sessionsKey(), sessions)
}

/** @returns {Promise<string | null>} the userId that owns this token */
export async function resolveSession(token) {
  if (!token) return null
  const sessions = (await getValue(sessionsKey(), {})) ?? {}
  return sessions[token]?.userId ?? null
}

export async function endSession(token) {
  if (!token) return
  const sessions = (await getValue(sessionsKey(), {})) ?? {}
  if (!(token in sessions)) return
  delete sessions[token]
  await setValue(sessionsKey(), sessions)
}

/* ------------------------------------------------------------- workspaces --- */

export function activate(userId) {
  activeUserId = userId
}

function isUsable(value) {
  return Boolean(value && typeof value === 'object' && Array.isArray(value.threads))
}

/**
 * Load (and cache) the active user's workspace, seeding it on first run.
 * Returns an empty graph when unauthenticated.
 */
export async function loadDb(force = false) {
  if (!activeUserId) return { ...EMPTY }
  if (!force && cache.has(activeUserId)) return cache.get(activeUserId)

  const userId = activeUserId
  const stored = force ? null : await getValue(dbKey(userId), null)

  let state
  if (isUsable(stored)) {
    state = { ...EMPTY, ...stored }
  } else {
    state = createSeedData()
    const profile = (await getUser(userId)) ?? {}
    state.user = {
      ...state.user,
      id: userId,
      email: profile.email ?? state.user.email,
      fullName: profile.fullName ?? state.user.fullName,
    }
  }

  cache.set(userId, state)
  return state
}

/** Synchronous accessor for the active workspace; call `loadDb()` first. */
export function getDb() {
  if (!activeUserId) return { ...EMPTY }
  return cache.get(activeUserId) ?? { ...EMPTY }
}

/** Persist the active workspace. */
export async function persistDb() {
  if (!activeUserId) return
  await setValue(dbKey(activeUserId), getDb())
}

/** Throw away local changes and restore the demo dataset. */
export async function resetDb() {
  if (!activeUserId) return { ...EMPTY }
  const state = createSeedData()
  const profile = (await getUser(activeUserId)) ?? {}
  state.user = { ...state.user, id: activeUserId, email: profile.email ?? state.user.email }
  cache.set(activeUserId, state)
  await persistDb()
  return state
}
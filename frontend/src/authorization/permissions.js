/**
 * Authorization model.
 *
 * Two orthogonal axes:
 *   - **Plan** gates paid capabilities
 *     (docs/01_product_strategy.md -> Free: 5 threads / 25 people;
 *      Pro: unlimited + AI features + browser extension).
 *   - **Role** gates destructive actions (used by the Phase 3 team tier).
 *
 * The UI never hard-codes plan checks - it always asks `can(user, capability)`.
 */
export const PLANS = Object.freeze({ FREE: 'free', PRO: 'pro', TEAM: 'team' })
export const ROLES = Object.freeze({ OWNER: 'owner', MEMBER: 'member', VIEWER: 'viewer' })

export const CAPABILITIES = Object.freeze({
  CAPTURE: 'capture',
  THREAD_WRITE: 'thread:write',
  COMMITMENT_WRITE: 'commitment:write',
  PEOPLE_WRITE: 'people:write',
  PEOPLE_MERGE: 'people:merge',
  AI_SUMMARY: 'ai:summary',
  AI_BRIEF: 'ai:brief',
  EXPORT_DATA: 'data:export',
})

const BASE = [
  CAPABILITIES.CAPTURE,
  CAPABILITIES.THREAD_WRITE,
  CAPABILITIES.COMMITMENT_WRITE,
  CAPABILITIES.PEOPLE_WRITE,
  CAPABILITIES.PEOPLE_MERGE,
  CAPABILITIES.EXPORT_DATA,
]

/** Plan definitions: capabilities + hard limits (`null` = unlimited). */
export const PLAN_MATRIX = Object.freeze({
  [PLANS.FREE]: {
    label: 'Free',
    capabilities: BASE,
    limits: { threads: 5, people: 25 },
  },
  [PLANS.PRO]: {
    label: 'Pro',
    capabilities: [...BASE, CAPABILITIES.AI_SUMMARY, CAPABILITIES.AI_BRIEF],
    limits: { threads: null, people: null },
  },
  [PLANS.TEAM]: {
    label: 'Team',
    capabilities: [...BASE, CAPABILITIES.AI_SUMMARY, CAPABILITIES.AI_BRIEF],
    limits: { threads: null, people: null },
  },
})

const ROLE_CAPABILITIES = {
  [ROLES.OWNER]: '*',
  [ROLES.MEMBER]: '*',
  [ROLES.VIEWER]: [],
}

export function planDefinition(plan) {
  return PLAN_MATRIX[plan] ?? PLAN_MATRIX[PLANS.FREE]
}

export function planLimits(plan) {
  return planDefinition(plan).limits
}

/**
 * @param {import('@/types/models').User | null | undefined} user
 * @param {string} capability
 */
export function can(user, capability) {
  if (!user) return false
  if (!planDefinition(user.plan).capabilities.includes(capability)) return false

  const role = ROLE_CAPABILITIES[user.role ?? ROLES.OWNER]
  if (role === '*') return true

  const mutating = capability.endsWith(':write') || capability.endsWith(':merge')
  return mutating ? role.includes(capability) : true
}

/**
 * Check a plan quota, e.g. the Free tier cap of 5 threads.
 * @param {import('@/types/models').User | null} user
 * @param {'threads'|'people'} resource
 */
export function isWithinLimit(user, resource, currentCount) {
  if (!user) return false
  const limit = planLimits(user.plan)[resource]
  if (limit === null || limit === undefined) return true
  return currentCount < limit
}

/** Short, user-facing copy for upgrade prompts. */
export function capabilityLabel(capability) {
  switch (capability) {
    case CAPABILITIES.AI_SUMMARY:
      return 'Where We Left Off summaries are part of Friday Pro.'
    case CAPABILITIES.AI_BRIEF:
      return 'Pre-Meeting Briefs are part of Friday Pro.'
    case CAPABILITIES.PEOPLE_MERGE:
      return 'Merging duplicate people requires write access.'
    default:
      return 'Upgrade to Friday Pro to unlock this.'
  }
}
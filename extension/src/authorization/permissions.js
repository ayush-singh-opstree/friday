/**
 * Authorization model.
 *
 * Two orthogonal axes:
 *  - **Plan** gates paid capabilities (docs/01_product_strategy.md ->
 *    "Free: 5 threads, 25 people. Pro: unlimited, AI, extension").
 *  - **Role** gates destructive/shared actions (Phase 3 team tier).
 *
 * Keeping this in one module means the UI never hard-codes plan checks - it
 * always asks `can(user, capability)`.
 */
export const PLANS = Object.freeze({
  FREE: 'free',
  PRO: 'pro',
  TEAM: 'team',
})

export const ROLES = Object.freeze({
  OWNER: 'owner',
  MEMBER: 'member',
  VIEWER: 'viewer',
})

export const CAPABILITIES = Object.freeze({
  CAPTURE: 'capture',
  THREAD_WRITE: 'thread:write',
  COMMITMENT_WRITE: 'commitment:write',
  PEOPLE_WRITE: 'people:write',
  PEOPLE_MERGE: 'people:merge',
  COMPANION: 'companion',
  AI_SUMMARY: 'ai:summary',
  AI_BRIEF: 'ai:brief',
  EXPORT_DATA: 'data:export',
})

const BASE_CAPABILITIES = [
  CAPABILITIES.CAPTURE,
  CAPABILITIES.THREAD_WRITE,
  CAPABILITIES.COMMITMENT_WRITE,
  CAPABILITIES.PEOPLE_WRITE,
  CAPABILITIES.PEOPLE_MERGE,
  CAPABILITIES.EXPORT_DATA,
]

/** Plan definitions: capabilities + hard limits (null = unlimited). */
export const PLAN_MATRIX = Object.freeze({
  [PLANS.FREE]: {
    label: 'Free',
    capabilities: [...BASE_CAPABILITIES],
    limits: { threads: 5, people: 25 },
  },
  [PLANS.PRO]: {
    label: 'Pro',
    capabilities: [...BASE_CAPABILITIES, CAPABILITIES.COMPANION, CAPABILITIES.AI_SUMMARY, CAPABILITIES.AI_BRIEF],
    limits: { threads: null, people: null },
  },
  [PLANS.TEAM]: {
    label: 'Team',
    capabilities: [
      ...BASE_CAPABILITIES,
      CAPABILITIES.COMPANION,
      CAPABILITIES.AI_SUMMARY,
      CAPABILITIES.AI_BRIEF,
    ],
    limits: { threads: null, people: null },
  },
})

/** Capabilities only roles with write access may perform. */
const ROLE_CAPABILITIES = {
  [ROLES.OWNER]: ['*'],
  [ROLES.MEMBER]: ['*'],
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
  const plan = planDefinition(user.plan)
  if (!plan.capabilities.includes(capability)) return false

  const roleCapabilities = ROLE_CAPABILITIES[user.role ?? ROLES.OWNER]
  if (roleCapabilities.includes('*')) return true

  // Read-only role: only non-mutating capabilities are permitted.
  const mutating = capability.endsWith(':write') || capability.endsWith(':merge')
  return mutating ? roleCapabilities.includes(capability) : true
}

/**
 * Check a plan quota, e.g. Free tier caps at 5 threads.
 * @param {import('@/types/models').User | null} user
 * @param {'threads'|'people'} resource
 * @param {number} currentCount
 */
export function isWithinLimit(user, resource, currentCount) {
  if (!user) return false
  const limit = planLimits(user.plan)[resource]
  if (limit === null || limit === undefined) return true
  return currentCount < limit
}

/** Short, user-facing explanation used by upgrade prompts. */
export function capabilityLabel(capability) {
  switch (capability) {
    case CAPABILITIES.COMPANION:
      return 'The companion overlay is part of Friday Pro.'
    case CAPABILITIES.AI_SUMMARY:
      return 'AI summaries ("Where We Left Off") are part of Friday Pro.'
    case CAPABILITIES.AI_BRIEF:
      return 'Pre-Meeting Briefs are part of Friday Pro.'
    case CAPABILITIES.PEOPLE_MERGE:
      return 'Merging duplicate people requires write access.'
    default:
      return 'Upgrade to Friday Pro to unlock this.'
  }
}

import { useAuthStore } from '@/store'
import { can, capabilityLabel } from './permissions'

/**
 * Declarative capability gate.
 *
 * ```jsx
 * <Can capability={CAPABILITIES.AI_BRIEF} fallback={<UpgradeHint />}>
 *   <BriefTab />
 * </Can>
 * ```
 */
export function Can({ capability, fallback = null, children }) {
  const user = useAuthStore((state) => state.user)
  if (can(user, capability)) return children
  return fallback
}

/** Convenience hook for imperative checks inside event handlers. */
export function useCan() {
  const user = useAuthStore((state) => state.user)
  return {
    user,
    can: (capability) => can(user, capability),
    explain: capabilityLabel,
  }
}

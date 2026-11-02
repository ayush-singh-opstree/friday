import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth'
import { LoadingState } from '@/components/ui/Feedback'
import { can, capabilityLabel } from './permissions'

/**
 * Route guard: blocks the app shell until a session exists (Requirement 12 /
 * Phase 1 "Auth (Clerk)").
 */
export function RequireAuth({ children }) {
  const { isAuthenticated, isBootstrapping } = useAuth()
  const location = useLocation()

  if (isBootstrapping) return <LoadingState label="Restoring your session…" className="min-h-dvh" />
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return children
}

/** Declarative capability gate. */
export function Can({ capability, fallback = null, children }) {
  const { user } = useAuth()
  return can(user, capability) ? children : fallback
}

/** Imperative helper for event handlers. */
export function useCan() {
  const { user } = useAuth()
  return {
    user,
    can: (capability) => can(user, capability),
    explain: capabilityLabel,
  }
}
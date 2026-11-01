import { useAuthStore } from '@/store'
import { LoginPrompt } from '@/components/common/LoginPrompt'
import { LoadingState } from '@/components/ui/LoadingState'

/**
 * Session gate for a whole surface.
 *
 * Feature 13 edge case: "If the user is not logged in, the extension shows a
 * login prompt."
 */
export function ProtectedView({ children, title, description }) {
  const status = useAuthStore((state) => state.status)

  if (status === 'authenticated') return children
  if (status === 'idle' || status === 'loading') {
    return <LoadingState label="Checking your Threadwise session…" />
  }

  return <LoginPrompt title={title} description={description} />
}

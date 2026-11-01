import { useEffect } from 'react'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { ErrorBoundary } from '@/components/common/System'
import { AuthProvider } from '@/auth'
import { useSyncStore, useUiStore } from '@/store'

/**
 * AppProviders - composition root.
 *
 * Responsibilities:
 *  - resolve `theme: 'system' | 'light' | 'dark'` into a `.dark` / `.light`
 *    class on <html> so the design tokens apply (docs -> Dark Mode Overrides)
 *  - mirror connectivity into `uiStore` for the offline banner (Requirement 11)
 *  - install the error boundary and the auth provider
 */
export function AppProviders({ children }) {
  const theme = useUiStore((state) => state.settings.theme)
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')

  const resolved = theme === 'system' ? (prefersDark ? 'dark' : 'light') : theme

  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('dark', 'light')
    root.classList.add(resolved)
    root.style.colorScheme = resolved
  }, [resolved])

  // Connectivity + offline outbox. `init()` attaches listeners and replays any
  // writes left over from a previous session.
  useEffect(() => {
    let cleanup
    useSyncStore
      .getState()
      .init()
      .then((fn) => {
        cleanup = fn
      })
    return () => cleanup?.()
  }, [])

  return (
    <ErrorBoundary>
      <AuthProvider>{children}</AuthProvider>
    </ErrorBoundary>
  )
}
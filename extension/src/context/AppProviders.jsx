import { useEffect } from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { AuthProvider } from '@/auth'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { ToastViewport } from '@/components/common/ToastViewport'
import { initSyncService } from '@/services'
import { useAuthStore, useSettingsStore, useSyncStore } from '@/store'
import { ThemeProvider } from './ThemeProvider'

/**
 * AppProviders - the single composition root shared by every extension
 * surface (popup, side panel, options page and the injected companion).
 *
 * @param {{
 *   children: React.ReactNode,
 *   themeContainer?: { current: HTMLElement | null },
 *   showToasts?: boolean,
 * }} props
 */
export function AppProviders({ children, themeContainer, showToasts = true }) {
  useEffect(() => {
    useSettingsStore.getState().hydrate()
    useAuthStore.getState().hydrate()
    useSyncStore.getState().hydrate()
    return initSyncService()
  }, [])

  return (
    <ErrorBoundary>
      <ThemeProvider container={themeContainer}>
        <AuthProvider>
          <TooltipPrimitive.Provider delayDuration={250} skipDelayDuration={300}>
            {children}
            {showToasts ? <ToastViewport /> : null}
          </TooltipPrimitive.Provider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

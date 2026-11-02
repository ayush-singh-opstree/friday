import { Toaster as SonnerToaster } from 'sonner'
import { useUiStore } from '@/store'

/**
 * Global toast viewport (sonner).
 *
 * A single mount point for the whole app - `uiStore.pushToast` funnels every
 * notification through it, and the notification bell mirrors new alerts here.
 * Anchored to the **top-right** so alerts land on the right edge of the screen
 * (clear of the sidebar rail) and never collide with the mobile tab bar.
 */
export function Toaster() {
  const theme = useUiStore((state) => state.settings.theme)

  return (
    <SonnerToaster
      position="top-right"
      offset={16}
      gap={10}
      visibleToasts={4}
      theme={theme === 'light' || theme === 'dark' ? theme : 'system'}
      richColors
      closeButton
      toastOptions={{
        duration: 5000,
        classNames: {
          toast: 'items-start',
          title: 'break-words',
          description: 'break-words',
        },
      }}
    />
  )
}

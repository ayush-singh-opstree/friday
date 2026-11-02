import { Toaster as SonnerToaster } from 'sonner'
import { useUiStore } from '@/store'

/**
 * Global toast viewport (sonner).
 *
 * A single mount point for the whole app - `uiStore.pushToast` funnels every
 * notification through it. Positioned top-centre so it never collides with the
 * mobile tab bar, and themed from the app's own appearance setting.
 */
export function Toaster() {
  const theme = useUiStore((state) => state.settings.theme)

  return (
    <SonnerToaster
      position="top-center"
      offset={72}
      theme={theme === 'light' || theme === 'dark' ? theme : 'system'}
      richColors
      closeButton
      toastOptions={{ duration: 4500 }}
    />
  )
}

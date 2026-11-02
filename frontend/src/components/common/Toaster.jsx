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
          toast:
            'w-[min(420px,calc(100vw-2rem))] min-h-14 items-start gap-3 rounded-xl px-4 py-3.5 shadow-lg',
          title: 'break-words text-small font-semibold leading-snug',
          description: 'break-words text-small leading-relaxed',
        },
      }}
    />
  )
}

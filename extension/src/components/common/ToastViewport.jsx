import { Toaster as SonnerToaster } from 'sonner'
import { useSettingsStore } from '@/store'

/**
 * Global toast viewport (sonner) - mounted once per surface by `AppProviders`.
 *
 * `uiStore.pushToast` funnels every companion notification through it, so the
 * popup, side panel and options page share one stacking, swipe-dismissable,
 * screen-reader-friendly implementation. Themed from the same appearance
 * setting the rest of the companion uses.
 */
export function ToastViewport() {
  const theme = useSettingsStore((state) => state.settings.theme)

  return (
    <SonnerToaster
      position="bottom-center"
      offset={12}
      theme={theme === 'light' || theme === 'dark' ? theme : 'system'}
      richColors
      closeButton
      toastOptions={{
        duration: 4200,
        classNames: {
          toast: 'min-h-12 w-[min(340px,calc(100vw-1.5rem))] rounded-xl px-3.5 py-3 shadow-lg',
          title: 'text-small font-semibold leading-snug',
          description: 'text-tiny leading-relaxed',
        },
      }}
    />
  )
}

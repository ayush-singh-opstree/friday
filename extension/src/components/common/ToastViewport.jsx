import { CheckCircle, Info, Warning, XCircle } from '@phosphor-icons/react'
import { useUiStore } from '@/store'
import { cn } from '@/lib/utils'

const TONES = {
  info: { icon: Info, className: 'border-line bg-card text-ink' },
  success: { icon: CheckCircle, className: 'border-success/30 bg-success/10 text-ink' },
  warning: { icon: Warning, className: 'border-warning/30 bg-warning/10 text-ink' },
  danger: { icon: XCircle, className: 'border-danger/30 bg-danger/10 text-ink' },
}

/** Global toast viewport, mounted once per surface by `AppProviders`. */
export function ToastViewport() {
  const toasts = useUiStore((state) => state.toasts)
  const dismissToast = useUiStore((state) => state.dismissToast)

  if (toasts.length === 0) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-100 flex flex-col items-center gap-1.5 p-3"
    >
      {toasts.map((toast) => {
        const tone = TONES[toast.tone] ?? TONES.info
        const Icon = tone.icon
        return (
          <button
            key={toast.id}
            type="button"
            onClick={() => dismissToast(toast.id)}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-md border px-3 py-2 text-left text-small shadow-md',
              tone.className,
            )}
          >
            <Icon size={14} weight="fill" className="mt-0.5 shrink-0" />
            <span className="flex-1">{toast.message}</span>
          </button>
        )
      })}
    </div>
  )
}
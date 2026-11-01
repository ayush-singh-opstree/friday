import { Component } from 'react'
import { CheckCircle, CloudArrowUp, Info, Warning, WifiSlash, XCircle } from '@phosphor-icons/react'
import { useSyncStore, useUiStore } from '@/store'
import { Button } from '@/components/ui/Button'
import { cn, pluralise } from '@/lib/utils'

/** Error boundary so one broken screen never blanks the whole app. */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Keep the details in the console for debugging without surfacing them.
    console.error('[Threadwise] Unhandled UI error', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-heading-1 text-ink">Something went wrong</h1>
        <p className="max-w-md text-small text-ink-muted">
          Threadwise hit an unexpected error. Your captures are safe — reloading usually fixes it.
        </p>
        <Button onClick={() => window.location.reload()}>Reload Threadwise</Button>
      </div>
    )
  }
}

const TOAST_TONES = {
  info: { icon: Info, className: 'border-line bg-card text-ink' },
  success: { icon: CheckCircle, className: 'border-success/30 bg-success/10 text-ink' },
  warning: { icon: Warning, className: 'border-warning/30 bg-warning/10 text-ink' },
  danger: { icon: XCircle, className: 'border-danger/30 bg-danger/10 text-ink' },
}

/** Global toast viewport. Mounted once by `AppProviders`. */
export function Toaster() {
  const toasts = useUiStore((state) => state.toasts)
  const dismissToast = useUiStore((state) => state.dismissToast)

  if (toasts.length === 0) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-100 flex flex-col items-center gap-2 p-4 pb-safe-tabs sm:pb-4"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const tone = TOAST_TONES[toast.tone] ?? TOAST_TONES.info
        const Icon = tone.icon
        return (
          <button
            key={toast.id}
            type="button"
            onClick={() => dismissToast(toast.id)}
            className={cn(
              'pointer-events-auto flex w-full max-w-md items-start gap-2.5 rounded-md border px-3.5 py-3 text-left text-small shadow-md',
              tone.className,
            )}
          >
            <Icon size={16} weight="fill" className="mt-0.5 shrink-0" />
            <span className="flex-1">{toast.message}</span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * Connectivity + sync banner (Requirement 11).
 *
 *   offline          -> "saved locally"
 *   online + pending -> "N changes waiting to sync" + Sync now
 *   online + idle    -> hidden
 */
export function OfflineBanner() {
  const online = useSyncStore((state) => state.online)
  const pendingCount = useSyncStore((state) => state.pendingCount)
  const status = useSyncStore((state) => state.status)
  const flush = useSyncStore((state) => state.flush)

  if (online && pendingCount === 0) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex items-center justify-center gap-2 px-4 py-1.5 text-tiny font-medium',
        online ? 'bg-primary-light text-primary' : 'bg-warning/15 text-[#8a5a06]',
      )}
    >
      {online ? <CloudArrowUp size={13} weight="bold" /> : <WifiSlash size={13} weight="bold" />}
      <span>
        {online
          ? `${pluralise(pendingCount, 'change')} waiting to sync`
          : `You're offline — ${pluralise(pendingCount, 'change')} saved locally`}
      </span>
      {online && pendingCount > 0 ? (
        <Button variant="ghost" size="sm" loading={status === 'syncing'} onClick={() => flush()}>
          Sync now
        </Button>
      ) : null}
    </div>
  )
}
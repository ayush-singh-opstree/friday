import { Component } from 'react'
import { CloudArrowUp, WifiSlash } from '@/components/icons'
import { useSyncStore } from '@/store'
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
    console.error('[Friday] Unhandled UI error', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-heading-1 text-ink">Something went wrong</h1>
        <p className="max-w-md text-small text-ink-muted">
          Friday hit an unexpected error. Your captures are safe — reloading usually fixes it.
        </p>
        <Button onClick={() => window.location.reload()}>Reload Friday</Button>
      </div>
    )
  }
}

/**
 * Connectivity + sync banner (Requirement 11).
 *
 *   offline          -> "saved locally"
 *   online + pending -> "N changes waiting to sync" + Sync now
 *   online + idle    -> hidden
 *
 * Toasts are handled separately by `components/common/Toaster.jsx` (sonner).
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

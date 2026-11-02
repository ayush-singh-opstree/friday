import { cn } from '@/lib/utils'
import { Spinner } from './Spinner'

/** Centred modern loading state with spinner and label. */
export function LoadingState({ label = 'Loading…', subtitle = null, className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-10 text-center',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="relative flex size-10 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 shadow-2xs">
        <Spinner className="size-5 text-primary" />
      </div>
      <div className="space-y-0.5">
        <p className="text-small font-semibold text-ink">{label}</p>
        {subtitle ? <p className="text-tiny text-ink-muted">{subtitle}</p> : null}
      </div>
    </div>
  )
}

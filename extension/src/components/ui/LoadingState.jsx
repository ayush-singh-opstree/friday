import { cn } from '@/lib/utils'
import { Spinner } from './Spinner'

/** Centred loading state for a whole surface or panel. */
export function LoadingState({ label = 'Loading…', className }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-12 text-center',
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Spinner className="size-5 text-primary" />
      <p className="text-small text-ink-muted">{label}</p>
    </div>
  )
}

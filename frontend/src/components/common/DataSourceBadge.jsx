import { dataSource } from '@/config/env'
import { cn } from '@/lib/utils'

/**
 * Data-source indicator.
 *
 * Makes it obvious whether the app is reading from the bundled demo dataset
 * (`src/mocks`) or the live Friday REST backend
 * (docs/08_system_architecture.md). Shown in the app shell and on sign-in so a
 * demo audience always knows which source is in play.
 */
export function DataSourceBadge({ className, withLabel = true }) {
  const live = dataSource.mode === 'live'
  return (
    <span
      title={live ? `Live API · ${dataSource.label}` : 'Demo dataset (offline capable)'}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-tiny font-medium',
        live ? 'bg-success/10 text-success' : 'bg-warning/10 text-[#8a5a06]',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn('size-1.5 rounded-full', live ? 'bg-success' : 'bg-warning')}
      />
      {withLabel ? (live ? 'Live API' : 'Demo data') : null}
    </span>
  )
}

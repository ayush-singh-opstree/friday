import { cn } from '@/lib/utils'

/**
 * Page container.
 */
export function PageContainer({ className, children }) {
  return (
    <div className={cn('mx-auto w-full max-w-[1680px]', className)}>{children}</div>
  )
}

/** Shared page header: eyebrow, display title, and actions (no description). */
export function PageHeader({ eyebrow, title, _description, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-tiny font-semibold tracking-[0.08em] text-ink-subtle uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-2xl font-bold text-ink sm:text-display">{title}</h1>
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
      ) : null}
    </div>
  )
}

import { cn } from '@/lib/utils'

/** The Friday mark: brand tile with three "thread" bars. */
export function Logo({ size = 28, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={cn('shrink-0', className)}
      role="img"
      aria-label="Friday"
    >
      <rect width="64" height="64" rx="15" fill="var(--color-primary)" />
      <rect x="16" y="19" width="33" height="7" rx="3.5" fill="#fff" />
      <rect x="16" y="29" width="33" height="7" rx="3.5" fill="#fff" />
      <rect x="16" y="39" width="19" height="7" rx="3.5" fill="#fff" />
    </svg>
  )
}

/** Logo + wordmark lockup. */
export function Wordmark({ size = 28, className, showTagline = false }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <Logo size={size} />
      <div className="leading-tight">
        <span className="block text-heading-2 font-semibold tracking-tight text-ink">
          Friday
        </span>
        {showTagline ? (
          <span className="block text-tiny text-ink-muted">Relationship memory</span>
        ) : null}
      </div>
    </div>
  )
}
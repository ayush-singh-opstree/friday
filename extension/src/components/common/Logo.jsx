/** The Threadwise mark: brand tile with three "thread" bars. */
export function Logo({ size = 28, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      className={className}
      role="img"
      aria-label="Threadwise"
    >
      <rect width="64" height="64" rx="15" fill="var(--color-primary)" />
      <rect x="16" y="19" width="33" height="7" rx="3.5" fill="#fff" />
      <rect x="16" y="29" width="33" height="7" rx="3.5" fill="#fff" />
      <rect x="16" y="39" width="19" height="7" rx="3.5" fill="#fff" />
    </svg>
  )
}

/** Logo + wordmark lockup. */
export function Wordmark({ size = 26, className }) {
  return (
    <div className={`flex items-center gap-2 ${className ?? ''}`}>
      <Logo size={size} />
      <span className="text-heading-3 font-semibold tracking-tight text-ink">Threadwise</span>
    </div>
  )
}
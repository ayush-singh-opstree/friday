/** Shared page header: eyebrow, display title, description and actions. */
export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-tiny font-semibold tracking-[0.08em] text-ink-subtle uppercase">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-display text-ink">{title}</h1>
        {description ? <p className="mt-1 text-body text-ink-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  )
}
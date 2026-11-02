import { cn } from '@/lib/utils'

/**
 * Page toolbar - filters on the left, controls on the right; stacks on phones.
 */
export function Toolbar({ className, children }) {
  return (
    <div
      className={cn(
        'mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      {children}
    </div>
  )
}

const PILL_SIZES = {
  sm: 'h-7 px-2.5 text-tiny',
  md: 'h-8 px-3.5 text-small',
}

/**
 * Pill filter rail - one choice from a small set, scrolling horizontally when
 * space runs out.
 */
export function FilterPills({ options = [], value, onChange, label, size = 'md', className }) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        'scrollbar-none -mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(option.value)}
            className={cn(
              'shrink-0 rounded-full font-medium transition-all duration-150',
              PILL_SIZES[size] ?? PILL_SIZES.md,
              active
                ? 'bg-primary text-ink-inverse shadow-sm'
                : 'bg-overlay text-ink-muted hover:bg-line hover:text-ink',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

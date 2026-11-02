import { useId } from 'react'
import { motion, useReducedMotion } from 'motion/react'
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
  const layoutId = useId()
  const reduceMotion = useReducedMotion()

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
              'relative shrink-0 rounded-full font-medium transition-colors duration-150',
              PILL_SIZES[size] ?? PILL_SIZES.md,
              active
                ? 'text-ink-inverse'
                : 'bg-overlay text-ink-muted hover:bg-line hover:text-ink',
            )}
          >
            {active ? (
              <motion.span
                layoutId={layoutId}
                aria-hidden="true"
                className="absolute inset-0 rounded-full bg-primary shadow-sm"
                transition={
                  reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 32 }
                }
              />
            ) : null}
            <span className="relative z-10">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

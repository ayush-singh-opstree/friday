import { cn } from '@/lib/utils'

/**
 * Card - surface container.
 * border 1px --color-line, radius --radius-md, padding --space-4,
 * shadow --shadow-sm -> --shadow-md on hover.
 */
export function Card({ className, interactive = false, as: Tag = 'div', children, ...props }) {
  return (
    <Tag
      className={cn(
        'rounded-md border border-line bg-card p-4 shadow-sm transition-shadow duration-150',
        interactive && 'cursor-pointer hover:shadow-md',
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  )
}

/**
 * Caps-lock section label ("NEEDS YOUR ATTENTION") with an optional action.
 */
export function SectionHeader({ label, action = null, className }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 pb-2', className)}>
      <h2 className="text-tiny font-semibold tracking-[0.08em] text-ink-subtle uppercase">
        {label}
      </h2>
      {action}
    </div>
  )
}
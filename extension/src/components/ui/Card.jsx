import { cn } from '@/lib/utils'

/**
 * Surface container.
 * border 1px --color-line, radius --radius-md, padding --space-4,
 * shadow --shadow-sm -> --shadow-md on hover.
 */
export function Card({ className, interactive = false, children, ...props }) {
  return (
    <div
      className={cn(
        'rounded-md border border-line bg-card p-4 shadow-sm transition-shadow duration-150',
        interactive && 'cursor-pointer hover:shadow-md active:scale-[0.995]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

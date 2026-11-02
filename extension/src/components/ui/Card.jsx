import { cn } from '@/lib/utils'

/**
 * Surface container with subtle elevation and hover transitions.
 */
export function Card({ className, interactive = false, children, ...props }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-line/80 bg-card p-3.5 shadow-sm transition-all duration-150',
        interactive && 'cursor-pointer hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md active:scale-[0.99]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

import { cn } from '@/lib/utils'

/**
 * Surface container with subtle elevation and hover transitions.
 */
export function Card({ className, interactive = false, children, ...props }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-line bg-card p-3.5 shadow-sm transition-all duration-150',
        interactive && 'cursor-pointer hover:shadow-md hover:border-line/80 hover:-translate-y-0.5 active:scale-[0.99]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

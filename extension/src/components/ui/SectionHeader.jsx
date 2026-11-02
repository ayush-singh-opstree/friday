import { cn } from '@/lib/utils'

/**
 * Caps-lock section label from the design system
 * ("NEEDS YOUR ATTENTION" / "DUE TODAY") with an optional trailing action.
 */
export function SectionHeader({ label, action = null, className, children }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 px-1 pb-2', className)}>
      <h2 className="text-tiny font-semibold tracking-[0.08em] text-ink-subtle uppercase">
        {label}
        {children}
      </h2>
      {action}
    </div>
  )
}

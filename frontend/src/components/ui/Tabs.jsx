import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'

/**
 * Segmented tab strip (Radix). Panels stay mounted so switching tabs never
 * re-fetches or loses scroll position (docs/05_user_flows.md -> Flow 12).
 */
export const Tabs = TabsPrimitive.Root

export function TabsList({ className, children, ...props }) {
  return (
    <TabsPrimitive.List
      className={cn(
        // Phones: natural-width triggers that scroll horizontally if they don't
        // fit (keeps every label readable). sm+: equal-width segmented control.
        'scrollbar-none flex w-full items-center gap-1 overflow-x-auto rounded-md bg-overlay p-1 text-small',
        className,
      )}
      {...props}
    >
      {children}
    </TabsPrimitive.List>
  )
}

export function TabsTrigger({ className, children, ...props }) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'inline-flex flex-none items-center justify-center gap-1.5 rounded-sm px-3 py-1.5 font-medium whitespace-nowrap text-ink-muted transition-colors',
        'sm:flex-1',
        'hover:text-ink data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm',
        className,
      )}
      {...props}
    >
      {children}
    </TabsPrimitive.Trigger>
  )
}

export function TabsContent({ className, children, ...props }) {
  return (
    <TabsPrimitive.Content className={cn('mt-3 outline-none', className)} {...props}>
      {children}
    </TabsPrimitive.Content>
  )
}
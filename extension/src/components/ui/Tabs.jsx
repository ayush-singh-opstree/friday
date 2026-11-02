import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'

/**
 * Segmented tab strip (Radix).
 */
export const Tabs = TabsPrimitive.Root

export function TabsList({ className, children, ...props }) {
  return (
    <TabsPrimitive.List
      className={cn(
        'scrollbar-none flex w-full items-center gap-1 overflow-x-auto rounded-xl bg-overlay p-1 text-small',
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
        'inline-flex flex-none items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 font-medium whitespace-nowrap text-ink-muted transition-all duration-150',
        'sm:flex-1 cursor-pointer text-tiny sm:text-small',
        'hover:text-ink data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-sm data-[state=active]:font-semibold',
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

import { forwardRef } from 'react'
import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'
import { cn } from '@/lib/utils'

/**
 * ScrollArea (Radix).
 *
 * Replaces the platform scrollbar with a consistent, theme-aware one across
 * every browser and OS. `type="scroll"` keeps the bar visible whenever there is
 * overflow, so it reads like a normal (but styled) browser scrollbar.
 */
export function ScrollArea({
  className,
  viewportClassName,
  viewportRef,
  children,
  orientation = 'vertical',
  ...props
}) {
  return (
    <ScrollAreaPrimitive.Root
      type="scroll"
      scrollHideDelay={600}
      className={cn('relative overflow-hidden', className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        ref={viewportRef}
        className={cn('size-full rounded-[inherit] outline-none', viewportClassName)}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar orientation="vertical" />
      {orientation === 'both' ? <ScrollBar orientation="horizontal" /> : null}
      <ScrollAreaPrimitive.Corner className="bg-transparent" />
    </ScrollAreaPrimitive.Root>
  )
}

/** The styled track + thumb, shared by both orientations. */
export const ScrollBar = forwardRef(function ScrollBar(
  { className, orientation = 'vertical', ...props },
  ref,
) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      ref={ref}
      orientation={orientation}
      className={cn(
        'flex touch-none select-none p-px transition-colors duration-150',
        orientation === 'vertical' ? 'h-full w-2.5' : 'h-2.5 flex-col',
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb className="relative flex-1 rounded-full bg-ink-subtle/40 transition-colors hover:bg-ink-subtle/70" />
    </ScrollAreaPrimitive.Scrollbar>
  )
})

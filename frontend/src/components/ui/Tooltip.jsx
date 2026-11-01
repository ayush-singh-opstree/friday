import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { cn } from '@/lib/utils'

/**
 * Tooltip (Radix) - short, non-interactive hints.
 *
 * Used wherever an affordance is icon-only (the collapsed sidebar rail, the
 * shell's icon buttons) so the label is never lost when space is tight.
 * Requires a `<TooltipPrimitive.Provider>` ancestor (mounted in AppProviders).
 */
export function Tooltip({ content, children, side = 'top', align = 'center', className }) {
  // Render bare children when there is nothing to say (keeps trees shallow).
  if (!content) return children

  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={align}
          sideOffset={6}
          className={cn(
            'z-110 max-w-56 rounded-sm bg-ink px-2.5 py-1.5 text-tiny text-ink-inverse shadow-md',
            className,
          )}
        >
          {content}
          <TooltipPrimitive.Arrow className="fill-ink" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}

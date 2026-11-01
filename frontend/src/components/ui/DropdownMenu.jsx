import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { cn } from '@/lib/utils'

/**
 * Dropdown menu (Radix) - anchored actions behind a single trigger.
 */
export const DropdownMenu = DropdownMenuPrimitive.Root
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
export const DropdownMenuGroup = DropdownMenuPrimitive.Group

export function DropdownMenuContent({ className, align = 'end', sideOffset = 8, children, ...props }) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-110 min-w-56 overflow-hidden rounded-xl border border-line bg-card p-1.5 text-ink shadow-xl',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
          className,
        )}
        {...props}
      >
        {children}
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  )
}

export function DropdownMenuItem({ className, destructive = false, children, ...props }) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        'flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-small outline-none select-none transition-colors duration-100',
        'data-[highlighted]:bg-overlay data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        destructive ? 'text-danger data-[highlighted]:bg-danger/10' : 'text-ink',
        className,
      )}
      {...props}
    >
      {children}
    </DropdownMenuPrimitive.Item>
  )
}

export function DropdownMenuLabel({ className, children }) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn(
        'px-2.5 pt-1.5 pb-0.5 text-tiny font-semibold tracking-[0.08em] text-ink-subtle uppercase',
        className,
      )}
    >
      {children}
    </DropdownMenuPrimitive.Label>
  )
}

export function DropdownMenuSeparator({ className }) {
  return <DropdownMenuPrimitive.Separator className={cn('my-1.5 h-px bg-line', className)} />
}

import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'

/**
 * Modal / bottom-sheet primitive (docs/07_design_system.md -> Bottom Sheet /
 * Modal): blurred overlay, --radius-lg sheet, grab handle, bottom sheet on
 * mobile and a centred dialog on wider surfaces.
 */
export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export function DialogContent({ className, children, showHandle = true, ...props }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-90 bg-black/40 backdrop-blur-[2px]" />
      <DialogPrimitive.Content
        className={cn(
          'fixed z-95 flex flex-col overflow-y-auto bg-card shadow-lg outline-none',
          'inset-x-0 bottom-0 max-h-[88vh] rounded-t-lg p-4',
          'sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[85vh] sm:w-[min(460px,92vw)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg',
          className,
        )}
        {...props}
      >
        {showHandle ? <div className="mx-auto mb-3 h-1 w-8 shrink-0 rounded-full bg-line sm:hidden" /> : null}
        {children}
        <DialogPrimitive.Close
          aria-label="Close"
          className="absolute top-3.5 right-3.5 rounded-sm p-1 text-ink-subtle transition-colors hover:bg-overlay hover:text-ink"
        >
          <X size={16} />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function DialogHeader({ className, children }) {
  return <div className={cn('mb-3 flex flex-col gap-1 pr-8', className)}>{children}</div>
}

export function DialogTitle({ className, children, ...props }) {
  return (
    <DialogPrimitive.Title className={cn('text-heading-2 text-ink', className)} {...props}>
      {children}
    </DialogPrimitive.Title>
  )
}

export function DialogDescription({ className, children, ...props }) {
  return (
    <DialogPrimitive.Description className={cn('text-small text-ink-muted', className)} {...props}>
      {children}
    </DialogPrimitive.Description>
  )
}

export function DialogFooter({ className, children }) {
  return <div className={cn('mt-4 flex items-center justify-end gap-2', className)}>{children}</div>
}
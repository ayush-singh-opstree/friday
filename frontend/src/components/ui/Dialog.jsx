import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from '@/components/icons'
import { cn } from '@/lib/utils'

/**
 * Modal / bottom-sheet primitive: blurred overlay, rounded-2xl sheet,
 * grab handle, bottom sheet on mobile and a centred dialog on wider surfaces.
 * Animations are handled via Radix's data-state attributes + CSS keyframes
 * in index.css.
 */
export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export function DialogContent({ className, children, showHandle = true, ...props }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-90 bg-black/50 backdrop-blur-sm data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out" />
      <DialogPrimitive.Content
        className={cn(
          'fixed z-95 flex flex-col overflow-y-auto bg-card shadow-xl outline-none',
          'border border-line/60',
          'inset-x-0 bottom-0 max-h-[90vh] rounded-t-2xl p-5',
          'sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[85vh]',
          'sm:w-[min(480px,94vw)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl',
          'data-[state=open]:animate-dialog-in data-[state=closed]:animate-dialog-out',
          className,
        )}
        {...props}
      >
        {showHandle ? (
          <div className="mx-auto mb-4 h-1 w-10 shrink-0 rounded-full bg-line/80 sm:hidden" />
        ) : null}
        {children}
        <DialogPrimitive.Close
          aria-label="Close"
          className="absolute top-4 right-4 flex size-7 items-center justify-center rounded-lg text-ink-subtle transition-all duration-150 hover:bg-overlay hover:text-ink"
        >
          <X size={15} />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function DialogHeader({ className, children }) {
  return <div className={cn('mb-4 flex flex-col gap-1 pr-8', className)}>{children}</div>
}

export function DialogTitle({ className, children, ...props }) {
  return (
    <DialogPrimitive.Title
      className={cn('text-heading-2 font-semibold text-ink', className)}
      {...props}
    >
      {children}
    </DialogPrimitive.Title>
  )
}

export function DialogDescription({ className, children, ...props }) {
  return (
    <DialogPrimitive.Description
      className={cn('text-small text-ink-muted leading-relaxed', className)}
      {...props}
    >
      {children}
    </DialogPrimitive.Description>
  )
}

export function DialogFooter({ className, children }) {
  return (
    <div
      className={cn(
        'mt-5 flex items-center justify-end gap-2 border-t border-line pt-4',
        className,
      )}
    >
      {children}
    </div>
  )
}

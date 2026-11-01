import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from '@/components/icons'
import { cn } from '@/lib/utils'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export function DialogContent({ className, children, showHandle = true, ...props }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in data-[state=closed]:animate-out data-[state=closed]:fade-out" />
      <DialogPrimitive.Content
        className={cn(
          'fixed z-50 flex flex-col bg-card shadow-xl outline-none border border-line/60',
          'inset-x-0 bottom-0 max-h-[88vh] rounded-t-2xl p-4',
          'sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[82vh] sm:w-[min(420px,94vw)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl',
          'data-[state=open]:animate-in data-[state=open]:zoom-in-95 data-[state=open]:fade-in',
          className,
        )}
        {...props}
      >
        {showHandle ? (
          <div className="mx-auto mb-3 h-1 w-9 shrink-0 rounded-full bg-line sm:hidden" />
        ) : null}
        {children}
        <DialogPrimitive.Close
          aria-label="Close"
          className="absolute top-3.5 right-3.5 flex size-7 items-center justify-center rounded-lg text-ink-subtle transition-colors hover:bg-overlay hover:text-ink cursor-pointer"
        >
          <X size={15} />
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
    <DialogPrimitive.Title className={cn('text-heading-2 font-semibold text-ink', className)} {...props}>
      {children}
    </DialogPrimitive.Title>
  )
}

export function DialogDescription({ className, children, ...props }) {
  return (
    <DialogPrimitive.Description
      className={cn('text-small text-ink-muted', className)}
      {...props}
    >
      {children}
    </DialogPrimitive.Description>
  )
}

export function DialogFooter({ className, children }) {
  return (
    <div className={cn('mt-4 flex items-center justify-end gap-2 border-t border-line pt-3.5', className)}>
      {children}
    </div>
  )
}

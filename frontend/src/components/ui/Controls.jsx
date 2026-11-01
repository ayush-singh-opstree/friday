import { forwardRef } from 'react'
import * as SwitchPrimitive from '@radix-ui/react-switch'
import { cn } from '@/lib/utils'

const FIELD_BASE =
  'w-full rounded-md border bg-overlay text-ink placeholder:text-ink-subtle transition-shadow duration-150 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60'
const FIELD_STATE = {
  default: 'border-line focus:border-primary focus:ring-3 focus:ring-primary/15',
  error: 'border-danger focus:border-danger focus:ring-3 focus:ring-danger/15',
}

/** Label + control + hint/error wrapper. */
export function Field({ label, hint, error, htmlFor, children, className }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label ? (
        <label htmlFor={htmlFor} className="text-small font-medium text-ink-muted">
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="text-small text-danger">{error}</p>
      ) : hint ? (
        <p className="text-tiny text-ink-subtle">{hint}</p>
      ) : null}
    </div>
  )
}

/** Text input - 44px tall, 12px 14px padding, 10px radius. */
export const Input = forwardRef(function Input({ className, invalid = false, ...props }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        FIELD_BASE,
        FIELD_STATE[invalid ? 'error' : 'default'],
        'h-11 px-3.5 text-body',
        className,
      )}
      {...props}
    />
  )
})

/** Textarea for captures and notes. */
export const Textarea = forwardRef(function Textarea(
  { className, invalid = false, rows = 3, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        FIELD_BASE,
        FIELD_STATE[invalid ? 'error' : 'default'],
        'resize-none px-3.5 py-3 text-body leading-relaxed',
        className,
      )}
      {...props}
    />
  )
})

/** Native select styled with the input tokens. */
export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(FIELD_BASE, FIELD_STATE.default, 'h-10 px-3 text-small', className)}
      {...props}
    >
      {children}
    </select>
  )
})

/** Accessible toggle (Radix). */
export function Switch({ className, checked, onCheckedChange, disabled, id }) {
  return (
    <SwitchPrimitive.Root
      id={id}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200',
        'data-[state=checked]:bg-primary data-[state=unchecked]:bg-line disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-5 rounded-full bg-white shadow-sm transition-transform duration-200 data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0.5" />
    </SwitchPrimitive.Root>
  )
}

/** Labelled switch row used across Settings. */
export function SwitchRow({ label, description, id, checked, onCheckedChange, disabled }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-body-medium text-ink">
          {label}
        </label>
        {description ? <p className="mt-0.5 text-small text-ink-muted">{description}</p> : null}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  )
}
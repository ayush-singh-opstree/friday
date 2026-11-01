import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const FIELD_BASE =
  'w-full rounded-xl border bg-overlay text-ink placeholder:text-ink-subtle transition-all duration-150 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60'

const FIELD_STATE = {
  default: 'border-line focus:border-primary focus:ring-3 focus:ring-primary/12 focus:bg-card',
  error: 'border-danger focus:border-danger focus:ring-3 focus:ring-danger/12',
}

function Field({ label, hint, error, htmlFor, children, className }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label ? (
        <label htmlFor={htmlFor} className="text-small font-medium text-ink">
          {label}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="text-tiny text-danger font-medium">{error}</p>
      ) : hint ? (
        <p className="text-tiny text-ink-subtle">{hint}</p>
      ) : null}
    </div>
  )
}

/** Text input - 44px tall, 12px 14px padding, 12px radius. */
export const Input = forwardRef(function Input(
  { className, invalid = false, id, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      id={id}
      aria-invalid={invalid || undefined}
      className={cn(
        FIELD_BASE,
        FIELD_STATE[invalid ? 'error' : 'default'],
        'h-10 px-3.5 text-small',
        className,
      )}
      {...props}
    />
  )
})

/** Auto-growing-friendly textarea for captures and notes. */
export const Textarea = forwardRef(function Textarea(
  { className, invalid = false, rows = 3, id, ...props },
  ref,
) {
  return (
    <textarea
      ref={ref}
      id={id}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(
        FIELD_BASE,
        FIELD_STATE[invalid ? 'error' : 'default'],
        'resize-none px-3.5 py-2.5 text-small leading-relaxed',
        className,
      )}
      {...props}
    />
  )
})

/** Select styled to match modern inputs. */
export const Select = forwardRef(function Select({ className, id, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      id={id}
      className={cn(
        FIELD_BASE,
        FIELD_STATE.default,
        'h-10 px-3.5 text-small cursor-pointer',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
})

export { Field }

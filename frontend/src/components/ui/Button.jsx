import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { Spinner } from './Feedback'

/**
 * Button (docs/07_design_system.md -> Component Library -> Button).
 * Variants: primary | secondary | ghost | outline | danger
 * Sizes:    sm (32px) | md (40px) | lg (48px) | icon
 */
const VARIANTS = {
  primary:
    'bg-primary text-ink-inverse hover:bg-primary-dark active:scale-[0.97] shadow-sm hover:shadow-md',
  secondary: 'bg-primary-light text-primary hover:brightness-[0.96] active:scale-[0.97]',
  ghost: 'bg-transparent text-primary hover:bg-primary-light active:scale-[0.97]',
  outline:
    'border border-line bg-card text-ink hover:border-primary/50 hover:bg-overlay active:scale-[0.97]',
  danger:
    'bg-danger text-ink-inverse hover:brightness-95 active:scale-[0.97] shadow-sm hover:shadow-md',
}

const SIZES = {
  sm: 'h-8 px-3.5 text-small rounded-lg',
  md: 'h-10 px-4 text-body-medium rounded-lg',
  lg: 'h-12 px-5 text-body-medium rounded-xl',
  icon: 'h-9 w-9 p-0 rounded-lg',
}

export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', loading = false, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap',
        'transition-all duration-150 ease-out',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANTS[variant] ?? VARIANTS.primary,
        SIZES[size] ?? SIZES.md,
        className,
      )}
      {...props}
    >
      {loading ? <Spinner className="size-4" /> : null}
      {children}
    </button>
  )
})

/** Square icon-only button; `label` becomes the accessible name. */
export const IconButton = forwardRef(function IconButton(
  { label, className, children, size = 'md', ...props },
  ref,
) {
  return (
    <Button
      ref={ref}
      variant="outline"
      size="icon"
      aria-label={label}
      title={label}
      className={cn(
        'border-transparent bg-transparent text-ink-muted hover:bg-overlay hover:text-ink hover:border-transparent shadow-none',
        size === 'sm' && 'h-8 w-8',
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  )
})

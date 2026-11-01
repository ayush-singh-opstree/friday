import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { Spinner } from './Spinner'

/**
 * Button.
 * Variants: primary | secondary | ghost | outline | danger
 * Sizes: sm (32px) | md (40px) | lg (48px) | icon
 * (docs/07_design_system.md -> Component Library -> Button)
 */
const VARIANTS = {
  primary: 'bg-primary text-ink-inverse hover:bg-primary-dark',
  secondary: 'bg-primary-light text-primary hover:brightness-[0.97]',
  ghost: 'bg-transparent text-primary hover:bg-primary-light',
  outline: 'bg-card text-ink border border-line hover:border-primary/50',
  danger: 'bg-danger text-ink-inverse hover:brightness-95',
}

const SIZES = {
  sm: 'h-8 px-3 text-small',
  md: 'h-10 px-4 text-body-medium',
  lg: 'h-12 px-5 text-body-medium',
  icon: 'h-9 w-9 p-0',
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
        'inline-flex items-center justify-center gap-2 rounded-sm font-medium whitespace-nowrap',
        'transition-colors duration-150 ease-out',
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

/** Square icon-only button with a required accessible label. */
export const IconButton = forwardRef(function IconButton(
  { label, variant = 'ghost', size = 'md', className, children, ...props },
  ref,
) {
  return (
    <Button
      ref={ref}
      variant={variant}
      size="icon"
      aria-label={label}
      title={label}
      className={cn(size === 'sm' && 'h-8 w-8', className)}
      {...props}
    >
      {children}
    </Button>
  )
})

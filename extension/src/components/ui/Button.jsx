import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { Spinner } from './Spinner'

/**
 * Button component for Friday Companion.
 * Variants: primary | secondary | ghost | outline | danger
 * Sizes: sm (32px) | md (40px) | lg (48px) | icon
 */
const VARIANTS = {
  primary:
    'bg-primary text-ink-inverse shadow-sm hover:bg-primary-dark hover:shadow-md active:scale-[0.97]',
  secondary: 'bg-primary-light text-primary hover:bg-primary/12 active:scale-[0.97]',
  ghost: 'bg-transparent text-primary hover:bg-primary-light active:scale-[0.97]',
  outline:
    'bg-card text-ink border border-line/80 hover:border-primary/40 hover:bg-overlay active:scale-[0.97]',
  danger:
    'bg-danger text-ink-inverse hover:brightness-95 shadow-sm hover:shadow active:scale-[0.97]',
}

const SIZES = {
  sm: 'h-8 px-3 text-small rounded-lg',
  md: 'h-10 px-4 text-body-medium rounded-xl',
  lg: 'h-12 px-5 text-body-medium rounded-xl',
  icon: 'h-8 w-8 p-0 rounded-lg',
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
        'inline-flex items-center justify-center gap-2 font-semibold whitespace-nowrap tracking-[-0.01em]',
        'transition-all duration-150 ease-out cursor-pointer',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
        VARIANTS[variant] ?? VARIANTS.primary,
        SIZES[size] ?? SIZES.md,
        className,
      )}
      {...props}
    >
      {loading ? <Spinner className="size-3.5" /> : null}
      {children}
    </button>
  )
})

/** Square icon-only button with accessible label. */
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
      className={cn(
        'border-transparent text-ink-muted hover:bg-overlay hover:text-ink',
        size === 'sm' && 'h-8 w-8',
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  )
})

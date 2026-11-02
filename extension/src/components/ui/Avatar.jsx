import * as AvatarPrimitive from '@radix-ui/react-avatar'
import { cn, initials } from '@/lib/utils'

const SIZES = {
  xs: 'size-6 text-[10px]',
  sm: 'size-8 text-tiny',
  md: 'size-10 text-small',
  lg: 'size-12 text-body-medium',
}

/**
 * Avatar with an initials fallback on --color-primary-light.
 * (docs/07_design_system.md -> Avatar)
 */
export function Avatar({ name = '', src, size = 'sm', className }) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        'relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full',
        SIZES[size] ?? SIZES.sm,
        className,
      )}
    >
      {src ? (
        <AvatarPrimitive.Image
          src={src}
          alt={name}
          className="size-full object-cover"
        />
      ) : null}
      <AvatarPrimitive.Fallback
        delayMs={src ? 300 : 0}
        className="flex size-full items-center justify-center bg-primary-light font-semibold text-primary"
      >
        {initials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  )
}

/** Overlapping avatar cluster (right-to-left stacking, -8px overlap). */
export function AvatarGroup({ people = [], max = 3, size = 'sm', className }) {
  const visible = people.slice(0, max)
  const overflow = people.length - visible.length

  return (
    <div className={cn('flex items-center', className)}>
      {visible.map((person, index) => (
        <Avatar
          key={person.id ?? person.fullName ?? index}
          name={person.fullName}
          size={size}
          className="ring-2 ring-card first:ml-0 -ml-2"
        />
      ))}
      {overflow > 0 ? (
        <span
          className={cn(
            '-ml-2 inline-flex items-center justify-center rounded-full bg-overlay font-semibold text-ink-muted ring-2 ring-card',
            SIZES[size] ?? SIZES.sm,
          )}
        >
          +{overflow}
        </span>
      ) : null}
    </div>
  )
}

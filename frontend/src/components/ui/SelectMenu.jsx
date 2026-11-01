import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'
import { CaretDown, Check } from '@/components/icons'
import { cn } from '@/lib/utils'

/**
 * Modern SelectMenu powered by Radix UI DropdownMenu.
 * Handles value, options, icons, keyboard navigation, and check indicators.
 */
export function SelectMenu({
  value,
  onChange,
  options = [],
  placeholder = 'Select…',
  disabled = false,
  className,
  triggerClassName,
  align = 'start',
  size = 'md',
  ...props
}) {
  const selected = options.find((opt) => String(opt.value) === String(value))
  const displayLabel = selected ? selected.label : placeholder

  return (
    <DropdownMenuPrimitive.Root>
      <DropdownMenuPrimitive.Trigger
        disabled={disabled}
        className={cn(
          'group flex items-center justify-between gap-2 rounded-xl border border-line bg-card text-ink font-medium transition-all duration-150',
          'hover:bg-overlay hover:border-primary/40 focus:outline-none focus:ring-3 focus:ring-primary/15 focus:border-primary',
          'disabled:cursor-not-allowed disabled:opacity-50 text-left cursor-pointer',
          size === 'sm' ? 'h-8 px-2.5 text-tiny' : 'h-10 px-3.5 text-small',
          triggerClassName,
          className,
        )}
        {...props}
      >
        <span className={cn('truncate', !selected && 'text-ink-subtle font-normal')}>
          {displayLabel}
        </span>
        <CaretDown
          size={size === 'sm' ? 12 : 14}
          className="shrink-0 text-ink-subtle transition-transform duration-200 group-data-[state=open]:rotate-180"
        />
      </DropdownMenuPrimitive.Trigger>

      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          align={align}
          sideOffset={6}
          className={cn(
            'z-110 min-w-[var(--radix-dropdown-menu-trigger-width)] max-h-64 overflow-y-auto scroll-slim rounded-xl border border-line bg-card p-1 text-ink shadow-xl',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          )}
        >
          {options.map((option) => {
            const isSelected = String(option.value) === String(value)
            return (
              <DropdownMenuPrimitive.Item
                key={option.value}
                onSelect={() => onChange(option.value)}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-small outline-none transition-colors duration-100 select-none',
                  'data-[highlighted]:bg-overlay',
                  isSelected ? 'font-semibold text-primary bg-primary/10' : 'text-ink',
                )}
              >
                <div className="flex items-center gap-2 truncate">
                  {option.icon ? <span className="shrink-0 text-ink-muted">{option.icon}</span> : null}
                  <span className="truncate">{option.label}</span>
                </div>
                {isSelected ? <Check size={14} className="shrink-0 text-primary" weight="bold" /> : null}
              </DropdownMenuPrimitive.Item>
            )
          })}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  )
}


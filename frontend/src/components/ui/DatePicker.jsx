import { useRef } from 'react'
import DatePickerComponent from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { CalendarDays, CaretLeft, CaretRight } from '@/components/icons'
import { toDate } from '@/lib/date'
import { cn } from '@/lib/utils'

/**
 * DatePicker - standard, robust calendar component using react-datepicker.
 * Fully accessible, supporting direct typing, keyboard navigation, popover calendar,
 * custom accessible header with next/previous buttons, and built-in clearing.
 */
export function DatePicker({
  value = null,
  onChange,
  placeholder = 'No due date',
  disabled = false,
  className,
  id,
  'aria-label': ariaLabel,
  minDate,
  maxDate,
}) {
  const pickerRef = useRef(null)
  const selected = value ? (value instanceof Date ? value : toDate(value)) : null

  return (
    <div className={cn('relative w-full', className)}>
      <DatePickerComponent
        ref={pickerRef}
        id={id}
        aria-label={ariaLabel}
        selected={selected}
        onChange={(date) => onChange?.(date ?? null)}
        placeholderText={placeholder}
        disabled={disabled}
        dateFormat="MMM d, yyyy"
        isClearable={!disabled && Boolean(selected)}
        showPopperArrow={false}
        popperPlacement="bottom-start"
        popperClassName="tw-datepicker-popper"
        portalId="root"
        popperProps={{
          strategy: 'fixed',
        }}
        todayButton="Today"
        renderCustomHeader={({
          date,
          decreaseMonth,
          increaseMonth,
          prevMonthButtonDisabled,
          nextMonthButtonDisabled,
        }) => (
          <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
            <button
              type="button"
              onClick={decreaseMonth}
              disabled={prevMonthButtonDisabled}
              aria-label="Previous month"
              className="flex size-7 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-overlay hover:text-ink disabled:opacity-30 cursor-pointer"
            >
              <CaretLeft size={16} />
            </button>
            <span className="text-small font-semibold text-ink select-none">
              {date.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </span>
            <button
              type="button"
              onClick={increaseMonth}
              disabled={nextMonthButtonDisabled}
              aria-label="Next month"
              className="flex size-7 items-center justify-center rounded-lg text-ink-muted transition-colors hover:bg-overlay hover:text-ink disabled:opacity-30 cursor-pointer"
            >
              <CaretRight size={16} />
            </button>
          </div>
        )}
        className={cn(
          'flex h-11 w-full items-center rounded-xl border border-line bg-overlay px-3.5 pl-10 text-small text-ink transition-all duration-150',
          'placeholder:text-ink-subtle hover:border-primary/40 focus:border-primary focus:ring-3 focus:ring-primary/15 focus:outline-none',
          disabled && 'cursor-not-allowed opacity-60',
        )}
        calendarClassName="tw-calendar-popup"
        wrapperClassName="w-full"
        minDate={minDate}
        maxDate={maxDate}
      />
      <CalendarDays
        size={16}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle"
      />
    </div>
  )
}

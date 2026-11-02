import {
  differenceInCalendarDays,
  format,
  formatDistanceToNowStrict,
  isToday as isTodayFn,
  isValid,
  parseISO,
} from 'date-fns'
import { URGENCY } from '@/config/constants'

/** Coerce anything date-like into a valid Date, or null. */
export function toDate(value) {
  if (!value) return null
  const date = value instanceof Date ? value : parseISO(String(value))
  return isValid(date) ? date : null
}

/** Current instant as an ISO string (the wire format used by the API). */
export function nowIso() {
  return new Date().toISOString()
}

/** ISO string `days` in the past/future relative to now. */
export function isoOffsetDays(days, base = Date.now()) {
  return new Date(base + days * 24 * 60 * 60 * 1000).toISOString()
}

/** ISO string `hours` in the past/future relative to now. */
export function isoOffsetHours(hours, base = Date.now()) {
  return new Date(base + hours * 60 * 60 * 1000).toISOString()
}

/** Whole calendar days since `value` (positive = in the past). */
export function daysSince(value) {
  const date = toDate(value)
  if (!date) return Number.POSITIVE_INFINITY
  return differenceInCalendarDays(new Date(), date)
}

/** Whole calendar days until `value` (negative = already overdue). */
export function daysUntil(value) {
  const date = toDate(value)
  if (!date) return Number.POSITIVE_INFINITY
  return differenceInCalendarDays(date, new Date())
}

/** "10 days ago" / "in 3 hours" - strict, so it never says "almost". */
export function relativeTime(value) {
  const date = toDate(value)
  if (!date) return 'No activity yet'
  return formatDistanceToNowStrict(date, { addSuffix: true })
}

/** "15 Jul" */
export function shortDate(value) {
  const date = toDate(value)
  return date ? format(date, 'd MMM') : '—'
}

/** "Tuesday, 15 July" - used by the Today view greeting. */
export function longDate(value = new Date()) {
  const date = toDate(value) ?? new Date()
  return format(date, 'EEEE, d MMMM')
}

/** "15 Jul 2026" */
export function fullDate(value) {
  const date = toDate(value)
  return date ? format(date, 'd MMM yyyy') : '—'
}

/** "14:05" */
export function clockTime(value) {
  const date = toDate(value)
  return date ? format(date, 'HH:mm') : '—'
}

export function isToday(value) {
  const date = toDate(value)
  return date ? isTodayFn(date) : false
}

/**
 * Commitment urgency band.
 * docs/07_design_system.md -> Urgency Indicator:
 *   green  when due in >= 3 days (or no due date)
 *   amber  when due within 48 hours
 *   red    when overdue
 */
export function commitmentUrgency(dueDate, status = 'open') {
  if (status === 'completed') return URGENCY.OK
  const date = toDate(dueDate)
  if (!date) return URGENCY.OK
  const days = daysUntil(dueDate)
  if (days < 0) return URGENCY.OVERDUE
  if (days <= 2) return URGENCY.SOON
  return URGENCY.OK
}

/** Human phrasing used on commitment rows: "Overdue by 2 days". */
export function humaniseDueDate(dueDate, status = 'open') {
  const date = toDate(dueDate)
  if (!date) return 'No due date'
  const days = daysUntil(dueDate)
  if (status === 'completed') return `Due ${shortDate(dueDate)}`
  if (days < 0) {
    const late = Math.abs(days)
    return late === 0 ? 'Overdue' : `Overdue by ${late} day${late === 1 ? '' : 's'}`
  }
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  if (days <= 7) return `Due in ${days} days`
  return `Due ${shortDate(dueDate)}`
}

/** Greeting name for the Today view header. */
export function greetingFor(fullName = '') {
  const hour = new Date().getHours()
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const first = String(fullName).trim().split(/\s+/)[0] || 'there'
  return `${part}, ${first}`
}

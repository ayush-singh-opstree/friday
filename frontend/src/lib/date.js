import {
  differenceInCalendarDays,
  format,
  formatDistanceToNowStrict,
  isToday as isTodayFn,
  isValid,
  parseISO,
  startOfDay,
} from 'date-fns'
import { URGENCY } from '@/config/constants'

/**
 * Timestamps that carry a time but no timezone designator are treated as UTC.
 * The backend serialises naive UTC columns (e.g. "2026-11-03T06:30:00"), which
 * `parseISO` would otherwise read as *local* time - making a just-created record
 * look hours old in non-UTC zones such as IST. Strings that already carry a
 * designator ("Z" / "+05:30") or a bare date ("2026-11-03") are left untouched.
 */
const NAIVE_DATETIME = /^[0-9]{4}-[0-9]{2}-[0-9]{2}[ T][0-9]{2}:[0-9]{2}(:[0-9]{2})?([.][0-9]+)?$/

function normaliseIso(value) {
  const raw = String(value).trim()
  return NAIVE_DATETIME.test(raw) ? `${raw.replace(' ', 'T')}Z` : raw
}

/** Coerce anything date-like into a valid Date, or null. */
export function toDate(value) {
  if (!value) return null
  if (value instanceof Date) return isValid(value) ? value : null
  const date = parseISO(normaliseIso(value))
  return isValid(date) ? date : null
}

export function nowIso() {
  return new Date().toISOString()
}

/** ISO timestamp `days` from now (negative = past). */
export function isoOffsetDays(days, base = Date.now()) {
  return new Date(base + days * 24 * 60 * 60 * 1000).toISOString()
}

/** ISO timestamp `hours` from now (negative = past). */
export function isoOffsetHours(hours, base = Date.now()) {
  return new Date(base + hours * 60 * 60 * 1000).toISOString()
}

/** ISO timestamp for the end of today (17:00 local), used as a default due date. */
export function endOfTodayIso() {
  const date = startOfDay(new Date())
  date.setHours(17, 0, 0, 0)
  return date.toISOString()
}

/** Whole calendar days since `value` (positive = past). */
export function daysSince(value) {
  const date = toDate(value)
  if (!date) return Number.POSITIVE_INFINITY
  return differenceInCalendarDays(new Date(), date)
}

/** Whole calendar days until `value` (negative = overdue). */
export function daysUntil(value) {
  const date = toDate(value)
  if (!date) return Number.POSITIVE_INFINITY
  return differenceInCalendarDays(date, new Date())
}

/** "10 days ago" - strict, so it never reports "almost 10 days". */
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

/** "Tuesday, 15 July" - the Today view subtitle. */
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

/**
 * Human duration between two instants, e.g. "under a minute", "45 min", "1h 10m".
 * Returns null when either end is missing (e.g. a still-running session), so the
 * caller can omit it instead of showing a bogus value.
 */
export function durationBetween(startValue, endValue) {
  const start = toDate(startValue)
  const end = toDate(endValue)
  if (!start || !end) return null
  const totalMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000))
  if (totalMinutes < 1) return 'under a minute'
  if (totalMinutes < 60) return `${totalMinutes} min`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`
}

/** Value for an <input type="date"> (yyyy-MM-dd). */
export function toDateInputValue(value) {
  const date = toDate(value)
  return date ? format(date, 'yyyy-MM-dd') : ''
}

/** Interpret an <input type="date"> value as end of that local day. */
export function fromDateInputValue(value) {
  return endOfDayIso(value)
}

/**
 * ISO timestamp for 17:00 local on the given day - the app's default due time,
 * so a commitment due "today" is due end of the working day.
 */
export function endOfDayIso(value) {
  const date = toDate(value)
  if (!date) return null
  const end = new Date(date)
  end.setHours(17, 0, 0, 0)
  return end.toISOString()
}

export function isToday(value) {
  const date = toDate(value)
  return date ? isTodayFn(date) : false
}

/**
 * Commitment urgency band.
 * docs/07_design_system.md -> Urgency Indicator:
 *   green  when due in >= 3 days, or no due date
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

/**
 * Presentation metadata for a commitment row: one status chip that answers
 * "what state is this in?" plus the tone to render it with. Ordered by
 * importance so the most urgent signal wins.
 *
 * @returns {{ key: 'completed'|'overdue'|'soon'|'open', label: string, tone: string }}
 */
export function commitmentStatusMeta(dueDate, status = 'open') {
  if (status === 'completed') return { key: 'completed', label: 'Completed', tone: 'success' }
  const urgency = commitmentUrgency(dueDate, status)
  if (urgency === URGENCY.OVERDUE) return { key: 'overdue', label: 'Overdue', tone: 'danger' }
  if (urgency === URGENCY.SOON) return { key: 'soon', label: 'Due soon', tone: 'warning' }
  return { key: 'open', label: 'Open', tone: 'neutral' }
}

/** Human phrasing for commitment rows: "Overdue by 2 days", "Due tomorrow". */
export function humaniseDueDate(dueDate, status = 'open') {
  const date = toDate(dueDate)
  if (!date) return 'No due date'
  const days = daysUntil(dueDate)
  if (status === 'completed') return `Due ${shortDate(dueDate)}`
  if (days < 0) {
    const late = Math.abs(days)
    return `Overdue by ${late} ${late === 1 ? 'day' : 'days'}`
  }
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  if (days <= 7) return `Due in ${days} days`
  return `Due ${shortDate(dueDate)}`
}

/** "Good morning, Meera" for the Today view header. */
export function greetingFor(fullName = '') {
  const hour = new Date().getHours()
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const first = String(fullName).trim().split(/\s+/)[0] || 'there'
  return `${part}, ${first}`
}

/** Group a list by "calendar bucket": Overdue / Today / This week / Later. */
export function dueBucket(dueDate, status = 'open') {
  if (status === 'completed') return 'completed'
  if (!dueDate) return 'no_date'
  const days = daysUntil(dueDate)
  if (days < 0) return 'overdue'
  if (days === 0) return 'today'
  if (days <= 7) return 'this_week'
  return 'later'
}

export const DUE_BUCKET_LABELS = Object.freeze({
  overdue: 'Overdue',
  today: 'Today',
  this_week: 'This week',
  later: 'Later',
  no_date: 'No due date',
  completed: 'Completed',
})

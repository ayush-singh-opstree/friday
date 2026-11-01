/**
 * Single clock helper so every seed file derives its dates from one "now".
 * Dates are relative, which keeps the demo looking live every time it loads.
 */
export function isoTimestamp(base = Date.now()) {
  const DAY = 24 * 60 * 60 * 1000
  const HOUR = 60 * 60 * 1000
  const at = (offset) => new Date(base + offset).toISOString()

  return {
    /** ISO timestamp `n` days from now (negative = days ago). */
    days: (n) => at(n * DAY),
    /** ISO timestamp `n` hours from now (negative = hours ago). */
    hours: (n) => at(n * HOUR),
    /** Today at 09:00 local - used for "due today" fixtures. */
    today: () => {
      const date = new Date(base)
      date.setHours(9, 0, 0, 0)
      return date.toISOString()
    },
    now: () => new Date(base).toISOString(),
  }
}

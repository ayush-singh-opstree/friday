/** Tiny clock helper so every seed file derives dates from a single "now". */
export function isoTimestamp(base = Date.now()) {
  const day = 24 * 60 * 60 * 1000
  const hour = 60 * 60 * 1000
  const at = (offset) => new Date(base + offset).toISOString()

  return {
    /** ISO timestamp `n` days from now (negative = days ago). */
    days: (n) => at(n * day),
    /** ISO timestamp `n` hours from now. */
    hours: (n) => at(n * hour),
    /** Start of the current day. */
    today: () => {
      const d = new Date(base)
      d.setHours(9, 0, 0, 0)
      return d.toISOString()
    },
    now: () => new Date(base).toISOString(),
  }
}

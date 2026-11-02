import { useEffect, useState } from 'react'
import { searchApi } from '@/apis'
import { useDebounce } from './useDebounce'

/**
 * Cross-entity search (Feature 12 / Requirement 9).
 *
 * Sends nothing for queries shorter than 2 characters, debounces at 250ms and
 * ignores stale responses so fast typing can't render an older result set.
 */
export function useSearch(query) {
  const debounced = useDebounce(query, 250)
  const term = debounced.trim()

  const [state, setState] = useState({ term: '', status: 'idle', results: null, error: null })

  useEffect(() => {
    if (term.length < 2) return undefined
    let cancelled = false

    const run = async () => {
      // Yield first so we never setState synchronously inside the effect body.
      await Promise.resolve()
      if (cancelled) return
      setState((previous) => ({ ...previous, term, status: 'loading' }))

      try {
        const results = await searchApi.query(term)
        if (!cancelled) setState({ term, status: 'ready', results, error: null })
      } catch (error) {
        if (!cancelled) {
          setState({ term, status: 'error', results: null, error: error?.message ?? 'Search failed.' })
        }
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [term])

  const active = term.length >= 2
  const fresh = active && state.term === term

  return {
    term,
    active,
    status: !active ? 'idle' : fresh ? state.status : 'loading',
    results: fresh ? state.results : null,
    error: fresh ? state.error : null,
  }
}
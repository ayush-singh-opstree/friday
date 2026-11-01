import { useCallback, useEffect, useMemo } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
import { findPersonMatch } from '@/services'
import { usePeopleStore } from '@/store'

/** People directory access with debounced search. */
export function usePeople({ autoLoad = true, query = '' } = {}) {
  const people = usePeopleStore((state) => state.people)
  const status = usePeopleStore((state) => state.status)
  const error = usePeopleStore((state) => state.error)
  const debouncedQuery = useDebounce(query, 250)

  useEffect(() => {
    if (!autoLoad) return
    usePeopleStore.getState().fetchPeople({ query: debouncedQuery })
  }, [autoLoad, debouncedQuery])

  const refresh = useCallback((nextQuery) => usePeopleStore.getState().fetchPeople({ query: nextQuery }), [])
  const createPerson = useCallback((payload) => usePeopleStore.getState().createPerson(payload), [])

  return { people, status, error, isLoading: status === 'loading', refresh, createPerson }
}

/**
 * Resolve the page context against the directory.
 * @param {import('@/types/models').PageContext | null} context
 */
export function usePersonMatch(context) {
  const people = usePeopleStore((state) => state.people)

  return useMemo(() => {
    if (!context) return { state: 'unknown', person: null, confidence: 0, reason: 'no page context' }
    if (!context.name && !context.email && !context.linkedInUrl) {
      return { state: 'unmatched', person: null, confidence: 0, reason: 'nothing detected' }
    }

    const match = findPersonMatch(people, {
      name: context.name,
      email: context.email,
      organisation: context.organisation,
      linkedInUrl: context.linkedInUrl ?? context.url,
      url: context.url,
    })

    if (!match.person) {
      return { state: 'unmatched', person: null, confidence: 0, reason: match.reason }
    }
    return { state: 'matched', person: match.person, confidence: match.confidence, reason: match.reason }
  }, [context, people])
}

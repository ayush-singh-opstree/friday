import { useCallback, useEffect } from 'react'
import {
  useAttentionStore,
  useCommitmentStore,
  usePeopleStore,
  useThreadStore,
} from '@/store'

/**
 * Data hooks.
 *
 * Every hook reads from its Zustand store (single source of truth) and exposes
 * a small, ergonomic API to components. `autoLoad` lets a page opt out when the
 * data is already warm.
 */

/** Thread list + filter/sort controls. */
export function useThreads({ autoLoad = true, filter, sort } = {}) {
  const threads = useThreadStore((state) => state.threads)
  const status = useThreadStore((state) => state.status)
  const error = useThreadStore((state) => state.error)
  const activeFilter = useThreadStore((state) => state.filter)
  const activeSort = useThreadStore((state) => state.sort)

  useEffect(() => {
    if (!autoLoad) return
    useThreadStore.getState().fetchThreads({ filter, sort })
  }, [autoLoad, filter, sort])

  return {
    threads,
    status,
    error,
    filter: activeFilter,
    sort: activeSort,
    isLoading: status === 'loading',
    refresh: useCallback(() => useThreadStore.getState().fetchThreads(), []),
    setFilter: useCallback((value) => useThreadStore.getState().setFilter(value), []),
    setSort: useCallback((value) => useThreadStore.getState().setSort(value), []),
    togglePin: useCallback((id, isPinned) => useThreadStore.getState().togglePin(id, isPinned), []),
    archiveThread: useCallback((id) => useThreadStore.getState().archiveThread(id), []),
    snoozeThread: useCallback((id, days) => useThreadStore.getState().snoozeThread(id, days), []),
  }
}

/** Today view payload from the Attention Engine. */
export function useAttention({ autoLoad = true } = {}) {
  const topThreads = useAttentionStore((state) => state.topThreads)
  const dueToday = useAttentionStore((state) => state.dueToday)
  const overdue = useAttentionStore((state) => state.overdue)
  const goingCold = useAttentionStore((state) => state.goingCold)
  const upcoming = useAttentionStore((state) => state.upcoming)
  const inboxCount = useAttentionStore((state) => state.inboxCount)
  const status = useAttentionStore((state) => state.status)
  const error = useAttentionStore((state) => state.error)

  useEffect(() => {
    if (!autoLoad) return
    useAttentionStore.getState().fetchToday()
  }, [autoLoad])

  return {
    topThreads,
    dueToday,
    overdue,
    goingCold,
    upcoming,
    inboxCount,
    status,
    error,
    isLoading: status === 'loading',
    refresh: useCallback(() => useAttentionStore.getState().fetchToday(), []),
  }
}

/** People directory with debounced search. */
export function usePeople({ autoLoad = true, query = '' } = {}) {
  const people = usePeopleStore((state) => state.people)
  const status = usePeopleStore((state) => state.status)
  const error = usePeopleStore((state) => state.error)

  useEffect(() => {
    if (!autoLoad) return
    usePeopleStore.getState().fetchPeople({ query })
  }, [autoLoad, query])

  return {
    people,
    status,
    error,
    isLoading: status === 'loading',
    search: useCallback((value) => usePeopleStore.getState().setQuery(value), []),
    createPerson: useCallback((payload) => usePeopleStore.getState().createPerson(payload), []),
  }
}

/** Unified commitments view with owner filters. */
export function useCommitments({ autoLoad = true, threadId } = {}) {
  const commitments = useCommitmentStore((state) => state.commitments)
  const status = useCommitmentStore((state) => state.status)
  const error = useCommitmentStore((state) => state.error)
  const ownerFilter = useCommitmentStore((state) => state.ownerFilter)
  const groupBy = useCommitmentStore((state) => state.groupBy)
  const showCompleted = useCommitmentStore((state) => state.showCompleted)

  useEffect(() => {
    if (!autoLoad) return
    useCommitmentStore.getState().fetchCommitments({ threadId })
  }, [autoLoad, threadId])

  return {
    commitments,
    status,
    error,
    ownerFilter,
    groupBy,
    showCompleted,
    isLoading: status === 'loading',
    refresh: useCallback(
      () => useCommitmentStore.getState().fetchCommitments({ threadId }),
      [threadId],
    ),
    setOwnerFilter: useCallback((value) => useCommitmentStore.getState().setOwnerFilter(value), []),
    setGroupBy: useCallback((value) => useCommitmentStore.getState().setGroupBy(value), []),
    toggleShowCompleted: useCallback(() => useCommitmentStore.getState().toggleShowCompleted(), []),
    complete: useCallback(
      (id, note) => useCommitmentStore.getState().completeCommitment(id, note),
      [],
    ),
  }
}
import { useCallback, useEffect } from 'react'
import { useThreadStore } from '@/store'

/**
 * Thread list + detail access.
 * @param {{ autoLoad?: boolean, filter?: string, sort?: string }} [options]
 */
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

  const refresh = useCallback(() => useThreadStore.getState().fetchThreads(), [])
  const setFilter = useCallback((value) => useThreadStore.getState().setFilter(value), [])
  const setSort = useCallback((value) => useThreadStore.getState().setSort(value), [])
  const selectThread = useCallback((id) => useThreadStore.getState().selectThread(id), [])
  const pinThread = useCallback(
    (id, isPinned) => useThreadStore.getState().pinThread(id, isPinned),
    [],
  )
  const archiveThread = useCallback((id) => useThreadStore.getState().archiveThread(id), [])
  const snoozeThread = useCallback((id, days) => useThreadStore.getState().snoozeThread(id, days), [])

  return {
    threads,
    status,
    error,
    filter: activeFilter,
    sort: activeSort,
    isLoading: status === 'loading',
    isReady: status === 'ready',
    refresh,
    setFilter,
    setSort,
    selectThread,
    pinThread,
    archiveThread,
    snoozeThread,
  }
}

/** Currently selected thread and its detail payload. */
export function useThreadDetail() {
  const selectedThreadId = useThreadStore((state) => state.selectedThreadId)
  const thread = useThreadStore((state) => state.selectedThread)
  const captures = useThreadStore((state) => state.captures)
  const commitments = useThreadStore((state) => state.commitments)
  const timeline = useThreadStore((state) => state.timeline)
  const summaries = useThreadStore((state) => state.summaries)
  const status = useThreadStore((state) => state.detailStatus)

  const select = useCallback((id) => useThreadStore.getState().selectThread(id), [])
  const clear = useCallback(() => useThreadStore.getState().selectThread(null), [])
  const refresh = useCallback(() => {
    const current = useThreadStore.getState().selectedThreadId
    return current ? useThreadStore.getState().selectThread(current) : Promise.resolve(null)
  }, [])

  return {
    threadId: selectedThreadId,
    thread,
    captures,
    commitments,
    timeline,
    summaries,
    status,
    isLoading: status === 'loading',
    select,
    clear,
    refresh,
  }
}

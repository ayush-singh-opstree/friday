import { useCallback, useEffect } from 'react'
import { useAttentionStore } from '@/store'

/**
 * Attention Engine payload for the Today view: the top 5 threads by score,
 * commitments due today, overdue commitments and going-cold threads.
 */
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

  const refresh = useCallback(() => useAttentionStore.getState().fetchToday(), [])
  const recompute = useCallback((threadId) => useAttentionStore.getState().recompute(threadId), [])

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
    refresh,
    recompute,
  }
}

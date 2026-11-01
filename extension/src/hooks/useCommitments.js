import { useCallback, useEffect } from 'react'
import { useCommitmentStore } from '@/store'

/** Unified commitments view with owner filters (All / Mine / Theirs / Overdue). */
export function useCommitments({ autoLoad = true, threadId, owner } = {}) {
  const commitments = useCommitmentStore((state) => state.commitments)
  const status = useCommitmentStore((state) => state.status)
  const error = useCommitmentStore((state) => state.error)
  const ownerFilter = useCommitmentStore((state) => state.ownerFilter)

  useEffect(() => {
    if (!autoLoad) return
    useCommitmentStore.getState().fetchCommitments({ threadId, owner })
  }, [autoLoad, threadId, owner])

  const refresh = useCallback(
    () => useCommitmentStore.getState().fetchCommitments({ threadId, owner }),
    [threadId, owner],
  )
  const setOwnerFilter = useCallback(
    (value) => useCommitmentStore.getState().setOwnerFilter(value),
    [],
  )
  const complete = useCallback(
    (id, note) => useCommitmentStore.getState().completeCommitment(id, note),
    [],
  )
  const create = useCallback((payload) => useCommitmentStore.getState().createCommitment(payload), [])

  return {
    commitments,
    status,
    error,
    ownerFilter,
    isLoading: status === 'loading',
    refresh,
    setOwnerFilter,
    complete,
    create,
  }
}

import { useCallback, useMemo, useState } from 'react'
import { useCaptureStore } from '@/store'
import { inferCaptureType, looksLikeCommitment, parseDueDate, stripCommand } from '@/lib/patterns'
import { useDebounce } from './useDebounce'

/**
 * Quick Capture behaviour (Feature 3 / docs/05_user_flows.md -> Flow 3).
 *
 * Owns the draft state, the type selector, an optional thread assignment and
 * the two smart-detection affordances: "looks like a commitment" and a parsed
 * due date.
 *
 * @param {{ threadId?: string | null, personId?: string | null,
 *           source?: string, onSaved?: (capture: any) => void }} [options]
 */
export function useQuickCapture({
  threadId = null,
  personId = null,
  source = 'extension',
  onSaved,
} = {}) {
  const [content, setContent] = useState('')
  const [type, setType] = useState('note')
  /** null = Inbox */
  const [targetThreadId, setTargetThreadId] = useState(threadId)
  const [error, setError] = useState(null)
  const [lastSaved, setLastSaved] = useState(null)

  const saving = useCaptureStore((state) => state.saving)
  const debouncedContent = useDebounce(content, 500)

  // Adjust state during render (React's recommended pattern) instead of via an
  // effect, so changing the target thread never causes a cascading render.
  const [lastThreadId, setLastThreadId] = useState(threadId)
  if (threadId !== lastThreadId) {
    setLastThreadId(threadId)
    setTargetThreadId(threadId)
  }

  const canSave = content.trim().length > 0 && !saving

  /** Smart detection: does the draft read like a promise? */
  const commitmentSuggestion = useMemo(() => {
    if (!looksLikeCommitment(debouncedContent)) return null
    return {
      text: debouncedContent.trim(),
      dueDate: parseDueDate(debouncedContent),
      suggestedType: inferCaptureType(debouncedContent),
    }
  }, [debouncedContent])

  const save = useCallback(async () => {
    const cleaned = stripCommand(content).trim()
    if (!cleaned) {
      setError('Add something to capture.')
      return null
    }
    setError(null)
    try {
      const capture = await useCaptureStore.getState().createCapture({
        content: cleaned,
        type,
        threadId: targetThreadId,
        personId,
        source,
      })
      setLastSaved(capture ?? null)
      setContent('')
      setType('note')
      onSaved?.(capture)
      return capture
    } catch (saveError) {
      setError(saveError?.message ?? 'Could not save that capture.')
      return null
    }
  }, [content, type, targetThreadId, personId, source, onSaved])

  const reset = useCallback(() => {
    setContent('')
    setType('note')
    setError(null)
  }, [])

  return {
    content,
    setContent,
    type,
    setType,
    targetThreadId,
    setTargetThreadId,
    saving,
    error,
    canSave,
    commitmentSuggestion,
    lastSaved,
    save,
    reset,
  }
}

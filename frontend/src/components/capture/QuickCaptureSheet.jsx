import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, Sparkle, X } from '@phosphor-icons/react'
import { CAPTURE_MAX_LENGTH, CAPTURE_TYPES } from '@/config/constants'
import { inferCaptureType, looksLikeCommitment, parseDueDate } from '@/lib/patterns'
import { useCaptureStore, useThreadStore, useUiStore } from '@/store'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Textarea } from '@/components/ui/Controls'
import { cn } from '@/lib/utils'

/**
 * Quick Capture (Feature 4).
 *
 * Global capture sheet: FAB or Cmd/Ctrl+K, auto-focus, type selection, thread
 * assignment and smart commitment detection (docs/05_user_flows.md -> Flow 3).
 */
/**
 * Outer shell: mounts the form only while the sheet is open, so draft state
 * resets naturally and no state is copied inside an effect.
 */
export function QuickCaptureSheet() {
  const quickCapture = useUiStore((state) => state.quickCapture)
  if (!quickCapture.open) return null
  return (
    <QuickCaptureForm
      key={quickCapture.threadId ?? 'inbox'}
      initialThreadId={quickCapture.threadId}
    />
  )
}

function QuickCaptureForm({ initialThreadId }) {
  const closeQuickCapture = useUiStore((state) => state.closeQuickCapture)
  const pushToast = useUiStore((state) => state.pushToast)
  const createCapture = useCaptureStore((state) => state.createCapture)
  const saving = useCaptureStore((state) => state.saving)
  const threads = useThreadStore((state) => state.threads)

  const [content, setContent] = useState('')
  const [type, setType] = useState('note')
  const [threadId, setThreadId] = useState(initialThreadId ?? null)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  // Auto-focus on mount (Feature 4 -> "Text field auto-focuses on open").
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 60)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeQuickCapture()
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        inputRef.current?.form?.requestSubmit()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closeQuickCapture])

  const suggestion = useMemo(
    () =>
      looksLikeCommitment(content)
        ? { dueDate: parseDueDate(content), type: inferCaptureType(content) }
        : null,
    [content],
  )

  const overLimit = content.length > CAPTURE_MAX_LENGTH

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!content.trim()) return setError('Add something to capture.')
    if (overLimit) return setError(`Captures are limited to ${CAPTURE_MAX_LENGTH} characters.`)

    try {
      await createCapture({ content, type, threadId, source: 'manual' })
      pushToast(threadId ? 'Capture added to the thread.' : 'Saved to your Inbox.', 'success')
      closeQuickCapture()
    } catch (submitError) {
      setError(submitError?.message ?? 'Could not save that capture.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-90 flex items-end justify-center bg-black/40 backdrop-blur-[2px] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Quick capture"
      onMouseDown={(event) => event.target === event.currentTarget && closeQuickCapture()}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full rounded-t-lg bg-card p-4 shadow-lg sm:max-w-lg sm:rounded-lg"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-heading-3 text-ink">Quick capture</h2>
          <button
            type="button"
            onClick={closeQuickCapture}
            aria-label="Close"
            className="rounded-sm p-1 text-ink-subtle hover:bg-overlay hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>

        <Textarea
          ref={inputRef}
          rows={4}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="What just happened? e.g. Aditya wants the API spec by Monday"
          invalid={Boolean(error)}
          aria-label="Capture text"
        />

        <div className="mt-1.5 flex items-center justify-between text-tiny text-ink-subtle">
          <span>{threadId ? 'Filed into the selected thread' : 'Saves to your Inbox'}</span>
          <span className={cn(overLimit && 'font-semibold text-danger')}>
            {content.length}/{CAPTURE_MAX_LENGTH}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {CAPTURE_TYPES.map((option) => (
            <button key={option.value} type="button" onClick={() => setType(option.value)}>
              <Chip tone={type === option.value ? option.value : 'neutral'}>
                {type === option.value ? <Check size={11} weight="bold" /> : null}
                {option.label}
              </Chip>
            </button>
          ))}
        </div>

        <label
          htmlFor="capture-thread"
          className="mt-3 mb-1 block text-tiny font-medium text-ink-muted"
        >
          Assign to a thread
        </label>
        <select
          id="capture-thread"
          value={threadId ?? ''}
          onChange={(event) => setThreadId(event.target.value || null)}
          className="h-10 w-full rounded-md border border-line bg-overlay px-3 text-small text-ink focus:border-primary focus:outline-none"
        >
          <option value="">Inbox (unassigned)</option>
          {threads
            .filter((thread) => thread.status === 'active')
            .map((thread) => (
              <option key={thread.id} value={thread.id}>
                {thread.title}
              </option>
            ))}
        </select>

        {suggestion ? (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-primary/25 bg-primary-light px-3 py-2.5">
            <Sparkle size={15} weight="fill" className="mt-0.5 shrink-0 text-primary" />
            <p className="text-small text-ink">
              This looks like a commitment.{' '}
              <button
                type="button"
                className="font-medium text-primary underline"
                onClick={() => setType('action')}
              >
                Track it as an action
              </button>
            </p>
          </div>
        ) : null}

        {error ? <p className="mt-2 text-small text-danger">{error}</p> : null}

        <div className="mt-4 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={closeQuickCapture}>
            Cancel
          </Button>
          <Button type="submit" loading={saving} disabled={overLimit || !content.trim()}>
            Save capture
          </Button>
        </div>
      </form>
    </div>
  )
}
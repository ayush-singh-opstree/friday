import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CalendarBlank, Check, Sparkle, X } from '@/components/icons'
import { aiApi } from '@/apis'
import { CAPTURE_MAX_LENGTH, CAPTURE_TYPES, CAPTURE_TYPE_MAP } from '@/config/constants'
import { inferCaptureType, looksLikeCommitment, parseDueDate } from '@/lib/patterns'
import { useCaptureStore, useThreadStore, useUiStore } from '@/store'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { Textarea } from '@/components/ui/Controls'
import { SelectMenu } from '@/components/ui/SelectMenu'
import { cn } from '@/lib/utils'
import { motion } from 'motion/react'

/**
 * Quick Capture (Feature 4).
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
  const [dueDate, setDueDate] = useState('')
  const [threadId, setThreadId] = useState(initialThreadId ?? null)
  const [error, setError] = useState(null)
  const [aiHint, setAiHint] = useState(null)
  const inputRef = useRef(null)

  const reset = useCallback(() => {
    setContent('')
    setType('note')
    setDueDate('')
    setError(null)
  }, [])

  const handleClose = useCallback(() => {
    reset()
    closeQuickCapture()
  }, [reset, closeQuickCapture])

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 60)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === 'Escape') handleClose()
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        inputRef.current?.form?.requestSubmit()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleClose])

  const suggestion = useMemo(
    () =>
      looksLikeCommitment(content)
        ? { dueDate: parseDueDate(content), type: inferCaptureType(content) }
        : null,
    [content],
  )

  // Server-side AI classification (POST /ai/classify). Debounced so typing stays
  // snappy, and strictly optional: if the model/endpoint is unavailable the local
  // heuristic `suggestion` above still drives the flow. The hint is stored
  // alongside the text it was computed for, so a stale result never renders
  // against newer input (and no state is set synchronously in the effect body).
  useEffect(() => {
    const text = content.trim()
    if (text.length < 8) return undefined
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        const result = await aiApi.classify(text)
        if (!cancelled) setAiHint({ text, data: result })
      } catch {
        if (!cancelled) setAiHint({ text, data: null })
      }
    }, 600)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [content])

  const aiSuggestion =
    aiHint && aiHint.text === content.trim() && content.trim().length >= 8 ? aiHint.data : null

  const overLimit = content.length > CAPTURE_MAX_LENGTH

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!content.trim()) return setError('Add something to capture.')
    if (overLimit) return setError(`Captures are limited to ${CAPTURE_MAX_LENGTH} characters.`)

    try {
      await createCapture({
        content,
        type,
        threadId,
        deadline: dueDate || undefined,
        dueDate: dueDate || undefined,
        source: 'manual',
      })
      pushToast(threadId ? 'Capture added to the thread.' : 'Saved to your Inbox.', 'success')
      reset()
      closeQuickCapture()
    } catch (submitError) {
      setError(submitError?.message ?? 'Could not save that capture.')
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-90 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Quick capture"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onMouseDown={(event) => event.target === event.currentTarget && handleClose()}
    >
      <motion.form
        onSubmit={handleSubmit}
        className="w-full rounded-t-2xl bg-card border border-line/60 border-b-0 p-5 shadow-2xl sm:max-w-lg sm:rounded-2xl sm:border-b"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-heading-3 font-semibold text-ink">Quick capture</h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="flex size-7 items-center justify-center rounded-lg text-ink-subtle transition-all hover:bg-overlay hover:text-ink"
          >
            <X size={15} />
          </button>
        </div>

        {/* Textarea */}
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
          <span>{threadId ? 'Filing into selected thread' : 'Saves to Inbox'}</span>
          <span className={cn(overLimit && 'font-semibold text-danger')}>
            {content.length}/{CAPTURE_MAX_LENGTH}
          </span>
        </div>

        {/* Type chips */}
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

        {/* Commitment Due Date */}
        {type === 'commitment' ? (
          <div className="mt-3 rounded-xl border border-line bg-surface/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="qc-due-date" className="text-small font-medium text-ink flex items-center gap-1.5">
                <CalendarBlank size={14} className="text-primary" />
                Due date (Commitment)
              </label>
              <input
                id="qc-due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-8 rounded-lg border border-line bg-card px-2.5 text-tiny text-ink focus:border-primary focus:outline-none"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="mt-2 flex items-center justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setDueDate(new Date().toISOString().split('T')[0])}
                className="rounded-md border border-line bg-card px-2 py-0.5 text-tiny text-ink-muted hover:border-primary/40 hover:text-primary transition-colors cursor-pointer"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDueDate(new Date(Date.now() + 86400000).toISOString().split('T')[0])}
                className="rounded-md border border-line bg-card px-2 py-0.5 text-tiny text-ink-muted hover:border-primary/40 hover:text-primary transition-colors cursor-pointer"
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => setDueDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0])}
                className="rounded-md border border-line bg-card px-2 py-0.5 text-tiny text-ink-muted hover:border-primary/40 hover:text-primary transition-colors cursor-pointer"
              >
                Next week
              </button>
            </div>
          </div>
        ) : null}

        {/* Thread selector */}
        <div className="mt-3">
          <label className="mb-1.5 block text-small font-medium text-ink">
            Assign to thread
          </label>
          <SelectMenu
            value={threadId ?? ''}
            onChange={(val) => setThreadId(val || null)}
            options={[
              { value: '', label: 'Inbox (unassigned)' },
              ...threads
                .filter((thread) => thread.status === 'active')
                .map((thread) => ({
                  value: thread.id,
                  label: thread.title,
                })),
            ]}
            className="w-full h-11"
          />
        </div>

        {/* Smart suggestion */}
        {suggestion ? (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary-light px-3.5 py-3">
            <Sparkle size={15} weight="fill" className="mt-0.5 shrink-0 text-primary" />
            <p className="text-small text-ink">
              Looks like a commitment.{' '}
              <button
                type="button"
                className="font-semibold text-primary underline underline-offset-2"
                onClick={() => setType('commitment')}
              >
                Track as commitment
              </button>
            </p>
          </div>
        ) : null}

        {/* AI suggestion (POST /ai/classify) - accepts type + thread in one tap */}
        {aiSuggestion && aiSuggestion.suggestedType && aiSuggestion.suggestedType !== type ? (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-line bg-overlay px-3.5 py-3">
            <Sparkle size={15} weight="fill" className="mt-0.5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-small text-ink">
                AI suggests a{' '}
                <span className="font-semibold">
                  {CAPTURE_TYPE_MAP[aiSuggestion.suggestedType]?.label ??
                    aiSuggestion.suggestedType}
                </span>
                {aiSuggestion.suggestedThreadId
                  ? ` filed into “${
                      threads.find((thread) => thread.id === aiSuggestion.suggestedThreadId)
                        ?.title ?? 'a thread'
                    }”`
                  : ''}
                {typeof aiSuggestion.confidence === 'number'
                  ? ` · ${Math.round(aiSuggestion.confidence * 100)}% confidence`
                  : ''}
              </p>
              <button
                type="button"
                className="mt-1 text-small font-semibold text-primary underline underline-offset-2"
                onClick={() => {
                  setType(aiSuggestion.suggestedType)
                  if (aiSuggestion.suggestedThreadId) setThreadId(aiSuggestion.suggestedThreadId)
                }}
              >
                Apply suggestion
              </button>
            </div>
          </div>
        ) : null}

        {error ? <p className="mt-2 text-small text-danger">{error}</p> : null}

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between gap-2 border-t border-line pt-4">
          <p className="text-tiny text-ink-subtle hidden sm:block">
            <kbd className="rounded bg-overlay px-1.5 py-0.5 font-mono text-[11px]">Ctrl+K</kbd> to open · <kbd className="rounded bg-overlay px-1.5 py-0.5 font-mono text-[11px]">Ctrl+Enter</kbd> to save
          </p>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} disabled={overLimit || !content.trim()}>
              Save capture
            </Button>
          </div>
        </div>
      </motion.form>
    </motion.div>
  )
}

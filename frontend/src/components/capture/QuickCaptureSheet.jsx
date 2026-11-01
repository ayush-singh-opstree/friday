import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Sparkle, X } from '@/components/icons'
import { CAPTURE_MAX_LENGTH, CAPTURE_TYPES } from '@/config/constants'
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
  const [threadId, setThreadId] = useState(initialThreadId ?? null)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const reset = useCallback(() => {
    setContent('')
    setType('note')
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

  const overLimit = content.length > CAPTURE_MAX_LENGTH

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!content.trim()) return setError('Add something to capture.')
    if (overLimit) return setError(`Captures are limited to ${CAPTURE_MAX_LENGTH} characters.`)

    try {
      await createCapture({ content, type, threadId, source: 'manual' })
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
                onClick={() => setType('action')}
              >
                Track as action
              </button>
            </p>
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

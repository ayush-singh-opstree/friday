import { useState } from 'react'
import { ArrowLeft, ArrowRight, Brain, Check, Lightning, Sparkle, Trash } from '@/components/icons'
import { inferCaptureType, stripCommand } from '@/lib/patterns'
import { useCaptureStore, useThreadStore, useUiStore } from '@/store'
import { aiApi } from '@/apis'
import { Button } from '@/components/ui/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'
import { cn, uid } from '@/lib/utils'

/**
 * Brain Dump (Feature 7).
 *
 * Rapid multi-line entry: one thought per line. On review each line becomes a
 * capture with an inferred type and a suggested thread, then the whole session
 * is filed in one batch. Supports both AI Smart Triage (Gemini) and Instant Rules.
 */
export function BrainDumpDialog({ open, onOpenChange }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined}>
        {open ? <BrainDumpContent onOpenChange={onOpenChange} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function BrainDumpContent({ onOpenChange }) {
  const threads = useThreadStore((state) => state.threads)
  const createCapture = useCaptureStore((state) => state.createCapture)
  const pushToast = useUiStore((state) => state.pushToast)

  const [step, setStep] = useState('dump')
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem('brain_dump_mode') || 'ai'
    } catch {
      return 'ai'
    }
  })
  const [text, setText] = useState('')
  const [entries, setEntries] = useState([])
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleModeChange = (newMode) => {
    setMode(newMode)
    try {
      localStorage.setItem('brain_dump_mode', newMode)
    } catch {
      // ignore
    }
  }

  /** Cheap local matcher; used for Instant Rules and offline fallback. */
  const suggestThreadId = (content) => {
    const needle = content.toLowerCase()
    const scored = threads
      .filter((thread) => thread.status === 'active')
      .map((thread) => {
        const words = thread.title
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter((word) => word.length > 3)
        return { thread, score: words.filter((word) => needle.includes(word)).length }
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
    return scored[0]?.thread.id ?? null
  }

  const startReview = async () => {
    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)

    if (lines.length === 0) {
      pushToast('Type at least one line to dump.', 'warning')
      return
    }

    if (mode === 'rules') {
      // 100% instant local heuristics
      setEntries(
        lines.map((line) => ({
          id: uid('dump'),
          content: stripCommand(line),
          type: inferCaptureType(line),
          threadId: suggestThreadId(line),
          confidence: null,
          reasoning: null,
          sourceMode: 'rules',
          include: true,
        })),
      )
      setStep('review')
      return
    }

    // AI Smart Triage (Gemini / AI backend)
    setAnalyzing(true)
    try {
      const parsedEntries = await Promise.all(
        lines.map(async (line) => {
          const cleaned = stripCommand(line)
          const localType = inferCaptureType(line)
          const localThreadId = suggestThreadId(line)

          try {
            const aiRes = await aiApi.classify(cleaned)

            // Check if backend returned the static fallback stub (caused when Gemini hits quota 429 or is offline)
            const isFallbackStub =
              aiRes?.confidence === 0.75 &&
              aiRes?.reasoning === 'General observation or meeting context.' &&
              aiRes?.suggestedType === 'note'

            if (isFallbackStub) {
              // The backend's Gemini API was rate-limited or offline and defaulted to a generic 75% note.
              // Apply smart local pattern detection so we correctly identify actions, decisions, and questions.
              const finalType = localType !== 'note' ? localType : 'note'
              const finalThreadId = aiRes?.suggestedThreadId ?? localThreadId
              return {
                id: uid('dump'),
                content: cleaned,
                type: finalType,
                threadId: finalThreadId,
                confidence: finalType !== 'note' ? 0.88 : 0.75,
                reasoning:
                  finalType !== 'note'
                    ? `Smart Pattern: Detected ${finalType} intent (Gemini Quota Exceeded)`
                    : 'General observation or note (Gemini Quota Exceeded)',
                sourceMode: 'fallback',
                include: true,
              }
            }

            // Real AI response was received from Gemini!
            return {
              id: uid('dump'),
              content: cleaned,
              type: aiRes?.suggestedType || localType,
              threadId: aiRes?.suggestedThreadId ?? localThreadId,
              confidence: aiRes?.confidence ?? null,
              reasoning: aiRes?.reasoning || 'Classified by Gemini AI',
              sourceMode: 'ai',
              include: true,
            }
          } catch {
            return {
              id: uid('dump'),
              content: cleaned,
              type: localType,
              threadId: localThreadId,
              confidence: 0.85,
              reasoning: `Smart Rule: ${localType.toUpperCase()}`,
              sourceMode: 'fallback',
              include: true,
            }
          }
        }),
      )

      setEntries(parsedEntries)
      setStep('review')
    } catch {
      pushToast('AI triage unavailable, falling back to instant rules.', 'warning')
      setEntries(
        lines.map((line) => ({
          id: uid('dump'),
          content: stripCommand(line),
          type: inferCaptureType(line),
          threadId: suggestThreadId(line),
          confidence: null,
          reasoning: 'Local fallback',
          sourceMode: 'fallback',
          include: true,
        })),
      )
      setStep('review')
    } finally {
      setAnalyzing(false)
    }
  }

  const fileAll = async () => {
    const included = entries.filter((entry) => entry.include && entry.content.trim())
    if (included.length === 0) {
      pushToast('Nothing selected to file.', 'warning')
      return
    }

    setSaving(true)
    let saved = 0
    for (const entry of included) {
      try {
        await createCapture({
          content: entry.content,
          type: entry.type,
          threadId: entry.threadId,
          source: 'brain_dump',
        })
        saved += 1
      } catch {
        // One failed line must not discard the whole session.
      }
    }
    setSaving(false)

    pushToast(
      `${saved} of ${included.length} lines filed.`,
      saved === included.length ? 'success' : 'warning',
    )
    onOpenChange(false)
  }

  const updateEntry = (id, patch) => {
    setEntries((current) =>
      current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    )
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          <span className="flex items-center gap-1.5">
            <Brain size={17} weight="duotone" className="text-primary" />
            Brain dump
          </span>
        </DialogTitle>
        <DialogDescription>
          {step === 'dump'
            ? mode === 'ai'
              ? 'One thought per line. AI Smart Triage analyzes type and thread with Gemini.'
              : 'One thought per line. Instant rules evaluate types and threads locally.'
            : entries.some((e) => e.sourceMode === 'ai')
              ? 'Triaged with Gemini AI. Adjust assignments and types before filing.'
              : 'Triaged with Instant Rules. Adjust assignments and types before filing.'}
        </DialogDescription>
      </DialogHeader>

      {step === 'dump' ? (
        <div className="space-y-3">
          {/* Segmented Mode Selector */}
          <div className="flex items-center justify-between rounded-lg border border-line bg-overlay/60 p-1">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handleModeChange('ai')}
                disabled={analyzing}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-tiny font-medium transition-all cursor-pointer',
                  mode === 'ai'
                    ? 'bg-card text-primary shadow-xs ring-1 ring-line font-semibold'
                    : 'text-ink-subtle hover:text-ink',
                )}
              >
                <Sparkle size={13} weight={mode === 'ai' ? 'bold' : 'regular'} className={mode === 'ai' ? 'text-primary' : ''} />
                <span>AI Smart Triage</span>
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('rules')}
                disabled={analyzing}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-tiny font-medium transition-all cursor-pointer',
                  mode === 'rules'
                    ? 'bg-card text-primary shadow-xs ring-1 ring-line font-semibold'
                    : 'text-ink-subtle hover:text-ink',
                )}
              >
                <Lightning size={13} weight={mode === 'rules' ? 'bold' : 'regular'} className={mode === 'rules' ? 'text-primary' : ''} />
                <span>Instant Rules</span>
              </button>
            </div>

            <span className="text-[11px] text-ink-subtle pr-1.5 hidden sm:inline">
              {mode === 'ai' ? 'Gemini AI reasoning' : 'Offline regex matching'}
            </span>
          </div>

          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            disabled={analyzing}
            rows={8}
            autoFocus
            placeholder={
              'Call Priya about design handoff\nAditya wants the API spec by Monday\nInvestor call — ask about the Series A intro'
            }
            className="w-full resize-none rounded-md border border-line bg-overlay px-3 py-2.5 text-body leading-relaxed focus:border-primary focus:outline-none disabled:opacity-50"
          />

          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={analyzing}>
              Cancel
            </Button>
            <Button onClick={startReview} loading={analyzing} disabled={analyzing}>
              {analyzing ? (
                'Analyzing with AI...'
              ) : (
                <>
                  Review
                  {mode === 'ai' ? <Sparkle size={14} weight="bold" /> : <ArrowRight size={14} weight="bold" />}
                </>
              )}
            </Button>
          </DialogFooter>
        </div>
      ) : (
        <div>
          {/* Top banner summarizing the AI triage results */}
          <div
            className={cn(
              'mb-3 flex items-center justify-between rounded-lg border px-3 py-2 text-tiny',
              entries.some((e) => e.sourceMode === 'ai')
                ? 'border-primary/25 bg-primary-light/40 text-primary-dark'
                : entries.some((e) => e.sourceMode === 'fallback')
                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200'
                  : 'border-line bg-overlay/60 text-ink-muted',
            )}
          >
            <div className="flex items-center gap-2">
              {entries.some((e) => e.sourceMode === 'ai') ? (
                <Sparkle size={15} weight="fill" className="text-primary" />
              ) : entries.some((e) => e.sourceMode === 'fallback') ? (
                <Sparkle size={15} className="text-amber-600" />
              ) : (
                <Lightning size={15} className="text-primary" />
              )}
              <span className="font-semibold text-ink">
                {entries.some((e) => e.sourceMode === 'ai')
                  ? `AI Triaged ${entries.length} ${entries.length === 1 ? 'thought' : 'thoughts'}`
                  : entries.some((e) => e.sourceMode === 'fallback')
                    ? `AI Quota Exceeded · Smart Triage Applied (${entries.length} ${entries.length === 1 ? 'item' : 'items'})`
                    : `Classified ${entries.length} ${entries.length === 1 ? 'thought' : 'thoughts'} (Instant Rules)`}
              </span>
            </div>
            <span className="text-[11px] text-ink-subtle">
              Review & adjust before filing
            </span>
          </div>

          <ul className="flex max-h-80 flex-col gap-2.5 overflow-y-auto scroll-slim pr-0.5">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className={cn(
                  'rounded-lg border p-3 transition-colors',
                  entry.include
                    ? 'border-line bg-card shadow-2xs'
                    : 'border-line bg-overlay/60 opacity-60',
                )}
              >
                <div className="flex items-start gap-2.5">
                  <button
                    type="button"
                    onClick={() => updateEntry(entry.id, { include: !entry.include })}
                    aria-pressed={entry.include}
                    aria-label={entry.include ? 'Exclude line' : 'Include line'}
                    className={cn(
                      'mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full border cursor-pointer transition-colors',
                      entry.include
                        ? 'border-primary bg-primary text-white'
                        : 'border-line bg-card hover:border-primary/60',
                    )}
                  >
                    {entry.include ? <Check size={11} weight="bold" /> : null}
                  </button>
                  <p className="min-w-0 flex-1 text-small font-medium text-ink leading-relaxed">
                    {entry.content}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setEntries((current) => current.filter((row) => row.id !== entry.id))
                    }
                    aria-label="Remove line"
                    className="rounded-sm p-1 text-ink-subtle hover:text-danger hover:bg-danger/10 transition-colors cursor-pointer"
                  >
                    <Trash size={13} />
                  </button>
                </div>

                <div className="mt-2.5 flex flex-wrap items-center gap-2 pl-7">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-ink-subtle font-medium">Type:</span>
                    <select
                      value={entry.type}
                      onChange={(event) => updateEntry(entry.id, { type: event.target.value })}
                      aria-label="Change capture type"
                      className="h-7 rounded-md border border-line bg-overlay px-2 text-tiny font-semibold capitalize text-ink focus:border-primary focus:outline-none"
                    >
                      <option value="note">Note</option>
                      <option value="commitment">Commitment</option>
                      <option value="decision">Decision</option>
                      <option value="question">Question</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 flex-1 min-w-[180px]">
                    <span className="text-[11px] text-ink-subtle font-medium">Thread:</span>
                    <select
                      value={entry.threadId ?? ''}
                      onChange={(event) =>
                        updateEntry(entry.id, { threadId: event.target.value || null })
                      }
                      aria-label="Assign thread"
                      className="h-7 flex-1 rounded-md border border-line bg-card px-2 text-tiny text-ink focus:border-primary focus:outline-none"
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
                  </div>
                </div>

                {/* AI Response details card */}
                {entry.sourceMode === 'ai' && (
                  <div className="mt-2.5 ml-7 rounded-md border border-primary/20 bg-primary-light/25 px-2.5 py-1.5 text-tiny">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                        <Sparkle size={12} weight="fill" className="text-primary" />
                        AI Analysis
                      </span>
                      {typeof entry.confidence === 'number' && (
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.5 text-[10px] font-bold tracking-tight',
                            entry.confidence >= 0.85
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                              : entry.confidence >= 0.7
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                                : 'bg-overlay text-ink-subtle',
                          )}
                        >
                          {Math.round(entry.confidence * 100)}% confidence
                        </span>
                      )}
                    </div>
                    {entry.reasoning && (
                      <p className="mt-1 text-[11px] leading-snug text-ink-muted">
                        {entry.reasoning}
                      </p>
                    )}
                  </div>
                )}

                {/* Fallback notice if AI was offline or quota exceeded */}
                {entry.sourceMode === 'fallback' && (
                  <div className="mt-2.5 ml-7 rounded-md border border-amber-500/25 bg-amber-500/10 px-2.5 py-1.5 text-tiny">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                        <Sparkle size={12} className="text-amber-600" />
                        Smart Triage (AI Quota Fallback)
                      </span>
                      {typeof entry.confidence === 'number' && (
                        <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                          {Math.round(entry.confidence * 100)}% match
                        </span>
                      )}
                    </div>
                    {entry.reasoning && (
                      <p className="mt-1 text-[11px] leading-snug text-ink-muted">
                        {entry.reasoning}
                      </p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setStep('dump')} disabled={saving}>
              <ArrowLeft size={13} />
              Back
            </Button>
            <Button onClick={fileAll} loading={saving}>
              File {entries.filter((entry) => entry.include).length} lines
            </Button>
          </DialogFooter>
        </div>
      )}
    </>
  )
}

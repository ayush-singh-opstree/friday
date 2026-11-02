import { useState } from 'react'
import { ArrowCounterClockwise, CopySimple, Robot, Warning } from '@/components/icons'
import { aiApi } from '@/apis'
import { Can } from '@/authorization'
import { CAPABILITIES } from '@/authorization/permissions'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { EmptyState, Skeleton } from '@/components/ui/Feedback'
import { relativeTime } from '@/lib/date'
import { useThreadStore, useUiStore } from '@/store'

/**
 * Brief tab (Features 8 + 9).
 *
 * Shows "Where We Left Off" and the Pre-Meeting Brief. Regeneration goes through
 * POST /ai/summarise/:id and /ai/brief/:id. If generation fails we fall back to
 * a locally-compiled digest of the last 5 captures and open commitments, as
 * docs/03_feature_specs.md requires.
 */
export function BriefTab({ thread, summaries = [], captures = [], commitments = [] }) {
  const pushToast = useUiStore((state) => state.pushToast)
  const selectThread = useThreadStore((state) => state.selectThread)

  const [local, setLocal] = useState({ where_we_left_off: null, pre_meeting_brief: null })
  const [busy, setBusy] = useState(null)
  const [fallback, setFallback] = useState(null)

  const existing = (type) =>
    local[type] ?? summaries.find((summary) => summary.type === type) ?? null

  const generate = async (type) => {
    if (!thread) return
    setBusy(type)
    setFallback(null)
    try {
      const data =
        type === 'pre_meeting_brief'
          ? await aiApi.brief(thread.id)
          : await aiApi.summarise(thread.id)
      setLocal((current) => ({ ...current, [type]: data?.summary ?? null }))
      pushToast('Brief regenerated.', 'success')
      selectThread(thread.id)
    } catch {
      setFallback(type)
      pushToast('AI is unavailable — showing the compiled fallback.', 'warning')
    } finally {
      setBusy(null)
    }
  }

  const copy = async (summary) => {
    if (!summary) return
    const content = summary.content ?? {}
    const text = [
      content.lastContactSummary,
      content.keyTopics?.length ? `Topics: ${content.keyTopics.join(', ')}` : '',
      content.openCommitments?.length
        ? `Open commitments:\n- ${content.openCommitments.join('\n- ')}`
        : '',
      content.talkingPoints?.length
        ? `Talking points:\n- ${content.talkingPoints.join('\n- ')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n\n')

    try {
      await navigator.clipboard.writeText(text)
      pushToast('Brief copied to clipboard.', 'success')
    } catch {
      pushToast('Could not access the clipboard.', 'danger')
    }
  }

  return (
    <Can
      capability={CAPABILITIES.AI_BRIEF}
      fallback={
        <EmptyState
          icon={<Robot size={26} weight="duotone" />}
          title="AI briefs are a Pro feature"
          description="Upgrade to Friday Pro to generate Where We Left Off summaries and Pre-Meeting Briefs."
        />
      }
    >
      <div className="flex flex-col gap-4">
        <BriefCard
          title="Where we left off"
          summary={existing('where_we_left_off')}
          loading={busy === 'where_we_left_off'}
          showFallback={fallback === 'where_we_left_off'}
          fallbackData={{ captures, commitments }}
          onRegenerate={() => generate('where_we_left_off')}
          onCopy={copy}
        />

        <BriefCard
          title="Pre-meeting brief"
          summary={existing('pre_meeting_brief')}
          loading={busy === 'pre_meeting_brief'}
          showFallback={fallback === 'pre_meeting_brief'}
          fallbackData={{ captures, commitments }}
          onRegenerate={() => generate('pre_meeting_brief')}
          onCopy={copy}
          withTalkingPoints
        />
      </div>
    </Can>
  )
}

function Section({ label, children }) {
  return (
    <div>
      <h4 className="mb-1 text-tiny font-semibold tracking-[0.08em] text-ink-subtle uppercase">
        {label}
      </h4>
      {children}
    </div>
  )
}

function BriefCard({
  title,
  summary,
  loading,
  showFallback,
  fallbackData,
  onRegenerate,
  onCopy,
  withTalkingPoints = false,
}) {
  const content = summary?.content

  return (
    <Card className="p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-1.5 text-heading-3 text-ink">
          <Robot size={15} weight="duotone" className="text-primary" />
          {title}
        </h3>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onRegenerate}
            loading={loading}
            aria-label={`Regenerate ${title}`}
          >
            <ArrowCounterClockwise size={13} />
            Regenerate
          </Button>
          {summary ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onCopy(summary)}
              aria-label={`Copy ${title}`}
            >
              <CopySimple size={13} />
            </Button>
          ) : null}
        </div>
      </div>

      {loading && !content ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-11/12" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      ) : content ? (
        <div className="flex flex-col gap-3">
          {content.lastContactSummary ? (
            <p className="text-body text-ink">{content.lastContactSummary}</p>
          ) : null}

          {content.keyTopics?.length ? (
            <Section label="Key topics">
              <ul className="flex flex-wrap gap-1.5">
                {content.keyTopics.map((topic) => (
                  <li
                    key={topic}
                    className="rounded-full bg-overlay px-2.5 py-0.5 text-tiny text-ink-muted"
                  >
                    {topic}
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}

          {content.openCommitments?.length ? (
            <Section label="Open commitments">
              <ul className="list-disc space-y-0.5 pl-4 text-small text-ink">
                {content.openCommitments.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Section>
          ) : null}

          {withTalkingPoints && content.talkingPoints?.length ? (
            <Section label="Talking points">
              <ul className="list-disc space-y-0.5 pl-4 text-small text-ink">
                {content.talkingPoints.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Section>
          ) : null}

          {content.nextSteps?.length ? (
            <Section label="Next steps">
              <ul className="list-disc space-y-0.5 pl-4 text-small text-ink">
                {content.nextSteps.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </Section>
          ) : null}

          <p className="text-tiny text-ink-subtle">
            Generated {relativeTime(summary?.generatedAt)}
            {summary?.sourceCaptures?.length
              ? ` · based on ${summary.sourceCaptures.length} captures`
              : ''}
          </p>
        </div>
      ) : showFallback ? (
        <CompiledFallback {...fallbackData} />
      ) : (
        <p className="text-small text-ink-muted">
          No summary yet. Regenerate to build one from this thread&apos;s captures.
        </p>
      )}
    </Card>
  )
}

/** Degraded mode: last 5 captures + open commitments (documented fallback). */
function CompiledFallback({ captures = [], commitments = [] }) {
  const recent = [...captures]
    .sort((a, b) => new Date(b.capturedAt) - new Date(a.capturedAt))
    .slice(0, 5)
  const open = commitments.filter((row) => row.status === 'open')

  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-start gap-1.5 rounded-sm bg-warning/10 px-2.5 py-2 text-tiny text-[#8a5a06]">
        <Warning size={13} weight="bold" className="mt-0.5 shrink-0" />
        AI generation is unavailable. Showing the compiled fallback.
      </p>

      <Section label="Recent context">
        <ul className="space-y-1 text-small text-ink">
          {recent.length === 0 ? (
            <li className="text-ink-subtle">No captures yet.</li>
          ) : (
            recent.map((capture) => <li key={capture.id}>“{capture.content}”</li>)
          )}
        </ul>
      </Section>

      <Section label="Open commitments">
        <ul className="list-disc space-y-0.5 pl-4 text-small text-ink">
          {open.length === 0 ? (
            <li className="text-ink-subtle">Nothing outstanding.</li>
          ) : (
            open.map((commitment) => <li key={commitment.id}>{commitment.description}</li>)
          )}
        </ul>
      </Section>
    </div>
  )
}
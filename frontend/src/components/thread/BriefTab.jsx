import { useState } from 'react'
import { ArrowCounterClockwise, CopySimple, Robot, Sparkle, Warning } from '@/components/icons'
import { aiApi } from '@/apis'
import { Can } from '@/authorization'
import { CAPABILITIES } from '@/authorization/permissions'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Chip } from '@/components/ui/Chip'
import { EmptyState, Skeleton } from '@/components/ui/Feedback'
import { relativeTime } from '@/lib/date'
import { cn } from '@/lib/utils'
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
          description="A quick recap of your last interaction with this thread."
          summary={existing('where_we_left_off')}
          loading={busy === 'where_we_left_off'}
          showFallback={fallback === 'where_we_left_off'}
          fallbackData={{ captures, commitments }}
          onRegenerate={() => generate('where_we_left_off')}
          onCopy={copy}
        />

        <BriefCard
          title="Pre-meeting brief"
          description="Talking points and context for your next conversation."
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
      <h4 className="mb-1.5 text-tiny font-semibold tracking-[0.08em] text-ink-subtle uppercase">
        {label}
      </h4>
      {children}
    </div>
  )
}

const BULLET_TONES = {
  primary: 'bg-primary/50',
  warning: 'bg-warning/70',
  success: 'bg-success/60',
}

/** Clean, flat bulleted list with a small tone-coloured marker. */
function BulletList({ items, tone = 'primary' }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-2.5 text-small leading-relaxed text-ink">
          <span
            aria-hidden="true"
            className={cn('mt-2 size-1.5 shrink-0 rounded-full', BULLET_TONES[tone])}
          />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function BriefCard({
  title,
  description,
  summary,
  loading,
  showFallback,
  fallbackData,
  onRegenerate,
  onCopy,
  withTalkingPoints = false,
}) {
  const content = summary?.content
  // Keep a single action per state: header shows Regenerate only once there is
  // something to regenerate; the empty state owns the initial Generate CTA.
  const showHeaderAction = Boolean(summary) || showFallback

  return (
    <Card className="overflow-hidden rounded-2xl border-line/80 p-0 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line/60 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <Robot size={15} weight="duotone" />
          </span>
          <div className="min-w-0">
            <h3 className="text-heading-3 font-semibold tracking-tight text-ink">{title}</h3>
            {description ? <p className="text-tiny text-ink-muted">{description}</p> : null}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {summary ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-tiny"
              onClick={() => onCopy(summary)}
              aria-label={`Copy ${title}`}
            >
              <CopySimple size={13} />
              <span className="hidden sm:inline">Copy</span>
            </Button>
          ) : null}
          {showHeaderAction ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2.5 text-tiny"
              onClick={onRegenerate}
              loading={loading}
              aria-label={`Regenerate ${title}`}
            >
              <ArrowCounterClockwise size={13} />
              Regenerate
            </Button>
          ) : null}
        </div>
      </div>

      <div className="px-4 py-3.5">
        {loading && !content ? (
          <div className="flex flex-col gap-2.5">
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-11/12" />
            <Skeleton className="h-3.5 w-3/4" />
          </div>
        ) : content ? (
          <div className="flex flex-col gap-4">
            {content.lastContactSummary ? (
              <p className="text-body leading-relaxed text-ink">{content.lastContactSummary}</p>
            ) : null}

            {content.keyTopics?.length ? (
              <Section label="Key topics">
                <div className="flex flex-wrap gap-1.5">
                  {content.keyTopics.map((topic) => (
                    <Chip key={topic} tone="neutral">
                      {topic}
                    </Chip>
                  ))}
                </div>
              </Section>
            ) : null}

            {content.openCommitments?.length ? (
              <Section label="Open commitments">
                <BulletList items={content.openCommitments} tone="warning" />
              </Section>
            ) : null}

            {withTalkingPoints && content.talkingPoints?.length ? (
              <Section label="Talking points">
                <BulletList items={content.talkingPoints} tone="primary" />
              </Section>
            ) : null}

            {content.nextSteps?.length ? (
              <Section label="Next steps">
                <BulletList items={content.nextSteps} tone="success" />
              </Section>
            ) : null}

            <div className="flex items-center gap-1.5 border-t border-line/60 pt-3 text-tiny text-ink-subtle">
              <Sparkle size={11} weight="fill" className="text-accent" />
              <span>
                Generated {relativeTime(summary?.generatedAt)}
                {summary?.sourceCaptures?.length
                  ? ` · based on ${summary.sourceCaptures.length} captures`
                  : ''}
              </span>
            </div>
          </div>
        ) : showFallback ? (
          <CompiledFallback {...fallbackData} />
        ) : (
          <EmptyBrief onGenerate={onRegenerate} loading={loading} />
        )}
      </div>
    </Card>
  )
}

/** Friendly empty state with a one-tap generate action. */
function EmptyBrief({ onGenerate, loading }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-card/50 px-4 py-7 text-center">
      <span className="flex size-9 items-center justify-center rounded-full bg-overlay text-ink-subtle">
        <Robot size={16} weight="duotone" />
      </span>
      <p className="text-small font-medium text-ink">Nothing generated yet</p>
      <p className="max-w-xs text-tiny text-ink-subtle">
        Build a brief from this thread&apos;s captures and commitments.
      </p>
      <Button size="sm" className="mt-1 gap-1.5" onClick={onGenerate} loading={loading}>
        <Sparkle size={13} weight="fill" />
        Generate
      </Button>
    </div>
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
      <p className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-tiny text-[#8a5a06]">
        <Warning size={13} weight="bold" className="mt-0.5 shrink-0" />
        <span>AI generation is unavailable. Showing the compiled fallback.</span>
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
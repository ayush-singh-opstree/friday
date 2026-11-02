import { URGENCY_STYLES } from '@/config/constants'
import { attentionBand } from '@/lib/attention'
import { commitmentUrgency } from '@/lib/date'
import { cn } from '@/lib/utils'

/**
 * Attention score badge - 28px circle, band colour at 15% opacity background
 * (docs/07_design_system.md -> Attention Score Badge).
 */
export function AttentionScoreBadge({ score = 0, className }) {
  const band = attentionBand(score)
  const tones = {
    low: 'bg-line/60 text-ink-subtle',
    medium: 'bg-primary/15 text-primary',
    high: 'bg-accent/20 text-[#B9760F]',
    very_high: 'bg-danger/15 text-danger',
    critical: 'bg-danger/20 text-danger',
  }

  return (
    <span
      title={`Attention score ${score} · ${band.label}`}
      className={cn(
        'inline-flex size-7 shrink-0 items-center justify-center rounded-full text-tiny font-bold tabular-nums',
        tones[band.key] ?? tones.low,
        className,
      )}
    >
      {score}
    </span>
  )
}

/** 8px urgency dot for commitments. Pulses only when overdue. */
export function UrgencyDot({ dueDate, status = 'open', className }) {
  const urgency = commitmentUrgency(dueDate, status)
  const meta = URGENCY_STYLES[urgency]

  return (
    <span
      aria-label={meta.label}
      title={meta.label}
      className={cn(
        'inline-block size-2 shrink-0 rounded-full',
        meta.dot,
        meta.animate && 'animate-pulse',
        className,
      )}
    />
  )
}

/** Tier badge used by the authorization gates. */
export function PlanBadge({ plan = 'free', className }) {
  const isPaid = plan === 'pro' || plan === 'team'
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1 rounded-full px-2 text-tiny font-semibold uppercase tracking-wide',
        isPaid ? 'bg-primary-light text-primary' : 'bg-overlay text-ink-muted',
        className,
      )}
    >
      {plan}
    </span>
  )
}

/** Small numeric counter used on tabs and rails. */
export function CountBadge({ value = 0, className }) {
  if (!value) return null
  return (
    <span
      className={cn(
        'inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-overlay px-1.5 text-tiny font-semibold text-ink-muted tabular-nums',
        className,
      )}
    >
      {value}
    </span>
  )
}

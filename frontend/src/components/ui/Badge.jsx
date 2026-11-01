import { URGENCY_STYLES } from '@/config/constants'
import { attentionBand } from '@/lib/attention'
import { commitmentUrgency } from '@/lib/date'
import { cn } from '@/lib/utils'

/**
 * Attention score badge - 28px circle with the band colour at ~15% opacity
 * (docs/07_design_system.md -> Attention Score Badge).
 */
const BAND_TONES = {
  low: 'bg-line/60 text-ink-subtle',
  medium: 'bg-primary/15 text-primary',
  high: 'bg-accent/20 text-[#B9760F]',
  very_high: 'bg-danger/15 text-danger',
  critical: 'bg-danger/20 text-danger',
}

export function AttentionScoreBadge({ score = 0, className }) {
  const band = attentionBand(score)
  return (
    <span
      title={`Attention score ${score} · ${band.label}`}
      aria-label={`Attention score ${score}, ${band.label}`}
      className={cn(
        'inline-flex size-7 shrink-0 items-center justify-center rounded-full text-tiny font-bold tabular-nums',
        BAND_TONES[band.key] ?? BAND_TONES.low,
        className,
      )}
    >
      {score}
    </span>
  )
}

/** 8px commitment urgency dot. Pulses only when overdue. */
export function UrgencyDot({ dueDate, status = 'open', className }) {
  const meta = URGENCY_STYLES[commitmentUrgency(dueDate, status)]
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

/** Small numeric counter used on tabs and rails. */
export function CountBadge({ value = 0, className }) {
  if (!value) return null
  return (
    <span
      className={cn(
        'inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-overlay px-1.5 text-[10px] font-semibold text-ink-muted tabular-nums',
        className,
      )}
    >
      {value}
    </span>
  )
}

/** Plan tier badge used by upgrade prompts. */
export function PlanBadge({ plan = 'free', className }) {
  const paid = plan === 'pro' || plan === 'team'
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center rounded-full px-2 text-tiny font-semibold uppercase tracking-wide',
        paid ? 'bg-primary-light text-primary' : 'bg-overlay text-ink-muted',
        className,
      )}
    >
      {plan}
    </span>
  )
}
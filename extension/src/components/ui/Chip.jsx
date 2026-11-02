import {
  CheckSquare,
  Lightning,
  Note,
  Question,
  Snowflake,
} from '@/components/icons'
import { CAPTURE_TYPE_MAP } from '@/config/constants'
import { cn } from '@/lib/utils'

/**
 * Chip / Tag - 24px height, --radius-full, --text-tiny.
 * Tones follow the type variants in docs/07_design_system.md.
 */
export function Chip({ tone = 'neutral', icon = null, className, children }) {
  const tones = {
    neutral: 'bg-overlay text-ink-muted',
    primary: 'bg-primary-light text-primary',
    note: 'bg-[#EEF1FE] text-[#4F6AF5]',
    action: 'bg-[#FFF3E0] text-[#E67E22]',
    decision: 'bg-[#E8F5E9] text-[#27AE60]',
    question: 'bg-[#FCE4EC] text-[#E91E63]',
    cold: 'bg-[#E3F2FD] text-[#1565C0]',
    danger: 'bg-danger/10 text-danger',
    warning: 'bg-warning/15 text-[#B9760F]',
    success: 'bg-success/12 text-success',
  }

  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-tiny font-medium',
        tones[tone] ?? tones.neutral,
        className,
      )}
    >
      {icon}
      {children}
    </span>
  )
}

const TYPE_ICONS = {
  note: Note,
  action: Lightning,
  decision: CheckSquare,
  question: Question,
}

/** Chip for a capture type (Note / Action / Decision / Question). */
export function CaptureTypeChip({ type = 'note', className }) {
  const meta = CAPTURE_TYPE_MAP[type] ?? CAPTURE_TYPE_MAP.note
  const Icon = TYPE_ICONS[meta.value] ?? Note
  return (
    <Chip tone={meta.value} icon={<Icon size={12} weight="bold" />} className={className}>
      {meta.label}
    </Chip>
  )
}

/** Going-cold indicator chip (Feature 6). */
export function ColdChip({ days, className }) {
  return (
    <Chip tone="cold" icon={<Snowflake size={12} weight="bold" />} className={className}>
      {days ? `No contact in ${days}d` : 'Going cold'}
    </Chip>
  )
}

import { ArrowRight, GearSix, SidebarSimple, Sparkle, WifiSlash } from '@phosphor-icons/react'
import { ProtectedView } from '@/authorization'
import { Logo } from '@/components/common/Logo'
import {
  AttentionScoreBadge,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  IconButton,
  LoadingState,
  SectionHeader,
  Textarea,
} from '@/components/ui'
import { CAPTURE_TYPES } from '@/config/constants'
import { useAttention, useQuickCapture, useThreads } from '@/hooks'
import { openOptions, openSidePanel } from '@/lib/messaging'
import { relativeTime } from '@/lib/date'
import { useSyncStore } from '@/store'

/**
 * Popup - the fastest possible capture surface.
 *
 * Shows the top three attention threads and an always-ready Quick Capture form.
 * The full companion lives in the side panel.
 */
export function PopupPage() {
  return (
    <div className="flex min-h-[420px] flex-col bg-surface">
      <header className="flex items-center justify-between border-b border-line bg-card px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Logo size={22} />
          <span className="text-small font-semibold text-ink">Threadwise</span>
        </div>
        <IconButton label="Settings" size="sm" onClick={openOptions}>
          <GearSix size={15} />
        </IconButton>
      </header>

      <ProtectedView
        title="Sign in to Threadwise"
        description="Capture context from any page without leaving it."
      >
        <PopupBody />
      </ProtectedView>
    </div>
  )
}

function PopupBody() {
  const { threads } = useThreads({ autoLoad: true })
  const { topThreads, isLoading } = useAttention({ autoLoad: true })
  const capture = useQuickCapture({ source: 'extension' })
  const online = useSyncStore((state) => state.online)
  const queue = useSyncStore((state) => state.queue)

  const activeThreads = threads.filter((thread) => thread.status === 'active')

  return (
    <div className="flex flex-1 flex-col gap-3 p-3">
      <section>
        <SectionHeader label="Needs attention" />
        {isLoading && topThreads.length === 0 ? (
          <LoadingState label="Reading your threads…" className="py-6" />
        ) : topThreads.length === 0 ? (
          <EmptyState
            title="All clear"
            description="Nothing needs your attention right now."
            className="py-6"
          />
        ) : (
          <ul className="flex flex-col gap-1.5">
            {topThreads.slice(0, 3).map((thread) => (
              <li key={thread.id}>
                <Card className="flex items-center gap-2.5 p-2.5">
                  <AttentionScoreBadge score={thread.attentionScore ?? 0} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-small font-medium text-ink">{thread.title}</p>
                    <p className="truncate text-tiny text-ink-muted">
                      {thread.attentionReason || relativeTime(thread.lastInteractionAt)}
                    </p>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-auto">
        <SectionHeader label="Quick capture" />
        {!online || queue.length > 0 ? (
          <p className="mb-2 flex items-center gap-1.5 rounded-sm bg-warning/15 px-2 py-1.5 text-tiny text-[#8a5a06]">
            <WifiSlash size={12} weight="bold" />
            {online
              ? `${queue.length} change${queue.length === 1 ? '' : 's'} waiting to sync`
              : `${queue.length} saved locally — you're offline`}
          </p>
        ) : null}
        <form
          onSubmit={async (event) => {
            event.preventDefault()
            await capture.save()
          }}
          className="flex flex-col gap-2"
        >
          <Field htmlFor="popup-capture">
            <Textarea
              id="popup-capture"
              rows={3}
              value={capture.content}
              onChange={(event) => capture.setContent(event.target.value)}
              placeholder="What just happened?"
              invalid={Boolean(capture.error)}
              aria-label="Capture text"
            />
          </Field>

          <div className="flex flex-wrap gap-1">
            {CAPTURE_TYPES.map((option) => (
              <button key={option.value} type="button" onClick={() => capture.setType(option.value)}>
                <Chip tone={capture.type === option.value ? option.value : 'neutral'}>
                  {option.label}
                </Chip>
              </button>
            ))}
          </div>

          <label htmlFor="popup-thread" className="text-tiny font-medium text-ink-muted">
            Thread
          </label>
          <select
            id="popup-thread"
            value={capture.targetThreadId ?? ''}
            onChange={(event) => capture.setTargetThreadId(event.target.value || null)}
            className="h-9 w-full rounded-sm border border-line bg-overlay px-2 text-small text-ink focus:border-primary focus:outline-none"
          >
            <option value="">Inbox (unassigned)</option>
            {activeThreads.map((thread) => (
              <option key={thread.id} value={thread.id}>
                {thread.title}
              </option>
            ))}
          </select>

          {capture.commitmentSuggestion ? (
            <p className="flex items-start gap-1.5 rounded-sm bg-primary-light px-2 py-1.5 text-tiny text-ink">
              <Sparkle size={12} weight="fill" className="mt-0.5 shrink-0 text-primary" />
              Looks like a commitment.
              <button
                type="button"
                onClick={() => capture.setType('action')}
                className="font-semibold text-primary underline"
              >
                Track it
              </button>
            </p>
          ) : null}

          {capture.error ? <p className="text-tiny text-danger">{capture.error}</p> : null}

          <div className="flex gap-1.5">
            <Button
              type="submit"
              size="sm"
              loading={capture.saving}
              disabled={!capture.content.trim()}
              className="flex-1"
            >
              Save
              <ArrowRight size={12} weight="bold" />
            </Button>
            <Button variant="outline" size="sm" onClick={openSidePanel}>
              <SidebarSimple size={13} />
              Companion
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}
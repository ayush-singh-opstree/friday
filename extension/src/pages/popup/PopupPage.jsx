import { ArrowRight, Check, GearSix, SidebarSimple, Sparkle, WifiSlash } from '@/components/icons'
import { ProtectedView } from '@/authorization'
import { Logo } from '@/components/common/Logo'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import {
  AttentionScoreBadge,
  Button,
  Card,
  Chip,
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
import { cn } from '@/lib/utils'

/**
 * Popup - fast capture surface in the browser toolbar.
 */
export function PopupPage() {
  return (
    <div className="flex w-[360px] min-h-[440px] flex-col bg-surface">
      <header className="flex items-center justify-between border-b border-line bg-card/95 px-3.5 py-2.5 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Logo size={22} />
          <span className="text-small font-bold text-ink tracking-tight">Threadwise</span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <IconButton label="Settings" size="sm" onClick={openOptions}>
            <GearSix size={16} />
          </IconButton>
        </div>
      </header>

      <ProtectedView
        title="Sign in to Threadwise"
        description="Capture context and track promises from any page without switching tabs."
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
    <div className="flex flex-1 flex-col gap-3.5 p-3.5">
      {/* Needs Attention Snapshot */}
      <section>
        <SectionHeader label="Needs attention" />
        {isLoading && topThreads.length === 0 ? (
          <LoadingState label="Reading your threads…" className="py-4" />
        ) : topThreads.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-card/60 p-3 text-center">
            <p className="text-tiny font-medium text-ink-muted">Nothing urgent right now. All caught up!</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {topThreads.slice(0, 3).map((thread) => (
              <li key={thread.id}>
                <Card className="flex items-center gap-2.5 p-2.5 hover:border-primary/40 transition-colors">
                  <AttentionScoreBadge score={thread.attentionScore ?? 0} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-small font-semibold text-ink">{thread.title}</p>
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

      {/* Quick Capture Section */}
      <section className="mt-auto rounded-xl border border-line bg-card p-3 shadow-sm">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-tiny font-semibold tracking-[0.08em] text-ink-subtle uppercase">
            Quick capture
          </span>
          <span className="text-tiny text-ink-subtle">Saves to Inbox or Thread</span>
        </div>

        {!online || queue.length > 0 ? (
          <p className="mb-2 flex items-center gap-1.5 rounded-lg bg-warning/12 px-2.5 py-1.5 text-tiny font-medium text-[#8a5a06]">
            <WifiSlash size={12} weight="bold" />
            {online
              ? `${queue.length} change${queue.length === 1 ? '' : 's'} waiting to sync`
              : `${queue.length} saved locally — offline`}
          </p>
        ) : null}

        <form
          onSubmit={async (event) => {
            event.preventDefault()
            await capture.save()
          }}
          className="flex flex-col gap-2.5"
        >
          <Field htmlFor="popup-capture">
            <Textarea
              id="popup-capture"
              rows={3}
              value={capture.content}
              onChange={(event) => capture.setContent(event.target.value)}
              placeholder="What happened or what did you promise?"
              invalid={Boolean(capture.error)}
              aria-label="Capture text"
              className="text-small"
            />
          </Field>

          {/* Type chips */}
          <div className="flex flex-wrap gap-1">
            {CAPTURE_TYPES.map((option) => {
              const active = capture.type === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => capture.setType(option.value)}
                  className="cursor-pointer"
                >
                  <Chip tone={active ? option.value : 'neutral'} className={cn(active && 'font-semibold shadow-xs')}>
                    {active ? <Check size={11} weight="bold" /> : null}
                    {option.label}
                  </Chip>
                </button>
              )
            })}
          </div>

          {/* Thread assignment */}
          <div>
            <select
              id="popup-thread"
              value={capture.targetThreadId ?? ''}
              onChange={(event) => capture.setTargetThreadId(event.target.value || null)}
              className="h-9 w-full rounded-xl border border-line bg-overlay px-3 text-small text-ink transition-all focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/12 cursor-pointer"
            >
              <option value="">Inbox (unassigned)</option>
              {activeThreads.map((thread) => (
                <option key={thread.id} value={thread.id}>
                  {thread.title}
                </option>
              ))}
            </select>
          </div>

          {capture.commitmentSuggestion ? (
            <p className="flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary-light px-2.5 py-1.5 text-tiny text-ink">
              <Sparkle size={12} weight="fill" className="shrink-0 text-primary" />
              <span>Looks like a promise.</span>
              <button
                type="button"
                onClick={() => capture.setType('action')}
                className="font-bold text-primary underline underline-offset-2 ml-auto"
              >
                Track as action
              </button>
            </p>
          ) : null}

          {capture.error ? <p className="text-tiny font-medium text-danger">{capture.error}</p> : null}

          <div className="mt-1 flex items-center gap-2 pt-1 border-t border-line/60">
            <Button
              type="submit"
              size="sm"
              loading={capture.saving}
              disabled={!capture.content.trim()}
              className="flex-1 gap-1.5"
            >
              Save
              <ArrowRight size={13} weight="bold" />
            </Button>
            <Button variant="outline" size="sm" onClick={openSidePanel} className="gap-1.5">
              <SidebarSimple size={14} />
              Companion
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}

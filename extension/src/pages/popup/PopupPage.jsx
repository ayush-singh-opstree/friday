import { GearSix } from '@/components/icons'
import { ProtectedView } from '@/authorization'
import { Logo } from '@/components/common/Logo'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { IconButton } from '@/components/ui'
import { ThreadSessionFlow } from '@/components/threads/ThreadSessionFlow'
import { openOptions, openSidePanel } from '@/lib/messaging'
import { useUiStore } from '@/store'

/**
 * Popup - Clean, focused extension popup:
 * - Starts with Create New Thread / Search / Recent Threads (No Needs Attention).
 * - Full thread creation -> Add people (existing/create new) -> Active capture session -> Stop & Club.
 * - Live capture session timer shown in top heading beside UI toggle.
 */
export function PopupPage() {
  const activeSession = useUiStore((state) => state.activeSession)

  const formatTimer = (seconds = 0) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <div className="flex w-[370px] min-h-[470px] flex-col bg-surface">
      <header className="flex items-center justify-between border-b border-line bg-card/95 px-3.5 py-2 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Logo size={22} />
          <span className="text-small font-bold text-ink tracking-tight">Threadwise</span>
        </div>
        <div className="flex items-center gap-1.5">
          {activeSession ? (
            <div
              className="flex items-center gap-1.5 rounded-full border border-danger/30 bg-danger/10 px-2 py-0.5 text-tiny font-medium text-danger animate-pulse"
              title={`Recording capture session for: ${activeSession.threadTitle}`}
            >
              <span className="size-1.5 rounded-full bg-danger" />
              <span className="font-mono text-tiny font-bold tabular-nums">
                {formatTimer(activeSession.elapsed)}
              </span>
            </div>
          ) : null}
          <ThemeToggle />
          <IconButton label="Settings" size="sm" onClick={openOptions}>
            <GearSix size={16} />
          </IconButton>
        </div>
      </header>

      <ProtectedView
        title="Sign in to Threadwise"
        description="Capture context and track commitments from any page without switching tabs."
      >
        <ThreadSessionFlow onOpenCompanion={openSidePanel} />
      </ProtectedView>
    </div>
  )
}

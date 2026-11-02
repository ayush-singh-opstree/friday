import { GearSix, SidebarSimple } from '@/components/icons'
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

  const handleOpenCompanion = async () => {
    try {
      await openSidePanel()
    } catch (err) {
      console.error('Failed to open companion side panel:', err)
    } finally {
      // Close popup so user seamlessly transitions into companion mode
      window.close()
    }
  }

  return (
    <div className="flex min-h-[470px] w-[370px] max-w-full flex-col bg-surface overflow-x-hidden">
      <header className="flex h-12 items-center justify-between border-b border-line/80 bg-card px-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Logo size={22} />
          <span className="text-small font-bold tracking-[-0.02em] text-ink">Friday</span>
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
          <IconButton
            label="Open Companion Side Panel"
            size="sm"
            onClick={handleOpenCompanion}
          >
            <SidebarSimple size={16} />
          </IconButton>
          <ThemeToggle />
          <IconButton label="Settings" size="sm" onClick={openOptions}>
            <GearSix size={16} />
          </IconButton>
        </div>
      </header>

      <ProtectedView
        title="Sign in to Friday"
        description="Capture context and track commitments from any page without switching tabs."
      >
        <ThreadSessionFlow onOpenCompanion={handleOpenCompanion} />
      </ProtectedView>
    </div>
  )
}

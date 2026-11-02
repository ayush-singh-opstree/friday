import { GearSix } from '@/components/icons'
import { ProtectedView } from '@/authorization'
import { Logo } from '@/components/common/Logo'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { IconButton } from '@/components/ui'
import { ThreadSessionFlow } from '@/components/threads/ThreadSessionFlow'
import { openOptions, openSidePanel } from '@/lib/messaging'

/**
 * Popup - Clean, focused extension popup:
 * - Starts with Create New Thread / Search / Recent Threads (No Needs Attention).
 * - Full thread creation -> Add people (existing/create new) -> Active capture session -> Stop & Club.
 */
export function PopupPage() {
  return (
    <div className="flex w-[370px] min-h-[470px] flex-col bg-surface">
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
        <ThreadSessionFlow onOpenCompanion={openSidePanel} />
      </ProtectedView>
    </div>
  )
}

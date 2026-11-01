import { useEffect } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  CheckSquare,
  ChatCircleDots,
  GearSix,
  HouseSimple,
  MagnifyingGlass,
  Plus,
  SignOut,
  Users,
} from '@phosphor-icons/react'
import { useAuth } from '@/auth'
import { QuickCaptureSheet } from '@/components/capture/QuickCaptureSheet'
import { SearchOverlay } from '@/components/search/SearchOverlay'
import { Wordmark } from '@/components/common/Brand'
import { OfflineBanner, Toaster } from '@/components/common/System'
import { IconButton } from '@/components/ui/Button'
import { NAV_ITEMS } from '@/config/constants'
import { cn, initials } from '@/lib/utils'
import { useUiStore } from '@/store'

const ICONS = { HouseSimple, ChatCircleDots, Users, CheckSquare }

const navClass = ({ isActive }) =>
  cn(
    'flex items-center justify-center gap-3 rounded-sm px-3 py-2.5 text-body-medium transition-colors xl:justify-start',
    isActive ? 'bg-primary-light text-primary' : 'text-ink-muted hover:bg-overlay hover:text-ink',
  )

const tabClass = ({ isActive }) =>
  cn('flex flex-1 flex-col items-center gap-0.5 py-1.5 text-tiny', isActive ? 'text-primary' : 'text-ink-subtle')

/**
 * AppShell - the responsive frame around every authenticated route.
 *
 * docs/07_design_system.md -> Responsive Behaviour:
 *   desktop (>=1280px) : 240px labelled sidebar
 *   tablet  (>=768px)  : 64px icon rail
 *   mobile             : bottom tab bar + centre FAB
 */
export function AppShell({ children }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const openQuickCapture = useUiStore((state) => state.openQuickCapture)
  const openSearch = useUiStore((state) => state.openSearch)

  // Global shortcuts: Cmd/Ctrl+K capture (Feature 4), Cmd/Ctrl+F search (Feature 12).
  useEffect(() => {
    const onKeyDown = (event) => {
      const meta = event.metaKey || event.ctrlKey
      if (meta && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        const segments = location.pathname.split('/')
        openQuickCapture(segments[1] === 'threads' ? (segments[2] ?? null) : null)
      }
      if (meta && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        openSearch()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openQuickCapture, openSearch, location.pathname])

  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <OfflineBanner />

      <div className="flex flex-1">
        <aside className="sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-card md:flex md:w-16 md:px-2 xl:w-60 xl:px-4">
          <Link to="/today" className="flex items-center px-1 py-5">
            <Wordmark size={28} className="[&>div]:hidden xl:[&>div]:block" />
          </Link>

          <nav className="flex flex-1 flex-col gap-1" aria-label="Primary">
            {NAV_ITEMS.map((item) => {
              const Icon = ICONS[item.icon]
              return (
                <NavLink key={item.to} to={item.to} title={item.label} className={navClass}>
                  <Icon size={20} />
                  <span className="hidden xl:inline">{item.label}</span>
                </NavLink>
              )
            })}
          </nav>

          <div className="flex flex-col gap-1 pb-4">
            <button
              type="button"
              onClick={() => openQuickCapture(null)}
              className="mb-1 flex items-center justify-center gap-2 rounded-sm bg-primary px-3 py-2.5 text-body-medium text-ink-inverse hover:bg-primary-dark xl:justify-start"
            >
              <Plus size={18} weight="bold" />
              <span className="hidden xl:inline">Quick capture</span>
            </button>

            <NavLink to="/settings" title="Settings" className={navClass}>
              <GearSix size={20} />
              <span className="hidden xl:inline">Settings</span>
            </NavLink>

            <button
              type="button"
              title="Sign out"
              onClick={async () => {
                await signOut()
                navigate('/login', { replace: true })
              }}
              className="flex items-center justify-center gap-3 rounded-sm px-3 py-2.5 text-body-medium text-ink-muted transition-colors hover:bg-overlay hover:text-ink xl:justify-start"
            >
              <SignOut size={20} />
              <span className="hidden xl:inline">Sign out</span>
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-line bg-card/95 px-4 py-3 backdrop-blur">
            <Link to="/today" className="md:hidden">
              <Wordmark size={24} className="[&_span]:hidden" />
            </Link>
            <div className="flex flex-1 items-center justify-end gap-1.5">
              <IconButton label="Search (Ctrl+F)" onClick={openSearch}>
                <MagnifyingGlass size={18} />
              </IconButton>
              <IconButton label="Notifications">
                <Bell size={18} />
              </IconButton>
              <div
                title={user?.fullName ?? 'Account'}
                className="ml-1 flex size-8 items-center justify-center rounded-full bg-primary-light text-tiny font-semibold text-primary"
              >
                {initials(user?.fullName ?? '')}
              </div>
            </div>
          </header>

          <main className="min-w-0 flex-1 px-4 pt-4 pb-safe-tabs md:pb-8">{children}</main>
        </div>
      </div>

      {/* Mobile bottom tab bar with the capture FAB in the centre */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-line bg-card px-2 pt-1.5 md:hidden"
        style={{ paddingBottom: 'calc(6px + var(--safe-bottom))' }}
        aria-label="Primary"
      >
        {NAV_ITEMS.slice(0, 2).map((item) => {
          const Icon = ICONS[item.icon]
          return (
            <NavLink key={item.to} to={item.to} className={tabClass}>
              <Icon size={21} />
              {item.label}
            </NavLink>
          )
        })}

        <button
          type="button"
          aria-label="Quick capture"
          onClick={() => openQuickCapture(null)}
          className="mx-1 flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-ink-inverse shadow-lg active:scale-95"
        >
          <Plus size={22} weight="bold" />
        </button>

        {NAV_ITEMS.slice(2).map((item) => {
          const Icon = ICONS[item.icon]
          return (
            <NavLink key={item.to} to={item.to} className={tabClass}>
              <Icon size={21} />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      <QuickCaptureSheet />
      <SearchOverlay />
      <Toaster />
    </div>
  )
}
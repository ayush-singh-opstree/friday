import { useEffect } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  CaretDoubleLeft,
  CaretDoubleRight,
  CheckSquare,
  ChatCircleDots,
  GearSix,
  HouseSimple,
  MagnifyingGlass,
  Plus,
  SignOut,
  Users,
} from '@/components/icons'
import { useAuth } from '@/auth'
import { QuickCaptureSheet } from '@/components/capture/QuickCaptureSheet'
import { SearchOverlay } from '@/components/search/SearchOverlay'
import { Wordmark, Logo } from '@/components/common/Brand'
import { DataSourceBadge } from '@/components/common/DataSourceBadge'
import { OfflineBanner } from '@/components/common/System'
import { Toaster } from '@/components/common/Toaster'
import { IconButton } from '@/components/ui/Button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu'
import { Tooltip } from '@/components/ui/Tooltip'
import { ScrollArea } from '@/components/ui/ScrollArea'
import { NAV_ITEMS } from '@/config/constants'
import { useBreakpoint } from '@/hooks/useMediaQuery'
import { cn, initials } from '@/lib/utils'
import { useUiStore } from '@/store'
import { motion, useReducedMotion } from 'motion/react'

const ICONS = { HouseSimple, ChatCircleDots, Users, CheckSquare }

const tabClass = ({ isActive }) =>
  cn(
    'flex flex-1 flex-col items-center gap-0.5 py-1.5 text-tiny font-medium transition-colors duration-150',
    isActive ? 'text-primary' : 'text-ink-subtle',
  )

export function AppShell({ children }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const openQuickCapture = useUiStore((state) => state.openQuickCapture)
  const openSearch = useUiStore((state) => state.openSearch)

  const { isDesktop } = useBreakpoint()
  const sidebarPref = useUiStore((state) => state.settings.sidebar ?? 'auto')
  const updateSettings = useUiStore((state) => state.updateSettings)
  const reduceMotion = useReducedMotion()

  const section = location.pathname.split('/')[1] ?? 'today'
  const collapsed =
    sidebarPref === 'collapsed' ? true : sidebarPref === 'expanded' ? false : !isDesktop
  const toggleSidebar = () => updateSettings({ sidebar: collapsed ? 'expanded' : 'collapsed' })

  const navClass = ({ isActive }) =>
    cn(
      'group relative flex h-10 shrink-0 items-center rounded-lg text-[14px] font-medium transition-all duration-150',
      collapsed ? 'size-10 justify-center mx-auto' : 'w-full gap-3 px-3',
      isActive
        ? 'bg-primary/10 text-primary font-semibold shadow-xs'
        : 'text-ink-muted hover:bg-overlay hover:text-ink',
    )

  const railStack = collapsed ? 'items-center gap-1.5' : 'gap-1'

  const handleSignOut = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

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
    <div className="flex h-dvh flex-col overflow-hidden bg-surface">
      <OfflineBanner />

      <div className="flex min-h-0 flex-1">
        {/* ── Sidebar ─────────────────────────────────────── */}
        <aside
          className={cn(
            'hidden h-full shrink-0 flex-col border-r border-line bg-card transition-[width,padding] duration-200 ease-out md:flex',
            collapsed ? 'md:w-[70px] md:px-2.5' : 'md:w-64 md:px-3',
          )}
        >
          {/* Brand header */}
          <div
            className={cn(
              'group/nav flex h-16 shrink-0 items-center',
              collapsed ? 'justify-center' : 'gap-2 px-1.5',
            )}
          >
            <Link
              to="/today"
              aria-label="Threadwise home"
              className={cn('flex items-center', collapsed && 'group-hover/nav:hidden')}
            >
              {collapsed ? <Logo size={28} /> : <Wordmark size={28} />}
            </Link>

            <Tooltip content={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} side="right">
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                aria-expanded={!collapsed}
                className={cn(
                  'size-8 shrink-0 items-center justify-center rounded-lg text-ink-subtle transition-all duration-150 hover:bg-overlay hover:text-ink',
                  collapsed ? 'hidden group-hover/nav:flex mx-auto' : 'ml-auto flex',
                )}
              >
                {collapsed ? <CaretDoubleRight size={16} /> : <CaretDoubleLeft size={16} />}
              </button>
            </Tooltip>
          </div>

          {/* Nav items */}
          <ScrollArea className="min-h-0 flex-1 py-2">
            <nav className={cn('flex w-full flex-col', railStack)} aria-label="Primary">
              {NAV_ITEMS.map((item) => {
                const Icon = ICONS[item.icon]
                return (
                  <Tooltip key={item.to} content={collapsed ? item.label : null} side="right">
                    <NavLink to={item.to} aria-label={item.label} className={navClass}>
                      <span className="flex size-5 shrink-0 items-center justify-center transition-transform duration-150 group-hover:scale-105">
                        <Icon size={20} />
                      </span>
                      {collapsed ? null : <span className="truncate">{item.label}</span>}
                    </NavLink>
                  </Tooltip>
                )
              })}
            </nav>
          </ScrollArea>

          {/* Bottom section */}
          <div className={cn('flex w-full flex-col pb-4 pt-2', railStack)}>
            <div className="h-px w-full shrink-0 bg-line mb-2" aria-hidden="true" />

            {!collapsed && (
              <div className="flex h-6 w-full items-center px-3 mb-1">
                <DataSourceBadge />
              </div>
            )}

            <Tooltip content={collapsed ? 'Quick capture (Ctrl+K)' : null} side="right">
              <button
                type="button"
                onClick={() => openQuickCapture(null)}
                className={cn(
                  'flex h-10 shrink-0 items-center rounded-lg font-medium transition-all duration-150',
                  'bg-primary text-ink-inverse hover:bg-primary-dark shadow-xs hover:shadow-sm active:scale-95',
                  collapsed ? 'size-10 justify-center mx-auto' : 'w-full gap-2.5 px-3',
                )}
              >
                <span className="flex size-5 shrink-0 items-center justify-center">
                  <Plus size={18} weight="bold" />
                </span>
                {collapsed ? null : <span className="text-[14px]">Quick capture</span>}
              </button>
            </Tooltip>

            <Tooltip content={collapsed ? 'Settings' : null} side="right">
              <NavLink to="/settings" aria-label="Settings" className={navClass}>
                <span className="flex size-5 shrink-0 items-center justify-center transition-transform duration-150 group-hover:scale-105">
                  <GearSix size={20} />
                </span>
                {collapsed ? null : <span className="truncate">Settings</span>}
              </NavLink>
            </Tooltip>
          </div>
        </aside>

        {/* ── Main content ────────────────────────────────── */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Top header bar */}
          <header className="relative z-30 flex shrink-0 items-center gap-2 border-b border-line bg-card/95 px-4 py-3 backdrop-blur-sm">
            <Link to="/today" className="md:hidden">
              <Wordmark size={24} className="[&_span]:hidden" />
            </Link>
            <div className="flex flex-1 items-center justify-end gap-1">
              <DataSourceBadge className="mr-2 xl:hidden" />
              <Tooltip content="Search (Ctrl+F)" side="bottom">
                <IconButton label="Search" onClick={openSearch}>
                  <MagnifyingGlass size={18} />
                </IconButton>
              </Tooltip>
              <IconButton label="Notifications">
                <Bell size={18} />
              </IconButton>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Account menu"
                    className="ml-2 flex size-8.5 items-center justify-center rounded-full bg-primary text-tiny font-bold text-ink-inverse ring-2 ring-primary/20 transition-all hover:ring-4 hover:scale-105 active:scale-95 shadow-xs cursor-pointer"
                  >
                    {initials(user?.fullName ?? '')}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-1.5">
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-tiny font-bold text-ink-inverse">
                      {initials(user?.fullName ?? '')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-small font-semibold text-ink leading-tight">
                        {user?.fullName ?? 'Signed In'}
                      </p>
                      <p className="truncate text-tiny text-ink-muted leading-tight mt-0.5">
                        {user?.email ?? ''}
                      </p>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => navigate('/settings')}>
                    <GearSix size={16} />
                    <span>Settings & Preferences</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => openQuickCapture(null)}>
                    <Plus size={16} />
                    <span>Quick capture</span>
                    <kbd className="ml-auto text-[10px] font-mono text-ink-subtle">Ctrl+K</kbd>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem destructive onSelect={handleSignOut}>
                    <SignOut size={16} />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <ScrollArea className="min-h-0 flex-1">
            <main className="min-w-0 px-4 pt-6 pb-safe-tabs sm:px-6 md:pb-10 lg:px-8 xl:px-10">
              <motion.div
                key={section}
                initial={reduceMotion ? false : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={
                  reduceMotion ? { duration: 0 } : { duration: 0.22, ease: [0.22, 1, 0.36, 1] }
                }
              >
                {children}
              </motion.div>
            </main>
          </ScrollArea>
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-line bg-card/95 px-2 pt-1.5 pb-[calc(6px_+_var(--safe-bottom))] backdrop-blur-sm md:hidden"
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
          className="mx-1 flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-ink-inverse shadow-lg active:scale-95 transition-transform duration-150"
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

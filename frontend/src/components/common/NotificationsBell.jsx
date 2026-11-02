import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import {
  ArrowCounterClockwise,
  Bell,
  ChatCircleDots,
  CheckSquare,
  Snowflake,
  Sparkle,
  Sun,
  X,
} from '@/components/icons'
import { NOTIFICATION_TYPE_MAP } from '@/config/constants'
import { useNotifications } from '@/hooks/useData'
import { relativeTime } from '@/lib/date'
import { useNotificationStore, useUiStore } from '@/store'
import { IconButton } from '@/components/ui/Button'
import { EmptyState, Skeleton } from '@/components/ui/Feedback'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover'
import { cn } from '@/lib/utils'

const ICONS = { Sun, CheckSquare, Snowflake, Sparkle, ChatCircleDots }

/**
 * Ids already surfaced as an alert toast. Module-level so it survives re-mounts
 * and hot reloads. `alertPrimerDone` suppresses toasting the pre-existing
 * backlog on the very first load - only genuinely-new alerts are announced.
 */
const alertedIds = new Set()
let alertPrimerDone = false

/**
 * Header notification bell (Feature 14 / Requirement 10).
 *
 * An unread badge plus a popover inbox backed by GET /notifications. Each row
 * deep-links into the app, matching docs/03_feature_specs.md: "Each
 * notification includes a deep link to the relevant thread or commitment."
 */
export function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const pushToast = useUiStore((state) => state.pushToast)
  const generating = useNotificationStore((state) => state.generating)
  const {
    notifications,
    unreadCount,
    isLoading,
    status,
    error,
    runTriggers,
    markRead,
    markAllRead,
    remove,
  } = useNotifications({ autoLoad: true, poll: true })

  const openItem = async (item) => {
    if (!item.isRead) await markRead(item.id)
    setOpen(false)
    if (item.deepLinkUrl) navigate(item.deepLinkUrl)
  }

  const checkForAlerts = async () => {
    const result = await runTriggers()
    // Newly generated alerts are announced individually by the effect below.
    if (!result?.generatedCount) pushToast('No new alerts right now.', 'info')
  }

  // Mirror genuinely-new alerts into a toast pinned to the right edge of the
  // screen, with a one-tap deep link into the relevant thread. The priming pass
  // stops the existing backlog from spamming the user on first load.
  useEffect(() => {
    if (status !== 'ready') return
    if (!alertPrimerDone) {
      notifications.forEach((item) => alertedIds.add(item.id))
      alertPrimerDone = true
      return
    }
    const fresh = notifications.filter((item) => !item.isRead && !alertedIds.has(item.id))
    for (const item of fresh.slice(0, 3)) {
      alertedIds.add(item.id)
      toast(item.title, {
        description: item.body || undefined,
        duration: 6500,
        action: item.deepLinkUrl
          ? {
              label: 'View',
              onClick: () => {
                setOpen(false)
                navigate(item.deepLinkUrl)
              },
            }
          : undefined,
      })
    }
  }, [notifications, status, navigate])

  const isLoadingList = isLoading && notifications.length === 0

  const renderRow = (item) => {
    const meta = NOTIFICATION_TYPE_MAP[item.type]
    const Icon = ICONS[meta?.icon] ?? Bell
    return (
      <li key={item.id} className="group relative flex items-start">
        {!item.isRead ? (
          <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] rounded-r-full bg-gradient-to-b from-primary to-primary/40" />
        ) : null}
        <button
          type="button"
          onClick={() => openItem(item)}
          className={cn(
            'flex min-w-0 flex-1 items-start gap-3 py-3 pl-3.5 pr-1 text-left transition-colors',
            item.isRead
              ? 'hover:bg-overlay'
              : 'bg-gradient-to-r from-primary/[0.07] via-primary/[0.03] to-transparent hover:from-primary/[0.1] hover:via-primary/[0.05]',
          )}
        >
          <span
            className={cn(
              'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset transition-colors',
              item.isRead
                ? 'bg-overlay text-ink-subtle ring-line/70'
                : 'bg-primary/[0.12] text-primary ring-primary/20',
            )}
          >
            <Icon size={15} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-start gap-2">
              <span
                className={cn(
                  'min-w-0 flex-1 break-words text-small leading-snug text-ink',
                  item.isRead ? 'font-medium' : 'font-semibold',
                )}
              >
                {item.title}
              </span>
              {!item.isRead ? (
                <span className="mt-1 flex size-4 shrink-0 items-center justify-center">
                  <span className="size-2 rounded-full bg-primary ring-2 ring-primary/20" />
                </span>
              ) : null}
            </span>
            {item.body ? (
              <span className="mt-0.5 block break-words text-tiny leading-relaxed text-ink-muted">
                {item.body}
              </span>
            ) : null}
            <span className="mt-1.5 block text-[11px] font-medium text-ink-subtle">
              {relativeTime(item.scheduledAt)}
            </span>
          </span>
        </button>
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={(event) => {
            event.stopPropagation()
            remove(item.id)
          }}
          className="mr-1 mt-2.5 flex size-6 shrink-0 items-center justify-center rounded-full text-ink-subtle opacity-0 transition-all hover:bg-danger/10 hover:text-danger focus-visible:opacity-100 group-hover:opacity-100 group-focus-within:opacity-100"
        >
          <X size={13} weight="bold" />
        </button>
      </li>
    )
  }

  return (
    <span className="relative inline-flex">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <IconButton label="Notifications" aria-haspopup="dialog">
            <Bell size={18} />
          </IconButton>
        </PopoverTrigger>

        <PopoverContent align="end" className="w-[368px] max-w-[92vw] overflow-hidden p-0">
          <div className="flex items-center justify-between gap-2 border-b border-line/80 bg-gradient-to-br from-overlay/70 via-card to-card px-3.5 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-inset ring-primary/15">
                <Bell size={15} weight="fill" />
              </span>
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-small font-semibold tracking-tight text-ink">
                  Notifications
                </p>
                {unreadCount > 0 ? (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    <span className="size-1.5 rounded-full bg-primary" />
                    {unreadCount} new
                  </span>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              onClick={checkForAlerts}
              disabled={generating}
              aria-label="Check for new alerts"
              title="Check for new alerts"
              className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-line/70 bg-card text-ink-muted transition-all hover:border-primary/30 hover:bg-primary-light hover:text-primary disabled:cursor-wait disabled:opacity-70"
            >
              <ArrowCounterClockwise
                size={15}
                className={cn((generating || isLoadingList) && 'animate-spin')}
              />
            </button>
          </div>

          <div className="scroll-slim max-h-[420px] overflow-y-auto overflow-x-hidden">
            {isLoadingList ? (
              <div className="flex flex-col gap-3 p-3.5">
                {[0, 1, 2].map((row) => (
                  <div key={row} className="flex items-start gap-3">
                    <Skeleton className="size-8 shrink-0 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3.5 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-2.5 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-3">
                <EmptyState
                  className="border-0 bg-transparent px-4 py-10"
                  icon={<Bell size={22} weight="duotone" />}
                  title={error ? 'Could not load notifications' : "You're all caught up"}
                  description={
                    error ?? 'Commitment reminders, going-cold alerts and digests will land here.'
                  }
                />
              </div>
            ) : (
              <ul className="divide-y divide-line/70">{notifications.map(renderRow)}</ul>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-line/80 bg-overlay/30 px-3 py-2">
            <button
              type="button"
              disabled={unreadCount === 0}
              onClick={() => markAllRead()}
              className="rounded-lg px-2 py-1 text-tiny font-medium text-ink-muted transition-colors hover:bg-overlay hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              Mark all as read
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                navigate('/settings')
              }}
              className="rounded-lg px-2 py-1 text-tiny font-semibold text-primary transition-colors hover:bg-primary-light"
            >
              Notification settings
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {unreadCount > 0 ? (
        <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-card">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      ) : null}
    </span>
  )
}

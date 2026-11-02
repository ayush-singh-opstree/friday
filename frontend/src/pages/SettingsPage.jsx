import { useEffect, useState } from 'react'
import {
  Bell,
  CaretRight,
  ChatCircleDots,
  Check,
  CheckCircle,
  DownloadSimple,
  Info,
  Monitor,
  Moon,
  PaintBrush,
  PencilSimpleLine,
  PushPin,
  ShieldCheck,
  SignOut,
  Sparkle,
  Sun,
  UserCircle,
} from '@/components/icons'
import { capturesApi, commitmentsApi, peopleApi, threadsApi } from '@/apis'
import { useAuth } from '@/auth'
import { PageContainer, PageHeader } from '@/components/layout/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { PlanBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, SectionHeader } from '@/components/ui/Card'
import { Field, SwitchRow } from '@/components/ui/Controls'
import { SelectMenu } from '@/components/ui/SelectMenu'
import { APP, SETTINGS_SECTIONS } from '@/config/app'
import { CAPTURE_TYPES, DEFAULT_SETTINGS, THREAD_SORTS } from '@/config/constants'
import { dataSource, pushEnabled as pushConfigured } from '@/config/env'
import { useNotificationStore, useUiStore } from '@/store'
import { cn } from '@/lib/utils'

const ICONS = { UserCircle, Bell, PencilSimpleLine, ChatCircleDots, PaintBrush, ShieldCheck, Info }

const NOTIFICATION_ROWS = [
  { key: 'dailyDigest', label: 'Daily digest', description: 'Top threads and due-today commitments.' },
  { key: 'commitmentDue', label: 'Commitment due', description: '24 hours before something is due.' },
  { key: 'goingCold', label: 'Going cold', description: 'When a relationship crosses its threshold.' },
  { key: 'preMeetingBrief', label: 'Pre-meeting brief', description: '30 minutes before a linked event.' },
  { key: 'reengagementDigest', label: 'Re-engagement', description: 'After 7 days of inactivity.' },
]

/** Going-cold threshold choices (docs -> User.goingColdThresholdDays). */
const GOING_COLD_OPTIONS = [7, 14, 21, 30].map((days) => ({
  value: String(days),
  label: `${days} days`,
}))

/** Keyboard shortcuts surfaced in the Capture section. */
const SHORTCUTS = [
  { keys: 'Ctrl + K', action: 'Open Quick Capture' },
  { keys: 'Ctrl + F', action: 'Search every thread, person and capture' },
  { keys: 'Ctrl + Enter', action: 'Save the capture you are writing' },
  { keys: 'Esc', action: 'Close the active overlay' },
]

/**
 * Shared settings panel: consistent card chrome, a caps section label and an
 * optional description, so every section reads with the same rhythm.
 */
function Pane({ title, description, action, className, children }) {
  return (
    <Card className={cn('rounded-2xl border-line/80 p-5 shadow-xs', className)}>
      <SectionHeader label={title} action={action} />
      {description ? (
        <p className="mb-3 max-w-2xl text-small leading-relaxed text-ink-muted">{description}</p>
      ) : null}
      {children}
    </Card>
  )
}

/**
 * Settings / Preferences Page.
 *
 * Two-pane workspace: a sticky navigation rail (identity, sections, data source)
 * and a fluid content column. Each section lays its panels out on a responsive
 * grid so the page fills the available width instead of leaving blank space.
 */
export function SettingsPage() {
  const [section, setSection] = useState('profile')
  const { user, signOut } = useAuth()

  return (
    <PageContainer>
      <PageHeader eyebrow="Settings" title="Preferences" />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)] xl:gap-6">
        {/* Navigation rail */}
        <aside className="flex flex-col gap-3 lg:sticky lg:top-6 lg:self-start">
          <nav
            className="scrollbar-none flex gap-1 overflow-x-auto rounded-2xl border border-line/80 bg-card p-2 shadow-xs lg:flex-col lg:overflow-visible"
            aria-label="Settings sections"
          >
            {SETTINGS_SECTIONS.map((item) => {
              const Icon = ICONS[item.icon] ?? Info
              const active = section === item.key
              return (
                <button
                  key={item.key}
                  type="button"
                  aria-current={active ? 'true' : undefined}
                  onClick={() => setSection(item.key)}
                  className={cn(
                    'group flex h-10 shrink-0 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-left text-small font-medium transition-all duration-150',
                    active
                      ? 'bg-primary/10 font-semibold text-primary shadow-xs'
                      : 'text-ink-muted hover:bg-overlay hover:text-ink',
                  )}
                >
                  <Icon
                    size={17}
                    className={cn(
                      'shrink-0 transition-colors',
                      active ? 'text-primary' : 'text-ink-subtle group-hover:text-ink',
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              )
            })}
          </nav>
        </aside>

        {/* Content */}
        <div className="flex min-w-0 flex-col gap-4">
          {section === 'profile' ? <ProfileSection user={user} signOut={signOut} /> : null}
          {section === 'notifications' ? <NotificationsSection /> : null}
          {section === 'capture' ? <CaptureSection /> : null}
          {section === 'threads' ? <ThreadsSection /> : null}
          {section === 'appearance' ? <AppearanceSection /> : null}
          {section === 'data' ? <DataSection /> : null}
          {section === 'about' ? <AboutSection /> : null}
        </div>
      </div>
    </PageContainer>
  )
}

function ProfileSection({ user, signOut }) {
  const details = [
    { label: 'Full name', value: user?.fullName ?? '—' },
    { label: 'Email address', value: user?.email ?? '—' },
    {
      label: 'Role',
      value: user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '—',
    },
    { label: 'Workspace', value: dataSource.mode === 'live' ? 'Connected backend' : 'Offline demo' },
  ]

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Pane title="Profile & Account">
        <div className="flex flex-wrap items-center gap-4 border-b border-line/70 pb-5">
          <Avatar name={user?.fullName ?? ''} size="lg" className="ring-2 ring-primary/20" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-heading-3 font-semibold text-ink">
              {user?.fullName ?? 'Signed in'}
            </p>
            <p className="truncate text-small text-ink-muted">{user?.email ?? '—'}</p>
          </div>
          <PlanBadge plan={user?.plan ?? 'free'} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {details.map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-line/70 bg-overlay/40 px-3.5 py-2.5">
              <p className="text-tiny font-medium tracking-[0.06em] text-ink-subtle uppercase">
                {label}
              </p>
              <p className="mt-1 truncate text-body-medium font-semibold text-ink" title={String(value)}>
                {value}
              </p>
            </div>
          ))}
        </div>
      </Pane>

      <Pane title="Session">
        <div className="flex items-center gap-3 rounded-xl border border-line/70 bg-overlay/40 px-3.5 py-3">
          <span className="size-2 shrink-0 rounded-full bg-emerald-500" />
          <div className="min-w-0">
            <p className="text-small font-semibold text-ink">Active and authenticated</p>
            <p className="text-tiny text-ink-muted">Signed in on this device</p>
          </div>
        </div>

        <ul className="mt-4 flex flex-col gap-2.5 text-small text-ink-muted">
          {['Session token stored locally', 'Every request scoped to your workspace'].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <CheckCircle size={15} className="mt-0.5 shrink-0 text-emerald-500" />
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-5 border-t border-line/70 pt-4">
          <p className="mb-3 text-tiny text-ink-subtle">End your session on this device.</p>
          <Button
            variant="outline"
            onClick={signOut}
            className="w-full gap-1.5 border-danger/30 text-danger hover:border-danger/40 hover:bg-danger/10"
          >
            <SignOut size={15} />
            Sign out
          </Button>
        </div>
      </Pane>
    </div>
  )
}

function NotificationsSection() {
  const pushToast = useUiStore((state) => state.pushToast)
  const settings = useUiStore((state) => state.settings)
  const updateSettings = useUiStore((state) => state.updateSettings)

  // Server-side preferences (Feature 14): per-user, so they follow the account
  // across devices. The local `settings` store stays the immediate,
  // offline-safe mirror so toggles never block on the network.
  const prefs = useNotificationStore((state) => state.preferences)
  const preferencesStatus = useNotificationStore((state) => state.preferencesStatus)
  const fetchPreferences = useNotificationStore((state) => state.fetchPreferences)
  const updatePreferences = useNotificationStore((state) => state.updatePreferences)

  useEffect(() => {
    fetchPreferences()
  }, [fetchPreferences])

  const timeOptions = ['07:00', '08:00', '09:00', '12:00', '17:00', '18:00'].map((t) => ({
    value: t,
    label: `${t} hrs`,
  }))

  /** Persist a trigger toggle to the account and mirror it locally. */
  const saveTrigger = async (key, value) => {
    updateSettings({
      notificationPreferences: { ...settings.notificationPreferences, [key]: value },
    })
    try {
      await updatePreferences({ [key]: value })
    } catch {
      pushToast('Could not save that notification preference.', 'danger')
    }
  }

  /** Persist a digest-delivery setting to the account and mirror it locally. */
  const saveDelivery = async (patch) => {
    updateSettings(patch)
    try {
      await updatePreferences(patch)
    } catch {
      pushToast('Could not update digest delivery.', 'danger')
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Pane
        title="Notification Triggers"
          description={
            preferencesStatus === 'loading'
              ? 'Syncing your preferences...'
              : 'Choose which moments should surface an alert.'
          }
      >
        <div className="divide-y divide-line/70">
          {NOTIFICATION_ROWS.map((row) => (
            <SwitchRow
              key={row.key}
              id={`notify-${row.key}`}
              label={row.label}
              description={row.description}
              checked={Boolean(prefs[row.key])}
              onCheckedChange={(value) => saveTrigger(row.key, value)}
            />
          ))}
        </div>
      </Pane>

      <div className="flex flex-col gap-4">
        <Pane title="Digest Delivery">
          <Field label="Preferred digest time" hint="Sent once a day at this local time.">
            <SelectMenu
              value={prefs.digestTime}
              onChange={(val) => saveDelivery({ digestTime: val })}
              options={timeOptions}
            />
          </Field>
          <div className="mt-3 divide-y divide-line/70">
            <SwitchRow
              id="digest-email"
              label="Email digest"
              description="Also send the digest to your inbox."
              checked={Boolean(prefs.emailDigestEnabled)}
              onCheckedChange={(value) => saveDelivery({ emailDigestEnabled: value })}
            />
          </div>
        </Pane>

        <Pane title="Delivery Channels">
          <div className="divide-y divide-line/70">
            <SwitchRow
              id="push-enabled"
              label="Browser push"
              description={
                pushConfigured
                  ? 'Mirror alerts from the bell to your desktop.'
                  : 'Unavailable until a push key is configured.'
              }
              checked={Boolean(settings.pushEnabled)}
              disabled={!pushConfigured}
              onCheckedChange={(value) => updateSettings({ pushEnabled: value })}
            />
            <SwitchRow
              id="do-not-disturb"
              label="Do not disturb"
              description="Queue alerts and deliver them together later."
              checked={Boolean(settings.doNotDisturb)}
              onCheckedChange={(value) => updateSettings({ doNotDisturb: value })}
            />
          </div>
        </Pane>
      </div>
    </div>
  )
}

function CaptureSection() {
  const settings = useUiStore((state) => state.settings)
  const updateSettings = useUiStore((state) => state.updateSettings)

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Pane
        title="Capture Preferences"
        description="Quick Capture preselects this type for rapid notes. Smart detection reads action verbs and dates to suggest commitments."
      >
        <Field label="Default capture entry type">
          <SelectMenu
            value={settings.defaultCaptureType}
            onChange={(val) => updateSettings({ defaultCaptureType: val })}
            options={CAPTURE_TYPES}
          />
        </Field>
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-primary/20 bg-primary-light/60 px-3.5 py-3">
          <Sparkle size={15} weight="fill" className="mt-0.5 shrink-0 text-primary" />
          <p className="text-small text-ink">
            Capture anything and Smart detection suggests the type, the thread and any commitment
            for you.
          </p>
        </div>
      </Pane>

      <Pane
        title="Editor & Shortcuts"
        description="Shortcuts that work anywhere in Friday while you are capturing or searching."
      >
        <SwitchRow
          id="shortcuts-enabled"
          label="Keyboard shortcuts"
          description="Enable global shortcuts for capture, search and saving."
          checked={Boolean(settings.keyboardShortcutsEnabled)}
          onCheckedChange={(value) => updateSettings({ keyboardShortcutsEnabled: value })}
        />
        <ul className="mt-2 flex flex-col divide-y divide-line/70">
          {SHORTCUTS.map((row) => (
            <li key={row.keys} className="flex items-center justify-between gap-4 py-2.5">
              <span className="text-small text-ink-muted">{row.action}</span>
              <kbd className="shrink-0 rounded-md border border-line bg-overlay px-2 py-0.5 font-mono text-[11px] text-ink">
                {row.keys}
              </kbd>
            </li>
          ))}
        </ul>
      </Pane>
    </div>
  )
}

function ThreadsSection() {
  const settings = useUiStore((state) => state.settings)
  const updateSettings = useUiStore((state) => state.updateSettings)

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Pane title="Thread Sorting" description="The default order applied to your Threads list.">
        <Field label="Default sort order" hint="You can still change it per session from the list.">
          <SelectMenu
            value={settings.defaultThreadSort}
            onChange={(val) => updateSettings({ defaultThreadSort: val })}
            options={THREAD_SORTS}
          />
        </Field>
      </Pane>

      <Pane
        title="Going Cold Threshold"
        description="How long a thread may go without interaction before it is flagged as going cold."
      >
        <Field label="Days without interaction">
          <SelectMenu
            value={String(settings.goingColdThresholdDays)}
            onChange={(val) => updateSettings({ goingColdThresholdDays: Number(val) })}
            options={GOING_COLD_OPTIONS}
          />
        </Field>
        <p className="mt-3 flex items-start gap-2 text-small text-ink-muted">
          <PushPin size={15} className="mt-0.5 shrink-0 text-ink-subtle" />
          Threads past this threshold surface on Today and can raise a going-cold alert.
        </p>
      </Pane>
    </div>
  )
}

function AppearanceSection() {
  const settings = useUiStore((state) => state.settings)
  const updateSettings = useUiStore((state) => state.updateSettings)

  const themeOptions = [
    { key: 'system', label: 'System', icon: Monitor, desc: 'Follows your operating system' },
    { key: 'light', label: 'Light', icon: Sun, desc: 'Clean, high-contrast light mode' },
    { key: 'dark', label: 'Dark', icon: Moon, desc: 'Reduced eye-strain dark mode' },
  ]

  return (
    <Pane title="Theme" description="Applies across the whole app immediately.">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {themeOptions.map((opt) => {
          const Icon = opt.icon
          const active = settings.theme === opt.key
          return (
            <button
              key={opt.key}
              type="button"
              aria-pressed={active}
              onClick={() => updateSettings({ theme: opt.key })}
              className={cn(
                'flex cursor-pointer flex-col gap-3 rounded-2xl border p-4 text-left transition-all duration-150',
                active
                  ? 'border-primary/50 bg-primary/8 shadow-xs ring-2 ring-primary/20'
                  : 'border-line/80 bg-card hover:border-line hover:bg-overlay',
              )}
            >
              <div className="flex items-center justify-between">
                <div
                  className={cn(
                    'flex size-9 items-center justify-center rounded-xl transition-colors',
                    active ? 'bg-primary text-ink-inverse' : 'bg-overlay text-ink-muted',
                  )}
                >
                  <Icon size={18} />
                </div>
                {active ? <Check size={16} className="text-primary" weight="bold" /> : null}
              </div>
              <div>
                <p className="text-body-medium font-semibold text-ink">{opt.label}</p>
                <p className="mt-0.5 text-tiny text-ink-muted">{opt.desc}</p>
              </div>
            </button>
          )
        })}
      </div>
    </Pane>
  )
}

function DataSection() {
  const pushToast = useUiStore((state) => state.pushToast)
  const updateSettings = useUiStore((state) => state.updateSettings)
  const [exporting, setExporting] = useState(false)

  const exportData = async () => {
    setExporting(true)
    try {
      const [threads, people, captures, commitments] = await Promise.all([
        threadsApi.list({ filter: 'all' }),
        peopleApi.list(),
        capturesApi.list(),
        commitmentsApi.list(),
      ])

      const payload = {
        exportedAt: new Date().toISOString(),
        app: APP.name,
        version: APP.version,
        threads: threads?.threads ?? [],
        people: people?.people ?? [],
        captures: captures?.captures ?? [],
        commitments: commitments?.commitments ?? [],
      }

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `friday-export-${new Date().toISOString().slice(0, 10)}.json`
      link.click()
      URL.revokeObjectURL(url)
      pushToast('Your data was exported.', 'success')
    } catch (error) {
      pushToast(error?.message ?? 'Export failed.', 'danger')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Pane
        title="Data Ownership & Backup"
        description="Everything you capture belongs to you. Export the full workspace as a standard JSON backup at any time."
      >
        <div className="rounded-xl border border-line/70 bg-overlay/40 px-3.5 py-3">
          <p className="text-small font-semibold text-ink">Every export includes</p>
          <p className="mt-0.5 text-small text-ink-muted">
            Threads, people, captures and commitments, packaged into one portable file.
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button variant="outline" loading={exporting} onClick={exportData} className="gap-2">
            <DownloadSimple size={15} />
            Export all data (JSON)
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              updateSettings({ ...DEFAULT_SETTINGS })
              pushToast('Preferences restored to defaults', 'info')
            }}
          >
            Restore defaults
          </Button>
        </div>
      </Pane>

      <Pane title="Privacy">
        <ul className="flex flex-col gap-3 text-small text-ink-muted">
          {[
            'Your threads stay scoped to your own workspace',
            'No third-party sharing and no ad tracking',
            'Export or reset your data whenever you like',
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <CheckCircle size={15} className="mt-0.5 shrink-0 text-emerald-500" />
              {item}
            </li>
          ))}
        </ul>
      </Pane>
    </div>
  )
}

function AboutSection() {
  const buildInfo = [
    { label: 'Application version', value: `v${APP.version}` },
    { label: 'Storage', value: 'Local-first, synced to your account' },
    { label: 'Architecture', value: 'Offline-first Dexie sync + live REST backend' },
    { label: 'Design system', value: 'React 19 / Tailwind v4 / Radix primitives' },
  ]

  const links = [
    { label: 'Privacy policy', href: APP.links.privacy },
    { label: 'Support & help', href: APP.links.support },
    { label: 'Changelog', href: APP.links.changelog },
  ]

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Pane title="About Friday" description={APP.tagline}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {buildInfo.map(({ label, value }) => (
            <div key={label} className="rounded-xl border border-line/70 bg-overlay/40 px-3.5 py-3">
              <p className="text-tiny font-medium tracking-[0.06em] text-ink-subtle uppercase">
                {label}
              </p>
              <p className="mt-1 text-body-medium font-semibold text-ink">{value}</p>
            </div>
          ))}
        </div>
      </Pane>

      <Pane title="Resources">
        <ul className="flex flex-col divide-y divide-line/70">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-3 py-3 text-small font-medium text-ink transition-colors hover:text-primary"
              >
                {link.label}
                <CaretRight size={14} className="shrink-0 text-ink-subtle" />
              </a>
            </li>
          ))}
        </ul>
      </Pane>
    </div>
  )
}

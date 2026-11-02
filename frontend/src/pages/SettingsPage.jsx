import { useState } from 'react'
import {
  Bell,
  Check,
  DownloadSimple,
  Info,
  Monitor,
  Moon,
  PaintBrush,
  PencilSimpleLine,
  ShieldCheck,
  SignOut,
  Sun,
  UserCircle,
} from '@/components/icons'
import { capturesApi, commitmentsApi, peopleApi, threadsApi } from '@/apis'
import { useAuth } from '@/auth'
import { PageContainer, PageHeader } from '@/components/layout/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { Card, SectionHeader } from '@/components/ui/Card'
import { SelectMenu } from '@/components/ui/SelectMenu'
import { SwitchRow } from '@/components/ui/Controls'
import { APP, SETTINGS_SECTIONS } from '@/config/app'
import { CAPTURE_TYPES, DEFAULT_SETTINGS } from '@/config/constants'
import { dataSource } from '@/config/env'
import { useUiStore } from '@/store'
import { cn } from '@/lib/utils'

const ICONS = { UserCircle, Bell, PencilSimpleLine, PaintBrush, ShieldCheck, Info }

const NOTIFICATION_ROWS = [
  { key: 'dailyDigest', label: 'Daily digest', description: 'Top threads and due-today commitments.' },
  { key: 'commitmentDue', label: 'Commitment due', description: '24 hours before something is due.' },
  { key: 'goingCold', label: 'Going cold', description: 'When a relationship crosses its threshold.' },
  { key: 'preMeetingBrief', label: 'Pre-meeting brief', description: '30 minutes before a linked event.' },
  { key: 'reengagementDigest', label: 'Re-engagement', description: 'After 7 days of inactivity.' },
]

/**
 * Settings / Preferences Page.
 * Full-width, restyled two-column layout with clean category sidebar and refined panels.
 */
export function SettingsPage() {
  const [section, setSection] = useState('profile')
  const { user, signOut } = useAuth()

  return (
    <PageContainer>
      <PageHeader eyebrow="Settings" title="Preferences" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Sidebar Nav */}
        <aside className="flex flex-col gap-3.5 lg:col-span-4 xl:col-span-3">
          {/* User Profile Card */}
          <div className="flex items-center gap-3 rounded-2xl border border-line/80 bg-card p-4 shadow-xs">
            <div className="relative">
              <Avatar name={user?.fullName ?? ''} size="md" className="ring-2 ring-primary/20" />
              <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 ring-2 ring-card" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-body-medium font-semibold text-ink">
                {user?.fullName ?? 'Signed In'}
              </p>
              <p className="truncate text-tiny text-ink-muted">{user?.email ?? ''}</p>
            </div>
          </div>

          {/* Section Navigation */}
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
                  aria-pressed={active}
                  onClick={() => setSection(item.key)}
                  className={cn(
                    'group flex h-10 shrink-0 items-center gap-2.5 rounded-lg px-3 text-small font-medium transition-all duration-150 text-left cursor-pointer',
                    active
                      ? 'bg-primary/10 text-primary font-semibold shadow-xs'
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

        {/* Right Content Panel */}
        <div className="min-w-0 lg:col-span-8 xl:col-span-9">
          {section === 'profile' ? <ProfileSection user={user} signOut={signOut} /> : null}
          {section === 'notifications' ? <NotificationsSection /> : null}
          {section === 'capture' ? <CaptureSection /> : null}
          {section === 'appearance' ? <AppearanceSection /> : null}
          {section === 'data' ? <DataSection /> : null}
          {section === 'about' ? <AboutSection /> : null}
        </div>
      </div>
    </PageContainer>
  )
}

function ProfileSection({ user, signOut }) {
  return (
    <Card className="rounded-2xl border-line/80 p-6 shadow-xs">
      <SectionHeader label="Profile & Account" />
      <div className="flex flex-col divide-y divide-line/70">
        {[
          { label: 'Full name', value: user?.fullName ?? '—' },
          { label: 'Email address', value: user?.email ?? '—' },
          { label: 'Data source', value: dataSource.label },
          { label: 'Session status', value: 'Active and authenticated' },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-center justify-between gap-4 py-3.5">
            <span className="text-small font-medium text-ink-muted">{label}</span>
            <span className="truncate text-body-medium font-semibold text-ink">{value}</span>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-line/70 pt-5">
        <p className="text-tiny text-ink-subtle">End your current session on this device</p>
        <Button
          variant="outline"
          size="sm"
          onClick={signOut}
          className="gap-1.5 text-danger hover:bg-danger/10 hover:border-danger/30"
        >
          <SignOut size={14} />
          Sign out
        </Button>
      </div>
    </Card>
  )
}

function NotificationsSection() {
  const settings = useUiStore((state) => state.settings)
  const updateSettings = useUiStore((state) => state.updateSettings)
  const prefs = settings.notificationPreferences

  const timeOptions = ['07:00', '08:00', '09:00', '12:00', '17:00', '18:00'].map((t) => ({
    value: t,
    label: `${t} hrs`,
  }))

  return (
    <div className="flex flex-col gap-6">
      <Card className="rounded-2xl border-line/80 p-6 shadow-xs">
        <SectionHeader label="Notification Triggers" />
        <div className="divide-y divide-line/70">
          {NOTIFICATION_ROWS.map((row) => (
            <SwitchRow
              key={row.key}
              id={`notify-${row.key}`}
              label={row.label}
              description={row.description}
              checked={Boolean(prefs[row.key])}
              onCheckedChange={(value) =>
                updateSettings({ notificationPreferences: { ...prefs, [row.key]: value } })
              }
            />
          ))}
        </div>
      </Card>

      <Card className="rounded-2xl border-line/80 p-6 shadow-xs">
        <SectionHeader label="Digest Delivery" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:items-center">
          <div>
            <label className="mb-2 block text-small font-medium text-ink">
              Preferred digest time
            </label>
            <SelectMenu
              value={settings.digestTime}
              onChange={(val) => updateSettings({ digestTime: val })}
              options={timeOptions}
              className="w-full sm:w-48"
            />
          </div>

          <div className="sm:pt-6">
            <label className="flex cursor-pointer items-center gap-2.5 text-small text-ink font-medium">
              <input
                type="checkbox"
                checked={settings.emailDigestEnabled}
                onChange={(event) => updateSettings({ emailDigestEnabled: event.target.checked })}
                className="size-4 rounded accent-[var(--color-primary)]"
              />
              Deliver digest to my inbox as email
            </label>
          </div>
        </div>
      </Card>
    </div>
  )
}

function CaptureSection() {
  const settings = useUiStore((state) => state.settings)
  const updateSettings = useUiStore((state) => state.updateSettings)

  return (
    <Card className="rounded-2xl border-line/80 p-6 shadow-xs">
      <SectionHeader label="Capture Preferences" />
      <div className="max-w-xl">
        <label className="mb-2 block text-small font-medium text-ink">
          Default capture entry type
        </label>
        <SelectMenu
          value={settings.defaultCaptureType}
          onChange={(val) => updateSettings({ defaultCaptureType: val })}
          options={CAPTURE_TYPES}
          className="w-56"
        />
        <p className="mt-3 text-small text-ink-muted leading-relaxed">
          Quick Capture preselects this type for rapid notes. Smart detection automatically identifies action verbs and dates to suggest commitments.
        </p>
      </div>
    </Card>
  )
}

function AppearanceSection() {
  const settings = useUiStore((state) => state.settings)
  const updateSettings = useUiStore((state) => state.updateSettings)

  const themeOptions = [
    { key: 'system', label: 'System', icon: Monitor, desc: 'Syncs with your operating system preference' },
    { key: 'light', label: 'Light', icon: Sun, desc: 'Clean, high-contrast light mode' },
    { key: 'dark', label: 'Dark', icon: Moon, desc: 'Reduced eye-strain dark mode' },
  ]

  return (
    <Card className="rounded-2xl border-line/80 p-6 shadow-xs">
      <SectionHeader label="Theme & Visual Appearance" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {themeOptions.map((opt) => {
          const Icon = opt.icon
          const active = settings.theme === opt.key
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => updateSettings({ theme: opt.key })}
              className={cn(
                'flex flex-col gap-3 rounded-2xl border p-4 text-left transition-all duration-150 cursor-pointer',
                active
                  ? 'border-primary/50 bg-primary/8 ring-2 ring-primary/20 shadow-xs'
                  : 'border-line/80 bg-card hover:bg-overlay hover:border-line',
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
    </Card>
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
      link.download = `threadwise-export-${new Date().toISOString().slice(0, 10)}.json`
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
    <Card className="rounded-2xl border-line/80 p-6 shadow-xs">
      <SectionHeader label="Data Ownership & Backup" />
      <p className="max-w-2xl text-body text-ink-muted leading-relaxed">
        Your relationship data is private and encrypted. You can export all your threads, contacts, captures, and commitments as a standardized JSON backup at any time.
      </p>
      <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-line/70 pt-5">
        <Button variant="outline" size="sm" loading={exporting} onClick={exportData} className="gap-2">
          <DownloadSimple size={15} />
          Export all data (JSON)
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            updateSettings({ ...DEFAULT_SETTINGS })
            pushToast('Preferences restored to defaults', 'info')
          }}
        >
          Restore defaults
        </Button>
      </div>
    </Card>
  )
}

function AboutSection() {
  return (
    <Card className="rounded-2xl border-line/80 p-6 shadow-xs">
      <SectionHeader label="About Threadwise" />
      <div className="flex flex-col divide-y divide-line/70 text-small">
        <div className="flex justify-between items-center py-3">
          <span className="font-medium text-ink-muted">Application Version</span>
          <span className="font-semibold text-ink">v{APP.version}</span>
        </div>
        <div className="flex justify-between items-center py-3">
          <span className="font-medium text-ink-muted">Tagline</span>
          <span className="text-ink">{APP.tagline}</span>
        </div>
        <div className="flex justify-between items-center py-3">
          <span className="font-medium text-ink-muted">Architecture</span>
          <span className="text-ink">Offline-first local Dexie sync with live backend</span>
        </div>
      </div>
      <div className="mt-5 flex gap-4 border-t border-line/70 pt-4 text-small">
        <a
          href={APP.links.privacy}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-primary hover:underline"
        >
          Privacy Policy
        </a>
        <a
          href={APP.links.support}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-primary hover:underline"
        >
          Support & Help
        </a>
        <a
          href={APP.links.changelog}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-primary hover:underline"
        >
          Changelog
        </a>
      </div>
    </Card>
  )
}

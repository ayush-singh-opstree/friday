import { useState } from 'react'
import {
  Bell,
  DownloadSimple,
  Info,
  PaintBrush,
  PencilSimpleLine,
  ShieldCheck,
  UserCircle,
} from '@phosphor-icons/react'
import { capturesApi, commitmentsApi, peopleApi, threadsApi } from '@/apis'
import { useAuth } from '@/auth'
import { PageHeader } from '@/components/layout/PageHeader'
import { PlanBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, SectionHeader } from '@/components/ui/Card'
import { Select, SwitchRow } from '@/components/ui/Controls'
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
 * Settings (Requirement 10 preferences + Requirement 12 data controls).
 */
export function SettingsPage() {
  const [section, setSection] = useState('profile')

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        eyebrow="Settings"
        title="Preferences"
        description="Notifications, capture defaults, appearance and your data."
      />

      <div className="flex flex-col gap-4 md:flex-row">
        <nav
          className="flex shrink-0 gap-1.5 overflow-x-auto pb-1 md:w-44 md:flex-col md:overflow-visible"
          aria-label="Settings sections"
        >
          {SETTINGS_SECTIONS.map((item) => {
            const Icon = ICONS[item.icon] ?? Info
            return (
              <button
                key={item.key}
                type="button"
                aria-pressed={section === item.key}
                onClick={() => setSection(item.key)}
                className={cn(
                  'flex h-9 shrink-0 items-center gap-2 rounded-sm px-3 text-small font-medium transition-colors',
                  section === item.key
                    ? 'bg-primary-light text-primary'
                    : 'text-ink-muted hover:bg-overlay hover:text-ink',
                )}
              >
                <Icon size={15} />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="min-w-0 flex-1">
          {section === 'profile' ? <ProfileSection /> : null}
          {section === 'notifications' ? <NotificationsSection /> : null}
          {section === 'capture' ? <CaptureSection /> : null}
          {section === 'appearance' ? <AppearanceSection /> : null}
          {section === 'data' ? <DataSection /> : null}
          {section === 'about' ? <AboutSection /> : null}
        </div>
      </div>
    </div>
  )
}

function ProfileSection() {
  const { user, signOut } = useAuth()

  return (
    <Card>
      <SectionHeader label="Profile" />
      <dl className="flex flex-col gap-2 text-small">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-ink-muted">Name</dt>
          <dd className="truncate text-ink">{user?.fullName ?? '—'}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-ink-muted">Email</dt>
          <dd className="truncate text-ink">{user?.email ?? '—'}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-ink-muted">Plan</dt>
          <dd>
            <PlanBadge plan={user?.plan ?? 'free'} />
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-ink-muted">Data source</dt>
          <dd className="truncate text-ink">{dataSource.label}</dd>
        </div>
      </dl>
      <div className="mt-4">
        <Button variant="outline" size="sm" onClick={signOut}>
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

  return (
    <Card>
      <SectionHeader label="Notifications" />
      <div className="divide-y divide-line">
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

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="digest-time" className="mb-1 block text-tiny font-medium text-ink-muted">
            Digest time
          </label>
          <Select
            id="digest-time"
            value={settings.digestTime}
            onChange={(event) => updateSettings({ digestTime: event.target.value })}
          >
            {['07:00', '08:00', '09:00', '12:00', '17:00', '18:00'].map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-small text-ink-muted">
            <input
              type="checkbox"
              checked={settings.emailDigestEnabled}
              onChange={(event) => updateSettings({ emailDigestEnabled: event.target.checked })}
              className="size-4 accent-[var(--color-primary)]"
            />
            Also email the digest
          </label>
        </div>
      </div>
    </Card>
  )
}

function CaptureSection() {
  const settings = useUiStore((state) => state.settings)
  const updateSettings = useUiStore((state) => state.updateSettings)

  return (
    <Card>
      <SectionHeader label="Capture" />
      <label htmlFor="default-type" className="mb-1 block text-tiny font-medium text-ink-muted">
        Default capture type
      </label>
      <Select
        id="default-type"
        value={settings.defaultCaptureType}
        onChange={(event) => updateSettings({ defaultCaptureType: event.target.value })}
        className="w-40"
      >
        {CAPTURE_TYPES.map((type) => (
          <option key={type.value} value={type.value}>
            {type.label}
          </option>
        ))}
      </Select>
      <p className="mt-2 text-tiny text-ink-subtle">
        Quick Capture preselects this type. Smart detection still suggests Action when the text reads
        like a promise.
      </p>
    </Card>
  )
}

function AppearanceSection() {
  const settings = useUiStore((state) => state.settings)
  const updateSettings = useUiStore((state) => state.updateSettings)

  return (
    <Card>
      <SectionHeader label="Appearance" />
      <div className="flex gap-1.5">
        {['system', 'light', 'dark'].map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={settings.theme === option}
            onClick={() => updateSettings({ theme: option })}
            className={cn(
              'h-9 flex-1 rounded-sm text-small font-medium capitalize transition-colors',
              settings.theme === option
                ? 'bg-primary text-ink-inverse'
                : 'bg-overlay text-ink-muted hover:text-ink',
            )}
          >
            {option}
          </button>
        ))}
      </div>
    </Card>
  )
}

function DataSection() {
  const pushToast = useUiStore((state) => state.pushToast)
  const updateSettings = useUiStore((state) => state.updateSettings)
  const [exporting, setExporting] = useState(false)

  /** Requirement 12: export everything as machine-readable JSON. */
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
    <Card>
      <SectionHeader label="Data & privacy" />
      <p className="text-small text-ink-muted">
        Your relationship data is yours. Export everything as JSON at any time. Account deletion
        permanently removes all records within 30 days of the request.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button variant="outline" size="sm" loading={exporting} onClick={exportData}>
          <DownloadSimple size={13} />
          Export my data (JSON)
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => updateSettings({ ...DEFAULT_SETTINGS })}
        >
          Restore defaults
        </Button>
      </div>
    </Card>
  )
}

function AboutSection() {
  return (
    <Card>
      <SectionHeader label="About" />
      <dl className="flex flex-col gap-1.5 text-small">
        <div className="flex justify-between gap-4">
          <dt className="text-ink-muted">Version</dt>
          <dd className="text-ink">{APP.version}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-muted">Tagline</dt>
          <dd className="truncate text-ink">{APP.tagline}</dd>
        </div>
      </dl>
      <div className="mt-3 flex gap-3 text-small">
        <a href={APP.links.privacy} target="_blank" rel="noreferrer" className="text-primary">
          Privacy
        </a>
        <a href={APP.links.support} target="_blank" rel="noreferrer" className="text-primary">
          Support
        </a>
      </div>
    </Card>
  )
}
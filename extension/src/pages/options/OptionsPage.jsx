import { useState } from 'react'
import {
  Check,
  Monitor,
  Moon,
  PlugsConnected,
  ShieldCheck,
  SignOut,
  Sun,
} from '@/components/icons'
import { ProtectedView } from '@/authorization'
import { Logo } from '@/components/common/Logo'
import { Button, Card, Field, SectionHeader, SwitchRow } from '@/components/ui'
import { APP, OPTIONS_SECTIONS } from '@/config/app'
import { APPROVED_DOMAINS, STORAGE_KEYS } from '@/config/constants'
import { dataSource, env } from '@/config/env'
import { useTheme } from '@/context'
import { useAuthState, useSettings } from '@/hooks'
import { removeValue } from '@/lib/storage'
import { cn } from '@/lib/utils'

const THEME_OPTIONS = [
  { value: 'system', label: 'System', icon: Monitor, description: 'Follow your operating system preference.' },
  { value: 'light', label: 'Light', icon: Sun, description: 'Crisp, high-contrast light appearance.' },
  { value: 'dark', label: 'Dark', icon: Moon, description: 'Deep dark appearance for low-light environments.' },
]

/**
 * Options page for Threadwise Companion.
 */
export function OptionsPage() {
  const [section, setSection] = useState('connection')

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-6 px-4 py-8">
      {/* Header */}
      <header className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-ink-inverse shadow-md shadow-primary/25">
          <Logo size={24} className="[&_rect:first-child]:hidden" />
        </div>
        <div>
          <h1 className="text-heading-1 font-bold text-ink">{APP.companionName}</h1>
          <p className="text-small text-ink-muted">{APP.tagline}</p>
        </div>
      </header>

      {/* Navigation Pills */}
      <nav className="flex flex-wrap gap-1.5" aria-label="Settings sections">
        {OPTIONS_SECTIONS.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={section === item.key}
            onClick={() => setSection(item.key)}
            className={cn(
              'h-9 rounded-xl px-3.5 text-small font-medium transition-all duration-150 cursor-pointer',
              section === item.key
                ? 'bg-primary text-ink-inverse shadow-sm'
                : 'bg-overlay text-ink-muted hover:bg-line hover:text-ink',
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <ProtectedView title="Sign in to manage your companion">
        <div className="flex flex-col gap-4">
          {section === 'connection' ? <ConnectionSection /> : null}
          {section === 'appearance' ? <AppearanceSection /> : null}
          {section === 'detection' ? <DetectionSection /> : null}
          {section === 'notifications' ? <NotificationsSection /> : null}
          {section === 'privacy' ? <PrivacySection /> : null}
          {section === 'about' ? <AboutSection /> : null}
          {section === 'account' ? <AccountSection /> : null}
        </div>
      </ProtectedView>
    </div>
  )
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme()

  return (
    <Card className="p-6">
      <SectionHeader label="Visual Appearance" />
      <p className="text-small text-ink-muted mb-4">
        Customize the visual theme across the popup, side panel and options page.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Theme">
        {THEME_OPTIONS.map((option) => {
          const Icon = option.icon
          const selected = theme === option.value
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setTheme(option.value)}
              className={cn(
                'flex flex-col gap-3 rounded-2xl border p-4 text-left transition-all duration-150 cursor-pointer',
                selected
                  ? 'border-primary bg-primary/8 ring-2 ring-primary/20 shadow-sm'
                  : 'border-line bg-card hover:bg-overlay hover:border-line/80',
              )}
            >
              <div className="flex items-center justify-between">
                <div
                  className={cn(
                    'flex size-9 items-center justify-center rounded-xl',
                    selected ? 'bg-primary text-ink-inverse' : 'bg-overlay text-ink-muted',
                  )}
                >
                  <Icon size={18} />
                </div>
                {selected ? <Check size={16} className="text-primary" weight="bold" /> : null}
              </div>
              <div>
                <p className="text-body-medium font-semibold text-ink">{option.label}</p>
                <p className="mt-0.5 text-tiny text-ink-muted">{option.description}</p>
              </div>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

function ConnectionSection() {
  const { user, signOut } = useAuthState()

  return (
    <Card className="p-6">
      <SectionHeader label="Connection & Backend" />
      <div className="mt-2 flex flex-col divide-y divide-line text-small">
        <div className="flex items-center justify-between py-3">
          <span className="font-medium text-ink-muted">Signed in account</span>
          <span className="font-semibold text-ink truncate">{user?.email ?? '—'}</span>
        </div>
        <div className="flex items-center justify-between py-3">
          <span className="font-medium text-ink-muted">Membership plan</span>
          <span className="font-semibold text-primary capitalize">{user?.plan ?? 'Free'}</span>
        </div>
        <div className="flex items-center justify-between py-3">
          <span className="font-medium text-ink-muted">Data source</span>
          <span className="font-medium text-ink">{dataSource.label}</span>
        </div>
        <div className="flex items-center justify-between py-3">
          <span className="font-medium text-ink-muted">API Endpoint</span>
          <span className="font-mono text-tiny text-ink-muted truncate">{env.apiBaseUrl || 'Bundled mock dataset'}</span>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2.5 border-t border-line pt-4">
        <Button variant="outline" size="sm" onClick={() => removeValue(STORAGE_KEYS.MOCK_DB)}>
          Reset demo data
        </Button>
        <Button variant="ghost" size="sm" onClick={signOut} className="text-danger hover:bg-danger/10 hover:text-danger gap-1.5 ml-auto">
          <SignOut size={14} />
          Sign out
        </Button>
      </div>
    </Card>
  )
}

function DetectionSection() {
  const { settings, update } = useSettings()

  return (
    <Card className="p-6">
      <SectionHeader label="Context Detection" />
      <div className="divide-y divide-line">
        <SwitchRow
          id="inject"
          label="Show floating launcher pill on supported sites"
          description="Displays a discreet launcher in the bottom corner when a recognized person is detected."
          checked={settings.injectCompanion}
          onCheckedChange={(value) => update({ injectCompanion: value })}
        />
        <SwitchRow
          id="linkedin"
          label="LinkedIn profile detection"
          description="Recognize full name and role from /in/ profile headers."
          checked={settings.detectOnLinkedIn}
          onCheckedChange={(value) => update({ detectOnLinkedIn: value })}
        />
        <SwitchRow
          id="gmail"
          label="Gmail thread detection"
          description="Recognize email address and sender name in active message threads."
          checked={settings.detectOnGmail}
          onCheckedChange={(value) => update({ detectOnGmail: value })}
        />
      </div>

      <div className="mt-4 flex items-start gap-2 rounded-xl bg-overlay p-3 text-tiny text-ink-muted">
        <PlugsConnected size={15} className="mt-0.5 shrink-0 text-primary" />
        <span>
          <strong>Allowed domains:</strong> {APPROVED_DOMAINS.map((domain) => domain.label).join(', ')}. The extension script never reads page bodies or executes on any other domain.
        </span>
      </div>
    </Card>
  )
}

function NotificationsSection() {
  const { settings, update, setNotificationPreference } = useSettings()
  const prefs = settings.notificationPreferences

  return (
    <Card className="p-6">
      <SectionHeader label="Notification Reminders" />
      <div className="divide-y divide-line">
        <SwitchRow
          id="digest"
          label="Daily attention digest"
          description="Top threads and due-today commitments."
          checked={prefs.dailyDigest}
          onCheckedChange={(value) => setNotificationPreference('dailyDigest', value)}
        />
        <SwitchRow
          id="due"
          label="Commitment due alerts"
          description="24 hours before a commitment reaches its due date."
          checked={prefs.commitmentDue}
          onCheckedChange={(value) => setNotificationPreference('commitmentDue', value)}
        />
        <SwitchRow
          id="cold"
          label="Going-cold relationship alerts"
          description="When a relationship crosses its inactivity threshold."
          checked={prefs.goingCold}
          onCheckedChange={(value) => setNotificationPreference('goingCold', value)}
        />
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <Field label="Digest delivery time" htmlFor="digest-time">
          <select
            id="digest-time"
            value={settings.digestTime}
            onChange={(event) => update({ digestTime: event.target.value })}
            className="h-10 w-44 rounded-xl border border-line bg-overlay px-3.5 text-small text-ink transition-all focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/12 cursor-pointer"
          >
            {['07:00', '08:00', '09:00', '12:00', '17:00', '18:00'].map((time) => (
              <option key={time} value={time}>
                {time} hrs
              </option>
            ))}
          </select>
        </Field>
      </div>
    </Card>
  )
}

function PrivacySection() {
  return (
    <Card className="p-6">
      <SectionHeader label="Privacy & Security" />
      <div className="flex items-start gap-3 text-small text-ink-muted leading-relaxed">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success">
          <ShieldCheck size={18} />
        </div>
        <div>
          <p className="font-semibold text-ink">Zero Page Scraping</p>
          <p className="mt-1">
            The companion reads only a person&apos;s public display name, email, and the profile URL exclusively on approved domains. Page body content is never read, analyzed, or stored. Contact data remains strictly confidential in your isolated workspace.
          </p>
        </div>
      </div>
    </Card>
  )
}

function AccountSection() {
  const { user } = useAuthState()
  return (
    <Card className="p-6">
      <SectionHeader label="Account Overview" />
      <p className="text-small text-ink-muted leading-relaxed">
        Signed in as <strong className="text-ink">{user?.fullName ?? '—'}</strong> ({user?.email ?? '—'}). Full account deletion, profile editing, and JSON data exports can be accessed anytime from the main Threadwise web application.
      </p>
    </Card>
  )
}

function AboutSection() {
  return (
    <Card className="p-6">
      <SectionHeader label="About Threadwise Companion" />
      <div className="flex flex-col divide-y divide-line text-small">
        <div className="flex justify-between items-center py-3">
          <span className="font-medium text-ink-muted">Companion Version</span>
          <span className="font-semibold text-ink">v{APP.version}</span>
        </div>
        <div className="flex justify-between items-center py-3">
          <span className="font-medium text-ink-muted">Chrome Extension Manifest</span>
          <span className="font-semibold text-ink">Manifest V3</span>
        </div>
      </div>
      <p className="mt-4 text-tiny text-ink-subtle">
        Threadwise Companion seamlessly surfaces relationship context from your threads directly inside LinkedIn and Gmail without breaking your workflow.
      </p>
    </Card>
  )
}

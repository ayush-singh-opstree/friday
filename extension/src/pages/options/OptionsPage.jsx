import { useState } from 'react'
import { PlugsConnected, ShieldCheck, SignOut } from '@phosphor-icons/react'
import { ProtectedView } from '@/authorization'
import { Logo } from '@/components/common/Logo'
import { Button, Card, Field, SectionHeader, Select, SwitchRow } from '@/components/ui'
import { APP, OPTIONS_SECTIONS } from '@/config/app'
import { APPROVED_DOMAINS, STORAGE_KEYS } from '@/config/constants'
import { dataSource, env } from '@/config/env'
import { useAuthState, useSettings } from '@/hooks'
import { removeValue } from '@/lib/storage'
import { cn } from '@/lib/utils'

/**
 * Options page - connection, detection and notification preferences.
 * Opens in its own tab (`options_ui.open_in_tab` in the manifest).
 */
export function OptionsPage() {
  const [section, setSection] = useState('connection')

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-5 px-4 py-8">
      <header className="flex items-center gap-2.5">
        <Logo size={30} />
        <div>
          <h1 className="text-heading-1 text-ink">{APP.companionName}</h1>
          <p className="text-small text-ink-muted">{APP.tagline}</p>
        </div>
      </header>

      <nav className="flex flex-wrap gap-1.5" aria-label="Settings sections">
        {OPTIONS_SECTIONS.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={section === item.key}
            onClick={() => setSection(item.key)}
            className={cn(
              'h-8 rounded-full px-3 text-small font-medium transition-colors',
              section === item.key
                ? 'bg-primary text-ink-inverse'
                : 'bg-overlay text-ink-muted hover:text-ink',
            )}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <ProtectedView title="Sign in to manage your companion">
        <div className="flex flex-col gap-4">
          {section === 'connection' ? <ConnectionSection /> : null}
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

function ConnectionSection() {
  const { user, signOut } = useAuthState()

  return (
    <Card>
      <SectionHeader label="Connection" />
      <dl className="mt-1 flex flex-col gap-2 text-small">
        <div className="flex justify-between gap-4">
          <dt className="text-ink-muted">Signed in as</dt>
          <dd className="truncate text-ink">{user?.email ?? '—'}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-muted">Plan</dt>
          <dd className="text-ink">{user?.plan ?? '—'}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-muted">Data source</dt>
          <dd className="text-ink">{dataSource.label}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink-muted">API base URL</dt>
          <dd className="truncate text-ink">{env.apiBaseUrl || 'Bundled demo dataset'}</dd>
        </div>
      </dl>

      <div className="mt-4 flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => removeValue(STORAGE_KEYS.MOCK_DB)}>
          Reset demo data
        </Button>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <SignOut size={13} />
          Sign out
        </Button>
      </div>
    </Card>
  )
}

function DetectionSection() {
  const { settings, update } = useSettings()

  return (
    <Card>
      <SectionHeader label="Detection" />
      <div className="divide-y divide-line">
        <SwitchRow
          id="inject"
          label="Show the companion on supported sites"
          description="Displays an inline panel when a recognised person is detected."
          checked={settings.injectCompanion}
          onCheckedChange={(value) => update({ injectCompanion: value })}
        />
        <SwitchRow
          id="linkedin"
          label="LinkedIn profiles"
          checked={settings.detectOnLinkedIn}
          onCheckedChange={(value) => update({ detectOnLinkedIn: value })}
        />
        <SwitchRow
          id="gmail"
          label="Gmail"
          checked={settings.detectOnGmail}
          onCheckedChange={(value) => update({ detectOnGmail: value })}
        />
      </div>

      <p className="mt-3 flex items-start gap-1.5 rounded-sm bg-overlay px-2.5 py-2 text-tiny text-ink-muted">
        <PlugsConnected size={13} className="mt-0.5 shrink-0" />
        Approved domains: {APPROVED_DOMAINS.map((domain) => domain.label).join(', ')}. The extension
        never injects anywhere else.
      </p>
    </Card>
  )
}

function NotificationsSection() {
  const { settings, update, setNotificationPreference } = useSettings()
  const prefs = settings.notificationPreferences

  return (
    <Card>
      <SectionHeader label="Notifications" />
      <div className="divide-y divide-line">
        <SwitchRow
          id="digest"
          label="Daily digest"
          description="Top threads, due-today commitments and cold alerts."
          checked={prefs.dailyDigest}
          onCheckedChange={(value) => setNotificationPreference('dailyDigest', value)}
        />
        <SwitchRow
          id="due"
          label="Commitment due reminders"
          description="24 hours before a commitment is due."
          checked={prefs.commitmentDue}
          onCheckedChange={(value) => setNotificationPreference('commitmentDue', value)}
        />
        <SwitchRow
          id="cold"
          label="Going-cold alerts"
          checked={prefs.goingCold}
          onCheckedChange={(value) => setNotificationPreference('goingCold', value)}
        />
      </div>

      <div className="mt-3">
        <Field label="Digest time" htmlFor="digest-time">
          <Select
            id="digest-time"
            value={settings.digestTime}
            onChange={(event) => update({ digestTime: event.target.value })}
            className="w-32"
          >
            {['07:00', '08:00', '09:00', '12:00', '17:00', '18:00'].map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </Card>
  )
}

function PrivacySection() {
  return (
    <Card>
      <SectionHeader label="Privacy" />
      <p className="flex items-start gap-2 text-small text-ink-muted">
        <ShieldCheck size={15} className="mt-0.5 shrink-0 text-success" />
        The companion reads only a person&apos;s display name, an optional email address and the page
        URL, and only on the approved domain list. Page content is never read, stored or transmitted.
        Contact and thread data is never shared with third parties.
      </p>
    </Card>
  )
}

function AccountSection() {
  const { user } = useAuthState()
  return (
    <Card>
      <SectionHeader label="Account" />
      <p className="text-small text-ink-muted">
        Signed in as {user?.fullName ?? '—'} ({user?.email ?? '—'}). Manage your account, export your
        data or delete it from the Threadwise web app.
      </p>
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
          <dt className="text-ink-muted">Manifest</dt>
          <dd className="text-ink">V3</dd>
        </div>
      </dl>
      <p className="mt-3 text-tiny text-ink-subtle">
        Threadwise Companion surfaces relationship context from your Threadwise threads while you
        work in the browser.
      </p>
    </Card>
  )
}
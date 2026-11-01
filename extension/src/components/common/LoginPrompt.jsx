import { useState } from 'react'
import { SignIn } from '@/components/icons'
import { useAuthState } from '@/hooks/useAuth'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Input'
import { Logo } from '@/components/common/Logo'
import { dataSource } from '@/config/env'

/**
 * Login prompt (Feature 13 -> edge case: "If the user is not logged in, the
 * extension shows a login prompt").
 *
 * Posts to `POST /auth/login`; in demo mode the bundled mock API signs the user
 * in as the seeded Meera persona.
 */
export function LoginPrompt({ title = 'Sign in to Threadwise', description }) {
  const { signIn, error, clearError } = useAuthState()
  const [email, setEmail] = useState('meera@demo.threadwise.app')
  const [password, setPassword] = useState('threadwise')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState(null)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError(null)
    clearError()
    setBusy(true)
    try {
      await signIn({ email, password })
    } catch (submitError) {
      setFormError(submitError?.message ?? 'Unable to sign in.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
      <Logo size={36} />
      <div>
        <h1 className="text-heading-2 text-ink">{title}</h1>
        <p className="mt-1 text-small text-ink-muted">
          {description ?? 'Your threads, commitments and briefs, wherever you are working.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-1 flex w-full flex-col gap-2.5 text-left">
        <Field label="Email" htmlFor="tw-email">
          <Input
            id="tw-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </Field>

        <Field label="Password" htmlFor="tw-password">
          <Input
            id="tw-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </Field>

        {formError ?? error ? (
          <p role="alert" className="text-small text-danger">
            {formError ?? error}
          </p>
        ) : null}

        <Button type="submit" loading={busy} className="mt-1 w-full">
          <SignIn size={14} weight="bold" />
          Continue
        </Button>
      </form>

      <p className="text-tiny text-ink-subtle">Data source: {dataSource.label}</p>
    </div>
  )
}
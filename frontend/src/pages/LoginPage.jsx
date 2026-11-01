import { useCallback, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Key, Sparkle } from '@phosphor-icons/react'
import { useAuth } from '@/auth'
import { Wordmark } from '@/components/common/Brand'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Controls'
import { env, dataSource } from '@/config/env'

/**
 * Login screen (Phase 1 -> Auth).
 *
 * The demo dataset accepts the seeded Meera credentials; with
 * `VITE_API_BASE_URL` set this posts to `POST /auth/login` instead.
 */
export function LoginPage() {
  const { signIn, isAuthenticated, error, clearError } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [email, setEmail] = useState('meera@demo.threadwise.app')
  const [password, setPassword] = useState('threadwise')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState(null)

  const from = location.state?.from ?? '/today'

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault()
      setFormError(null)
      clearError()
      setSubmitting(true)
      try {
        await signIn({ email, password })
        navigate(from, { replace: true })
      } catch (submitError) {
        setFormError(submitError?.message ?? 'Unable to sign in.')
      } finally {
        setSubmitting(false)
      }
    },
    [email, password, signIn, navigate, from, clearError],
  )

  if (isAuthenticated) return <Navigate to={from} replace />

  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface px-4 py-10">
      <div className="w-full max-w-sm">
        <Wordmark size={32} className="mb-6 justify-center" showTagline />

        <div className="rounded-lg border border-line bg-card p-6 shadow-sm">
          <h1 className="text-heading-1 text-ink">Sign in</h1>
          <p className="mt-1 text-small text-ink-muted">
            Pick up exactly where you left off with every relationship.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-3">
            <Field label="Email" htmlFor="email">
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                required
              />
            </Field>

            <Field label="Password" htmlFor="password">
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                required
              />
            </Field>

            {formError ?? error ? (
              <p role="alert" className="text-small text-danger">
                {formError ?? error}
              </p>
            ) : null}

            <Button type="submit" size="lg" loading={submitting} className="mt-1 w-full">
              Continue
              <ArrowRight size={16} weight="bold" />
            </Button>
          </form>

          {env.useMockApi ? (
            <div className="mt-4 flex items-start gap-2 rounded-md bg-primary-light px-3 py-2.5">
              <Sparkle size={15} weight="fill" className="mt-0.5 shrink-0 text-primary" />
              <p className="text-small text-ink">
                <strong>Demo mode.</strong> Any email and password works. Each account gets its
                own isolated workspace seeded with the demo dataset — try{' '}
                <code className="text-tiny">meera@demo.threadwise.app</code> and{' '}
                <code className="text-tiny">arjun@demo.threadwise.app</code> to see the isolation.
              </p>
            </div>
          ) : null}
        </div>

        <p className="mt-4 flex items-center justify-center gap-1.5 text-tiny text-ink-subtle">
          <Key size={12} />
          Data source: {dataSource.label}
        </p>
      </div>
    </div>
  )
}
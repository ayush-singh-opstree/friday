import { useCallback, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ArrowRight, Key, Sparkle } from '@/components/icons'
import { useAuth } from '@/auth'
import { Logo } from '@/components/common/Brand'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Controls'
import { env, dataSource } from '@/config/env'
import { motion } from 'motion/react'

/**
 * Login screen (Phase 1 -> Auth).
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
      {/* Subtle background gradient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 size-96 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 size-96 rounded-full bg-primary/6 blur-3xl" />
      </div>

      <motion.div
        className="relative w-full max-w-sm"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25">
            <Logo size={28} className="[&_rect:first-child]:fill-transparent [&_rect:first-child]:hidden" />
          </div>
          <div className="text-center">
            <h1 className="text-heading-1 font-bold text-ink">Threadwise</h1>
            <p className="mt-0.5 text-small text-ink-muted">Relationship memory for professionals</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-line bg-card p-6 shadow-lg">
          <h2 className="mb-5 text-heading-2 font-semibold text-ink">Sign in</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
              <p role="alert" className="rounded-xl bg-danger/10 px-3 py-2 text-small text-danger">
                {formError ?? error}
              </p>
            ) : null}

            <Button type="submit" size="lg" loading={submitting} className="mt-1 w-full">
              Continue
              <ArrowRight size={16} weight="bold" />
            </Button>
          </form>

          {env.useMockApi ? (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-primary-light px-3.5 py-3">
              <Sparkle size={15} weight="fill" className="mt-0.5 shrink-0 text-primary" />
              <p className="text-small text-ink">
                <strong>Demo mode.</strong> Any credentials work — try{' '}
                <code className="rounded bg-primary/10 px-1 py-0.5 font-mono text-tiny">
                  meera@demo.threadwise.app
                </code>
              </p>
            </div>
          ) : null}
        </div>

        <p className="mt-5 flex items-center justify-center gap-1.5 text-tiny text-ink-subtle">
          <Key size={12} />
          {dataSource.label}
        </p>
      </motion.div>
    </div>
  )
}

import { Component } from 'react'
import { Button } from '@/components/ui/Button'

/**
 * Error boundary so one broken surface never blanks the whole extension.
 * Used by `AppProviders` in the popup, side panel, options page and companion.
 */
export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[Threadwise] Unhandled UI error', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="flex min-h-40 flex-col items-center justify-center gap-2 p-6 text-center">
        <h1 className="text-heading-3 text-ink">Something went wrong</h1>
        <p className="text-small text-ink-muted">
          Threadwise hit an unexpected error. Reloading usually fixes it.
        </p>
        <Button size="sm" onClick={() => window.location.reload()}>
          Reload
        </Button>
      </div>
    )
  }
}
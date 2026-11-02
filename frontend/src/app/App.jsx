import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from './AppProviders'
import { AppRoutes } from './routes'

/**
 * Friday application root.
 * Providers -> router -> routes. Kept intentionally thin so tests can mount
 * `AppRoutes` with a memory router.
 */
export function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProviders>
  )
}

export default App
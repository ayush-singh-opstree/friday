import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { RequireAuth } from '@/authorization'
import { AppShell } from '@/components/layout/AppShell'
import { CommitmentsPage } from '@/pages/CommitmentsPage'
import { LoginPage } from '@/pages/LoginPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PeoplePage } from '@/pages/PeoplePage'
import { PersonDetailPage } from '@/pages/PersonDetailPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { ThreadDetailPage } from '@/pages/ThreadDetailPage'
import { ThreadsPage } from '@/pages/ThreadsPage'
import { TodayPage } from '@/pages/TodayPage'

/** Authenticated layout: guard -> app shell -> routed page. */
function ShellLayout() {
  return (
    <RequireAuth>
      <AppShell>
        <Outlet />
      </AppShell>
    </RequireAuth>
  )
}

/**
 * Route table.
 *
 * Phase 1A ships Today, Threads and auth. The remaining destinations are
 * explicit placeholders that name the slice that delivers them, so navigation
 * is never a dead end.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ShellLayout />}>
        <Route index element={<Navigate to="/today" replace />} />
        <Route path="/today" element={<TodayPage />} />
        <Route path="/threads" element={<ThreadsPage />} />
        <Route path="/threads/:threadId" element={<ThreadDetailPage />} />
        <Route path="/people" element={<PeoplePage />} />
        <Route path="/people/:personId" element={<PersonDetailPage />} />
        <Route path="/commitments" element={<CommitmentsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
/**
 * Runtime environment configuration.
 *
 * The backend is owned by another team, so every value here can be supplied at
 * build time via `.env` (see README). When no API base URL is configured the
 * app automatically falls back to the bundled mock API in `src/mocks`, which
 * lets the whole extension run standalone against the Meera demo dataset.
 *
 *   VITE_API_BASE_URL   e.g. https://api.threadwise.app  (no trailing slash)
 *   VITE_APP_WEB_URL    e.g. https://threadwise.app
 *   VITE_USE_MOCK_API   'true' | 'false'  (defaults to true when no base URL)
 *   VITE_API_TIMEOUT_MS request timeout, default 15000
 */

const rawApiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')
const rawUseMock = import.meta.env.VITE_USE_MOCK_API ?? ''

export const env = {
  /** True while running `vite dev` with CRXJS HMR. */
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,

  /** Base URL for the Threadwise REST API (docs/08_system_architecture.md). */
  apiBaseUrl: rawApiBaseUrl,

  /** Public web app, used by "Open in Threadwise" deep links. */
  appWebUrl: (import.meta.env.VITE_APP_WEB_URL ?? 'https://threadwise.app').replace(/\/+$/, ''),

  /** Request timeout in milliseconds. */
  apiTimeoutMs: Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 15000),

  /**
   * Server-Sent Events endpoint for real-time capture/thread updates
   * (docs/08_system_architecture.md -> Real-time). Empty disables the feed.
   */
  realtimeUrl: (import.meta.env.VITE_REALTIME_URL ?? '').replace(/\/+$/, ''),

  /**
   * When true, `src/apis` resolves against `src/mocks` instead of the network.
   * Explicit `VITE_USE_MOCK_API` wins; otherwise mock mode is implied by the
   * absence of a configured backend.
   */
  useMockApi: rawUseMock === '' ? rawApiBaseUrl === '' : rawUseMock !== 'false',
}

/** Human readable label for the active data source, shown in Settings. */
export const dataSource = env.useMockApi
  ? { mode: 'mock', label: 'Demo dataset (offline)' }
  : { mode: 'live', label: env.apiBaseUrl }

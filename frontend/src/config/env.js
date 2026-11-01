/**
 * Runtime configuration.
 *
 * The backend is delivered separately, so every value is supplied at build time
 * via `.env`. With no `VITE_API_BASE_URL` the app automatically serves the
 * bundled demo dataset from `src/mocks`, which keeps the whole product
 * explorable before the API lands.
 *
 *   VITE_API_BASE_URL  e.g. https://api.threadwise.app  (no trailing slash)
 *   VITE_APP_WEB_URL   public web app URL
 *   VITE_USE_MOCK_API  'true' | 'false' (defaults to true when no base URL)
 *   VITE_API_TIMEOUT_MS default 15000
 *   VITE_REALTIME_URL  SSE endpoint for real-time updates
 *   VITE_VAPID_PUBLIC_KEY  Web Push public key
 *   VITE_AUTH_PROVIDER 'local' | 'clerk'
 */

const rawApiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')
const rawUseMock = import.meta.env.VITE_USE_MOCK_API ?? ''

export const env = {
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,

  /** Base URL for the Threadwise REST API (docs/08_system_architecture.md). */
  apiBaseUrl: rawApiBaseUrl,

  /** Public web app URL, used for share links and deep links. */
  appWebUrl: (import.meta.env.VITE_APP_WEB_URL ?? 'https://threadwise.app').replace(/\/+$/, ''),

  apiTimeoutMs: Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 15000),

  /** SSE endpoint; empty disables live updates. */
  realtimeUrl: (import.meta.env.VITE_REALTIME_URL ?? '').replace(/\/+$/, ''),

  /** Web Push (VAPID) public key; empty disables push subscription. */
  vapidPublicKey: import.meta.env.VITE_VAPID_PUBLIC_KEY ?? '',

  authProvider: import.meta.env.VITE_AUTH_PROVIDER ?? 'local',

  /** True while the app resolves against `src/mocks` instead of the network. */
  useMockApi: rawUseMock === '' ? rawApiBaseUrl === '' : rawUseMock !== 'false',
}

/** Label for the active data source, surfaced in Settings. */
export const dataSource = env.useMockApi
  ? { mode: 'demo', label: 'Demo dataset (offline capable)' }
  : { mode: 'live', label: env.apiBaseUrl }

/** Push is only offered when a key is configured. */
export const pushEnabled = Boolean(env.vapidPublicKey)

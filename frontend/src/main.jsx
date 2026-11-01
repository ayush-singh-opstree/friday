import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted variable fonts (offline-safe - no external font CDN at runtime).
import '@fontsource-variable/inter'
import '@fontsource-variable/jetbrains-mono'
import App from '@/app/App'
import '@/styles/index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Register the offline app-shell service worker in production only, so local
// development is never served from a stale cache (Phase 1E).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Registration failures are non-fatal; the app still works online.
    })
  })
}
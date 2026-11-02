import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json' with { type: 'json' }

/**
 * Manifest V3 definition for the Threadwise Companion extension.
 * CRXJS resolves the source paths below, bundles each entry point and
 * rewrites them to the hashed output files inside `dist/`.
 *
 * Surfaces implemented here:
 *  - action.default_popup  -> quick capture + attention snapshot
 *  - side_panel            -> full companion (threads, commitments, brief)
 *  - options_ui            -> settings, connection and privacy controls
 *  - background            -> session, context-menu capture, badge sync
 *  - content_scripts       -> inline companion on the approved domain list
 *
 * Reference: docs/03_feature_specs.md -> Feature 13 (Extension Companion)
 */
export default defineManifest({
  manifest_version: 3,
  name: 'Threadwise Companion',
  version: pkg.version,
  description: pkg.description,
  icons: {
    16: 'public/icons/icon16.png',
    32: 'public/icons/icon32.png',
    48: 'public/icons/icon48.png',
    128: 'public/icons/icon128.png',
  },
  action: {
    default_title: 'Threadwise Companion',
    default_popup: 'src/pages/popup/index.html',
    default_icon: {
      16: 'public/icons/icon16.png',
      32: 'public/icons/icon32.png',
      48: 'public/icons/icon48.png',
      128: 'public/icons/icon128.png',
    },
  },
  side_panel: {
    default_path: 'src/pages/sidepanel/index.html',
  },
  options_ui: {
    page: 'src/pages/options/index.html',
    open_in_tab: true,
  },
  background: {
    service_worker: 'src/background/index.js',
    type: 'module',
  },
  content_scripts: [
    {
      // Approved domain list only - the extension never injects anywhere else.
      matches: [
        'https://www.linkedin.com/*',
        'https://linkedin.com/*',
        'https://mail.google.com/*',
      ],
      js: ['src/content/index.js'],
      run_at: 'document_idle',
    },
  ],
  permissions: [
    'storage',
    'sidePanel',
    'contextMenus',
    'activeTab',
    'alarms',
  ],
  host_permissions: [
    // Threadwise API + web app (see docs/08_system_architecture.md).
    'https://threadwise.app/*',
    'https://*.threadwise.app/*',
    'https://*.vercel.app/*',
    'https://*.railway.app/*',
    // Local development: the FastAPI backend (backend/run.py) and the Vite dev
    // server. Extension pages/workers with these host permissions can call the
    // API cross-origin without CORS headers.
    'http://localhost:8000/*',
    'http://127.0.0.1:8000/*',
    'http://localhost:3000/*',
    'http://localhost:5173/*',
  ],
})

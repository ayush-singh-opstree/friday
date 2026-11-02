import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    // Pre-bundle every third-party dependency up front, in a single pass.
    //
    // Without this, a dependency that is first imported lazily at runtime - for
    // example `react-datepicker`, pulled in by src/components/ui/DatePicker.jsx -
    // is discovered mid-session. Vite then re-runs dependency optimization and
    // issues new pre-bundle URLs, which invalidates the module URLs the browser
    // is already holding and surfaces as "504 (Outdated Optimize Dep)".
    // Listing them here keeps a single, stable optimize generation per session.
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-runtime',
      'react/jsx-dev-runtime',
      'react-router-dom',
      'zustand',
      'sonner',
      'clsx',
      'tailwind-merge',
      'date-fns',
      'dexie',
      'dexie-react-hooks',
      'lucide-react',
      'motion/react',
      'react-datepicker',
      '@radix-ui/react-avatar',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-switch',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
    ],
  },
  server: {
    port: 5173,
    host: true,
    // The Phase 2 browser extension reads thread context from the dev server.
    cors: true,
  },
  build: {
    target: 'esnext',
    sourcemap: false,
    // Radix primitives, Phosphor icons and `motion` (Framer Motion - the
    // animation library named in docs/08_system_architecture.md) are all
    // bundled into the single app chunk, so the ceiling reflects that stack.
    chunkSizeWarningLimit: 1200,
  },
})

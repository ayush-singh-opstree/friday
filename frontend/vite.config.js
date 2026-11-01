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

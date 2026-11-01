import path from 'node:path'
import { crx } from '@crxjs/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import zip from 'vite-plugin-zip-pack'
import manifest from './manifest.config.js'
import pkg from './package.json' with { type: 'json' }

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    crx({ manifest }),
    // Produces release/<name>-<version>.zip, ready to upload to the Chrome Web Store.
    zip({ outDir: 'release', outFileName: `${pkg.name}-${pkg.version}.zip` }),
  ],
  build: {
    target: 'esnext',
    sourcemap: false,
    chunkSizeWarningLimit: 900,
  },
  server: {
    port: 5173,
    strictPort: false,
    cors: {
      // The extension runs on a chrome-extension:// origin during dev HMR.
      origin: [/chrome-extension:\/\//],
    },
  },
})

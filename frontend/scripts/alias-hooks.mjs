/**
 * Dev-only ESM resolve hooks that map the `@/` alias to `src/`.
 *
 * Vite handles `@/` at build time; this lets plain `node` scripts import the
 * real source so the Attention Engine can be verified against the worked
 * examples in docs/06_data_model.md.
 *
 * Registered by `scripts/alias-loader.mjs` - do not import directly.
 */
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const SRC = new URL('../src/', import.meta.url)

function withExtension(candidateUrl) {
  const path = fileURLToPath(candidateUrl)
  if (existsSync(path)) return candidateUrl.href
  if (existsSync(`${path}.js`)) return `${candidateUrl.href}.js`
  if (existsSync(`${path}.jsx`)) return `${candidateUrl.href}.jsx`
  if (existsSync(`${path}/index.js`)) return `${candidateUrl.href}/index.js`
  return null
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const resolved = withExtension(new URL(specifier.slice(2), SRC))
    if (resolved) return { url: resolved, shortCircuit: true }
  }

  // Extensionless relative imports (`./db`, `./seed`) - the bundler resolves
  // these, but plain Node does not.
  const isRelative = specifier.startsWith('./') || specifier.startsWith('../')
  const hasExtension = /\.[a-z0-9]+$/i.test(specifier)
  if (isRelative && !hasExtension && context.parentURL) {
    const resolved = withExtension(new URL(specifier, context.parentURL))
    if (resolved) return { url: resolved, shortCircuit: true }
  }

  return nextResolve(specifier, context)
}
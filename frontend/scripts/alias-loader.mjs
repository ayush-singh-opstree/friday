/**
 * Registers the `@/` alias resolve hooks for plain `node` runs.
 *
 *   npm run verify:attention
 *   # i.e. node --import ./scripts/alias-loader.mjs scripts/verify-attention.mjs
 */
import { register } from 'node:module'

register('./alias-hooks.mjs', import.meta.url)
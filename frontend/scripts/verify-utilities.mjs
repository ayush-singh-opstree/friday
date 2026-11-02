/**
 * verify-utilities.mjs
 *
 * Guards the `cn()` contract used by every component:
 *
 *   1. utilities from DIFFERENT groups must coexist (colour + font-size),
 *   2. same-group conflicts must resolve last-wins,
 *   3. a caller's `className` must still override a component's variant.
 *
 * Regression this exists for: our `@theme` type scale (`text-small`,
 * `text-tiny`, ...) was unknown to tailwind-merge, so it was classified as a
 * text *colour* and silently deleted real colour utilities - primary buttons
 * lost their white label and inherited the body colour instead.
 *
 *   npm run verify:utilities
 */
import { cn } from '@/lib/utils'

let passed = 0
let failed = 0

function check(name, ok, detail = '') {
  if (ok) {
    passed += 1
    console.log(`PASS  ${name}`)
  } else {
    failed += 1
    console.log(`FAIL  ${name}${detail ? `\n      ${detail}` : ''}`)
  }
}

/* ------------------------------------------- colour + custom size coexist --- */

check(
  'colour survives a custom size (variant first, sm)',
  cn('bg-primary text-ink-inverse', 'h-8 px-3 text-small').includes('text-ink-inverse'),
  cn('bg-primary text-ink-inverse', 'h-8 px-3 text-small'),
)
check(
  'colour survives a custom size (variant first, md)',
  cn('bg-primary text-ink-inverse', 'h-10 px-4 text-body-medium').includes('text-ink-inverse'),
  cn('bg-primary text-ink-inverse', 'h-10 px-4 text-body-medium'),
)
check(
  'colour survives a custom size (size first)',
  cn('h-8 px-3 text-small', 'bg-primary text-ink-inverse').includes('text-ink-inverse'),
  cn('h-8 px-3 text-small', 'bg-primary text-ink-inverse'),
)
check(
  'every custom size is treated as font-size, not colour',
  ['display', 'heading-1', 'heading-2', 'heading-3', 'body', 'body-medium', 'small', 'tiny', 'mono']
    .every((size) => cn('text-ink-inverse', `text-${size}`).includes('text-ink-inverse')),
)
check(
  'ghost/secondary style colour survives a size',
  cn('bg-transparent text-primary', 'h-10 px-4 text-body-medium').includes('text-primary'),
  cn('bg-transparent text-primary', 'h-10 px-4 text-body-medium'),
)
check(
  'heading size no longer eats a colour',
  cn('text-heading-2', 'text-ink').includes('text-ink'),
  cn('text-heading-2', 'text-ink'),
)

/* ------------------------------------------------ same-group last-wins --- */

check('colour conflicts resolve last-wins', cn('text-ink', 'text-primary') === 'text-primary', cn('text-ink', 'text-primary'))
check(
  'size conflicts resolve last-wins',
  cn('text-small', 'text-heading-2') === 'text-heading-2',
  cn('text-small', 'text-heading-2'),
)
check(
  "caller className still overrides a variant's colour",
  cn('bg-primary text-ink-inverse', 'text-ink') === 'bg-primary text-ink',
  cn('bg-primary text-ink-inverse', 'text-ink'),
)
check(
  "caller className still overrides a variant's background",
  cn('bg-primary text-ink-inverse', 'bg-card') === 'text-ink-inverse bg-card',
  cn('bg-primary text-ink-inverse', 'bg-card'),
)

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)

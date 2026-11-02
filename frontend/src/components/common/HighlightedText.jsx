import { escapeRegExp } from '@/lib/regex'

/**
 * Renders text with the search term highlighted (`<mark>`), matching
 * docs/03_feature_specs.md -> "Each result shows the matched text with the
 * search term highlighted".
 *
 * Handles quoted phrases too: `"follow up on contract"` highlights the whole
 * phrase rather than the individual words.
 */
export function HighlightedText({ text = '', term = '', className }) {
  const value = String(text ?? '')
  const needle = String(term ?? '').replace(/^"|"$/g, '').trim()

  if (!needle) return <span className={className}>{value}</span>

  const pattern = new RegExp(`(${escapeRegExp(needle)})`, 'ig')
  const parts = value.split(pattern)

  return (
    <span className={className}>
      {parts.map((part, index) =>
        part.toLowerCase() === needle.toLowerCase() ? (
          <mark
            key={`${part}-${index}`}
            className="rounded-[2px] bg-accent/30 px-0.5 text-ink"
          >
            {part}
          </mark>
        ) : (
          <span key={`${part}-${index}`}>{part}</span>
        ),
      )}
    </span>
  )
}
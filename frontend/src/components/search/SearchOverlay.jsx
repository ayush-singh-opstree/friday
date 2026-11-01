import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChatCircleDots,
  CheckSquare,
  ClockCounterClockwise,
  MagnifyingGlass,
  NoteBlank,
  Users,
  X,
} from '@phosphor-icons/react'
import { STORAGE_KEYS } from '@/config/constants'
import { useSearch } from '@/hooks/useSearch'
import { useDebounce } from '@/hooks/useDebounce'
import { HighlightedText } from '@/components/common/HighlightedText'
import { CaptureTypeChip } from '@/components/ui/Chip'
import { UrgencyDot } from '@/components/ui/Badge'
import { EmptyState, LoadingState } from '@/components/ui/Feedback'
import { readJson, writeJson } from '@/lib/localStore'
import { humaniseDueDate } from '@/lib/date'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/store'

const TYPE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'threads', label: 'Threads' },
  { value: 'people', label: 'People' },
  { value: 'captures', label: 'Captures' },
  { value: 'commitments', label: 'Commitments' },
]

const MAX_RECENT = 6

/**
 * Global search overlay (Feature 12).
 *
 * Cmd/Ctrl+F opens it, Escape closes it, results are grouped by entity, matches
 * are highlighted, recent searches are remembered, and quoted phrases work.
 */
export function SearchOverlay() {
  const open = useUiStore((state) => state.searchOpen)
  const closeSearch = useUiStore((state) => state.closeSearch)
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [type, setType] = useState('all')
  const [recent, setRecent] = useState(() => readJson(STORAGE_KEYS.RECENT_SEARCHES, []) ?? [])
  const inputRef = useRef(null)

  const highlightTerm = useDebounce(query, 200)
  const { term, active, status, results, error } = useSearch(query)

  useEffect(() => {
    if (!open) return undefined
    const timer = setTimeout(() => inputRef.current?.focus(), 40)
    return () => clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeSearch()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, closeSearch])

  if (!open) return null

  const remember = (value) => {
    const next = [value, ...recent.filter((item) => item !== value)].slice(0, MAX_RECENT)
    setRecent(next)
    writeJson(STORAGE_KEYS.RECENT_SEARCHES, next)
  }

  const go = (path) => {
    if (term) remember(term)
    closeSearch()
    setQuery('')
    navigate(path)
  }

  const sections = [
    {
      key: 'threads',
      label: 'Threads',
      Icon: ChatCircleDots,
      rows: (results?.threads ?? []).map((thread) => ({
        id: thread.id,
        primary: thread.title,
        secondary: thread.attentionReason ?? 'Thread',
        path: `/threads/${thread.id}`,
      })),
    },
    {
      key: 'people',
      label: 'People',
      Icon: Users,
      rows: (results?.people ?? []).map((person) => ({
        id: person.id,
        primary: person.fullName,
        secondary: [person.role, person.organisation].filter(Boolean).join(' · ') || 'Person',
        path: `/people/${person.id}`,
      })),
    },
    {
      key: 'captures',
      label: 'Captures',
      Icon: NoteBlank,
      rows: (results?.captures ?? []).map((capture) => ({
        id: capture.id,
        primary: capture.content,
        secondary: capture.threadTitle ?? 'Capture',
        captureType: capture.type,
        path: capture.threadId ? `/threads/${capture.threadId}` : '/threads',
      })),
    },
    {
      key: 'commitments',
      label: 'Commitments',
      Icon: CheckSquare,
      rows: (results?.commitments ?? []).map((commitment) => ({
        id: commitment.id,
        primary: commitment.description,
        secondary: `${humaniseDueDate(commitment.dueDate, commitment.status)}${
          commitment.threadTitle ? ` · ${commitment.threadTitle}` : ''
        }`,
        dueDate: commitment.dueDate,
        status: commitment.status,
        path: `/threads/${commitment.threadId}`,
      })),
    },
  ]

  const visible = type === 'all' ? sections : sections.filter((section) => section.key === type)
  const totalShown = visible.reduce((sum, section) => sum + section.rows.length, 0)

  return (
    <div
      className="fixed inset-0 z-100 flex items-start justify-center bg-black/40 p-4 pt-[10vh] backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="Search Threadwise"
      onMouseDown={(event) => event.target === event.currentTarget && closeSearch()}
    >
      <div className="flex max-h-[75vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-card shadow-lg">
        <div className="flex items-center gap-2 border-b border-line px-3 py-2.5">
          <MagnifyingGlass size={16} className="shrink-0 text-ink-subtle" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder='Search threads, people, captures, commitments…  (try "quoted phrases")'
            aria-label="Search query"
            className="h-8 min-w-0 flex-1 bg-transparent text-body text-ink placeholder:text-ink-subtle focus:outline-none"
          />
          <button
            type="button"
            onClick={closeSearch}
            aria-label="Close search"
            className="rounded-sm p-1 text-ink-subtle hover:bg-overlay hover:text-ink"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 border-b border-line px-3 py-2">
          {TYPE_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              aria-pressed={type === filter.value}
              onClick={() => setType(filter.value)}
              className={cn(
                'h-7 rounded-full px-2.5 text-tiny font-medium transition-colors',
                type === filter.value
                  ? 'bg-primary text-ink-inverse'
                  : 'bg-overlay text-ink-muted hover:text-ink',
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto scroll-slim px-3 py-3">
          {!active ? (
            <div>
              {recent.length > 0 ? (
                <>
                  <h3 className="mb-2 flex items-center gap-1.5 text-tiny font-semibold tracking-[0.08em] text-ink-subtle uppercase">
                    <ClockCounterClockwise size={12} />
                    Recent searches
                  </h3>
                  <ul className="mb-3 flex flex-wrap gap-1.5">
                    {recent.map((item) => (
                      <li key={item}>
                        <button
                          type="button"
                          onClick={() => setQuery(item)}
                          className="rounded-full bg-overlay px-2.5 py-1 text-small text-ink-muted hover:text-ink"
                        >
                          {item}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
              <p className="text-small text-ink-subtle">
                Type at least 2 characters to search across everything.
              </p>
            </div>
          ) : status === 'loading' ? (
            <LoadingState label="Searching…" className="py-8" />
          ) : status === 'error' ? (
            <EmptyState title="Search failed" description={error} className="py-8" />
          ) : totalShown === 0 ? (
            <EmptyState
              title="No matches"
              description={`Nothing found for “${term}”. Try a different word or a quoted phrase.`}
              className="py-8"
            />
          ) : (
            <div className="flex flex-col gap-4">
              {visible.map((section) => {
                if (section.rows.length === 0) return null
                const Icon = section.Icon
                return (
                  <section key={section.key}>
                    <h3 className="mb-1.5 flex items-center gap-1.5 text-tiny font-semibold tracking-[0.08em] text-ink-subtle uppercase">
                      <Icon size={12} />
                      {section.label} · {section.rows.length}
                    </h3>
                    <ul className="flex flex-col gap-0.5">
                      {section.rows.map((row) => (
                        <li key={row.id}>
                          <button
                            type="button"
                            onClick={() => go(row.path)}
                            className="flex w-full items-start gap-2 rounded-sm px-2 py-2 text-left transition-colors hover:bg-overlay"
                          >
                            {row.dueDate !== undefined || row.status ? (
                              <UrgencyDot
                                dueDate={row.dueDate}
                                status={row.status ?? 'open'}
                                className="mt-1.5"
                              />
                            ) : null}
                            <span className="min-w-0 flex-1">
                              <HighlightedText
                                text={row.primary}
                                term={highlightTerm}
                                className="block truncate text-body-medium text-ink"
                              />
                              <span className="mt-0.5 block truncate text-tiny text-ink-muted">
                                {row.secondary}
                              </span>
                            </span>
                            {row.captureType ? <CaptureTypeChip type={row.captureType} /> : null}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-line px-3 py-2 text-tiny text-ink-subtle">
          <span>Esc to close</span>
          <span>{active && results ? `${results.total ?? 0} results` : 'Your data only'}</span>
        </div>
      </div>
    </div>
  )
}
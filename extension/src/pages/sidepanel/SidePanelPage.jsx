import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  GearSix,
  MagnifyingGlass,
  Snowflake,
  Sparkle,
} from '@/components/icons'
import { ProtectedView } from '@/authorization'
import { Logo } from '@/components/common/Logo'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import {
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  IconButton,
  PersonRowSkeleton,
  Skeleton,
  ThreadListSkeleton,
  SectionHeader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@/components/ui'
import { CAPTURE_TYPES } from '@/config/constants'
import { usePeople, useQuickCapture, useThreads } from '@/hooks'
import { searchApi } from '@/apis'
import { useDebounce } from '@/hooks/useDebounce'
import { openOptions } from '@/lib/messaging'
import { relativeTime } from '@/lib/date'
import { usePeopleStore, useUiStore } from '@/store'
import { cn } from '@/lib/utils'
import { ThreadSessionFlow } from '@/components/threads/ThreadSessionFlow'

/**
 * Side panel - Friday Companion.
 * Clean contextual companion:
 * - Removed Page scraping feature.
 * - Removed Needs Attention.
 * - Focused on Threads, People Directory, Search, and Quick Capture.
 */
export function SidePanelPage() {
  const activeSession = useUiStore((state) => state.activeSession)

  const formatTimer = (seconds = 0) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <div className="flex min-h-dvh w-full flex-col bg-surface overflow-x-hidden">
      <header className="flex h-12 items-center justify-between border-b border-line/80 bg-card px-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Logo size={22} />
          <span className="text-small font-bold tracking-[-0.02em] text-ink">Friday Companion</span>
        </div>
        <div className="flex items-center gap-1.5">
          {activeSession ? (
            <div
              className="flex items-center gap-1.5 rounded-full border border-danger/30 bg-danger/10 px-2 py-0.5 text-tiny font-medium text-danger animate-pulse"
              title={`Recording capture session for: ${activeSession.threadTitle}`}
            >
              <span className="size-1.5 rounded-full bg-danger" />
              <span className="font-mono text-tiny font-bold tabular-nums">
                {formatTimer(activeSession.elapsed)}
              </span>
            </div>
          ) : null}
          <ThemeToggle />
          <IconButton label="Settings" size="sm" onClick={openOptions}>
            <GearSix size={16} />
          </IconButton>
        </div>
      </header>

      <ProtectedView title="Sign in to Friday">
        <SidePanelBody />
      </ProtectedView>
    </div>
  )
}

function SidePanelBody() {
  const capture = useQuickCapture({ source: 'extension' })
  const [tab, setTab] = useState('threads')

  return (
    <div className="flex flex-1 flex-col gap-3.5 p-3.5">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="Companion sections" className="p-1">
          <TabsTrigger value="threads">Thread</TabsTrigger>
          <TabsTrigger value="people">People</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="capture">Quick Capture</TabsTrigger>
        </TabsList>

        <TabsContent value="threads">
          <ThreadSessionFlow />
        </TabsContent>

        <TabsContent value="people">
          <PeoplePanel />
        </TabsContent>

        <TabsContent value="search">
          <SearchPanel />
        </TabsContent>

        <TabsContent value="capture">
          <Card className="p-3.5">
            <SectionHeader label="New capture" />
            <CaptureForm capture={capture} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

/** Browse the directory from the companion */
function PeoplePanel() {
  const [query, setQuery] = useState('')
  const { people, isLoading } = usePeople({ query })

  const directory = usePeopleStore((state) => state.people)
  const selectedPerson = usePeopleStore((state) => state.selectedPerson)
  const selectedPersonStatus = usePeopleStore((state) => state.selectedPersonStatus)
  const personThreads = usePeopleStore((state) => state.selectedPersonThreads)
  const personCommitments = usePeopleStore((state) => state.selectedPersonCommitments)
  const selectPerson = usePeopleStore((state) => state.selectPerson)

  const list = people.length > 0 ? people : directory
  const openCommitments = personCommitments.filter((row) => row.status === 'open')

  if (selectedPersonStatus === 'loading') {
    return <PersonDetailSkeleton />
  }

  if (selectedPerson) {
    return (
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => selectPerson(null)}
          className="inline-flex items-center gap-1 text-tiny font-medium text-primary hover:underline cursor-pointer"
        >
          <ArrowLeft size={12} weight="bold" /> Back to directory
        </button>

        <Card className="flex items-start gap-3 p-3.5">
          <Avatar name={selectedPerson.fullName} size="md" className="ring-2 ring-primary/10" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-medium font-semibold text-ink">{selectedPerson.fullName}</p>
            <p className="truncate text-small text-ink-muted">
              {[selectedPerson.role, selectedPerson.organisation].filter(Boolean).join(' · ') ||
                'No role recorded'}
            </p>
          </div>
        </Card>

        {selectedPerson.notes ? (
          <div className="rounded-xl border border-line/60 bg-overlay/80 p-3 text-small text-ink">
            <p className="text-tiny font-semibold text-ink-subtle uppercase tracking-wider mb-1">Notes</p>
            <p className="whitespace-pre-line text-small">{selectedPerson.notes}</p>
          </div>
        ) : null}

        <section>
          <SectionHeader label={`Threads · ${personThreads.length}`} />
          {personThreads.length === 0 ? (
            <p className="py-2 text-center text-small text-ink-subtle">Not linked to a thread yet.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {personThreads.map((thread) => (
                <li key={thread.id}>
                  <Card className="flex items-center justify-between gap-2.5 p-2.5 hover:border-primary/40 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-small font-semibold text-ink">{thread.title}</p>
                      <p className="truncate text-tiny text-ink-muted">
                        {relativeTime(thread.lastInteractionAt)}
                      </p>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>

        {openCommitments.length > 0 ? (
          <section>
            <SectionHeader label={`Open commitments · ${openCommitments.length}`} />
            <ul className="flex flex-col gap-1.5">
              {openCommitments.map((commitment) => (
                <li
                  key={commitment.id}
                  className="flex items-center gap-2.5 rounded-xl border border-line bg-card p-2.5 text-small text-ink shadow-xs"
                >
                  <Snowflake size={13} className="shrink-0 text-cold" />
                  <span className="truncate">{commitment.description}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <MagnifyingGlass
          size={14}
          className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-subtle"
        />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search directory…"
          aria-label="Search people"
          className="h-9 w-full rounded-xl border border-line bg-overlay pr-3 pl-8 text-small transition-all focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/12"
        />
      </div>

      {isLoading && list.length === 0 ? (
        <div className="flex flex-col gap-1.5 py-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <PersonRowSkeleton key={i} />
          ))}
        </div>
      ) : list.length === 0 ? (
        <EmptyState title="No people" description="Add people from the Friday web app." />
      ) : (
        <ul className="flex flex-col gap-1">
          {list.slice(0, 25).map((person) => (
            <li key={person.id}>
              <button
                type="button"
                onClick={() => selectPerson(person.id)}
                className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-overlay cursor-pointer"
              >
                <Avatar name={person.fullName} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-small font-semibold text-ink">
                    {person.fullName}
                  </span>
                  <span className="block truncate text-tiny text-ink-muted">
                    {[person.role, person.organisation].filter(Boolean).join(' · ') ||
                      'No role recorded'}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function PersonDetailSkeleton() {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Loading person details">
      <div className="flex items-center gap-2 px-1">
        <Skeleton className="h-4 w-24 rounded-md" />
      </div>

      <Card className="flex items-center gap-3 p-3.5">
        <Skeleton className="size-10 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-3 w-44 max-w-full rounded-md" />
        </div>
      </Card>

      <section>
        <Skeleton className="mb-2 h-3 w-28 rounded-md" />
        <div className="flex flex-col gap-1.5">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="rounded-xl border border-line/60 bg-card p-2.5 shadow-2xs"
            >
              <Skeleton className="h-3.5 w-3/4 rounded-md" />
              <Skeleton className="mt-1.5 h-2.5 w-1/3 rounded-md bg-line/60" />
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

/** Search from the companion */
function SearchPanel() {
  const [query, setQuery] = useState('')
  const debounced = useDebounce(query, 250)
  const [state, setState] = useState({ status: 'idle', results: null, error: null })

  useEffect(() => {
    const term = debounced.trim()
    if (term.length < 2) return undefined
    let cancelled = false

    const run = async () => {
      await Promise.resolve()
      if (cancelled) return
      setState({ status: 'loading', results: null, error: null })
      try {
        const results = await searchApi.query(term)
        if (!cancelled) setState({ status: 'ready', results, error: null })
      } catch (error) {
        if (!cancelled) setState({ status: 'error', results: null, error: error?.message })
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [debounced])

  const term = debounced.trim()
  const results = state.results

  const rows = [
    ...(results?.threads ?? []).map((thread) => ({
      id: thread.id,
      primary: thread.title,
      secondary: thread.attentionReason || 'Thread',
    })),
    ...(results?.people ?? []).map((person) => ({
      id: person.id,
      primary: person.fullName,
      secondary: [person.role, person.organisation].filter(Boolean).join(' · ') || 'Person',
    })),
    ...(results?.captures ?? []).map((capture) => ({
      id: capture.id,
      primary: capture.content,
      secondary: capture.threadTitle || 'Capture',
    })),
    ...(results?.commitments ?? []).map((commitment) => ({
      id: commitment.id,
      primary: commitment.description,
      secondary: commitment.dueDate
        ? new Date(commitment.dueDate).toLocaleDateString()
        : 'No due date',
    })),
  ]

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <MagnifyingGlass
          size={14}
          className="absolute top-1/2 left-3 -translate-y-1/2 text-ink-subtle"
        />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search threads, people, notes…"
          aria-label="Search"
          className="h-9 w-full rounded-xl border border-line bg-overlay pr-3 pl-8 text-small transition-all focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/12"
        />
      </div>

      {term.length < 2 ? (
        <p className="py-6 text-center text-small text-ink-subtle">
          Type at least 2 characters to search.
        </p>
      ) : state.status === 'loading' ? (
        <ThreadListSkeleton count={3} />
      ) : state.status === 'error' ? (
        <EmptyState title="Search failed" description={state.error} />
      ) : rows.length === 0 ? (
        <EmptyState title="No matches" description={`Nothing found for "${term}".`} />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {rows.slice(0, 20).map((row) => (
            <li key={row.id} className="rounded-xl border border-line bg-card px-3 py-2.5 shadow-xs">
              <p className="truncate text-small font-semibold text-ink">{row.primary}</p>
              <p className="truncate text-tiny text-ink-muted">{row.secondary}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function CaptureForm({ capture }) {
  const { threads } = useThreads({ autoLoad: true })
  const activeThreads = threads.filter((thread) => thread.status === 'active')

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault()
        await capture.save()
      }}
      className="flex flex-col gap-2.5"
    >
      <Field htmlFor="panel-capture">
        <Textarea
          id="panel-capture"
          rows={3}
          value={capture.content}
          onChange={(event) => capture.setContent(event.target.value)}
          placeholder="What just happened?"
          invalid={Boolean(capture.error)}
          aria-label="Capture text"
        />
      </Field>

      <div className="flex flex-wrap gap-1">
        {CAPTURE_TYPES.map((option) => {
          const active = capture.type === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => capture.setType(option.value)}
              className="cursor-pointer"
            >
              <Chip tone={active ? option.value : 'neutral'} className={cn(active && 'font-semibold shadow-xs')}>
                {active ? <Check size={11} weight="bold" /> : null}
                {option.label}
              </Chip>
            </button>
          )
        })}
      </div>

      {capture.type === 'commitment' ? (
        <div className="flex flex-col gap-1 rounded-xl border border-line bg-card p-2">
          <label htmlFor="panel-due-date" className="block text-tiny font-medium text-ink-muted">
            Due date (Commitment)
          </label>
          <input
            id="panel-due-date"
            type="date"
            value={capture.dueDate}
            onChange={(e) => capture.setDueDate(e.target.value)}
            className="h-8 w-full rounded-lg border border-line bg-overlay px-2.5 text-tiny text-ink focus:border-primary focus:bg-card focus:outline-none"
            min={new Date().toISOString().split('T')[0]}
          />
          <div className="flex flex-wrap items-center gap-1 justify-end pt-1">
            <button
              type="button"
              onClick={() => capture.setDueDate(new Date().toISOString().split('T')[0])}
              className="rounded px-1.5 py-0.5 text-[10px] font-medium border border-line bg-overlay hover:bg-card text-ink-muted shrink-0"
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => capture.setDueDate(new Date(Date.now() + 86400000).toISOString().split('T')[0])}
              className="rounded px-1.5 py-0.5 text-[10px] font-medium border border-line bg-overlay hover:bg-card text-ink-muted shrink-0"
            >
              Tomorrow
            </button>
            <button
              type="button"
              onClick={() => capture.setDueDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0])}
              className="rounded px-1.5 py-0.5 text-[10px] font-medium border border-line bg-overlay hover:bg-card text-ink-muted shrink-0"
            >
              Next week
            </button>
          </div>
        </div>
      ) : null}

      <div>
        <label htmlFor="panel-thread" className="mb-1 block text-tiny font-medium text-ink-muted">
          Thread
        </label>
        <select
          id="panel-thread"
          value={capture.targetThreadId ?? ''}
          onChange={(event) => capture.setTargetThreadId(event.target.value || null)}
          className="h-9 w-full rounded-xl border border-line bg-overlay px-3 text-small text-ink transition-all focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/12 cursor-pointer"
        >
          <option value="">Inbox (unassigned)</option>
          {activeThreads.map((thread) => (
            <option key={thread.id} value={thread.id}>
              {thread.title}
            </option>
          ))}
        </select>
      </div>

      {capture.commitmentSuggestion ? (
        <p className="flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary-light px-2.5 py-1.5 text-tiny text-ink">
          <Sparkle size={12} weight="fill" className="shrink-0 text-primary" />
          <span>Looks like a commitment.</span>
          <button
            type="button"
            onClick={() => capture.setType('commitment')}
            className="font-bold text-primary underline underline-offset-2 ml-auto"
          >
            Track as commitment
          </button>
        </p>
      ) : null}

      {capture.error ? <p className="text-tiny font-medium text-danger">{capture.error}</p> : null}

      <Button
        type="submit"
        size="sm"
        loading={capture.saving}
        disabled={!capture.content.trim()}
        className="mt-1 w-full gap-1.5"
      >
        Save capture
        <ArrowRight size={13} weight="bold" />
      </Button>
    </form>
  )
}

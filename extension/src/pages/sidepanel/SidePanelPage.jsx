import { useEffect, useState } from 'react'
import { ArrowRight, GearSix, Globe, MagnifyingGlass, Snowflake, Sparkle, Users } from '@phosphor-icons/react'
import { ProtectedView } from '@/authorization'
import { Logo } from '@/components/common/Logo'
import {
  AttentionScoreBadge,
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  IconButton,
  LoadingState,
  SectionHeader,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from '@/components/ui'
import { CAPTURE_TYPES } from '@/config/constants'
import {
  useAttention,
  usePageContext,
  usePeople,
  usePersonMatch,
  useQuickCapture,
  useThreads,
} from '@/hooks'
import { searchApi } from '@/apis'
import { useDebounce } from '@/hooks/useDebounce'
import { openOptions } from '@/lib/messaging'
import { relativeTime } from '@/lib/date'
import { usePeopleStore } from '@/store'

/**
 * Side panel - the full companion (Feature 13).
 *
 * Tabs: "On this page" (matched person, their threads and commitments),
 * "Today" (attention snapshot) and "Capture".
 */
export function SidePanelPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-surface">
      <header className="flex items-center justify-between border-b border-line bg-card px-3 py-2.5">
        <Logo size={22} />
        <IconButton label="Settings" size="sm" onClick={openOptions}>
          <GearSix size={15} />
        </IconButton>
      </header>

      <ProtectedView title="Sign in to Threadwise">
        <SidePanelBody />
      </ProtectedView>
    </div>
  )
}

function SidePanelBody() {
  const page = usePageContext()
  const match = usePersonMatch(page.context)
  const { topThreads, isLoading } = useAttention({ autoLoad: true })
  const capture = useQuickCapture({ source: 'extension' })
  const [tab, setTab] = useState('page')

  return (
    <div className="flex flex-1 flex-col gap-3 p-3">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList aria-label="Companion sections">
          <TabsTrigger value="page">Page</TabsTrigger>
          <TabsTrigger value="people">People</TabsTrigger>
          <TabsTrigger value="search">Search</TabsTrigger>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="capture">Capture</TabsTrigger>
        </TabsList>

        <TabsContent value="page">
          <PageContextPanel page={page} match={match} capture={capture} />
        </TabsContent>

        <TabsContent value="people">
          <PeoplePanel />
        </TabsContent>

        <TabsContent value="search">
          <SearchPanel />
        </TabsContent>

        <TabsContent value="today">
          {isLoading && topThreads.length === 0 ? (
            <LoadingState label="Reading your threads…" />
          ) : topThreads.length === 0 ? (
            <EmptyState title="All clear" description="Nothing needs your attention." />
          ) : (
            <ul className="flex flex-col gap-1.5">
              {topThreads.map((thread) => (
                <li key={thread.id}>
                  <Card className="flex items-center gap-2.5 p-2.5">
                    <AttentionScoreBadge score={thread.attentionScore ?? 0} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-small font-medium text-ink">{thread.title}</p>
                      <p className="truncate text-tiny text-ink-muted">{thread.attentionReason}</p>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="capture">
          <CaptureForm capture={capture} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/** Browse the directory from the companion (Phase 1 People Directory parity). */
function PeoplePanel() {
  const [query, setQuery] = useState('')
  const { people, isLoading } = usePeople({ query })

  const directory = usePeopleStore((state) => state.people)
  const selectedPerson = usePeopleStore((state) => state.selectedPerson)
  const personThreads = usePeopleStore((state) => state.selectedPersonThreads)
  const personCommitments = usePeopleStore((state) => state.selectedPersonCommitments)
  const selectPerson = usePeopleStore((state) => state.selectPerson)

  const list = people.length > 0 ? people : directory
  const openCommitments = personCommitments.filter((row) => row.status === 'open')

  if (selectedPerson) {
    return (
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => selectPerson(null)}
          className="self-start text-tiny font-medium text-primary hover:underline"
        >
          ← Back to directory
        </button>

        <Card className="flex items-start gap-2.5 p-3">
          <Avatar name={selectedPerson.fullName} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-medium text-ink">{selectedPerson.fullName}</p>
            <p className="truncate text-small text-ink-muted">
              {[selectedPerson.role, selectedPerson.organisation].filter(Boolean).join(' · ') ||
                'No role recorded'}
            </p>
          </div>
        </Card>

        {selectedPerson.notes ? (
          <p className="rounded-sm bg-overlay px-2.5 py-2 text-small text-ink">
            {selectedPerson.notes}
          </p>
        ) : null}

        <section>
          <SectionHeader label={`Threads · ${personThreads.length}`} />
          {personThreads.length === 0 ? (
            <p className="text-small text-ink-subtle">Not linked to a thread yet.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {personThreads.map((thread) => (
                <li key={thread.id}>
                  <Card className="flex items-center gap-2.5 p-2.5">
                    <AttentionScoreBadge score={thread.attentionScore ?? 0} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-small font-medium text-ink">{thread.title}</p>
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
            <ul className="flex flex-col gap-1">
              {openCommitments.map((commitment) => (
                <li
                  key={commitment.id}
                  className="flex items-center gap-2 rounded-sm bg-card px-2.5 py-2 text-small text-ink"
                >
                  <Snowflake size={12} className="shrink-0 text-ink-subtle" />
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
    <div className="flex flex-col gap-2">
      <div className="relative">
        <MagnifyingGlass
          size={13}
          className="absolute top-1/2 left-2.5 -translate-y-1/2 text-ink-subtle"
        />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search your directory…"
          aria-label="Search people"
          className="h-9 w-full rounded-sm border border-line bg-overlay pr-2 pl-7 text-small focus:border-primary focus:outline-none"
        />
      </div>

      {isLoading && list.length === 0 ? (
        <LoadingState label="Loading directory…" className="py-6" />
      ) : list.length === 0 ? (
        <EmptyState title="No people" description="Add people from the Threadwise web app." />
      ) : (
        <ul className="flex flex-col gap-1">
          {list.slice(0, 25).map((person) => (
            <li key={person.id}>
              <button
                type="button"
                onClick={() => selectPerson(person.id)}
                className="flex w-full items-center gap-2.5 rounded-sm px-2 py-2 text-left transition-colors hover:bg-overlay"
              >
                <Avatar name={person.fullName} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-small font-medium text-ink">
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

/** Cross-entity search from the companion (Feature 12 parity). */
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
    <div className="flex flex-col gap-2">
      <div className="relative">
        <MagnifyingGlass
          size={13}
          className="absolute top-1/2 left-2.5 -translate-y-1/2 text-ink-subtle"
        />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search everything…"
          aria-label="Search"
          className="h-9 w-full rounded-sm border border-line bg-overlay pr-2 pl-7 text-small focus:border-primary focus:outline-none"
        />
      </div>

      {term.length < 2 ? (
        <p className="py-4 text-center text-small text-ink-subtle">
          Type at least 2 characters.
        </p>
      ) : state.status === 'loading' ? (
        <LoadingState label="Searching…" className="py-6" />
      ) : state.status === 'error' ? (
        <EmptyState title="Search failed" description={state.error} />
      ) : rows.length === 0 ? (
        <EmptyState title="No matches" description={`Nothing found for “${term}”.`} />
      ) : (
        <ul className="flex flex-col gap-1">
          {rows.slice(0, 20).map((row) => (
            <li key={row.id} className="rounded-sm bg-card px-2.5 py-2">
              <p className="truncate text-small font-medium text-ink">{row.primary}</p>
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
      className="flex flex-col gap-2"
    >
      <Field htmlFor="panel-capture">
        <Textarea
          id="panel-capture"
          rows={4}
          value={capture.content}
          onChange={(event) => capture.setContent(event.target.value)}
          placeholder="What just happened?"
          invalid={Boolean(capture.error)}
          aria-label="Capture text"
        />
      </Field>

      <div className="flex flex-wrap gap-1">
        {CAPTURE_TYPES.map((option) => (
          <button key={option.value} type="button" onClick={() => capture.setType(option.value)}>
            <Chip tone={capture.type === option.value ? option.value : 'neutral'}>
              {option.label}
            </Chip>
          </button>
        ))}
      </div>

      <label htmlFor="panel-thread" className="text-tiny font-medium text-ink-muted">
        Thread
      </label>
      <select
        id="panel-thread"
        value={capture.targetThreadId ?? ''}
        onChange={(event) => capture.setTargetThreadId(event.target.value || null)}
        className="h-9 w-full rounded-sm border border-line bg-overlay px-2 text-small text-ink focus:border-primary focus:outline-none"
      >
        <option value="">Inbox (unassigned)</option>
        {activeThreads.map((thread) => (
          <option key={thread.id} value={thread.id}>
            {thread.title}
          </option>
        ))}
      </select>

      {capture.commitmentSuggestion ? (
        <p className="flex items-start gap-1.5 rounded-sm bg-primary-light px-2 py-1.5 text-tiny text-ink">
          <Sparkle size={12} weight="fill" className="mt-0.5 shrink-0 text-primary" />
          Looks like a commitment.
          <button
            type="button"
            onClick={() => capture.setType('action')}
            className="font-semibold text-primary underline"
          >
            Track it
          </button>
        </p>
      ) : null}

      {capture.error ? <p className="text-tiny text-danger">{capture.error}</p> : null}

      <Button type="submit" size="sm" loading={capture.saving} disabled={!capture.content.trim()}>
        Save capture
        <ArrowRight size={12} weight="bold" />
      </Button>
    </form>
  )
}

function PageContextPanel({ page, match, capture }) {
  const personThreads = usePeopleStore((state) => state.selectedPersonThreads)
  const personCommitments = usePeopleStore((state) => state.selectedPersonCommitments)
  const selectPerson = usePeopleStore((state) => state.selectPerson)
  const createPerson = usePeopleStore((state) => state.createPerson)

  const personId = match.person?.id ?? null

  useEffect(() => {
    if (personId) selectPerson(personId)
  }, [personId, selectPerson])

  if (page.status === 'loading') return <LoadingState label="Reading this page…" />

  if (page.status === 'unsupported' || !page.isApproved) {
    return (
      <EmptyState
        icon={<Globe size={24} weight="duotone" />}
        title="Nothing to surface here"
        description="The companion only injects on LinkedIn profiles and Gmail. Open one of those to see relationship context."
      />
    )
  }

  if (match.state === 'matched') {
    const openCommitments = personCommitments.filter((row) => row.status === 'open')
    return (
      <div className="flex flex-col gap-3">
        <Card className="flex items-start gap-2.5 p-3">
          <Avatar name={match.person.fullName} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-medium text-ink">{match.person.fullName}</p>
            <p className="truncate text-small text-ink-muted">
              {[match.person.role, match.person.organisation].filter(Boolean).join(' · ') ||
                'No role recorded'}
            </p>
            <p className="mt-1 text-tiny text-ink-subtle">{match.reason}</p>
          </div>
        </Card>

        {personThreads.length > 0 ? (
          <section>
            <SectionHeader label="Threads" />
            <ul className="flex flex-col gap-1.5">
              {personThreads.map((thread) => (
                <li key={thread.id}>
                  <Card className="flex items-center gap-2.5 p-2.5">
                    <AttentionScoreBadge score={thread.attentionScore ?? 0} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-small font-medium text-ink">{thread.title}</p>
                      <p className="truncate text-tiny text-ink-muted">
                        {relativeTime(thread.lastInteractionAt)}
                      </p>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {openCommitments.length > 0 ? (
          <section>
            <SectionHeader label="Open commitments" />
            <ul className="flex flex-col gap-1">
              {openCommitments.map((commitment) => (
                <li
                  key={commitment.id}
                  className="flex items-center gap-2 rounded-sm bg-card px-2.5 py-2 text-small text-ink"
                >
                  <Snowflake size={12} className="shrink-0 text-ink-subtle" />
                  <span className="truncate">{commitment.description}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <CaptureForm capture={capture} />
      </div>
    )
  }

  // Unmatched: offer to add the detected person to the directory.
  return (
    <div className="flex flex-col gap-3">
      <EmptyState
        icon={<Users size={24} weight="duotone" />}
        title="Not in your directory"
        description={
          page.context?.name
            ? `“${page.context.name}” was detected on this page but is not a Threadwise contact yet.`
            : 'No person was detected on this page.'
        }
        action={
          page.context?.name ? (
            <Button
              size="sm"
              onClick={() =>
                createPerson({
                  fullName: page.context.name,
                  organisation: page.context.organisation ?? undefined,
                  linkedInUrl: page.context.url ?? undefined,
                })
              }
            >
              Add to Threadwise
            </Button>
          ) : null
        }
      />

      <CaptureForm capture={capture} />
    </div>
  )
}
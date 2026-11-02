import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CalendarBlank,
  Check,
  CheckSquare,
  Lightning,
  MagnifyingGlass,
  Note,
  Plus,
  Question,
  Trash,
  X,
} from '@/components/icons'
import {
  Avatar,
  Button,
  Card,
  Chip,
  EmptyState,
  Field,
  Input,
  PersonRowSkeleton,
  Spinner,
  Textarea,
  ThreadListSkeleton,
} from '@/components/ui'
import { usePeople, useThreads } from '@/hooks'
import { clubsApi } from '@/apis'
import { useCaptureStore, usePeopleStore, useThreadStore, useUiStore } from '@/store'
import { cn } from '@/lib/utils'

const CAPTURE_TYPE_OPTIONS = [
  { value: 'commitment', label: 'Commitment', icon: Lightning, tone: 'commitment' },
  { value: 'decision', label: 'Decision', icon: CheckSquare, tone: 'decision' },
  { value: 'question', label: 'Question', icon: Question, tone: 'question' },
  { value: 'note', label: 'Note', icon: Note, tone: 'note' },
]

/**
 * ThreadSessionFlow - Clean, consolidated extension experience:
 * 1. Home: Create New Thread / Search Threads / Recent Threads (No Needs Attention).
 * 2. Create Thread: Title & Description -> Add People (Existing or Create New).
 * 3. Live Capture Session: Rapid multi-type logging with active timer.
 * 4. Stop Capturing: ends the club and saves the captures (no recap generated).
 */
export function ThreadSessionFlow({ onOpenCompanion }) {
  const { refresh: refreshThreads } = useThreads({ autoLoad: false })
  const { people, createPerson, refresh: refreshPeople } = usePeople({ autoLoad: true })
  const createCapture = useCaptureStore((state) => state.createCapture)
  const createThread = useThreadStore((state) => state.createThread)

  // Step state: 'people' | 'person_threads' | 'new_details' | 'new_people' | 'session' | 'summary'
  const [step, setStep] = useState('people')

  // People-first flow: the picked person + the threads they already share.
  const selectPerson = usePeopleStore((state) => state.selectPerson)
  const pickedPerson = usePeopleStore((state) => state.selectedPerson)
  const pickedPersonThreads = usePeopleStore((state) => state.selectedPersonThreads)
  const [pickedThreadsLoading, setPickedThreadsLoading] = useState(false)

  // Create thread form
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [selectedPersonIds, setSelectedPersonIds] = useState([])

  // Inline create person form
  const [showCreatePerson, setShowCreatePerson] = useState(false)
  const [newPersonName, setNewPersonName] = useState('')
  const [newPersonRole, setNewPersonRole] = useState('')
  const [newPersonOrg, setNewPersonOrg] = useState('')
  const [personSearch, setPersonSearch] = useState('')
  const [creatingPerson, setCreatingPerson] = useState(false)
  const [creatingThread, setCreatingThread] = useState(false)
  const [startingSessionId, setStartingSessionId] = useState(null)

  // Active Capture Session state
  const [activeThread, setActiveThread] = useState(null)
  const [activeClubId, setActiveClubId] = useState(null)
  const [sessionCaptures, setSessionCaptures] = useState([])
  const [captureInput, setCaptureInput] = useState('')
  const [captureType, setCaptureType] = useState('commitment')
  const [captureDueDate, setCaptureDueDate] = useState('')
  const [sessionElapsed, setSessionElapsed] = useState(0)
  const [stoppingSession, setStoppingSession] = useState(false)

  // Active session timer
  const captureInputRef = useRef(null)

  useEffect(() => {
    if (step !== 'session') {
      useUiStore.getState().clearActiveSession()
      return undefined
    }
    useUiStore.getState().setActiveSession({
      threadTitle: activeThread?.title ?? 'Session',
      elapsed: 0,
      clubId: activeClubId,
    })
    const interval = setInterval(() => {
      setSessionElapsed((prev) => prev + 1)
    }, 1000)
    return () => {
      clearInterval(interval)
      useUiStore.getState().clearActiveSession()
    }
  }, [step, activeThread, activeClubId])

  // Mirror the elapsed counter into the floating session pill.
  useEffect(() => {
    if (step !== 'session') return
    useUiStore.getState().updateSessionElapsed(sessionElapsed)
  }, [sessionElapsed, step])

  // Filtered people for person selection
  const filteredPeople = useMemo(() => {
    if (!personSearch.trim()) return people
    const q = personSearch.toLowerCase().trim()
    return people.filter(
      (p) =>
        p.fullName?.toLowerCase().includes(q) ||
        p.organisation?.toLowerCase().includes(q) ||
        p.role?.toLowerCase().includes(q),
    )
  }, [people, personSearch])

  // People-first flow step 1 -> 2: pick a person, then load their threads.
  const handlePickPerson = async (person) => {
    if (!person?.id) return
    // Pre-select them so the "Add People" step starts with them checked.
    setSelectedPersonIds([person.id])
    setPersonSearch('')
    setPickedThreadsLoading(true)
    setStep('person_threads')
    try {
      await selectPerson(person.id)
    } catch {
      // Keep going - the "create new thread" option is always available.
    } finally {
      setPickedThreadsLoading(false)
    }
  }

  // Start a brand new thread for the picked person.
  const handleStartNewThread = () => {
    setTitle('')
    setDescription('')
    setStep('new_details')
  }

  // Handle adding an inline person
  const handleCreatePersonInline = async (e) => {
    e.preventDefault()
    if (!newPersonName.trim()) return
    setCreatingPerson(true)
    try {
      const created = await createPerson({
        fullName: newPersonName.trim(),
        role: newPersonRole.trim() || undefined,
        organisation: newPersonOrg.trim() || undefined,
      })
      const person = created?.person ?? created
      setNewPersonName('')
      setNewPersonRole('')
      setNewPersonOrg('')
      setShowCreatePerson(false)
      refreshPeople()
      // Take the freshly created person straight to their threads.
      if (person?.id) await handlePickPerson(person)
    } catch {
      // ignore
    } finally {
      setCreatingPerson(false)
    }
  }

  // Toggle person selection
  const togglePersonSelect = (id) => {
    setSelectedPersonIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    )
  }

  // Start session for a newly created thread
  const handleCreateAndStartSession = async () => {
    if (!title.trim()) return
    setCreatingThread(true)
    try {
      const thread = await createThread({
        title: title.trim(),
        description: description.trim() || undefined,
        personIds: selectedPersonIds,
      })
      if (thread) {
        let clubId = null
        try {
          const club = await clubsApi.start({
            threadId: thread.id,
            name: `${thread.title} Session`,
            source: 'extension',
          })
          clubId = club?.id ?? null
        } catch {
          // fallback
        }
        setActiveThread(thread)
        setActiveClubId(clubId)
        setSessionCaptures([])
        setCaptureInput('')
        setCaptureDueDate('')
        setSessionElapsed(0)
        useUiStore.getState().setActiveSession({
          threadTitle: thread.title,
          elapsed: 0,
          clubId,
        })
        setStep('session')
        refreshThreads()
      }
    } catch {
      // fallback
    } finally {
      setCreatingThread(false)
    }
  }

  // Start session for an existing thread
  const handleStartExistingThreadSession = async (thread) => {
    setStartingSessionId(thread.id)
    let clubId = null
    try {
      const club = await clubsApi.start({
        threadId: thread.id,
        name: `${thread.title} Session`,
        source: 'extension',
      })
      clubId = club?.id ?? null
    } catch {
      // fallback
    } finally {
      setStartingSessionId(null)
    }
    setActiveThread(thread)
    setActiveClubId(clubId)
    setSessionCaptures([])
    setCaptureInput('')
    setCaptureDueDate('')
    setSessionElapsed(0)
    useUiStore.getState().setActiveSession({
      threadTitle: thread.title,
      elapsed: 0,
      clubId,
    })
    setStep('session')
  }

  // Add capture in session
  const handleAddCapture = (e) => {
    if (e) e.preventDefault()
    const content = captureInput.trim()
    if (!content) return

    setSessionCaptures((prev) => [
      ...prev,
      {
        id: `sess_cap_${Date.now()}_${Math.random()}`,
        content,
        type: captureType,
        dueDate: captureType === 'commitment' ? (captureDueDate || null) : null,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ])
    setCaptureInput('')
    setCaptureDueDate('')
    if (captureInputRef.current) {
      captureInputRef.current.focus()
    }
  }

  // Remove capture from session
  const handleRemoveCapture = (id) => {
    setSessionCaptures((prev) => prev.filter((c) => c.id !== id))
  }

  // Stop capturing: close the club and persist the individual captures.
  const handleStopSession = async () => {
    if (!activeThread) return
    setStoppingSession(true)
    useUiStore.getState().clearActiveSession()

    try {
      // 1. End club in backend if active
      if (activeClubId) {
        try {
          await clubsApi.end(activeClubId, new Date().toISOString())
        } catch {
          // Continue
        }
      }

      // 2. Save all individual structured captures with real API
      for (const cap of sessionCaptures) {
        try {
          await createCapture({
            content: cap.content,
            type: cap.type,
            threadId: activeThread.id,
            clubId: activeClubId || undefined,
            deadline: cap.dueDate || undefined,
            dueDate: cap.dueDate || undefined,
            personId: selectedPersonIds[0] || (activeThread.people?.[0]?.id) || undefined,
            source: 'extension',
          })
        } catch {
          // Continue saving remaining captures
        }
      }

      // 3. No recap/summary is generated - the session simply ends here.
      setStep('summary')
      refreshThreads()
    } catch {
      // Continue to summary even if partial save
      setStep('summary')
    } finally {
      setStoppingSession(false)
    }
  }

  // Reset the flow back to the person picker.
  const handleResetHome = () => {
    setStep('people')
    setTitle('')
    setDescription('')
    setSelectedPersonIds([])
    setActiveThread(null)
    setSessionCaptures([])
    setCaptureInput('')
    setPersonSearch('')
    usePeopleStore.getState().selectPerson(null)
  }

  // -------------------------------------------------------------
  // VIEW 1: PICK A PERSON (search, select, or create new)
  // -------------------------------------------------------------
  if (step === 'people') {
    return (
      <div className="flex flex-1 flex-col gap-3 p-3.5">
        <div className="pb-1 border-b border-line">
          <h2 className="text-small font-bold text-ink">Who is this session with?</h2>
          <p className="text-tiny text-ink-subtle">
            Pick a person, then choose a thread you share or create a new one
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <MagnifyingGlass
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle"
          />
          <input
            value={personSearch}
            onChange={(e) => setPersonSearch(e.target.value)}
            placeholder="Search people..."
            aria-label="Search people"
            className="h-9 w-full rounded-xl border border-line bg-overlay pl-8.5 pr-8 text-small text-ink placeholder:text-ink-subtle transition-all focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/12"
          />
          {personSearch && (
            <button
              type="button"
              onClick={() => setPersonSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink cursor-pointer"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* People List */}
        <div className="flex flex-1 flex-col min-h-0">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-tiny font-semibold uppercase tracking-wider text-ink-subtle">
              {personSearch.trim() ? 'Search Results' : 'People'}
            </span>
            <span className="text-tiny text-ink-subtle">{filteredPeople.length}</span>
          </div>

          {people.length === 0 ? (
            <div className="flex flex-col gap-1.5 py-1">
              {Array.from({ length: 3 }).map((_, i) => (
                <PersonRowSkeleton key={i} />
              ))}
            </div>
          ) : filteredPeople.length === 0 ? (
            <EmptyState
              title="No matching people"
              description="Try a different search, or create a new person below."
            />
          ) : (
            <ul className="flex max-h-[310px] flex-col gap-1.5 overflow-y-auto scroll-slim pr-0.5">
              {filteredPeople.map((person) => (
                <li key={person.id}>
                  <button
                    type="button"
                    onClick={() => handlePickPerson(person)}
                    className="flex w-full items-center justify-between gap-2.5 rounded-xl border border-line/70 bg-card p-2.5 text-left transition-colors hover:border-primary/40 hover:bg-overlay cursor-pointer"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <Avatar name={person.fullName} size="sm" />
                      <span className="min-w-0">
                        <span className="block truncate text-small font-semibold text-ink">
                          {person.fullName}
                        </span>
                        <span className="block truncate text-tiny text-ink-muted">
                          {[person.role, person.organisation].filter(Boolean).join(' · ') ||
                            'Contact'}
                        </span>
                      </span>
                    </span>
                    <ArrowRight size={14} weight="bold" className="shrink-0 text-ink-subtle" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Inline Create Person Form */}
        {showCreatePerson ? (
          <form
            onSubmit={handleCreatePersonInline}
            className="rounded-xl border border-primary/30 bg-primary-light/20 p-3 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-tiny font-bold text-primary">New Person</span>
              <button
                type="button"
                onClick={() => setShowCreatePerson(false)}
                className="text-ink-subtle hover:text-ink cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
            <Input
              autoFocus
              size="sm"
              placeholder="Full Name *"
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              className="h-8 text-tiny"
            />
            <div className="flex gap-2">
              <Input
                size="sm"
                placeholder="Role (optional)"
                value={newPersonRole}
                onChange={(e) => setNewPersonRole(e.target.value)}
                className="h-8 text-tiny flex-1"
              />
              <Input
                size="sm"
                placeholder="Company (optional)"
                value={newPersonOrg}
                onChange={(e) => setNewPersonOrg(e.target.value)}
                className="h-8 text-tiny flex-1"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              loading={creatingPerson}
              disabled={!newPersonName.trim()}
              className="mt-1 h-7 text-tiny"
            >
              Create Person
            </Button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowCreatePerson(true)}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-line bg-overlay/40 py-2 text-tiny font-semibold text-primary hover:border-primary/40 hover:underline cursor-pointer"
          >
            <Plus size={13} weight="bold" />
            Create new person
          </button>
        )}

        {onOpenCompanion && (
          <div className="mt-auto pt-2 border-t border-line/60">
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenCompanion}
              className="w-full gap-1.5 text-tiny text-ink-muted"
            >
              Open Companion Side Panel
            </Button>
          </div>
        )}
      </div>
    )
  }

  // -------------------------------------------------------------
  // VIEW 2: THE PICKED PERSON'S THREADS (+ create a new one)
  // -------------------------------------------------------------
  if (step === 'person_threads') {
    const personThreads = pickedPersonThreads ?? []

    return (
      <div className="flex flex-1 flex-col gap-3 p-3.5">
        <div className="flex items-center gap-2 pb-1 border-b border-line">
          <button
            type="button"
            onClick={() => setStep('people')}
            className="rounded-lg p-1 text-ink-subtle hover:text-ink hover:bg-overlay cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <Avatar name={pickedPerson?.fullName ?? ''} size="sm" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-small font-bold text-ink">
              {pickedPerson?.fullName ?? 'Person'}
            </h2>
            <p className="text-tiny text-ink-subtle">
              {personThreads.length > 0
                ? `${personThreads.length} thread${personThreads.length === 1 ? '' : 's'} together`
                : 'No threads together yet'}
            </p>
          </div>
        </div>

        {/* Always available - and the only option when no threads exist yet */}
        <Button size="sm" onClick={handleStartNewThread} className="w-full gap-1.5 shadow-sm">
          <Plus size={14} weight="bold" />
          Create New Thread
        </Button>

        <div className="flex flex-1 flex-col min-h-0">
          {pickedThreadsLoading ? (
            <ThreadListSkeleton count={3} />
          ) : personThreads.length === 0 ? (
            <EmptyState
              title={`No threads with ${pickedPerson?.fullName ?? 'this person'} yet`}
              description="Create your first thread above to start capturing notes, decisions and commitments."
            />
          ) : (
            <>
              <span className="mb-1.5 text-tiny font-semibold uppercase tracking-wider text-ink-subtle">
                Threads together
              </span>
              <ul className="flex max-h-[310px] flex-col gap-1.5 overflow-y-auto scroll-slim pr-0.5">
                {personThreads.map((thread) => (
                  <li key={thread.id}>
                    <Card className="flex items-center justify-between gap-2.5 p-2.5 hover:border-primary/40 transition-colors">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-small font-semibold text-ink">
                          {thread.title}
                        </p>
                        <p className="truncate text-tiny text-ink-muted capitalize">
                          {thread.status ?? 'active'}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        loading={startingSessionId === thread.id}
                        onClick={() => handleStartExistingThreadSession(thread)}
                        className="shrink-0 text-tiny h-7 px-2.5 gap-1 shadow-2xs"
                      >
                        <Lightning size={12} weight="bold" />
                        Capture
                      </Button>
                    </Card>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------
  // VIEW 3: CREATE THREAD DETAILS (Title & Description)
  // -------------------------------------------------------------
  if (step === 'new_details') {
    return (
      <div className="flex flex-1 flex-col gap-3 p-3.5">
        <div className="flex items-center gap-2 pb-1 border-b border-line">
          <button
            type="button"
            onClick={() => setStep('person_threads')}
            className="rounded-lg p-1 text-ink-subtle hover:text-ink hover:bg-overlay cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <h2 className="text-small font-bold text-ink">New Thread Details</h2>
            <p className="truncate text-tiny text-ink-subtle">
              {pickedPerson?.fullName
                ? `For ${pickedPerson.fullName} · Step 1 of 2`
                : 'Step 1 of 2: Define the topic'}
            </p>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 pt-1">
          <Field label="Agenda" htmlFor="new-thread-title">
            <Input
              id="new-thread-title"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q4 Strategy Sync, Aditya Project"
              className="text-small"
            />
          </Field>

          <Field label="Description (Optional)" htmlFor="new-thread-desc">
            <Textarea
              id="new-thread-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Key context, meeting goals, or background notes..."
              className="text-small resize-none"
            />
          </Field>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2 border-t border-line">
          <Button variant="ghost" size="sm" onClick={() => setStep('person_threads')}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!title.trim()}
            onClick={() => setStep('new_people')}
            className="gap-1.5"
          >
            Next: Add People
            <ArrowRight size={13} weight="bold" />
          </Button>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------
  // VIEW 3: ADD PEOPLE (Existing or Create New)
  // -------------------------------------------------------------
  if (step === 'new_people') {
    return (
      <div className="flex flex-1 flex-col gap-3 p-3.5">
        <div className="flex items-center gap-2 pb-1 border-b border-line">
          <button
            type="button"
            onClick={() => setStep('new_details')}
            className="rounded-lg p-1 text-ink-subtle hover:text-ink hover:bg-overlay cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0 flex-1">
            <h2 className="text-small font-bold text-ink truncate">Add People to “{title}”</h2>
            <p className="text-tiny text-ink-subtle">Step 2 of 2: Participants</p>
          </div>
        </div>

        {/* Selected People Pills */}
        {selectedPersonIds.length > 0 && (
          <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto scroll-slim">
            {selectedPersonIds.map((id) => {
              const person = people.find((p) => p.id === id)
              return (
                <span
                  key={id}
                  className="inline-flex items-center gap-1 rounded-full bg-primary-light px-2 py-0.5 text-tiny font-medium text-primary border border-primary/20"
                >
                  <Avatar name={person?.fullName || 'User'} size="xs" />
                  <span className="truncate max-w-[120px]">{person?.fullName || 'Person'}</span>
                  <button
                    type="button"
                    onClick={() => togglePersonSelect(id)}
                    className="hover:text-danger cursor-pointer ml-0.5"
                  >
                    <X size={10} />
                  </button>
                </span>
              )
            })}
          </div>
        )}

        {/* Inline Create Person Form */}
        {showCreatePerson ? (
          <form
            onSubmit={handleCreatePersonInline}
            className="rounded-xl border border-primary/30 bg-primary-light/20 p-3 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-tiny font-bold text-primary">New Person</span>
              <button
                type="button"
                onClick={() => setShowCreatePerson(false)}
                className="text-ink-subtle hover:text-ink cursor-pointer"
              >
                <X size={12} />
              </button>
            </div>
            <Input
              autoFocus
              size="sm"
              placeholder="Full Name *"
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              className="h-8 text-tiny"
            />
            <div className="flex gap-2">
              <Input
                size="sm"
                placeholder="Role (optional)"
                value={newPersonRole}
                onChange={(e) => setNewPersonRole(e.target.value)}
                className="h-8 text-tiny flex-1"
              />
              <Input
                size="sm"
                placeholder="Company (optional)"
                value={newPersonOrg}
                onChange={(e) => setNewPersonOrg(e.target.value)}
                className="h-8 text-tiny flex-1"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              loading={creatingPerson}
              disabled={!newPersonName.trim()}
              className="mt-1 h-7 text-tiny"
            >
              Add Person
            </Button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowCreatePerson(true)}
            className="flex items-center gap-1.5 text-tiny font-semibold text-primary hover:underline cursor-pointer"
          >
            <Plus size={13} weight="bold" />
            Create new person
          </button>
        )}

        {/* Search Existing People */}
        <div className="relative">
          <MagnifyingGlass
            size={13}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-subtle"
          />
          <input
            value={personSearch}
            onChange={(e) => setPersonSearch(e.target.value)}
            placeholder="Search existing contacts..."
            className="h-8 w-full rounded-lg border border-line bg-overlay pl-7.5 pr-2.5 text-tiny text-ink focus:border-primary focus:bg-card focus:outline-none"
          />
        </div>

        {/* Existing People List */}
        {people.length === 0 ? (
          <div className="flex flex-col gap-1.5 py-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <PersonRowSkeleton key={i} />
            ))}
          </div>
        ) : (
          <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto scroll-slim pr-0.5">
          {filteredPeople.map((person) => {
            const isSelected = selectedPersonIds.includes(person.id)
            return (
              <li key={person.id}>
                <button
                  type="button"
                  onClick={() => togglePersonSelect(person.id)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-lg border p-2 text-left transition-colors cursor-pointer',
                    isSelected
                      ? 'border-primary bg-primary-light/40 text-primary-dark font-medium'
                      : 'border-line/70 bg-card hover:bg-overlay text-ink',
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Avatar name={person.fullName} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-tiny font-semibold">{person.fullName}</p>
                      <p className="truncate text-[11px] text-ink-subtle">
                        {[person.role, person.organisation].filter(Boolean).join(' · ') ||
                          'Contact'}
                      </p>
                    </div>
                  </div>
                  <div
                    className={cn(
                      'flex size-4 shrink-0 items-center justify-center rounded-md border',
                      isSelected
                        ? 'border-primary bg-primary text-white'
                        : 'border-line bg-overlay',
                    )}
                  >
                    {isSelected ? <Check size={10} weight="bold" /> : null}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
        )}

        {/* Action Footer */}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2 border-t border-line">
          <Button variant="ghost" size="sm" onClick={() => setStep('new_details')}>
            Back
          </Button>
          <Button
            size="sm"
            loading={creatingThread}
            onClick={handleCreateAndStartSession}
            className="gap-1.5 shadow-sm"
          >
            Start Capture Session
            <Lightning size={13} weight="bold" />
          </Button>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------
  // VIEW 4: LIVE CAPTURE SESSION (Notes, Decision, Question, Action)
  // -------------------------------------------------------------
  if (step === 'session') {
    return (
      <div className="flex flex-1 flex-col gap-2.5 p-3.5 relative">
        {stoppingSession ? (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-card/92 backdrop-blur-xs p-6 text-center">
            <div className="relative flex size-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/25 shadow-sm mb-3">
              <Spinner className="size-6 text-primary" />
            </div>
            <p className="text-small font-bold text-ink">Stopping Session...</p>
            <p className="text-tiny text-ink-muted mt-1 max-w-[220px]">
              Saving captures and filing commitments
            </p>
          </div>
        ) : null}

        {/* Active Session Status Bar */}
        <div className="flex items-center justify-between rounded-xl border border-line/75 bg-card px-3 py-2 shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75"></span>
              <span className="relative inline-flex size-2 rounded-full bg-danger"></span>
            </span>
            <div className="min-w-0">
              <p className="truncate text-tiny font-bold text-ink">
                {activeThread?.title}
              </p>
              <p className="text-[11px] text-ink-subtle">
                Capturing Session · {sessionCaptures.length} logged
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
            Recording
          </span>
        </div>

        {/* Capture Input Card */}
        <form onSubmit={handleAddCapture} className="flex flex-col gap-2 rounded-xl border border-line bg-card p-2.5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-subtle">
              Log thought or event
            </span>
            <span className="text-[10px] text-ink-subtle">Press Enter to add</span>
          </div>

          <input
            ref={captureInputRef}
            autoFocus
            value={captureInput}
            onChange={(e) => setCaptureInput(e.target.value)}
            placeholder="Type note, commitment, decision, question..."
            className="h-9 w-full rounded-lg border border-line bg-overlay px-2.5 text-small text-ink focus:border-primary focus:bg-card focus:outline-none"
          />

          {/* Type Selectors */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex flex-wrap gap-1">
              {CAPTURE_TYPE_OPTIONS.map((opt) => {
                const active = captureType === opt.value
                const Icon = opt.icon
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setCaptureType(opt.value)}
                    className="cursor-pointer"
                  >
                    <Chip
                      tone={active ? opt.tone : 'neutral'}
                      icon={<Icon size={11} weight="bold" />}
                      className={cn(
                        'transition-all text-[11px] h-5.5 px-2',
                        active && 'ring-1 ring-primary/40 font-bold shadow-xs',
                      )}
                    >
                      {opt.label}
                    </Chip>
                  </button>
                )
              })}
            </div>

            <Button
              type="submit"
              size="sm"
              disabled={!captureInput.trim()}
              className="h-6 px-2.5 text-tiny gap-1"
            >
              <Plus size={11} weight="bold" />
              Add
            </Button>
          </div>

          {/* Commitment Due Date Field */}
          {captureType === 'commitment' ? (
            <div className="flex flex-col gap-1 rounded-lg border border-line/60 bg-overlay/50 p-2 pt-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-ink-muted flex items-center gap-1">
                  <CalendarBlank size={12} />
                  Due date (Commitment):
                </span>
                <input
                  type="date"
                  value={captureDueDate}
                  onChange={(e) => setCaptureDueDate(e.target.value)}
                  className="h-6.5 text-tiny rounded border border-line bg-card px-1.5 text-ink focus:border-primary focus:outline-none"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="flex items-center gap-1 justify-end pt-0.5">
                <button
                  type="button"
                  onClick={() => setCaptureDueDate(new Date().toISOString().split('T')[0])}
                  className="rounded px-1.5 py-0.5 text-[10px] font-medium border border-line bg-card hover:bg-overlay text-ink-muted transition-colors cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setCaptureDueDate(new Date(Date.now() + 86400000).toISOString().split('T')[0])}
                  className="rounded px-1.5 py-0.5 text-[10px] font-medium border border-line bg-card hover:bg-overlay text-ink-muted transition-colors cursor-pointer"
                >
                  Tomorrow
                </button>
                <button
                  type="button"
                  onClick={() => setCaptureDueDate(new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0])}
                  className="rounded px-1.5 py-0.5 text-[10px] font-medium border border-line bg-card hover:bg-overlay text-ink-muted transition-colors cursor-pointer"
                >
                  Next week
                </button>
              </div>
            </div>
          ) : null}
        </form>

        {/* Captures Logged in this Session */}
        <div className="flex flex-1 flex-col min-h-0">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-ink-subtle uppercase tracking-wider">
              Session Log ({sessionCaptures.length})
            </span>
          </div>

          {sessionCaptures.length === 0 ? (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-line bg-overlay/30 p-4 text-center">
              <p className="text-tiny text-ink-subtle">
                Capturing is active! Add notes, actions, questions, or decisions as you discuss.
              </p>
            </div>
          ) : (
            <ul className="flex max-h-44 flex-col gap-1.5 overflow-y-auto scroll-slim pr-0.5">
              {sessionCaptures.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-line bg-card p-2 text-tiny"
                >
                  <div className="flex items-start gap-1.5 min-w-0 flex-1">
                    <Chip tone={item.type} className="text-[10px] h-5 px-1.5 shrink-0 mt-0.5">
                      {item.type}
                    </Chip>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-ink text-small leading-tight break-words">
                        {item.content}
                      </span>
                      {item.dueDate ? (
                        <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-accent">
                          <CalendarBlank size={10} />
                          Due {item.dueDate}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveCapture(item.id)}
                    className="text-ink-subtle hover:text-danger cursor-pointer p-0.5 shrink-0"
                  >
                    <Trash size={12} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Stop Capturing & Club Footer */}
        <div className="mt-auto pt-2 border-t border-line flex flex-col gap-1.5">
          <Button
            variant="danger"
            size="sm"
            loading={stoppingSession}
            disabled={sessionCaptures.length === 0}
            onClick={handleStopSession}
            className="w-full gap-1.5 font-bold shadow-sm"
          >
            ■ Stop Capturing ({sessionCaptures.length})
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetHome}
            disabled={stoppingSession}
            className="w-full text-tiny text-ink-subtle"
          >
            Cancel Session
          </Button>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------
  // VIEW 5: SESSION ENDED (no recap is generated or stored)
  // -------------------------------------------------------------
  if (step === 'summary') {
    return (
      <div className="flex flex-1 flex-col gap-3 p-3.5">
        <div className="flex items-center gap-2 pb-1 border-b border-line">
          <div className="flex size-7 items-center justify-center rounded-full bg-success/20 text-success">
            <Check size={16} weight="bold" />
          </div>
          <div>
            <h2 className="text-small font-bold text-ink">Session Ended</h2>
            <p className="text-tiny text-ink-subtle">
              Captures saved to “{activeThread?.title}”
            </p>
          </div>
        </div>

        <p className="flex-1 text-tiny text-ink-muted leading-relaxed">
          Your captures were filed to the thread. Head back to continue working.
        </p>

        <div className="mt-auto pt-2 border-t border-line">
          <Button size="sm" onClick={handleResetHome} className="w-full font-bold">
            Done
          </Button>
        </div>
      </div>
    )
  }

  return null
}

import { useEffect, useMemo, useRef, useState } from 'react'

import {

  ArrowLeft,

  ArrowRight,

  CalendarBlank,

  Check,

  CheckCircle,

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

import { getValue, removeValue, setValue } from '@/lib/storage'

import { STORAGE_KEYS } from '@/config/constants'

import { cn } from '@/lib/utils'



const CAPTURE_TYPE_CONFIG = {

  commitment: {

    label: 'Commitment',

    icon: Lightning,

    activeClasses: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/35 ring-1 ring-amber-500/20 shadow-2xs font-semibold',

    badgeClasses: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',

  },

  decision: {

    label: 'Decision',

    icon: CheckSquare,

    activeClasses: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/35 ring-1 ring-emerald-500/20 shadow-2xs font-semibold',

    badgeClasses: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',

  },

  question: {

    label: 'Question',

    icon: Question,

    activeClasses: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/35 ring-1 ring-indigo-500/20 shadow-2xs font-semibold',

    badgeClasses: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/25',

  },

  note: {

    label: 'Note',

    icon: Note,

    activeClasses: 'bg-primary/15 text-primary border-primary/35 ring-1 ring-primary/20 shadow-2xs font-semibold',

    badgeClasses: 'bg-primary/10 text-primary border-primary/25',

  },

}



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

  const [isRestored, setIsRestored] = useState(false)



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

  const [, setSessionElapsed] = useState(0)

  const [stoppingSession, setStoppingSession] = useState(false)

  const [discardingSession, setDiscardingSession] = useState(false)

  const [saveProgress, setSaveProgress] = useState({

    current: 0,

    total: 0,

    statusText: '',

    currentItem: '',

  })

  const [lastSavedSummary, setLastSavedSummary] = useState(null)

  const [datePreset, setDatePreset] = useState(null)



  // Active session timer and storage refs

  const captureInputRef = useRef(null)

  const sessionStartTimeRef = useRef(null)



  // 1. Restore flow state from chrome.storage.local on mount

  useEffect(() => {

    let isMounted = true

    async function restoreSessionFlow() {

      try {

        const saved = await getValue(STORAGE_KEYS.SESSION_FLOW, null)

        if (saved && isMounted) {

          if (saved.step) setStep(saved.step)

          if (saved.title !== undefined) setTitle(saved.title)

          if (saved.description !== undefined) setDescription(saved.description)

          if (Array.isArray(saved.selectedPersonIds)) setSelectedPersonIds(saved.selectedPersonIds)

          if (saved.personSearch !== undefined) setPersonSearch(saved.personSearch)

          if (saved.activeThread) setActiveThread(saved.activeThread)

          if (saved.activeClubId !== undefined) setActiveClubId(saved.activeClubId)

          if (Array.isArray(saved.sessionCaptures)) setSessionCaptures(saved.sessionCaptures)

          if (saved.captureInput !== undefined) setCaptureInput(saved.captureInput)

          if (saved.captureType) setCaptureType(saved.captureType)

          if (saved.captureDueDate !== undefined) setCaptureDueDate(saved.captureDueDate)

          if (saved.lastSavedSummary) setLastSavedSummary(saved.lastSavedSummary)



          if (saved.pickedPerson) {

            usePeopleStore.setState({ selectedPerson: saved.pickedPerson })

          }

          if (saved.pickedPersonId) {

            setPickedThreadsLoading(true)

            selectPerson(saved.pickedPersonId).finally(() => {

              if (isMounted) setPickedThreadsLoading(false)

            })

          }



          if (saved.step === 'session') {

            const startTime = saved.sessionStartTime || Date.now()

            sessionStartTimeRef.current = startTime

            const elapsed = Math.max(0, Math.floor((Date.now() - startTime) / 1000))

            setSessionElapsed(elapsed)

            useUiStore.getState().setActiveSession({

              threadTitle: saved.activeThread?.title ?? 'Session',

              elapsed,

              clubId: saved.activeClubId,

            })

          }

        }

      } catch {

        // ignore storage read failure

      } finally {

        if (isMounted) {

          setIsRestored(true)

        }

      }

    }



    restoreSessionFlow()

    return () => {

      isMounted = false

    }

  }, [selectPerson])



  // 2. Active session wall-clock timer

  useEffect(() => {

    if (step !== 'session') {

      useUiStore.getState().clearActiveSession()

      return undefined

    }



    if (!sessionStartTimeRef.current) {

      sessionStartTimeRef.current = Date.now()

    }



    const computeElapsed = () =>

      Math.max(0, Math.floor((Date.now() - (sessionStartTimeRef.current || Date.now())) / 1000))



    const currentElapsed = computeElapsed()

    setSessionElapsed(currentElapsed)

    useUiStore.getState().setActiveSession({

      threadTitle: activeThread?.title ?? 'Session',

      elapsed: currentElapsed,

      clubId: activeClubId,

    })



    const interval = setInterval(() => {

      const elapsed = computeElapsed()

      setSessionElapsed(elapsed)

      useUiStore.getState().updateSessionElapsed(elapsed)

    }, 1000)



    return () => {

      clearInterval(interval)

    }

  }, [step, activeThread, activeClubId])



  // 3. Persist session flow across extension closes

  useEffect(() => {

    if (!isRestored) return



    // If completely default at home screen, remove the key

    if (

      step === 'people' &&

      !personSearch &&

      !title &&

      !description &&

      selectedPersonIds.length === 0

    ) {

      removeValue(STORAGE_KEYS.SESSION_FLOW)

      return undefined

    }



    const payload = {

      step,

      title,

      description,

      selectedPersonIds,

      personSearch,

      pickedPersonId: pickedPerson?.id || null,

      pickedPerson: pickedPerson || null,

      activeThread,

      activeClubId,

      sessionCaptures,

      sessionStartTime: sessionStartTimeRef.current,

      captureInput,

      captureType,

      captureDueDate,

      lastSavedSummary,

    }



    const timer = setTimeout(() => {

      setValue(STORAGE_KEYS.SESSION_FLOW, payload)

    }, 100)



    return () => clearTimeout(timer)

  }, [

    isRestored,

    step,

    title,

    description,

    selectedPersonIds,

    personSearch,

    pickedPerson,

    activeThread,

    activeClubId,

    sessionCaptures,

    captureInput,

    captureType,

    captureDueDate,

    lastSavedSummary,

  ])



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

    setValue(STORAGE_KEYS.SESSION_FLOW, {

      step: 'person_threads',

      pickedPersonId: person.id,

      pickedPerson: person,

      selectedPersonIds: [person.id],

      personSearch: '',

    })

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

    setValue(STORAGE_KEYS.SESSION_FLOW, {

      step: 'new_details',

      title: '',

      description: '',

      pickedPersonId: pickedPerson?.id || null,

      pickedPerson: pickedPerson || null,

      selectedPersonIds,

    })

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

        const now = Date.now()

        sessionStartTimeRef.current = now

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

        setValue(STORAGE_KEYS.SESSION_FLOW, {

          step: 'session',

          title: '',

          description: '',

          selectedPersonIds,

          personSearch: '',

          pickedPersonId: pickedPerson?.id || null,

          pickedPerson: pickedPerson || null,

          activeThread: thread,

          activeClubId: clubId,

          sessionCaptures: [],

          sessionStartTime: now,

          captureInput: '',

          captureType: 'commitment',

          captureDueDate: '',

        })

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

    // eslint-disable-next-line react-hooks/purity

    const now = Date.now()

    sessionStartTimeRef.current = now

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

    setValue(STORAGE_KEYS.SESSION_FLOW, {

      step: 'session',

      title: '',

      description: '',

      selectedPersonIds,

      personSearch: '',

      pickedPersonId: pickedPerson?.id || null,

      pickedPerson: pickedPerson || null,

      activeThread: thread,

      activeClubId: clubId,

      sessionCaptures: [],

      sessionStartTime: now,

      captureInput: '',

      captureType: 'commitment',

      captureDueDate: '',

    })

  }



  // Preset date picker for commitment

  const handleSelectDatePreset = (preset) => {

    const d = new Date()

    if (preset === 'tomorrow') d.setDate(d.getDate() + 1)

    if (preset === 'nextWeek') d.setDate(d.getDate() + 7)

    setCaptureDueDate(d.toISOString().split('T')[0])

    setDatePreset(preset)

  }



  // Add capture in session

  const handleAddCapture = (e) => {

    if (e) e.preventDefault()

    const content = captureInput.trim()

    if (!content) return



    const nextCaptures = [

      ...sessionCaptures,

      {

        id: `sess_cap_${Date.now()}_${Math.random()}`,

        content,

        type: captureType,

        dueDate: captureType === 'commitment' ? (captureDueDate || null) : null,

        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),

      },

    ]

    setSessionCaptures(nextCaptures)

    setCaptureInput('')

    setCaptureDueDate('')

    setDatePreset(null)

    setValue(STORAGE_KEYS.SESSION_FLOW, {

      step: 'session',

      title: '',

      description: '',

      selectedPersonIds,

      personSearch: '',

      pickedPersonId: pickedPerson?.id || null,

      pickedPerson: pickedPerson || null,

      activeThread,

      activeClubId,

      sessionCaptures: nextCaptures,

      sessionStartTime: sessionStartTimeRef.current,

      captureInput: '',

      captureType,

      captureDueDate: '',

    })

    if (captureInputRef.current) {

      captureInputRef.current.focus()

    }

  }



  // Remove capture from session

  const handleRemoveCapture = (id) => {

    const nextCaptures = sessionCaptures.filter((c) => c.id !== id)

    setSessionCaptures(nextCaptures)

    setValue(STORAGE_KEYS.SESSION_FLOW, {

      step: 'session',

      title: '',

      description: '',

      selectedPersonIds,

      personSearch: '',

      pickedPersonId: pickedPerson?.id || null,

      pickedPerson: pickedPerson || null,

      activeThread,

      activeClubId,

      sessionCaptures: nextCaptures,

      sessionStartTime: sessionStartTimeRef.current,

      captureInput,

      captureType,

      captureDueDate,

    })

  }



  // Stop capturing: close the club and persist individual captures one by one with live progress.

  const handleStopSession = async () => {

    if (!activeThread) return

    setStoppingSession(true)

    useUiStore.getState().clearActiveSession()



    const totalCaptures = sessionCaptures.length

    setSaveProgress({

      current: 0,

      total: totalCaptures,

      statusText: activeClubId ? 'Finalizing meeting session...' : 'Preparing captures...',

      currentItem: '',

    })



    const summaryData = {

      total: totalCaptures,

      commitments: sessionCaptures.filter((c) => c.type === 'commitment').length,

      decisions: sessionCaptures.filter((c) => c.type === 'decision').length,

      notes: sessionCaptures.filter((c) => c.type === 'note').length,

      questions: sessionCaptures.filter((c) => c.type === 'question').length,

      threadTitle: activeThread?.title ?? 'Thread',

    }

    setLastSavedSummary(summaryData)



    try {

      // 1. End club in backend if active

      if (activeClubId) {

        setSaveProgress({

          current: 0,

          total: totalCaptures,

          statusText: 'Ending meeting session...',

          currentItem: '',

        })

        try {

          await clubsApi.end(activeClubId, new Date().toISOString())

        } catch {

          // Continue

        }

      }



      // 2. Save each capture one by one with live progress feedback

      for (let i = 0; i < totalCaptures; i++) {

        const cap = sessionCaptures[i]

        const typeLabel = CAPTURE_TYPE_CONFIG[cap.type]?.label || 'Capture'

        setSaveProgress({

          current: i + 1,

          total: totalCaptures,

          statusText: `Saving ${typeLabel} ${i + 1} of ${totalCaptures}...`,

          currentItem: cap.content,

        })



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

          // Continue saving remaining captures even if one fails

        }

      }



      // 3. Complete session and show clean summary screen

      sessionStartTimeRef.current = null

      setStep('summary')

      setValue(STORAGE_KEYS.SESSION_FLOW, {

        step: 'summary',

        activeThread,

        lastSavedSummary: summaryData,

      })

      refreshThreads()

    } catch {

      sessionStartTimeRef.current = null

      setStep('summary')

      setValue(STORAGE_KEYS.SESSION_FLOW, {

        step: 'summary',

        activeThread,

        lastSavedSummary: summaryData,

      })

    } finally {

      setStoppingSession(false)

    }

  }



  // Discard an active session and clean up server club + local state

  const handleDiscardSession = async () => {

    setDiscardingSession(true)

    const clubIdToDiscard = activeClubId

    try {

      if (clubIdToDiscard) {

        await clubsApi.discard(clubIdToDiscard)

      }

      useUiStore.getState().pushToast('Session discarded.', 'info')

    } catch (err) {

      console.warn('Failed to discard club session on server:', err)

      useUiStore.getState().pushToast('Session discarded.', 'info')

    } finally {

      handleResetHome()

      setDiscardingSession(false)

    }

  }



  // Reset the flow back to the person picker.

  const handleResetHome = () => {

    sessionStartTimeRef.current = null

    useUiStore.getState().clearActiveSession()

    removeValue(STORAGE_KEYS.SESSION_FLOW)

    setStep('people')

    setTitle('')

    setDescription('')

    setSelectedPersonIds([])

    setActiveThread(null)

    setActiveClubId(null)

    setSessionCaptures([])

    setCaptureInput('')

    setCaptureDueDate('')

    setPersonSearch('')

    setLastSavedSummary(null)

    setSaveProgress({ current: 0, total: 0, statusText: '', currentItem: '' })

    usePeopleStore.getState().selectPerson(null)

  }



  if (!isRestored) {

    return (

      <div className="flex flex-1 items-center justify-center p-8">

        <Spinner className="size-5 text-primary" />

      </div>

    )

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

            onClick={() => {

              setStep('people')

              usePeopleStore.getState().selectPerson(null)

              removeValue(STORAGE_KEYS.SESSION_FLOW)

            }}

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

  // VIEW 4: LIVE CAPTURE SESSION

  // -------------------------------------------------------------

  if (step === 'session') {

    return (

      <div className="flex flex-1 flex-col gap-2 p-3 relative">

        {stoppingSession ? (

          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-card/95 backdrop-blur-md p-6 text-center animate-in fade-in duration-150">

            <div className="relative flex size-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/25 shadow-sm mb-3">

              <Spinner className="size-6 text-primary" />

            </div>



            <p className="text-small font-bold text-ink">

              {saveProgress.total > 0

                ? `Saving Captures (${saveProgress.current}/${saveProgress.total})`

                : 'Saving Session...'}

            </p>



            {saveProgress.total > 0 ? (

              <div className="w-full max-w-[240px] mt-3">

                <div className="flex items-center justify-between text-[11px] font-medium text-ink-muted mb-1.5">

                  <span className="truncate pr-2">{saveProgress.statusText || 'Saving...'}</span>

                  <span className="tabular-nums font-semibold shrink-0">

                    {Math.round((saveProgress.current / saveProgress.total) * 100)}%

                  </span>

                </div>

                <div className="h-1.5 w-full rounded-full bg-line overflow-hidden">

                  <div

                    className="h-full bg-primary rounded-full transition-all duration-300 ease-out"

                    style={{

                      width: `${Math.round((saveProgress.current / saveProgress.total) * 100)}%`,

                    }}

                  />

                </div>

              </div>

            ) : (

              <p className="text-tiny text-ink-muted mt-1 max-w-[220px]">

                {saveProgress.statusText || 'Filing individual captures and organizing commitments'}

              </p>

            )}



            {saveProgress.currentItem ? (

              <div className="mt-3.5 w-full max-w-[240px] rounded-lg border border-line bg-surface/90 px-3 py-2 text-left shadow-2xs">

                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-primary mb-0.5">

                  <span className="size-1.5 rounded-full bg-primary animate-pulse" />

                  Saving item

                </div>

                <p className="truncate text-tiny font-medium text-ink">

                  {saveProgress.currentItem}

                </p>

              </div>

            ) : null}





            <p className="text-[11px] text-ink-subtle mt-3 max-w-[220px]">

              Filing into “{activeThread?.title ?? 'Thread'}”

            </p>

          </div>

        ) : null}



        {discardingSession ? (

          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-card/95 backdrop-blur-md p-6 text-center animate-in fade-in duration-150">

            <div className="relative flex size-12 items-center justify-center rounded-2xl bg-danger/10 border border-danger/25 shadow-sm mb-3">

              <Spinner className="size-6 text-danger" />

            </div>



            <p className="text-small font-bold text-ink">

              Discarding Session...

            </p>



            <p className="text-tiny text-ink-muted mt-1 max-w-[220px]">

              Cleaning up session workspace and removing live capture

            </p>



            <p className="text-[11px] text-ink-subtle mt-3 max-w-[220px]">

              From “{activeThread?.title ?? 'Thread'}”

            </p>

          </div>

        ) : null}





        {/* Thread Name Header */}

        <div className="flex items-center justify-between px-1 pt-0.5">

          <h2 className="truncate text-small font-bold text-ink" title={activeThread?.title}>

            {activeThread?.title ?? 'Session'}

          </h2>

          <span className="text-[11px] font-medium text-ink-subtle shrink-0">

            {sessionCaptures.length} logged

          </span>

        </div>



        {/* Quick Capture Composer */}

        <form

          onSubmit={handleAddCapture}

          className="flex flex-col gap-2 rounded-xl border border-line bg-card p-2.5 shadow-2xs"

        >

          <input

            ref={captureInputRef}

            autoFocus

            value={captureInput}

            onChange={(e) => setCaptureInput(e.target.value)}

            placeholder={

              captureType === 'commitment'

                ? 'Type commitment...'

                : captureType === 'decision'

                ? 'Type decision...'

                : captureType === 'question'

                ? 'Type question...'

                : 'Type note...'

            }

            className="h-8.5 w-full rounded-lg border border-line/80 bg-surface px-2.5 text-small text-ink placeholder:text-ink-subtle focus:border-primary focus:bg-card focus:outline-none transition-colors"

          />



          {/* Type Pill Selector & Add Action */}

          <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">

            <div className="flex flex-wrap gap-1">

              {Object.entries(CAPTURE_TYPE_CONFIG).map(([key, config]) => {

                const active = captureType === key

                const Icon = config.icon

                return (

                  <button

                    key={key}

                    type="button"

                    onClick={() => setCaptureType(key)}

                    className={cn(

                      'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-tiny font-medium transition-colors cursor-pointer shrink-0',

                      active

                        ? config.activeClasses

                        : 'text-ink-muted hover:text-ink hover:bg-overlay',

                    )}

                  >

                    <Icon size={11} weight={active ? 'bold' : 'regular'} />

                    {config.label}

                  </button>

                )

              })}

            </div>



            <Button

              type="submit"

              size="sm"

              disabled={!captureInput.trim()}

              className="h-6.5 px-2.5 text-tiny font-semibold gap-1 shrink-0 ml-auto"

            >

              <Plus size={11} weight="bold" />

              Add

            </Button>

          </div>



          {/* Commitment Due Date Field - Fully responsive on all popup & panel widths */}

          {captureType === 'commitment' ? (

            <div className="mt-1 flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-line/50">

              <div className="flex items-center gap-1.5 text-tiny text-ink-muted shrink-0">

                <CalendarBlank size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />

                <span className="text-[11px] font-medium shrink-0">Due:</span>

                <input

                  type="date"

                  value={captureDueDate}

                  onChange={(e) => {

                    setCaptureDueDate(e.target.value)

                    setDatePreset(null)

                  }}

                  className="h-6.5 max-w-[125px] text-[11px] rounded border border-line bg-surface px-1.5 text-ink focus:border-primary focus:outline-none"

                />

              </div>

              <div className="flex flex-wrap items-center gap-1">

                <button

                  type="button"

                  onClick={() => handleSelectDatePreset('today')}

                  className={cn(

                    'rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors cursor-pointer shrink-0',

                    datePreset === 'today'

                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-200 font-bold'

                      : 'text-ink-muted hover:text-ink hover:bg-overlay',

                  )}

                >

                  Today

                </button>

                <button

                  type="button"

                  onClick={() => handleSelectDatePreset('tomorrow')}

                  className={cn(

                    'rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors cursor-pointer shrink-0',

                    datePreset === 'tomorrow'

                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-200 font-bold'

                      : 'text-ink-muted hover:text-ink hover:bg-overlay',

                  )}

                >

                  Tomorrow

                </button>

                <button

                  type="button"

                  onClick={() => handleSelectDatePreset('nextWeek')}

                  className={cn(

                    'rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors cursor-pointer shrink-0',

                    datePreset === 'nextWeek'

                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-200 font-bold'

                      : 'text-ink-muted hover:text-ink hover:bg-overlay',

                  )}

                >

                  Next week

                </button>

              </div>

            </div>

          ) : null}



        </form>



        {/* Captures Logged in this Session */}

        <div className="flex flex-1 flex-col min-h-0">

          {sessionCaptures.length === 0 ? (

            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-line bg-overlay/30 p-4 text-center">

              <p className="text-small font-medium text-ink-muted">Listening & ready to capture</p>

              <p className="text-tiny text-ink-subtle mt-0.5">

                Add commitments, decisions, questions, or notes

              </p>

            </div>

          ) : (

            <ul className="flex max-h-52 flex-col gap-1.5 overflow-y-auto scroll-slim pr-0.5">

              {sessionCaptures.map((item) => {

                const config = CAPTURE_TYPE_CONFIG[item.type] || CAPTURE_TYPE_CONFIG.note

                const Icon = config.icon

                return (

                  <li

                    key={item.id}

                    className="group flex items-start justify-between gap-2 rounded-xl border border-line/70 bg-card p-2 text-tiny transition-colors hover:border-line"

                  >

                    <div className="flex items-start gap-2 min-w-0 flex-1">

                      <span

                        className={cn(

                          'mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-md font-bold',

                          config.badgeClasses,

                        )}

                        title={config.label}

                      >

                        <Icon size={11} weight="bold" />

                      </span>

                      <div className="flex flex-col min-w-0 flex-1">

                        <span className="text-small font-medium text-ink leading-snug break-words">

                          {item.content}

                        </span>

                        {(item.dueDate || item.time) && (

                          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-ink-subtle">

                            {item.dueDate && (

                              <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">

                                <CalendarBlank size={10} weight="bold" />

                                Due {item.dueDate}

                              </span>

                            )}

                            {item.time && <span>{item.time}</span>}

                          </div>

                        )}

                      </div>

                    </div>

                    <button

                      type="button"

                      onClick={() => handleRemoveCapture(item.id)}

                      title="Remove"

                      className="opacity-0 group-hover:opacity-100 text-ink-subtle hover:text-danger p-0.5 transition-opacity cursor-pointer shrink-0"

                    >

                      <Trash size={12} />

                    </button>

                  </li>

                )

              })}

            </ul>

          )}

        </div>



        {/* Stop Capturing & Discard Footer */}

        <div className="mt-auto pt-2 border-t border-line flex flex-col gap-2">

          <Button

            variant="primary"

            size="sm"

            loading={stoppingSession}

            disabled={sessionCaptures.length === 0 || stoppingSession || discardingSession}

            onClick={handleStopSession}

            className="w-full gap-1.5 font-bold shadow-xs h-9 cursor-pointer"

          >

            <Check size={14} weight="bold" />

            Complete & Save ({sessionCaptures.length})

          </Button>



          <Button

            variant="outline"

            size="sm"

            onClick={handleDiscardSession}

            loading={discardingSession}
            disabled={stoppingSession || discardingSession}

            className="w-full h-8 text-small font-semibold text-danger border-line/80 hover:bg-danger/5 hover:border-danger/30 cursor-pointer"

          >

            {discardingSession ? 'Discarding Session...' : 'Discard Session'}

          </Button>

        </div>

      </div>

    )

  }



  // -------------------------------------------------------------

  // VIEW 5: SESSION ENDED (Centralized Clean Success Screen)

  // -------------------------------------------------------------

  if (step === 'summary') {

    const summary = lastSavedSummary || {

      total: 0,

      commitments: 0,

      decisions: 0,

      notes: 0,

      questions: 0,

      threadTitle: activeThread?.title ?? 'Thread',

    }



    return (

      <div className="flex flex-1 flex-col items-center justify-center p-6 text-center my-auto animate-in fade-in duration-200">

        {/* Central Success Emblem */}

        <div className="mb-3 flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">

          <CheckCircle size={30} weight="bold" />

        </div>



        {/* Central Title */}

        <h2 className="text-heading-3 font-bold text-ink tracking-tight">

          Captures Saved!

        </h2>

        <p className="text-tiny text-ink-muted mt-1">

          Filed to “<span className="font-semibold text-ink">{summary.threadTitle}</span>”

        </p>



        {/* Summary metric tags */}

        {summary.total > 0 && (

          <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">

            <span className="rounded-lg border border-line bg-card px-2.5 py-1 text-tiny font-semibold text-ink shadow-2xs">

              {summary.total} Total

            </span>

            {summary.commitments > 0 && (

              <span className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-tiny font-semibold text-amber-700 dark:text-amber-300">

                {summary.commitments} Commitment{summary.commitments === 1 ? '' : 's'}

              </span>

            )}

            {summary.decisions > 0 && (

              <span className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-tiny font-semibold text-emerald-700 dark:text-emerald-300">

                {summary.decisions} Decision{summary.decisions === 1 ? '' : 's'}

              </span>

            )}

          </div>

        )}



        {/* Actions */}

        <div className="mt-6 w-full flex flex-col gap-2">

          <Button

            size="sm"

            onClick={handleResetHome}

            className="w-full h-9 font-bold shadow-xs gap-1.5 cursor-pointer"

          >

            Start New Session

            <ArrowRight size={13} weight="bold" />

          </Button>



          {onOpenCompanion && (

            <Button

              variant="outline"

              size="sm"

              onClick={onOpenCompanion}

              className="w-full h-8 text-tiny text-ink-muted cursor-pointer"

            >

              Open Companion Side Panel

            </Button>

          )}

        </div>

      </div>

    )

  }



  return null

}


# Part 5: User Flows and Interaction Specifications

---

## Flow 1: App Open → Today View

**Trigger:** User opens the app (cold start or from background).

### Happy Path
1. Splash screen (max 800ms, logo + tagline)
2. Auth check:
   - Authenticated → Today view
   - Not authenticated → Login screen
3. Today view loads:
   a. Skeleton placeholders appear immediately
   b. Data loads from local cache within 100ms
   c. Background sync with server starts (silent)
   d. If server has fresher data, UI updates in place without a reload
4. If first-ever open: onboarding modal appears (see Flow 14)

### Error Path
- No network + no cache: Empty state card "You're offline. Your data will appear once you reconnect."
- Server error: Toast: "Couldn't refresh — showing last saved data."

---

## Flow 2: Create New Thread

**Trigger:** User taps "New Thread" FAB or "+" on Threads list.

### Happy Path
1. Bottom sheet slides up with fields:
   - Thread Title (required, auto-focused)
   - Associated People: multi-select from People_Directory or "Add new person"
   - Description (optional, max 500 chars)
   - Going-Cold Threshold (optional, defaults to 14 days)
2. User fills title and taps "Create"
3. Thread is saved; user is navigated to the new thread's detail view
4. Empty-state prompt: "Add your first capture to get started"

### Error Path
- Title left blank: Inline validation "Thread title is required"
- Network offline at save: Toast "Saved offline — will sync when you're back online"

### Microinteraction
- Thread card animates into the top of the Threads list from below on creation
- Haptic feedback on iOS at save

---

## Flow 3: Quick Capture

**Trigger:** User taps global FAB or presses `Cmd+K`.

### Happy Path
1. Bottom sheet modal animates up; text field is auto-focused within 300ms
2. User types text
3. (Optional) User taps type selector: Note / Action / Decision / Question
4. (Optional) User taps thread selector, searches, and selects a thread
5. User taps Save (or `Cmd+Enter`)
6. Modal dismisses; success micro-animation on FAB
7. Capture appears in thread timeline (if assigned) or Inbox (if unassigned)

### Smart Detection (Commitment Pattern)
1. User types "I'll send the proposal by Friday"
2. After a 500ms debounce, a chip appears: "💡 This looks like a commitment — create one?"
3. User taps chip → inline commitment creation opens within the modal
4. Due date pre-populated with the date parsed from text ("Friday" → next Friday)

### Error Path
- Empty text: Save button disabled; if tapped, inline message "Add something to capture"
- Offline: Saved locally with grey "Pending sync" badge; syncs silently on reconnect

### Gestures
- Swipe down on modal: Dismiss (with confirmation if text was entered)
- `Escape` key: Dismiss (same confirmation)

---

## Flow 4: Create a Commitment

**Trigger:** User taps "New Commitment" from Commitments view, from Thread detail, or from Quick Capture smart detection.

### Happy Path
1. Inline form opens with fields:
   - Description (required, auto-focused)
   - Owner: Me (default) / select a person from thread's people
   - Due Date (optional, date picker)
   - Linked Thread (pre-populated if from thread context)
2. User fills and taps Save
3. Commitment appears in thread timeline and unified Commitments view
4. If due date is set, a reminder is scheduled

### Error Path
- Description blank: Inline validation
- Attempting to create a commitment with a past due date: Warning "This date has passed — are you sure?"

---

## Flow 5: Mark a Commitment Complete

**Trigger:** User taps the check circle on a commitment row.

### Happy Path
1. Check circle animates to filled
2. Completion note field slides in (optional: "Add a note on completion")
3. User taps Confirm (or lets it auto-confirm after 3 seconds)
4. Commitment moves to Completed section with animation
5. A completion event is added to the thread's timeline: "✅ [Description] — completed by [Owner] on [Date]"
6. Notification reminder (if any) is cancelled

### Undo
- A toast appears for 5 seconds: "Commitment marked complete — Undo"
- Tapping Undo reverses the action

---

## Flow 6: View Pre-Meeting Brief

**Trigger:** Notification 30 min before meeting OR user taps "Brief" tab on thread detail with a linked event.

### Happy Path
1. Brief card loads (from cache if available, else generates in ≤5 seconds with loading spinner)
2. Sections displayed:
   - Meeting info (time, attendees — matched to People_Directory)
   - Last Contact summary
   - Open Commitments list
   - Recent Context (last 3 captures)
   - AI Talking Points (2–3 bullets)
3. User can tap any capture in Recent Context to expand it
4. User can edit Talking Points inline
5. User taps "Add Note" → inline text field → saved to thread as a pre-meeting note

### Error Path
- AI unavailable: Falls back to manual compilation (last 5 captures + open commitments), with notice "AI summary unavailable — showing manual brief."
- Thread unlinked from event: "Link a thread to see a personalised brief" with thread-selection UI

---

## Flow 7: Brain Dump

**Trigger:** User taps "Brain Dump" button on Today view.

### Happy Path
1. Full-screen canvas opens; first line auto-focused
2. User types entries, pressing Enter to start each new line
3. User taps "Done"
4. Loading state: "Organising your thoughts…" (≤3 seconds)
5. Results screen: each entry shown as a row with:
   - Entry text
   - AI-suggested thread assignment (or "Inbox" if unsure)
   - Confidence indicator (●●○ = Medium)
   - Tap-to-change thread selector
6. User adjusts any incorrect assignments
7. User taps "File All"
8. All entries saved; toast: "X captures filed across Y threads"

### Error Path
- AI unavailable: All entries default to Inbox; user can manually assign from Inbox view
- No entries typed: "Done" shows no-op toast: "Nothing to file"

---

## Flow 8: Going-Cold Re-engagement

**Trigger:** Notification OR Going Cold section on Today view.

### Happy Path
1. User taps cold-thread card
2. Re-engage panel slides in:
   - "It's been X days since you last connected with [Person]"
   - Last interaction summary (one sentence)
   - Three action buttons: "Capture a note", "Open thread", "Dismiss for 7 days"
3. User taps "Capture a note" → Quick Capture opens pre-assigned to thread
4. User types note and saves → thread's last-interaction date updates → thread exits the cold list

### Dismiss Flow
1. User taps "Dismiss for 7 days"
2. Thread removed from Going Cold list for 7 days
3. If dismissed 3 times consecutively: prompt appears "You've dismissed this thread 3 times. Would you like to archive it?"

---

## Flow 9: Search

**Trigger:** User taps search icon or presses `Cmd+F`.

### Happy Path
1. Search bar expands with animation; keyboard appears
2. As user types (after 2 characters), results update in real time
3. Results categorised: Threads → People → Captures → Commitments
4. Each result shows: title/preview, matched text highlighted, thread name (for captures/commitments)
5. User taps a result → navigated to the thread/person/capture

### Filters
1. User taps Filter icon → filter sheet opens
2. Filter options: Date Range, Thread, Capture Type, Owner
3. Applied filters shown as chips below the search bar

### Error Path
- No results: "No results for '[query]'" with a suggestion to try a broader term
- Query < 2 characters: No search triggered; hint text "Keep typing…"

---

## Flow 10: People Directory — Add Person

**Trigger:** User taps "New Person" on the People screen, or "Add new person" during thread creation.

### Happy Path
1. Form opens: Name (required), Organisation, Role, Email, Phone, LinkedIn URL, Notes
2. User fills required field and any optionals, taps Save
3. Duplicate detection: if the name matches an existing record within a Levenshtein distance of 2:
   - Warning sheet: "This looks like a duplicate of [Name]. View existing or create new?"
4. If no duplicate: person saved, navigated to new person profile
5. Optionally: user immediately links the person to one or more threads from the profile

---

## Flow 11: Live Capture Session

**Trigger:** User taps "Start Live Session" on thread detail.

### Happy Path
1. Full-screen capture canvas opens with the thread name as header
2. Timer starts; first capture line auto-focused
3. User types entries:
   - Enter → new line
   - `/note`, `/action`, `/decision`, `/question` → type tag applied to that line
   - Tab on a line → commitment prompt appears inline
4. User taps "End Session"
5. Review screen: lists all captures with type tags; user can edit or delete before saving
6. User taps "Confirm & Save"
7. All captures added to thread timeline in one batch
8. Session summary: "X captures saved — Y commitments created"

---

## Flow 12: Thread Detail — Navigating Tabs

**Trigger:** User opens a thread from Threads list or Today view.

### Tab Structure
- **Timeline** (default): Chronological captures and events. Scroll to see history. FAB for new capture.
- **Commitments**: Open and closed commitments for this thread.
- **People**: Person chips. Tap to view profile or remove from thread.
- **Brief**: AI-generated summary. Auto-generates on first open. Regenerate button available.

### Interaction Notes
- Tab bar persists at top of thread detail; tabs don't reload when switching
- Back navigation: hardware back or swipe-right returns to Threads list

---

## Flow 13: Notification → Thread

**Trigger:** User receives a push notification and taps it.

### Happy Path
1. Notification arrives (e.g., "Commitment due tomorrow: Send revised proposal — Fintech Co.")
2. User taps notification
3. App opens (from background or cold start)
4. Deep-linked to the exact commitment row within the Fintech Co. thread Commitments tab
5. Commitment editor opens inline; user can mark complete from this screen

---

## Flow 14: Onboarding

**Trigger:** First authenticated app open.

### Happy Path
1. Welcome screen: product tagline + "Let's get started in 2 minutes"
2. Step 1 — First Thread: "Who's the most important professional relationship you're managing right now?" → user enters name → thread created
3. Step 2 — First Person: "Add [name] to your people directory" → quick person creation form
4. Step 3 — First Capture: "What was the last thing you discussed with [name]?" → Quick Capture opens pre-assigned
5. Step 4 — First Commitment: "Is there anything you've promised [name]?" → Commitment creation
6. Completion screen: today view populated with the new thread → "You're all set."
7. A demo thread (pre-populated with seed data) is added alongside the real thread so the user can explore

### Skip
- Each step has a "Skip" option; onboarding can be completed partially
- Skipped steps can be completed via a "Continue setup" card on Today view for 7 days

---

## Gesture and Shortcut Summary

| Action | Mobile Gesture | Keyboard Shortcut |
|---|---|---|
| Quick Capture | Tap FAB | `Cmd/Ctrl+K` |
| Save capture | — | `Cmd/Ctrl+Enter` |
| Dismiss modal | Swipe down | `Escape` |
| Search | Tap search icon | `Cmd/Ctrl+F` |
| Live Capture | — | `Cmd/Ctrl+Shift+L` |
| Complete commitment | Tap check circle | `Space` (when row focused) |
| Snooze thread | Swipe left → Snooze | — |
| Archive thread | Swipe left → Archive | — |

---

## Microinteraction Specifications

| Trigger | Animation | Duration | Haptic |
|---|---|---|---|
| Thread card created | Slide up + fade in | 200ms | Medium |
| Commitment marked complete | Check animates + card slides to completed section | 300ms | Success (iOS) |
| Quick Capture modal opens | Spring up from bottom | 250ms | Light |
| Going-cold card dismissed | Slide left + fade out | 200ms | None |
| Brain Dump filed | Cards cascade down + fade | 400ms (staggered) | Success |
| Attention score updates | Number rolls (slot machine) | 500ms | None |
| Snooze applied | Card shrinks + fades | 200ms | Light |


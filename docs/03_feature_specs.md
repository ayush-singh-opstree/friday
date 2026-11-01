# Part 3: Feature Specifications

Each feature below includes: purpose, entry points, functional behaviour, edge cases, and acceptance criteria.

---

## Feature 1: Today View

**Purpose:** The Today view is the home screen of Threadwise. It gives the user a prioritised snapshot of what needs their attention right now — not everything, just the most important things.

**Entry Point:** Default landing screen on app open. Also accessible via bottom navigation "Today" tab.

### Functional Behaviour

1. Displays a personalised greeting with the user's first name and the current date.
2. Shows the **Top Attention Threads** section: up to 5 thread cards ranked by attention score, each showing thread title, last interaction date, open commitment count, and a one-line attention reason.
3. Shows the **Due Today** section: all commitments with today's due date, grouped by thread.
4. Shows the **Going Cold** section: all threads that have crossed the going-cold threshold, displayed as a horizontal scroll strip.
5. Shows the **Upcoming** section: next 3 calendar-linked events with associated threads (where calendar integration is enabled).
6. Each thread card has a quick-action chevron that opens the thread detail in a side panel without leaving Today.
7. Tapping "Snooze" on a thread card opens a snooze duration picker (1, 3, 7 days) and removes the thread from the Today view for that period.

### Edge Cases
- If the user has fewer than 5 active threads, the Top Attention section shows all active threads.
- If no commitments are due today, the Due Today section is hidden.
- If no threads are going cold, the Going Cold section is hidden.
- On first use (no data), the Today view shows a welcome card with a prompt to create the first thread.

---

## Feature 2: Threads List and Thread Detail

**Purpose:** The central index of all the user's threads. The thread detail is the primary workspace for a single relationship or context.

**Entry Points:** "Threads" tab in bottom navigation. Direct link from thread card on Today view.

### Threads List Functional Behaviour

1. Displays all active threads as cards in a list.
2. Each thread card shows: title, associated people avatars (up to 3), last interaction date, attention score indicator, and open commitment count.
3. Supports sort by: Last Interaction (default), Attention Score, Created Date, Alphabetical.
4. Supports filter by: Active, Archived, Going Cold, Pinned.
5. A "New Thread" floating action button creates a new thread.
6. Swipe-left on a thread card reveals: Archive, Pin/Unpin, Delete actions.

### Thread Detail Functional Behaviour

1. Header shows: thread title (editable inline), people chips (tappable), and an attention score badge.
2. **Timeline tab**: chronological feed of all captures, commitments, and system events for this thread. Oldest-first by default; toggle to newest-first available.
3. **Commitments tab**: all open and closed commitments for this thread. Filter by owner: All, Mine, Theirs.
4. **People tab**: all people associated with this thread with quick-link to their profile.
5. **Brief tab**: the AI-generated "Where We Left Off" summary, with a Regenerate button.
6. A global FAB in thread detail opens Quick Capture pre-assigned to this thread.
7. The thread title and description are editable inline with auto-save on blur.

### Edge Cases
- A thread with no captures shows an empty-state prompt in the Timeline tab.
- Archiving a thread moves it to the Archived filter; it no longer appears in Today or attention scoring.
- Deleting a thread requires confirmation ("Delete thread and all its content? This cannot be undone.").

---

## Feature 3: People Directory

**Purpose:** A contact book scoped to professional relationships, linked to threads.

**Entry Points:** "People" tab in bottom navigation. Inline people chips on thread detail.

### Functional Behaviour

1. Displays all people as a searchable, alphabetically sorted list.
2. Each person card shows: name, organisation, role, thread count, and last interaction date across all their threads.
3. A "New Person" button opens the person creation form: name (required), organisation, role, email, phone, LinkedIn URL, notes.
4. Person profile page shows: contact details, associated threads list, and personal notes.
5. Search bar filters by name, organisation, or role in real time.
6. Tapping a person from a thread's People tab navigates to their full profile.

### Edge Cases
- If a person is associated with 0 threads, their profile shows a prompt to link them to a thread.
- Attempting to create a duplicate name triggers a warning with a "View Existing" option.
- Merging two person records consolidates thread associations and appends notes with a separator.

---

## Feature 4: Quick Capture

**Purpose:** Frictionless, global note/action capture that never requires the user to navigate away from what they're doing.

**Entry Points:** Global floating action button (FAB) accessible on every screen. Keyboard shortcut: `Cmd+K` / `Ctrl+K`.

### Functional Behaviour

1. Opens a bottom sheet modal with a text field, type selector (Note/Action/Decision/Question), thread/person assignment selector, and a Save button.
2. Text field auto-focuses on open.
3. Thread assignment is pre-populated if the user is currently on a thread's detail page.
4. Tapping Save persists the capture and dismisses the modal.
5. Tapping the expand icon opens the full capture editor with additional fields (date override, tags).
6. If no thread is assigned, capture goes to Inbox.
7. Smart detection: if the typed text contains commitment patterns, a "Create Commitment?" chip appears.

### Gestures and Shortcuts
- `Cmd+Enter` / `Ctrl+Enter`: Save
- `Escape`: Dismiss without saving
- Swipe down on modal: Dismiss without saving

### Edge Cases
- Empty saves are rejected with an inline validation message.
- If the app is offline, the capture is saved locally with a "Pending sync" indicator.
- Captures over 2,000 characters display a character counter and disable Save past the limit.

---

## Feature 5: Commitments Tracker

**Purpose:** A unified view of all promises and action items across all threads.

**Entry Points:** "Commitments" tab on Today view. Commitments tab within thread detail. "Commitments" item in navigation.

### Functional Behaviour

1. Displays all open commitments in a list, grouped by: Due Date (default), Thread, or Owner.
2. Each commitment row shows: description, thread name, owner label (Me / Person name), due date (if set), urgency indicator.
3. Tapping a commitment opens an inline editor: description, owner, due date, linked thread, notes.
4. Checking the completion checkbox marks it complete and animates it to the Completed section.
5. A "New Commitment" button opens the commitment creation form.
6. Filter chips: All / Mine / Theirs / Overdue.
7. Overdue commitments are highlighted with a red accent.

### Urgency Indicator States
- **Green**: due date ≥ 3 days away or no due date
- **Amber**: due date within 48 hours
- **Red**: overdue

### Edge Cases
- Completing a commitment that is linked to a thread adds a completion event to the thread's timeline.
- A commitment with no due date is sorted to the bottom of the due-date group.
- Reactivating a completed commitment moves it back to open status and clears the completion timestamp.

---

## Feature 6: Where We Left Off

**Purpose:** An AI-generated summary of a thread that helps the user re-engage quickly after a gap.

**Entry Points:** Brief tab within thread detail. Pre-Meeting Brief button when a calendar event is linked.

### Functional Behaviour

1. On first open of the Brief tab for a thread, the summary is auto-generated.
2. Summary sections: Last Contact, Key Topics (up to 3 bullets), Open Commitments (listed), Suggested Next Steps (up to 2 bullets), Source Captures (collapsible list of the 5 most-used captures).
3. A "Regenerate" button forces a fresh summary generation with a loading indicator.
4. A "Copy" button copies the summary to clipboard as plain text.
5. A "Share" button creates a shareable read-only link (Pro feature).

### AI Behaviour Notes
- Summary is generated from captures, commitments, and timeline events.
- Topics are extracted using keyword/entity clustering.
- Next steps are inferred from open commitments and the most recent capture.
- If the thread has fewer than 3 captures, the summary displays a "Not enough context — add more notes to improve this summary" message.

### Edge Cases
- If AI generation fails, the system displays the last cached summary with a staleness indicator.
- Regeneration is rate-limited to 3 times per hour per thread.
- For threads with no calendar event, the Pre-Meeting Brief button is disabled.

---

## Feature 7: Live Capture

**Purpose:** In-meeting note-taking mode that keeps the user in flow while capturing structured context.

**Entry Points:** "Start Live Session" button on thread detail. Shortcut: `Cmd+Shift+L`.

### Functional Behaviour

1. Opens a full-screen, distraction-minimised note canvas for the selected thread.
2. Top bar shows: thread name, elapsed time, mute/unmute mic (for future voice capture).
3. User types freely; pressing Enter creates a new capture block.
4. Each block can be tagged inline with `/note`, `/action`, `/decision`, `/question`.
5. Pressing `Tab` on a block promotes it to a commitment prompt.
6. Tapping "End Session" prompts the user to review and confirm captures before saving all to the thread timeline.
7. Session auto-saves every 30 seconds.

### Edge Cases
- If the user navigates away accidentally during a live session, a "Return to session?" persistent notification appears.
- If the device goes offline during a session, all captures are saved locally and synced on reconnect.
- A session that has been inactive for 2 hours without user interaction auto-ends and saves all content.

---

## Feature 8: Brain Dump

**Purpose:** A triage mode for offloading everything from the user's head quickly, then sorting it into threads afterward.

**Entry Points:** "Brain Dump" button on Today view. Accessible from Quick Capture with a mode switch.

### Functional Behaviour

1. Opens a fast-entry list canvas. Each line is a separate capture.
2. User types freely; pressing Enter creates a new entry line.
3. No thread assignment at input time — the goal is speed of capture.
4. After the user taps "Done", the AI_Summariser analyses the entries and suggests a thread assignment for each one.
5. The user reviews suggestions, adjusting any assignments, then taps "File All" to save everything.
6. Any entries not assigned are saved to the Inbox.

### Edge Cases
- Brain Dump sessions are not time-limited.
- If the user closes the Brain Dump without tapping Done, a draft is saved and a "Continue Brain Dump?" prompt appears on next app open.
- AI assignment suggestions are optional; the user can ignore all suggestions and manually assign.

---

## Feature 9: Pre-Meeting Brief

**Purpose:** A one-tap context refresh immediately before a meeting, drawing on everything in the relevant thread.

**Entry Points:** Notification 30 minutes before a calendar event with a linked thread. Today view Upcoming section. Thread detail Brief tab with an upcoming event.

### Functional Behaviour

1. Displays a full-screen card layout optimised for quick scanning.
2. Sections: Meeting Info (title, time, attendees), Last Contact (date and one-line summary), Open Commitments (list), Recent Context (last 3 captures), Talking Points (AI-suggested, editable by user).
3. Attendees who match People_Directory records are highlighted with a link to their profile.
4. The user can add a personal note to the brief before the meeting.
5. After the meeting, a "Capture Meeting Notes" prompt is displayed.

### Edge Cases
- If no thread is linked to the calendar event, the brief shows a "Link a Thread" prompt.
- If AI generation fails, the brief falls back to a manual compilation of the last 5 captures and open commitments.
- The brief is cached so it is available offline during the meeting.

---

## Feature 10: Going-Cold Detection

**Purpose:** Proactively alerts the user to relationships that are becoming inactive so they can re-engage before the relationship cools completely.

**Entry Points:** Going Cold section on Today view. Notification from Notification_Service.

### Functional Behaviour

1. The Attention_Engine evaluates every thread daily and computes a cold score based on days since last capture, days since last commitment activity, and user-set threshold.
2. Threads crossing the threshold appear in the Going Cold list on the Today view.
3. Each cold-thread card shows: thread title, person(s), days since last interaction, and a "Re-engage" button.
4. Tapping "Re-engage" opens a contextual prompt: "Reach out to [Person] — it's been X days. Here's what you last discussed: [one-line summary]."
5. The user can dismiss a cold alert without taking action (removes from list for 7 days).
6. The user can configure the going-cold threshold per thread (override global setting).

### Edge Cases
- Archived threads are excluded from going-cold detection.
- Snoozed threads are excluded during the snooze period.
- If a user dismisses the same thread 3 times in a row without acting, the app asks "Would you like to archive this thread?"

---

## Feature 11: Smart Snooze

**Purpose:** Lets users temporarily clear a thread or commitment from view without losing it.

**Entry Points:** Swipe action on Today view thread card. "Snooze" button on thread detail header. Long-press on commitment row.

### Functional Behaviour

1. Snooze durations: Tomorrow, In 3 Days, Next Week, Custom Date.
2. Snoozed items are moved to a "Snoozed" section visible only from the Threads list filter or a dedicated Snoozed view.
3. A snooze badge shows the return date on the thread card in the Snoozed view.
4. When a snooze expires, the thread/commitment returns to the Today view and the Attention_Engine recomputes its score.
5. The user can un-snooze at any time from the Snoozed view.

### Edge Cases
- A commitment with a due date that falls inside the snooze window is exempted from snooze and shown in Due Today.
- Maximum snooze duration is 30 days. Attempting to snooze beyond 30 days shows a validation message.

---

## Feature 12: Search

**Purpose:** Find any thread, person, capture, or commitment instantly.

**Entry Points:** Search icon in top navigation bar. Keyboard shortcut: `Cmd+F` / `Ctrl+F`.

### Functional Behaviour

1. Global search across threads, people, captures, and commitments.
2. Results are categorised into sections: Threads, People, Captures, Commitments.
3. Each result shows the matched text with the search term highlighted.
4. Recent searches are stored and displayed when the search bar is activated with no query.
5. Supports quoted phrase search: `"follow up on contract"`.
6. Filters can be applied within search results: date range, thread, type.

### Edge Cases
- Search on a 0-capture dataset returns an empty state with a prompt to add captures.
- Searches shorter than 2 characters do not trigger a query.
- Deleting a capture removes it from search results within 60 seconds.

---

## Feature 13: Extension Companion

**Purpose:** Surfaces Threadwise thread context inline in the browser — on LinkedIn profiles, company websites, or email threads.

**Entry Points:** Browser extension icon. Auto-triggered when a recognised person's LinkedIn URL is visited.

### Functional Behaviour

1. On a LinkedIn profile page, the extension detects the person's name and checks the People_Directory for a match.
2. If matched, it displays a sidebar panel showing: matched person card, their threads, open commitments, and a Quick Capture input.
3. If unmatched, it shows an "Add to Threadwise" button.
4. On Gmail (where enabled), the extension reads the email sender and shows a matched person card if found.
5. The extension syncs with the Threadwise account in real time; captures made via extension appear in the app within 30 seconds.

### Edge Cases
- The extension does not inject content into pages outside its approved domain list.
- If the user is not logged in, the extension shows a login prompt.
- The extension does not read or store page content beyond person name and URL for matching.

---

## Feature 14: Digest and Notifications

**Purpose:** Keeps the user informed without requiring them to open the app.

**Entry Points:** System notification tray. Email inbox (for email digest).

### In-App Notification Types
1. **Daily Digest** (push + email): Top 5 threads, due-today commitments, going-cold alerts.
2. **Commitment Due** (push): 24 hours before a commitment due date.
3. **Going Cold Alert** (push): When a thread crosses the cold threshold.
4. **Pre-Meeting Brief** (push): 30 minutes before a calendar event with a linked thread.
5. **Re-engagement Digest** (push + email): Triggered after 7 days of inactivity.

### Notification Preferences
- Each type is independently togglable.
- Daily digest delivery time is user-configurable.
- Email digest is opt-in (default off).
- Notification preferences are accessible from Settings → Notifications.

### Edge Cases
- If the user has Do Not Disturb enabled, notifications are queued and delivered in batch at the end of the DND window.
- Notifications are not sent for archived or snoozed threads.
- Each notification includes a deep link to the relevant thread or commitment.

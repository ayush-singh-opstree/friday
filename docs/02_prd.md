# Part 2: Product Requirements Document (PRD)

## Overview

This document defines the functional and non-functional requirements for Threadwise. Requirements follow EARS notation and INCOSE quality standards. Each requirement maps to one or more features defined in Part 3.

---

## Glossary

- **Thread**: A continuing relationship or conversation record associated with a person, client, project, or meaningful context.
- **Person**: A contact in the user's people directory, associated with one or more threads.
- **Capture**: A user-created note, voice memo, or text snippet attached to a thread or person.
- **Commitment**: A tracked promise or action item, associated with a thread, with an owner and optional due date.
- **Attention Score**: A computed numeric value (0–100) indicating how urgently a thread requires the user's attention.
- **Thread_Manager**: The system component responsible for creating, updating, and retrieving threads.
- **Capture_Engine**: The system component that processes and stores user captures.
- **Commitment_Tracker**: The system component that creates, updates, and closes commitments.
- **Attention_Engine**: The system component that computes attention scores and surfaces threads requiring action.
- **People_Directory**: The system component that stores and retrieves person records.
- **Search_Index**: The system component that indexes and queries threads, captures, and commitments.
- **Notification_Service**: The system component that schedules and delivers reminders and digests.
- **AI_Summariser**: The system component that generates natural-language summaries from thread content.
- **Extension_Companion**: The browser extension component that surfaces thread context on external web pages.

---

## Functional Requirements

### Requirement 1: Thread Management

**User Story:** As a professional, I want to create and manage threads for each of my ongoing relationships and contexts, so that I have a single organised record for every important conversation.

#### Acceptance Criteria

1. THE Thread_Manager SHALL allow the user to create a thread with a title, one or more associated people, and an optional description.
2. THE Thread_Manager SHALL allow the user to archive a thread without deleting its history.
3. THE Thread_Manager SHALL allow the user to restore an archived thread.
4. THE Thread_Manager SHALL allow the user to delete a thread with an explicit confirmation step.
5. WHEN a thread is created, THE Thread_Manager SHALL assign it a unique identifier and record the creation timestamp.
6. WHILE a thread is active, THE Thread_Manager SHALL display the thread's attention score, last interaction date, and open commitment count on the thread card.
7. THE Thread_Manager SHALL allow the user to pin up to 5 threads for persistent visibility at the top of the threads list.
8. WHEN the user applies a filter or sort order to the threads list, THE Thread_Manager SHALL preserve that preference for the duration of the session.
9. THE Thread_Manager SHALL support the following sort orders: last interaction (default), attention score, thread creation date, and alphabetical by title.
10. IF a thread has no captures, commitments, or people associations for 90 or more consecutive days, THEN THE Attention_Engine SHALL flag the thread as going cold.

---

### Requirement 2: People Directory

**User Story:** As a professional, I want to maintain a directory of people associated with my work, so that I can quickly find anyone and see all threads connected to them.

#### Acceptance Criteria

1. THE People_Directory SHALL allow the user to create a person record with at minimum: full name, organisation, role, and email address.
2. THE People_Directory SHALL allow the user to associate a person with one or more threads.
3. THE People_Directory SHALL display, on each person's profile, all threads the person is associated with.
4. THE People_Directory SHALL allow the user to search for a person by name, organisation, or role.
5. WHEN a person is associated with a new thread, THE People_Directory SHALL update the person's thread list within 1 second.
6. THE People_Directory SHALL allow the user to add freeform notes to a person's profile independently of any thread.
7. IF the user attempts to create a person record with a name that exactly matches an existing record, THEN THE People_Directory SHALL present a duplicate-warning prompt before saving.
8. THE People_Directory SHALL allow the user to merge two person records, combining their thread associations and notes.

---

### Requirement 3: Quick Capture

**User Story:** As a professional, I want to capture a thought, note, or action item in seconds, regardless of where I am in the app, so that nothing gets lost before I can file it properly.

#### Acceptance Criteria

1. THE Capture_Engine SHALL provide a global capture entry point accessible from every screen in the application.
2. WHEN the user activates Quick Capture, THE Capture_Engine SHALL present the input field within 300 milliseconds.
3. THE Capture_Engine SHALL allow the user to type free text of up to 2,000 characters in a single capture.
4. THE Capture_Engine SHALL allow the user to optionally assign a capture to a thread or person at capture time.
5. THE Capture_Engine SHALL allow the user to assign a type tag to a capture: Note, Action, Decision, or Question.
6. WHEN the user saves a capture without assigning it to a thread, THE Capture_Engine SHALL place the capture in an Inbox for later assignment.
7. THE Capture_Engine SHALL allow the user to assign an Inbox capture to a thread or person from the Inbox view.
8. WHEN a capture is assigned to a thread, THE Capture_Engine SHALL add the capture to the thread's timeline in chronological order.
9. THE Capture_Engine SHALL allow the user to edit a capture within 30 days of creation.
10. WHEN a capture contains text that matches the pattern of a commitment (e.g., "I will", "I'll", "send by", "follow up"), THE Capture_Engine SHALL offer to create a linked commitment.

---

### Requirement 4: Commitment Tracking

**User Story:** As a professional, I want to track promises and action items associated with each thread, so that I always know what I owe and what others owe me.

#### Acceptance Criteria

1. THE Commitment_Tracker SHALL allow the user to create a commitment with: description, owner (Me or a named Person), thread association, and optional due date.
2. THE Commitment_Tracker SHALL allow the user to mark a commitment as complete.
3. THE Commitment_Tracker SHALL allow the user to reassign a commitment's owner.
4. THE Commitment_Tracker SHALL allow the user to change a commitment's due date.
5. WHILE a commitment is open and has a due date, THE Commitment_Tracker SHALL display a visual urgency indicator that changes state at 48 hours before the due date and again at the due date.
6. WHEN a commitment's due date passes without the commitment being marked complete, THE Notification_Service SHALL send the user a reminder notification.
7. THE Commitment_Tracker SHALL display all open commitments across all threads in a unified Commitments view, sortable by due date and by thread.
8. THE Commitment_Tracker SHALL allow the user to filter commitments by owner: All, Mine, or Theirs.
9. WHEN a commitment is completed, THE Commitment_Tracker SHALL record the completion timestamp and display it in the thread timeline.
10. THE Commitment_Tracker SHALL allow the user to add a completion note when marking a commitment complete.

---

### Requirement 5: Attention Engine

**User Story:** As a professional, I want the app to tell me which threads need my attention today, so that I don't have to manually review every thread to decide what to do.

#### Acceptance Criteria

1. THE Attention_Engine SHALL compute an attention score for every active thread at least once every 24 hours.
2. THE Attention_Engine SHALL base the attention score on: days since last interaction, count and age of open commitments, going-cold threshold, and manually pinned status.
3. THE Attention_Engine SHALL surface the top 5 highest-attention threads on the Today view each day.
4. WHEN a thread's attention score crosses a configurable going-cold threshold, THE Attention_Engine SHALL add the thread to the going-cold list.
5. THE Attention_Engine SHALL allow the user to configure the going-cold threshold in days (default: 14 days).
6. WHEN the user takes an action on a thread (adds a capture, closes a commitment, updates a field), THE Attention_Engine SHALL recompute the thread's attention score within 5 seconds.
7. THE Attention_Engine SHALL allow the user to snooze a thread from the Today view for 1, 3, or 7 days, removing it from the Today view for the snooze period.
8. WHEN a snoozed thread's snooze period expires, THE Attention_Engine SHALL return the thread to the Today view with its recalculated attention score.
9. THE Attention_Engine SHALL explain, in plain language, why a thread is surfaced on the Today view (e.g., "2 open commitments, last contact 12 days ago").

---

### Requirement 6: Context Retrieval (Where We Left Off)

**User Story:** As a professional preparing for a meeting or picking up a conversation, I want to instantly understand where a thread stands, so that I can re-engage without re-reading everything.

#### Acceptance Criteria

1. THE AI_Summariser SHALL generate a "Where We Left Off" summary for any thread on user request.
2. WHEN the user requests a summary, THE AI_Summariser SHALL return the summary within 5 seconds.
3. THE AI_Summariser SHALL include in every summary: last interaction date, key discussion topics, open commitments, and a next-steps suggestion.
4. THE AI_Summariser SHALL cite the specific captures used to generate each summary point.
5. THE AI_Summariser SHALL generate a Pre-Meeting Brief when a thread is associated with an upcoming calendar event.
6. WHEN a Pre-Meeting Brief is generated, THE AI_Summariser SHALL include: last contact date, open commitments, recent context, and suggested talking points.
7. THE AI_Summariser SHALL allow the user to regenerate a summary if the user considers it inaccurate.
8. WHERE the user has enabled AI features, THE AI_Summariser SHALL summarise Brain Dump entries and suggest thread assignments for unassigned captures.

---

### Requirement 7: Reminders and Notifications

**User Story:** As a professional, I want the app to proactively notify me about commitments, cold threads, and upcoming meetings, so that I don't have to check the app constantly.

#### Acceptance Criteria

1. THE Notification_Service SHALL deliver a daily digest at a user-configured time (default: 8:00 AM local time) summarising the day's top threads and open commitments.
2. THE Notification_Service SHALL deliver a commitment-due reminder 24 hours before any open commitment's due date.
3. THE Notification_Service SHALL deliver a going-cold alert when a thread crosses the going-cold threshold.
4. THE Notification_Service SHALL deliver a pre-meeting brief notification 30 minutes before a calendar-linked event, where calendar integration is enabled.
5. THE Notification_Service SHALL allow the user to configure which notification types are enabled independently.
6. THE Notification_Service SHALL allow the user to configure the daily digest delivery time.
7. WHEN the user taps a notification, THE Notification_Service SHALL navigate the user directly to the relevant thread or commitment.
8. IF the user has not interacted with the app in 7 or more consecutive days, THEN THE Notification_Service SHALL send a re-engagement digest highlighting the top 3 threads by attention score.

---

## Non-Functional Requirements

### Performance

1. THE Thread_Manager SHALL load the threads list with up to 100 active threads within 1 second on a standard broadband connection.
2. THE Capture_Engine SHALL persist a capture to storage within 500 milliseconds of the user submitting it.
3. THE Search_Index SHALL return search results for a query of up to 50 characters within 500 milliseconds across a dataset of up to 10,000 captures.
4. THE Attention_Engine SHALL complete a full attention score recomputation for up to 100 threads within 10 seconds.

### Reliability

1. THE Thread_Manager SHALL persist all user data to durable storage and SHALL recover from a client crash without data loss for any capture saved more than 500 milliseconds prior to the crash.
2. WHEN the client is offline, THE Capture_Engine SHALL store captures locally and sync to the server WHEN connectivity is restored.
3. THE system SHALL achieve an uptime of 99.5% or greater, measured monthly, excluding planned maintenance windows.

### Security and Privacy

1. THE system SHALL encrypt all user data at rest using AES-256 or equivalent.
2. THE system SHALL transmit all data in transit over TLS 1.2 or higher.
3. THE system SHALL not share, sell, or expose user contact data or thread content to third parties.
4. THE system SHALL allow the user to export all their data in a machine-readable format (JSON) on request.
5. THE system SHALL allow the user to permanently delete their account and all associated data within 30 days of the request.

### Usability

1. THE system SHALL be usable on Chrome, Safari, Firefox, and Edge browsers on desktop without requiring a plugin.
2. THE system SHALL be usable on iOS Safari and Android Chrome on mobile without requiring a native app install.
3. WHEN a new user completes the onboarding flow, THE system SHALL present a pre-populated demo thread so the user can experience the core loop without entering their own data.
4. THE system SHALL achieve a System Usability Scale (SUS) score of 75 or above in usability testing with 5 representative users from the target segment.

### Scalability

1. THE system SHALL support up to 100 active threads per user without performance degradation.
2. THE system SHALL support up to 500 people records per user without performance degradation.
3. THE system SHALL support up to 10,000 captures per user without degradation to search or timeline rendering.

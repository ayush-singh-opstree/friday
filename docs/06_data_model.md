# Part 6: Information Architecture, Data Model, and Attention Engine

---

## Information Architecture

### Navigation Structure

```
App Root
├── Today (home tab)
│   ├── Top Attention Threads (up to 5)
│   ├── Due Today (commitments)
│   ├── Going Cold (horizontal strip)
│   └── Upcoming (calendar events)
├── Threads (tab)
│   ├── Active list
│   ├── Archived list
│   ├── Snoozed list
│   └── Thread Detail
│       ├── Timeline tab
│       ├── Commitments tab
│       ├── People tab
│       └── Brief tab
├── People (tab)
│   ├── Directory list
│   └── Person Profile
│       ├── Contact details
│       ├── Associated threads
│       └── Personal notes
├── Commitments (tab)
│   ├── All / Mine / Theirs / Overdue filter
│   └── Commitment detail (inline)
└── Settings
    ├── Notifications
    ├── Integrations (calendar, email)
    ├── Going-Cold threshold (global)
    ├── Account
    └── Data export / Delete account
```

### Global Elements
- Top navigation bar: app logo, search icon, notifications bell
- Bottom tab bar: Today | Threads | People | Commitments
- Global FAB: Quick Capture (always visible)

---

## Data Model

### Entity: Thread

```typescript
interface Thread {
  id: string;                       // UUID
  userId: string;                   // FK → User
  title: string;                    // max 100 chars
  description?: string;             // max 500 chars
  status: 'active' | 'archived';
  isPinned: boolean;
  goingColdThresholdDays: number;   // default: 14, overrides global
  attentionScore: number;           // 0–100, computed
  lastInteractionAt: Date;          // updated on any activity
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
}
```

### Entity: Person

```typescript
interface Person {
  id: string;                       // UUID
  userId: string;                   // FK → User
  fullName: string;                 // required
  organisation?: string;
  role?: string;
  email?: string;
  phone?: string;
  linkedInUrl?: string;
  notes?: string;                   // freeform personal notes
  createdAt: Date;
  updatedAt: Date;
}
```

### Entity: ThreadPerson (join table)

```typescript
interface ThreadPerson {
  threadId: string;                 // FK → Thread
  personId: string;                 // FK → Person
  addedAt: Date;
}
```

### Entity: Capture

```typescript
interface Capture {
  id: string;                       // UUID
  userId: string;                   // FK → User
  threadId?: string;                // FK → Thread (null = Inbox)
  personId?: string;                // FK → Person (optional association)
  type: 'note' | 'action' | 'decision' | 'question';
  content: string;                  // max 2000 chars
  source: 'manual' | 'live_capture' | 'brain_dump' | 'extension';
  status: 'inbox' | 'filed';
  capturedAt: Date;                 // user-provided or auto-set
  createdAt: Date;
  updatedAt: Date;
  isEdited: boolean;
  editedAt?: Date;
}
```

### Entity: Commitment

```typescript
interface Commitment {
  id: string;                       // UUID
  userId: string;                   // FK → User
  threadId: string;                 // FK → Thread (required)
  captureId?: string;               // FK → Capture (if created from smart detection)
  description: string;              // max 500 chars
  ownerType: 'me' | 'person';
  ownerPersonId?: string;           // FK → Person (if ownerType = 'person')
  status: 'open' | 'completed';
  dueDate?: Date;
  completedAt?: Date;
  completionNote?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Entity: TimelineEvent

```typescript
interface TimelineEvent {
  id: string;                       // UUID
  threadId: string;                 // FK → Thread
  userId: string;                   // FK → User
  type:
    | 'capture_added'
    | 'commitment_created'
    | 'commitment_completed'
    | 'person_added'
    | 'person_removed'
    | 'thread_created'
    | 'summary_generated'
    | 'brief_opened';
  referenceId?: string;             // ID of the related entity
  metadata: Record<string, unknown>; // type-specific payload
  occurredAt: Date;
}
```

### Entity: Summary

```typescript
interface Summary {
  id: string;                       // UUID
  threadId: string;                 // FK → Thread
  userId: string;                   // FK → User
  type: 'where_we_left_off' | 'pre_meeting_brief';
  content: SummaryContent;
  sourceCaptures: string[];         // array of Capture IDs used
  generatedAt: Date;
  isStale: boolean;
}

interface SummaryContent {
  lastContactDate: Date;
  lastContactSummary: string;
  keyTopics: string[];              // up to 3
  openCommitments: string[];        // commitment descriptions
  nextSteps: string[];              // up to 2
  talkingPoints?: string[];         // for pre-meeting brief
}
```

### Entity: SnoozeRecord

```typescript
interface SnoozeRecord {
  id: string;
  userId: string;
  targetType: 'thread' | 'commitment';
  targetId: string;
  snoozeUntil: Date;
  createdAt: Date;
}
```

### Entity: Notification

```typescript
interface Notification {
  id: string;
  userId: string;
  type:
    | 'daily_digest'
    | 'commitment_due'
    | 'going_cold'
    | 'pre_meeting_brief'
    | 'reengagement_digest';
  referenceType?: string;
  referenceId?: string;
  title: string;
  body: string;
  deepLinkUrl: string;
  scheduledAt: Date;
  sentAt?: Date;
  isRead: boolean;
}
```

### Entity: User

```typescript
interface User {
  id: string;
  email: string;
  fullName: string;
  avatarUrl?: string;
  goingColdThresholdDays: number;   // global default: 14
  digestTime: string;               // HH:MM local time, default "08:00"
  digestEnabled: boolean;
  emailDigestEnabled: boolean;
  notificationPreferences: NotificationPreferences;
  createdAt: Date;
  lastActiveAt: Date;
}

interface NotificationPreferences {
  dailyDigest: boolean;
  commitmentDue: boolean;
  goingCold: boolean;
  preMeetingBrief: boolean;
  reengagementDigest: boolean;
}
```

---

## Entity Relationship Diagram (Text Representation)

```
User ──< Thread >─< Person
          |              |
          |              └── ThreadPerson (join)
          |
          ├──< Capture
          ├──< Commitment
          ├──< TimelineEvent
          ├──< Summary
          ├──< SnoozeRecord
          └──< Notification
```

---

## Attention Engine

### Purpose
The Attention Engine is the core algorithmic component of Threadwise. It computes an attention score (0–100) for each active thread and determines which threads surface on the Today view.

### Inputs
| Input | Source | Weight |
|---|---|---|
| Days since last interaction | `thread.lastInteractionAt` | Primary |
| Open commitment count | Count of open `Commitment` records | Secondary |
| Days to earliest due commitment | Minimum `dueDate` across open commitments | Secondary |
| Going-cold threshold | `thread.goingColdThresholdDays` | Modifier |
| Pinned status | `thread.isPinned` | Modifier |
| Snooze status | Active `SnoozeRecord` | Override |

### Score Computation (Pseudocode)

```
function computeAttentionScore(thread, now):

  # Snoozed threads always score 0 until snooze expires
  if isActiveSnooze(thread, now):
    return 0

  # Pinned threads have a score floor
  pinBonus = thread.isPinned ? 15 : 0

  # Base score from recency (0–50 points)
  daysSinceInteraction = daysBetween(thread.lastInteractionAt, now)
  threshold = thread.goingColdThresholdDays  # default 14
  recencyScore = min(50, (daysSinceInteraction / threshold) * 50)

  # Commitment pressure (0–35 points)
  openCommitments = getOpenCommitments(thread.id)
  commitmentScore = 0
  for commitment in openCommitments:
    if commitment.dueDate is null:
      commitmentScore += 5  # open with no date
    else:
      daysUntilDue = daysBetween(now, commitment.dueDate)
      if daysUntilDue < 0:
        commitmentScore += 20  # overdue
      elif daysUntilDue <= 2:
        commitmentScore += 15  # imminent
      elif daysUntilDue <= 7:
        commitmentScore += 10  # upcoming
      else:
        commitmentScore += 5   # exists but not urgent
  commitmentScore = min(35, commitmentScore)

  # Going-cold indicator (0–15 points)
  goingColdScore = 0
  if daysSinceInteraction >= threshold:
    goingColdScore = 15  # full cold penalty
  elif daysSinceInteraction >= threshold * 0.75:
    goingColdScore = 8   # approaching cold

  # Total score
  rawScore = recencyScore + commitmentScore + goingColdScore + pinBonus
  return min(100, rawScore)
```

### Score Bands

| Score | Label | Today View Visibility | Going Cold |
|---|---|---|---|
| 0–19 | Low | Not surfaced | No |
| 20–44 | Medium | Eligible if in top 5 | No |
| 45–69 | High | Surfaced in top 5 | No |
| 70–84 | Very High | Surfaced in top 5 | Possible |
| 85–100 | Critical | Always in top 5 | Yes |

### Explanation Generation

For each thread on the Today view, the Attention Engine generates a plain-language reason string:

```
function generateAttentionReason(thread, score, openCommitments, daysSinceInteraction):
  reasons = []

  if daysSinceInteraction > thread.goingColdThresholdDays:
    reasons.push("No contact in " + daysSinceInteraction + " days")

  overdueCount = openCommitments.filter(c => c.dueDate < now).length
  if overdueCount > 0:
    reasons.push(overdueCount + " overdue commitment(s)")

  imminentCount = openCommitments.filter(c => daysUntilDue(c) <= 2).length
  if imminentCount > 0:
    reasons.push(imminentCount + " commitment(s) due within 48h")

  if reasons.isEmpty():
    reasons.push(count(openCommitments) + " open commitment(s)")

  return reasons.join(" · ")
```

**Example output:** "No contact in 18 days · 1 overdue commitment"

---

## Worked Examples

### Example 1: Urgent Thread

**Thread:** "Fintech Co. — Aditya"
- Last interaction: 10 days ago
- Going-cold threshold: 14 days
- Open commitments: 2 (one overdue, one due in 1 day)
- Pinned: Yes

**Computation:**
- recencyScore = (10/14) × 50 = 35.7 → 35
- commitmentScore = 20 (overdue) + 15 (≤2 days) = 35
- goingColdScore = 0 (10 < 14 × 0.75 = 10.5) → 0 (just under threshold)
- pinBonus = 15
- rawScore = 35 + 35 + 0 + 15 = 85

**Result:** Score 85, band "Critical", surfaces in top 5. Reason: "1 overdue commitment · 1 commitment due within 48h"

---

### Example 2: Cold Thread

**Thread:** "Investor Z — Rahul"
- Last interaction: 22 days ago
- Going-cold threshold: 14 days
- Open commitments: 0
- Pinned: No

**Computation:**
- recencyScore = min(50, (22/14) × 50) = min(50, 78.6) = 50
- commitmentScore = 0
- goingColdScore = 15 (22 ≥ 14)
- pinBonus = 0
- rawScore = 50 + 0 + 15 + 0 = 65

**Result:** Score 65, band "High", surfaces in top 5. Reason: "No contact in 22 days"

---

### Example 3: Active Thread — No Urgency

**Thread:** "Design Partner — Priya"
- Last interaction: 2 days ago
- Going-cold threshold: 14 days
- Open commitments: 1 (due in 10 days)
- Pinned: No

**Computation:**
- recencyScore = (2/14) × 50 = 7.1 → 7
- commitmentScore = 5 (exists, not urgent)
- goingColdScore = 0
- pinBonus = 0
- rawScore = 7 + 5 + 0 + 0 = 12

**Result:** Score 12, band "Low", not surfaced on Today view unless in top 5 by default.

---

## Search Index Design

### Indexed Fields
| Entity | Fields Indexed |
|---|---|
| Thread | title, description |
| Person | fullName, organisation, role, email |
| Capture | content |
| Commitment | description, completionNote |

### Search Query Types
1. **Full-text**: tokenised, stemmed, ranked by recency and entity type
2. **Phrase**: exact match on `"quoted strings"`
3. **Entity filter**: restrict to Threads / People / Captures / Commitments

### Index Update Strategy
- New/edited captures are indexed within 10 seconds of save
- Deleted captures are removed from the index within 60 seconds
- Index is rebuilt nightly as a background job

---

## Offline and Sync Strategy

### Local Storage
- All entities are mirrored to device-local storage (IndexedDB on web, SQLite on native)
- The local store is the primary read source; server is the sync target

### Sync Protocol
1. On reconnect, client sends a `lastSyncedAt` timestamp
2. Server returns all changes since `lastSyncedAt`
3. Conflict resolution: last-write-wins per entity, with a `updatedAt` comparison
4. Captures created offline are given a temporary local ID; replaced by server-assigned UUID on sync
5. Synced items are marked with a sync badge removed after confirmation

### Pending Captures UI
- Offline captures show a grey "●" sync indicator
- On sync, indicator transitions to green with a check animation


# Threadwise — Requirements (Summary)

> Full detail is in `02_prd.md`. This file is the quick reference.

## Core Functional Requirements

| # | Requirement | Key Criteria |
|---|---|---|
| R1 | Thread Management | Create/archive/restore/delete threads; pin up to 5; sort by last interaction, score, date, alphabetical |
| R2 | People Directory | Create person records; associate with threads; search by name/org/role; duplicate detection; merge records |
| R3 | Quick Capture | Global FAB; opens in ≤300ms; type tags (Note/Action/Decision/Question); Inbox for unassigned; offline support |
| R4 | Commitment Tracking | Create with owner + due date; amber urgency ≤48h; red = overdue; unified view; completion adds to timeline |
| R5 | Attention Engine | Score 0–100 per thread; refreshed ≤4h; recomputes within 5s on interaction; Today view top 5; plain-language reason |
| R6 | AI Context Retrieval | "Where We Left Off" in ≤5s; Pre-Meeting Brief on demand; cites source captures; graceful fallback if AI down |
| R7 | Going-Cold Detection | Daily evaluation; configurable threshold (default 14d); alert + re-engage prompt; dismiss suppresses 7d |
| R8 | Brain Dump Mode | Rapid multi-line entry; AI suggests thread assignments in ≤3s; draft saved if session interrupted |
| R9 | Search | Cross-entity (threads, people, captures, commitments); results in ≤500ms; quoted phrase support |
| R10 | Notifications | Daily digest (user-configured time); commitment-due (24h prior); going-cold alerts; re-engagement after 7d inactivity |
| R11 | Offline + Sync | Local-first reads (≤100ms); offline captures synced on reconnect; last-write-wins conflict resolution |
| R12 | Security + Privacy | AES-256 at rest; TLS 1.2+ in transit; no third-party data sharing; JSON export; account deletion within 30d |

## Non-Functional Requirements

| Category | Requirement |
|---|---|
| Performance | Threads list (≤100 threads) loads in ≤1s; capture persisted in ≤500ms; search results in ≤500ms |
| Reliability | Uptime ≥99.5% monthly; no data loss for captures saved >500ms before crash |
| Usability | Works on Chrome, Safari, Firefox, Edge; iOS Safari and Android Chrome; SUS score ≥75 |
| Scalability | Supports ≤100 active threads, ≤500 people, ≤10,000 captures per user without degradation |

## EARS Pattern Examples

```
WHEN the user activates Quick Capture, THE Capture_Engine SHALL present the input field within 300 milliseconds.

WHILE a commitment is open and its due date has passed, THE Commitment_Tracker SHALL display a red urgency indicator.

IF the user has dismissed the same thread's going-cold alert 3 or more consecutive times without taking action,
THEN THE system SHALL prompt the user to consider archiving the thread.

WHERE the user has enabled AI features, THE AI_Summariser SHALL analyse Brain Dump entries and suggest thread assignments.
```


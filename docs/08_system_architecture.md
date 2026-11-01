# Part 8: System Architecture

---

## Architecture Overview

Threadwise is a web-first application with a progressive web app (PWA) experience on mobile. The architecture prioritises:

1. **Offline-first**: Core functionality works without a network connection.
2. **Fast local reads**: The local store is the read source; the server is the sync target.
3. **AI at the edge of features**: AI features are enhancements, not blockers — degrading gracefully when unavailable.
4. **Privacy-preserving**: Contact and relationship data never leaves the user's account without explicit action.

---

## High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              React Web App (PWA)                    │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐    │   │
│  │  │  UI      │ │  State   │ │  Sync Engine     │    │   │
│  │  │  Layer   │ │  Layer   │ │  (background)    │    │   │
│  │  │ (React)  │ │ (Zustand)│ │                  │    │   │
│  │  └──────────┘ └──────────┘ └──────────────────┘    │   │
│  │  ┌──────────────────────────────────────────────┐   │   │
│  │  │     Local Store (IndexedDB via Dexie.js)     │   │   │
│  │  └──────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────┘
                                │ HTTPS / WSS
┌───────────────────────────────▼─────────────────────────────┐
│                        SERVER                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │                API Gateway (REST + WebSocket)        │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ Auth     │ │ Thread   │ │ Capture  │ │ Commitment    │  │
│  │ Service  │ │ Service  │ │ Service  │ │ Service       │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │
│  │ People   │ │ Attention│ │ AI       │ │ Notification  │  │
│  │ Service  │ │ Engine   │ │ Service  │ │ Service       │  │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │
│  ┌──────────────────────────────────────────────────────┐   │
│  │               Primary Database (PostgreSQL)          │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │    Search Index (PostgreSQL full-text / Meilisearch) │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Job Queue (BullMQ / Redis)              │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Client Architecture

### Tech Stack (Web)

| Layer | Technology | Rationale |
|---|---|---|
| UI Framework | React 18 + TypeScript | Mature ecosystem, concurrent rendering |
| State Management | Zustand | Lightweight, no boilerplate, good devtools |
| Local Store | Dexie.js (IndexedDB wrapper) | Typed IndexedDB with reactive queries |
| Routing | React Router v6 | Industry standard, lazy loading support |
| Styling | Tailwind CSS + CSS Variables | Utility-first + design token integration |
| Animation | Framer Motion | Spring physics, gesture handling |
| Icons | Phosphor Icons (React) | Consistent, multiple weights, tree-shakable |
| PWA | Vite PWA plugin + Workbox | Service worker, offline caching, app manifest |
| Build | Vite | Fast HMR, ESM output, good TypeScript support |

### State Architecture

```
Global State (Zustand stores):
├── authStore       — user session, profile
├── threadStore     — threads list, selected thread
├── captureStore    — inbox captures, recent captures
├── commitmentStore — open commitments across threads
├── peopleStore     — people directory
├── attentionStore  — today view data, attention scores
├── uiStore         — modal state, active tab, loading indicators
└── syncStore       — sync status, pending operations

Local Queries (Dexie.js reactive):
- Thread detail timeline: indexed by threadId + capturedAt
- Commitment list: indexed by threadId + status + dueDate
- People search: indexed by fullName
```

### Sync Engine

```
SyncEngine (background service):
  - Runs as a Web Worker to avoid blocking UI
  - Maintains a pending operations queue
  - On network reconnect: drains queue in FIFO order
  - Subscribes to server-sent events for real-time updates
  - Conflict resolution: last-write-wins per entity (updatedAt comparison)
  - Exponential backoff on failures: 1s, 2s, 4s, 8s, max 60s
```

### Service Worker Strategy

| Resource Type | Cache Strategy |
|---|---|
| App shell (HTML/CSS/JS) | Cache-first (versioned) |
| API responses | Network-first with IndexedDB fallback |
| AI summaries | Stale-while-revalidate (cached 1 hour) |
| Avatar images | Cache-first (long TTL) |
| Notifications | Background sync via Push API |

---

## Server Architecture

### Tech Stack (Server)

| Layer | Technology | Rationale |
|---|---|---|
| Runtime | Node.js 20 (or Bun for hackathon speed) | JavaScript ecosystem consistency |
| Framework | Fastify | Performance, TypeScript support, plugin ecosystem |
| Database | PostgreSQL 16 | ACID compliance, JSONB support, full-text search |
| ORM | Drizzle ORM | Type-safe, lightweight, SQL-first |
| Authentication | Clerk (or Auth.js) | Managed auth, social login, JWT |
| Job Queue | BullMQ + Redis | Reliable async jobs, scheduled tasks |
| Real-time | Server-Sent Events (SSE) | Simpler than WebSockets for read-only push |
| Email | Resend | Modern, developer-friendly email API |
| Push Notifications | Web Push + VAPID | Standard, no vendor lock-in |
| AI | OpenAI GPT-4o (or Anthropic Claude) | Quality summaries, tool-calling for structured output |
| Search | PostgreSQL full-text (Phase 1) / Meilisearch (Phase 2) | Start simple, migrate when needed |
| File Storage | Cloudflare R2 | S3-compatible, cheap egress |
| Deployment | Railway (hackathon) / Fly.io (production) | Fast deploys, managed PostgreSQL |

### API Design

RESTful with resource-centric URLs. No GraphQL for simplicity.

```
Authentication:
  POST /auth/login
  POST /auth/logout
  GET  /auth/me

Threads:
  GET    /threads              — list (with filters, sort)
  POST   /threads              — create
  GET    /threads/:id          — get with timeline
  PATCH  /threads/:id          — update
  DELETE /threads/:id          — delete
  POST   /threads/:id/archive  — archive
  POST   /threads/:id/restore  — restore
  POST   /threads/:id/snooze   — snooze

Captures:
  GET    /captures             — inbox + recent
  POST   /captures             — create
  PATCH  /captures/:id         — edit
  DELETE /captures/:id         — delete
  POST   /captures/:id/assign  — assign to thread

Commitments:
  GET    /commitments          — list (filters: status, owner, thread)
  POST   /commitments          — create
  PATCH  /commitments/:id      — update
  POST   /commitments/:id/complete — complete

People:
  GET    /people               — list (search)
  POST   /people               — create
  GET    /people/:id           — get with threads
  PATCH  /people/:id           — update
  DELETE /people/:id           — delete
  POST   /people/merge         — merge two records

AI:
  POST   /ai/summarise/:threadId        — generate/regenerate summary
  POST   /ai/brief/:threadId            — generate pre-meeting brief
  POST   /ai/classify                   — classify brain dump entries

Attention:
  GET    /attention/today      — today view data
  POST   /attention/recompute/:threadId — force recompute

Search:
  GET    /search?q=...&type=...&thread=...

Sync:
  GET    /sync?since=<ISO timestamp>    — pull changes since last sync
  POST   /sync/batch                    — push batch of pending operations

Notifications:
  GET    /notifications        — list
  PATCH  /notifications/:id/read
  GET    /notifications/preferences
  PATCH  /notifications/preferences
```

### Attention Engine Service

The Attention Engine runs as a scheduled background job:

```
Schedule: Every 4 hours (cron: 0 */4 * * *)
  For each active user:
    For each active thread:
      score = computeAttentionScore(thread)
      if score !== thread.currentScore:
        update thread.attentionScore
        if score >= 85: add to today_view_cache
        if daysSinceInteraction >= goingColdThreshold: flag going_cold

On-demand recompute:
  Triggered by: any write to Capture, Commitment, Thread
  Scope: affected thread only
  Latency target: < 5 seconds
```

### AI Service Architecture

```
AI Pipeline:
  1. Request received (summarise / brief / classify)
  2. Load context: last N captures, open commitments, timeline events
  3. Build prompt from template
  4. Call LLM API (streaming response)
  5. Parse structured output (JSON mode / function calling)
  6. Validate output against schema
  7. Cache result with TTL (1 hour for summaries, 30 min for briefs)
  8. Return to client

Prompt Templates:
  summarise.hbs  — "Where We Left Off" summary
  brief.hbs      — Pre-Meeting Brief
  classify.hbs   — Brain Dump thread assignment
  detect.hbs     — Commitment pattern detection

Fallback:
  If LLM call fails or times out (>10s):
    → Return structured fallback from raw captures (no AI)
    → Flag as "manual_fallback" in response
    → Log for monitoring

Cost Controls:
  - Maximum 5 LLM calls per user per hour (rate limit)
  - Context window: last 20 captures max
  - Compress captures > 500 chars to 200-char summary before sending
```

---

## Data Flow: Capture to Timeline

```
1. User types in Quick Capture modal
2. Zustand captureStore: optimistic add to UI
3. Dexie.js: write to local IndexedDB (capture with status='pending_sync')
4. Sync Engine: enqueue POST /captures
5. UI shows capture immediately (optimistic)
6. Server: receives POST, validates, writes to PostgreSQL
7. Server: updates Thread.lastInteractionAt
8. Server: triggers async attention recompute for thread
9. Server: returns created capture with server-assigned ID
10. Sync Engine: receives response, updates local record (replace temp ID with server ID)
11. Dexie.js: update record to status='synced'
12. UI: sync indicator updates to green check
```

---

## Security Architecture

### Authentication
- JWTs issued by Clerk (or Auth.js) with 1-hour expiry
- Refresh tokens stored in HttpOnly cookies
- All API endpoints require a valid JWT
- Rate limiting: 100 requests/minute per user

### Data Isolation
- All database queries include `userId` in WHERE clause (row-level isolation)
- No shared data between users at the application layer
- Database row-level security (RLS) policies as defence-in-depth

### Encryption
- Data at rest: PostgreSQL transparent encryption (AWS RDS / Supabase)
- Data in transit: TLS 1.3 enforced
- Captures and thread content: searchable encryption not used (would break full-text search); data is protected by strong access controls at application and database layers

### Privacy
- No third-party analytics SDKs in the initial build (Plausible for privacy-first analytics in Phase 2)
- LLM calls send only the capture text and metadata — no PII in prompt unless user's own captures contain it
- Users can export all their data as a JSON archive (GDPR right to portability)
- Account deletion: hard-deletes all user records within 30 days

---

## Build Order for Hackathon MVP

### Day 1: Core Data + Auth
1. Project setup (Vite + React + TypeScript + Tailwind)
2. Database schema (PostgreSQL or SQLite for hackathon speed)
3. Auth (Clerk quickstart or simple JWT)
4. Thread and Capture CRUD APIs
5. Local state (Zustand stores)

### Day 2: Core UI
1. Today view (static layout with seed data)
2. Thread list + Thread detail (Timeline tab)
3. Quick Capture modal
4. Commitments view (basic list)

### Day 3: Attention + AI
1. Attention Engine (rule-based, no ML)
2. Going-Cold detection
3. AI summary (single LLM call, "Where We Left Off")
4. Pre-Meeting Brief (static structure + AI fill)

### Day 4: Polish + Demo
1. Seed data for demo narrative
2. Animations and microinteractions
3. Edge case handling (offline, empty states)
4. Browser extension (if time permits — optional)
5. Demo run-through

---

## Technology Alternatives (Trade-off Table)

| Decision | Option A | Option B | Chosen | Reason |
|---|---|---|---|---|
| Database | PostgreSQL | Supabase (hosted PG) | Supabase (hackathon) / PG (prod) | Supabase gives instant hosted PG + auth + realtime for hackathon speed |
| Auth | Clerk | Auth.js | Clerk | Managed, fast to integrate |
| ORM | Drizzle | Prisma | Drizzle | Lighter, SQL-first |
| Search | Meilisearch | PG full-text | PG full-text (Phase 1) | Ship faster; migrate if needed |
| State | Zustand | Redux Toolkit | Zustand | Less boilerplate, sufficient power |
| AI | OpenAI | Anthropic Claude | OpenAI GPT-4o | Broader ecosystem, streaming support |
| Hosting | Railway | Fly.io | Railway (hackathon) | Fastest to deploy from scratch |
| Mobile | PWA | React Native | PWA (Phase 1) | One codebase, deployable immediately |


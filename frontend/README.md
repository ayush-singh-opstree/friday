# Friday — Web App (`frontend/`)

> **The relationship memory layer for professionals.**
> Friday holds the context of every important professional relationship — what was said,
> what was promised, and what needs to happen next — so nothing gets lost between meetings,
> emails and chats.

This folder is the **website**: a responsive, installable web app. The browser extension lives
in [`../extension`](../extension) and is delivered in **Phase 2**. The two are independent
codebases that share one contract: the REST API documented in
[`../docs/08_system_architecture.md`](../docs/08_system_architecture.md).

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| UI | React 19 + Vite 8 (JavaScript) | Fast HMR, ESM output |
| Styling | Tailwind CSS v4 + CSS variables | Utilities + design tokens together |
| Routing | React Router 7 | Standard, lazy-loading friendly |
| State | Zustand | Small, no boilerplate |
| Design system | **`lucide-react`** (via `src/components/icons`), **Radix UI** primitives, **`sonner`**, **`motion`** | Popular, tree-shakable libraries: crisp icons, accessible unstyled primitives, stacked toasts, spring animation |
| Dates | `date-fns` | Small, tree-shakeable |
| Offline | Dexie (IndexedDB) | Phase 1E local-first layer |

Everything is **JavaScript** (no TypeScript build step), with JSDoc `@typedef`s in
`src/types/` for editor intellisense.

Typography is **self-hosted** — `@fontsource-variable/inter` +
`@fontsource-variable/jetbrains-mono` are imported in `src/main.jsx` and wired through
`--font-sans` / `--font-mono`. No external font CDN, so the demo keeps working offline
(docs/09_release_plan.md → D2).

---

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production bundle into dist/
npm run lint       # eslint
npm run verify:adapters   # API adapter contract (offline, fixtures)
npm run verify:live       # ...plus the running backend on :8000
npm run verify:attention  # Attention Engine rules
npm run verify:isolation  # per-user data isolation
npm run icons      # regenerate PWA icons (zero-dependency PNG encoder)
```

### Running against the backend (current setup)

`.env.local` (git-ignored) already points this app at the FastAPI backend:

```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_USE_MOCK_API=false
```

Start the API (`cd ../backend && python run.py`), then `npm run dev`. The backend allows
`http://localhost:5173` through CORS, and because Phase 0 has no auth routes, live sign-in binds a
local demo session automatically. Delete `.env.local` to fall back to the bundled demo dataset —
the app auto-detects which source to use and shows it in the shell's data-source badge.

**Demo mode** needs no configuration: with no `VITE_API_BASE_URL` the app serves a seeded dataset
(the *Meera* persona from `docs/04_personas_journeys.md`) from `src/mocks`, so every screen is
explorable before the backend exists. Sign in with any non-empty email/password.

To point at a *different* backend, copy the template and edit the URL:

```bash
cp .env.example .env.local
# VITE_API_BASE_URL=https://api.friday.app
# VITE_USE_MOCK_API=false
```

### Backend integration (dual mode)

The API layer runs in two modes that share one UI contract:

| Mode | Trigger | Transport |
|---|---|---|
| **Mock** (default) | no `VITE_API_BASE_URL`, or `VITE_USE_MOCK_API=true` | `src/mocks` (in-browser demo router) |
| **Live** | `VITE_API_BASE_URL` set and `VITE_USE_MOCK_API=false` | the FastAPI backend in `../backend` |

`src/apis/adapters.js` is the boundary: it translates UI camelCase to the
backend's snake_case contract (`owner_type`, `due_date`, `overdue_only`,
`completion_note`, `snooze_until`) and unwraps the `{ data, total }` list
envelope back into the shapes stores expect. Endpoints the backend composes from
several resources are stitched here too:

- `GET /threads/:id` detail = thread + `GET /captures?thread_id=…` +
  `GET /commitments?thread_id=…` + `GET /threads/:id/timeline`.
- `GET /attention/today` is enriched with overdue commitments and the inbox count.
- `POST /attention/recompute/:id` returns the score, which is folded back onto
  the refreshed thread so the Today ranking updates.
- `POST /threads/:id/snooze` converts the UI's whole-day preset into an absolute
  `snooze_until`.

Because the **Phase 0 backend is single-user with no auth**
(`backend/app/config.py -> DEMO_USER_ID`), live sign-in first tries
`POST /auth/login`; if that route does not exist it binds a local session to the
demo user. The data source is always visible via the `DataSourceBadge` in the
app shell and on the sign-in screen.

---

## Folder structure

```
src/
├── apis/            # REST client + one module per resource (the shared backend contract)
├── app/             # App root, providers, route table
├── auth/            # Session persistence + AuthProvider (+ useAuth)
├── authorization/   # Plan/role capability matrix, RequireAuth, <Can>
├── components/
│   ├── ui/          # Design-system primitives (Button, Card, Chip, Badge, Avatar, …)
│   ├── layout/      # AppShell, PageHeader
│   ├── thread/      # ThreadCard
│   ├── capture/     # QuickCaptureSheet
│   ├── commitment/  # CommitmentRow
│   └── common/      # Brand, ErrorBoundary, Toaster, OfflineBanner
├── config/          # env, constants (vocabularies), app metadata
├── hooks/           # useThreads, useAttention, usePeople, useCommitments, useBreakpoint
├── lib/             # utils, date, Attention Engine, capture patterns, errors
├── mocks/           # Seed dataset + demo API router (never shipped as the real backend)
├── pages/           # Route-level screens
├── store/           # Zustand stores
├── styles/          # Design tokens (theme.css) + global styles
└── types/           # JSDoc data-model contract
```

---

## Build phases

Phase plan comes from [`docs/09_release_plan.md`](../docs/09_release_plan.md).

### ✅ Phase 0 — Hackathon MVP (complete)

- Vite + React + Tailwind scaffold, template code removed
- Design tokens from `docs/07_design_system.md` (`src/styles/theme.css`) incl. dark mode
- UI kit: Button, IconButton, Card, SectionHeader, Chip, CaptureTypeChip, ColdChip,
  AttentionScoreBadge, UrgencyDot, PlanBadge, Avatar, AvatarGroup, Field, Input, Textarea,
  Select, Switch, SwitchRow, Spinner, Skeleton, LoadingState, EmptyState, ErrorState
- App shell matching the documented breakpoints (240px sidebar → 64px rail → bottom tabs + FAB)
- Routing + route guards; login screen; auth session store
- API layer against the documented contract (`endpoints.js` + `client.js` + resource modules)
- Demo API (`src/mocks`) so the product runs with no backend
- **Attention Engine ported verbatim** from `docs/06_data_model.md` (`src/lib/attention.js`)
- Zustand stores: threads, attention, commitments, people, captures, UI
- **Today view** (attention dashboard, due today, going cold rail)
- **Threads list** (filters + sort, attention bands, cold chips)
- **Quick Capture** (FAB / `Cmd+K`, type selector, thread assignment, smart commitment detection)
- **Thread detail** — Timeline, Commitments (All/Mine/Theirs), People and Brief tabs; inline-rename, pin, snooze, archive, delete
- **Unified Commitments view** — grouped by due date, All/Mine/Theirs/Overdue filters, inline completion
- **AI surfaces** — "Where We Left Off" + Pre-Meeting Brief with Regenerate, Copy and a capture-based fallback when the model is unavailable
- **Going Cold** — re-engage prompt with context, 7-day dismissal, archive offer after 3 dismissals
- **Smart Snooze** — 1 / 3 / 7-day presets, 1–30 day validation, Snoozed filter
- **Brain Dump** — multi-line entry, per-line type inference + thread suggestion, batch filing
- **Create thread** and **create/edit commitment** dialogs

### Next — Phase 1 (Private Beta)

| Slice | Scope |
|---|---|
| 1A ✅ | **People Directory (full)** — searchable directory, person profile, duplicate detection, record merge, delete |
| 1B ✅ | **Settings** — notification preferences + digest time, capture defaults, appearance/theme, JSON data export, restore defaults |
| 1C ✅ | **Offline-first** — Dexie mirror of all entities, outbox queue, FIFO replay with exponential backoff (1→2→4→8s), sync banner + per-capture pending badges |
| 1D ✅ | **Global search** — `Cmd/Ctrl+F` overlay, four entity groups, match highlighting, quoted phrases, recent searches, type filters (also in the extension side panel) |
| 1E ✅ | **Per-user data isolation** — token→user session registry, each account gets its own workspace, unauthenticated requests 401, cross-user reads/writes 404, offline mirror + stores purged on sign-in/out. Verified by `npm run verify:isolation` (11 checks) |
| 1F | Auth (Clerk) — *deferred by request* |
| 1G | Push notifications (Web Push + VAPID, preference sync) |
| 1H | Live Capture, Onboarding flow v1, iOS PWA verification |
| 2 | Browser Extension Companion (runnable), Free/Pro tier gate, email digest, calendar integration |
| 3 | Shared threads, team workspace, admin panel, native mobile, audit log |

Every route now renders a real screen — there are no placeholder pages left.

---

## Keyboard shortcuts

| Action | Shortcut |
|---|---|
| Quick Capture | `Cmd/Ctrl + K` |
| Save capture | `Cmd/Ctrl + Enter` |
| Search | `Cmd/Ctrl + F` |
| Dismiss sheet | `Escape` |

---

## Notes on the backend

This app never assumes a running backend:

1. `src/apis` is written strictly against the documented endpoints.
2. `src/config/env.js` flips to `src/mocks` when no API base URL is configured.
3. The mock router decorates threads exactly as the server would — the **Attention Engine runs
   server-side in production**, so clients only read `attentionScore` / `attentionReason` /
   `urgency`.

When the backend lands, no UI code changes: set the env vars and delete `src/mocks`.
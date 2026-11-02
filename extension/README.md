# Friday Companion — Browser Extension (`extension/`)

The **helper** companion for the Friday web app. It surfaces relationship context while you
work in the browser — on a LinkedIn profile, in a Gmail thread, or mid-conversation.

> This is a separate codebase from [`../frontend`](../frontend) (the website). They share **one
> contract**: the REST API in [`../docs/08_system_architecture.md`](../docs/08_system_architecture.md).

Maps to **Feature 13 — Extension Companion** in [`../docs/03_feature_specs.md`](../docs/03_feature_specs.md).
Per [`../docs/09_release_plan.md`](../docs/09_release_plan.md) it ships in **Phase 2**.

---

## Status: runnable (Phase 2 groundwork)

| Surface | File | What it does |
|---|---|---|
| Popup | `src/pages/popup/` | Top-3 attention threads + Quick Capture (type, thread, commitment detection) + theme toggle |
| Side panel | `src/pages/sidepanel/` | "On this page" (matched person, their threads + open commitments, capture), People, Search, Today, Capture + theme toggle |
| Options | `src/pages/options/` | Account, Connection (data source, sign out, reset demo), **Appearance (theme)**, Detection, Notifications, Privacy, About |
| Background | `src/background/index.js` | Context menu "Capture to Friday", page-context relay, hourly badge sync |
| Content script | `src/content/index.js` | Detects the person on LinkedIn/Gmail, publishes context, floating launcher pill |

**Privacy contract (from the spec):** the content script reads *only* a display name, an optional
email and the page URL, on the approved domain list (`linkedin.com`, `mail.google.com`). Page body
content is never read, stored or transmitted.

**Design note:** the rich companion UI lives in the **native side panel** (a real browser sidebar),
and the content script adds only a lightweight launcher pill. This avoids injecting a full React
tree into host pages, so LinkedIn/Gmail CSS can never leak into, or be broken by, the companion.

**Theme:** System / Light / Dark is chosen in **Options → Appearance**, or cycled from the header
of the popup and side panel (`ThemeToggle`). The preference lives in `settingsStore`
(`chrome.storage.local`) and is applied by `ThemeProvider`, which flips the `dark`/`light` class so
the CSS custom properties in `src/styles/theme.css` switch across every surface. Fonts (Inter /
JetBrains Mono) are self-hosted via `@fontsource-variable/*`, imported by each surface's entry.

## Stack

React 19 · Vite 8 (JS) · Tailwind v4 · **CRXJS v3** (MV3 bundling + HMR) · Zustand · Radix · **lucide-react** · **sonner**

## Commands

```bash
npm install
npm run dev     # CRXJS dev server -> load ./dist unpacked in chrome://extensions
npm run build   # -> dist/ (+ release/threadwise-companion-<version>.zip)
npm run lint
npm run icons   # regenerate PNG icons (zero-dependency encoder)
```

## Folder structure

```
src/
├── apis/            # REST client + resource modules (same endpoints as the web app)
├── auth/            # chrome.storage-backed session + AuthProvider
├── authorization/   # plan/role capabilities, ProtectedView, <Can>
├── background/      # MV3 service worker
├── components/      # ui/ (design system) + common/
├── config/          # env, constants (message contract, storage keys), app metadata
├── content/         # content script: detectors + launcher pill
├── context/         # AppProviders, ThemeProvider
├── hooks/           # usePageContext, usePersonMatch, useQuickCapture, useAttention, …
├── lib/             # messaging, storage, attention engine, patterns, dates
├── mocks/           # bundled demo dataset so the extension runs with no backend
├── pages/           # popup / sidepanel / options
├── services/        # detection + sync
├── store/           # Zustand stores
├── styles/          # design tokens (mirrors the web app)
└── types/           # JSDoc data-model contract
```

## Known gaps (Phase 2 remaining)

- Commands run against the **bundled demo dataset** by default; point `VITE_API_BASE_URL` at the
  real backend and set `VITE_USE_MOCK_API=false` to switch (the same env switch the web app uses).
  `src/apis/adapters.js` maps the FastAPI snake_case contract to the UI's camelCase shape, exactly
  like `../frontend/src/apis/adapters.js`, so the companion and the website read the same API.
  The active source is shown in the Options → Connection section.
- Gmail sender detection uses the first `span[email][name]` in the DOM — needs hardening against
  Gmail's DOM changes.
- Companion overlay is Pro-gated in the capability matrix but the upgrade path is not yet surfaced
  inside the extension.
- No automated tests yet for detection/matching.
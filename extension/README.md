# Threadwise Companion — Browser Extension (`extension/`)

The **helper** companion for the Threadwise web app. It surfaces relationship context while you
work in the browser — on a LinkedIn profile, in a Gmail thread, or mid-conversation.

> This is a separate codebase from [`../frontend`](../frontend) (the website). They share **one
> contract**: the REST API in [`../docs/08_system_architecture.md`](../docs/08_system_architecture.md).

Maps to **Feature 13 — Extension Companion** in [`../docs/03_feature_specs.md`](../docs/03_feature_specs.md).
Per [`../docs/09_release_plan.md`](../docs/09_release_plan.md) it ships in **Phase 2**.

---

## Status: runnable (Phase 2 groundwork)

| Surface | File | What it does |
|---|---|---|
| Popup | `src/pages/popup/` | Top-3 attention threads + Quick Capture (type, thread, commitment detection) |
| Side panel | `src/pages/sidepanel/` | "On this page" (matched person, their threads + open commitments, capture), Today, Capture |
| Options | `src/pages/options/` | Connection (data source, sign out, reset demo), Detection, Notifications, Privacy, Account, About |
| Background | `src/background/index.js` | Context menu "Capture to Threadwise", page-context relay, hourly badge sync |
| Content script | `src/content/index.js` | Detects the person on LinkedIn/Gmail, publishes context, floating launcher pill |

**Privacy contract (from the spec):** the content script reads *only* a display name, an optional
email and the page URL, on the approved domain list (`linkedin.com`, `mail.google.com`). Page body
content is never read, stored or transmitted.

**Design note:** the rich companion UI lives in the **native side panel** (a real browser sidebar),
and the content script adds only a lightweight launcher pill. This avoids injecting a full React
tree into host pages, so LinkedIn/Gmail CSS can never leak into, or be broken by, the companion.

## Stack

React 19 · Vite 8 (JS) · Tailwind v4 · **CRXJS v3** (MV3 bundling + HMR) · Zustand · Radix · Phosphor

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

- Commands are wired to the **bundled demo backend**; point `VITE_API_BASE_URL` at the real API to
  switch (the same env switch the web app uses).
- Gmail sender detection uses the first `span[email][name]` in the DOM — needs hardening against
  Gmail's DOM changes.
- Companion overlay is Pro-gated in the capability matrix but the upgrade path is not yet surfaced
  inside the extension.
- No automated tests yet for detection/matching.
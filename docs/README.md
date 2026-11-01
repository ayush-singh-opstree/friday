# Threadwise — Product Pack Index

Complete documentation for the Threadwise relationship-memory app. All 10 parts of the product pack are captured here.

---

## Document Index

| File | Contents |
|---|---|
| `orignal_challenge.md` | Original hackathon brief (source of truth, unmodified) |
| `product_startergy.md` | One-page product strategy summary |
| `requirement.md` | Requirements quick reference |
| `design.md` | Design notes (placeholder) |
| `01_product_strategy.md` | **Part 1** — Full product strategy: vision, market, value prop, business model, roadmap, risks |
| `02_prd.md` | **Part 2** — Full PRD: all functional + non-functional requirements in EARS/INCOSE format |
| `03_feature_specs.md` | **Part 3** — 14 feature specifications with behaviour, edge cases, and acceptance criteria |
| `04_personas_journeys.md` | **Part 4** — Meera hero persona, 3 supporting personas, journey maps, JTBD framework |
| `05_user_flows.md` | **Part 5** — 14 user flows with happy paths, error paths, gestures, and microinteractions |
| `06_data_model.md` | **Part 6** — Full data model (TypeScript interfaces), Attention Engine pseudocode, worked examples, sync strategy |
| `07_design_system.md` | **Part 7** — Colour system, typography, spacing, components, screen blueprints, motion specs |
| `08_system_architecture.md` | **Part 8** — Client + server architecture, tech stack, API design, security, build order |
| `09_release_plan.md` | **Part 9** — Product definition levels, MVP gate (20 criteria), test cases, demo checklist, known limitations |
| `10_pitch_playbook.md` | **Part 10** — Story, 10 slides, 5-minute demo script, seed data spec, Q&A bank, recovery plans |

---

## Core Concept

**The Thread** is the central primitive — a living record of a professional relationship containing every capture, commitment, and event related to that relationship.

```
Thread
 ├── People (associated contacts)
 ├── Timeline (captures: notes, actions, decisions, questions)
 ├── Commitments (promises + due dates + owners)
 └── Brief (AI-generated context summary)
```

**The Attention Engine** computes a 0–100 score for every thread based on recency, open commitments, and going-cold signals — then surfaces the top 5 on the Today view with a plain-language explanation.

---

## Hackathon MVP Scope

For the hackathon, build these 8 features in this order:

1. **Today View** — Home screen, attention dashboard
2. **Thread List + Thread Detail** — Core workspace
3. **Quick Capture** — Global, frictionless note entry
4. **Commitments Tracker** — Promises with owners and due dates
5. **Attention Engine** — Rule-based score computation
6. **Going-Cold Detection** — Threshold-based cold alerts
7. **Where We Left Off** — AI thread summary (Brief tab)
8. **Pre-Meeting Brief** — AI context card before meetings

Then add if time permits:
- Brain Dump
- Smart Snooze
- Search

---

## Tech Stack (Recommended)

| Layer | Choice |
|---|---|
| Frontend | React 18 + TypeScript + Vite + Tailwind + Framer Motion |
| State | Zustand + Dexie.js (IndexedDB) |
| Backend | Node.js + Fastify + Drizzle ORM |
| Database | Supabase (hosted PostgreSQL) |
| Auth | Clerk |
| AI | OpenAI GPT-4o |
| Deploy | Railway (backend) + Vercel (frontend) |

---

## Spec Files Location

```
friday/
  ├── docs/          — All product documentation (this folder)
  ├── frontend/      — React + Vite frontend application
  └── backend/       — Node.js + Fastify backend server
```


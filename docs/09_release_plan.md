# Part 9: Release Plan, Definition of Done, and Quality Plan

---

## Product Definition Levels

Threadwise is defined at four levels of completeness to guide scope decisions at every phase.

### Level 0: Sketch (Concept Proven)
The core idea is demonstrable without a working product.
- Paper prototype or clickable Figma
- Enough to gather feedback on the concept
- Not shippable

### Level 1: Hackathon MVP (Story Told)
A working prototype that demonstrates the core loop with seed data.
- Today view, Thread detail, Quick Capture, Commitments, Pre-Meeting Brief, Going-Cold
- Seed data populates a compelling demo narrative
- AI features use real API calls (not mocked)
- No user auth required for demo (single hardcoded user)
- **Target: End of hackathon**

### Level 2: Private Beta (Core Loop Validated)
Shippable to 200 real users. Real data, real auth, real sync.
- Full CRUD for threads, captures, commitments, people
- Auth + per-user data isolation
- Offline support (IndexedDB)
- Push notifications
- iOS PWA installable
- **Target: Month 3**

### Level 3: Public Launch (Growth-Ready)
Polished enough for word-of-mouth and paid tiers.
- Browser Extension Companion
- Email digest
- Calendar integration (read)
- Onboarding flow
- Free/Pro tier gate
- **Target: Month 6**

### Level 4: Scale (Team-Ready)
Shared threads, team workspace, native mobile.
- Team tier
- Shared thread collaboration
- Admin panel
- Native iOS/Android
- **Target: Month 18**

---

## MVP Gate (Hackathon Definition of Done)

The following criteria must all be met for the hackathon submission to be considered complete.

### Functional Gates

| # | Criterion | Test Method |
|---|---|---|
| F1 | User can create a thread with a title and one associated person | Manual |
| F2 | User can add a Quick Capture to a thread | Manual |
| F3 | User can create a commitment with a due date | Manual |
| F4 | User can mark a commitment as complete | Manual |
| F5 | Today view shows the correct top 3 threads by attention score | Manual + seed data |
| F6 | Going-Cold threads appear in the Going Cold section | Manual + seed data |
| F7 | Pre-Meeting Brief generates and displays correctly | Manual + AI call |
| F8 | Attention score updates when a capture is added to a thread | Manual |
| F9 | Snooze removes a thread from Today view for the specified duration | Manual |
| F10 | Where We Left Off summary generates correctly for a populated thread | Manual + AI call |

### Quality Gates

| # | Criterion | Test Method |
|---|---|---|
| Q1 | App loads in < 2 seconds on a standard broadband connection | Chrome DevTools |
| Q2 | Quick Capture modal opens in < 300ms | Chrome DevTools performance panel |
| Q3 | No unhandled console errors during the demo flow | Chrome DevTools console |
| Q4 | App is usable on Chrome, Safari, and Firefox latest | Manual cross-browser |
| Q5 | All copy is spell-checked and consistent with the design system | Manual review |
| Q6 | Seed data tells a coherent story for the Meera persona | Narrative review |
| Q7 | AI summaries are factually consistent with the seed data | Manual + AI call |

### Demo Gates

| # | Criterion |
|---|---|
| D1 | The 5-minute demo script can be executed without errors |
| D2 | The demo works without internet access (local seed data fallback) |
| D3 | Fallback screenshots exist for every AI-dependent screen |

---

## Phased Release Plan

### Phase 0: Hackathon MVP (Week 1)

**Goal:** Working prototype for demo. Single-user, seed data, AI-powered key features.

| Feature | Priority | Owner | Status |
|---|---|---|---|
| Today View | P0 | FE | — |
| Thread List + Thread Detail | P0 | FE | — |
| Quick Capture | P0 | FE | — |
| Commitments Tracker | P0 | FE | — |
| Attention Engine (rule-based) | P0 | BE | — |
| Going-Cold Detection | P0 | BE | — |
| Pre-Meeting Brief (AI) | P0 | BE + AI | — |
| Where We Left Off (AI) | P0 | BE + AI | — |
| Seed Data | P0 | Design | — |
| Brain Dump | P1 | FE | — |
| Smart Snooze | P1 | FE | — |

### Phase 1: Private Beta (Months 1–3)

**Goal:** 200 real users, core loop validated, D7 retention ≥ 30%.

| Feature | Priority |
|---|---|
| Auth (Clerk) | P0 |
| Per-user data isolation | P0 |
| Offline support (IndexedDB) | P0 |
| Push notifications | P0 |
| People Directory (full) | P0 |
| Live Capture | P1 |
| Search | P1 |
| iOS PWA installable | P1 |
| Onboarding flow v1 | P1 |

### Phase 2: Public Launch (Months 4–6)

**Goal:** 2,000 Pro subscribers, public press coverage.

| Feature | Priority |
|---|---|
| Free/Pro tier gate | P0 |
| Browser Extension Companion | P0 |
| Email digest | P0 |
| Calendar integration (read) | P1 |
| Onboarding flow v2 | P1 |
| Referral program | P2 |
| Settings page | P1 |

### Phase 3: Scale (Months 7–18)

**Goal:** 15,000 paid users, Team tier launched.

| Feature | Priority |
|---|---|
| Shared threads | P0 |
| Team workspace | P0 |
| Admin panel | P0 |
| Native iOS/Android | P1 |
| Advanced AI (draft follow-ups) | P1 |
| Audit log | P2 |

---

## Test Cases

### Unit Test Coverage Targets

| Module | Target Coverage |
|---|---|
| Attention Engine (score computation) | 90% |
| Commitment urgency logic | 90% |
| Going-cold threshold evaluation | 90% |
| Capture smart detection (commitment pattern) | 80% |
| Sync conflict resolution | 80% |
| Date/time utilities | 95% |

### Key Unit Tests

**Attention Engine:**
```
Test: Snoozed thread always returns score 0
Test: Pinned thread score floor is 15 above equivalent non-pinned thread
Test: Thread with overdue commitment scores >= 20 from commitmentScore alone
Test: Thread beyond going-cold threshold gets full goingColdScore of 15
Test: Score is capped at 100 regardless of inputs
Test: Score recomputes correctly after commitment is completed
```

**Commitment Urgency:**
```
Test: Commitment with no due date returns 'green' indicator
Test: Commitment due in 25 hours returns 'amber' indicator
Test: Commitment due 1 hour ago returns 'red' indicator
Test: Completing a commitment removes it from urgency computation
```

**Going-Cold:**
```
Test: Thread with lastInteractionAt = now returns isGoingCold = false
Test: Thread with lastInteractionAt = threshold + 1 day returns isGoingCold = true
Test: Archived thread is excluded from going-cold evaluation
Test: Snoozed thread is excluded from going-cold during snooze period
```

### Integration Test Cases

**Core Loop:**
1. Create thread → Add capture → Create commitment → Mark complete → Verify timeline
2. Create thread → Add captures × 5 → Generate "Where We Left Off" → Verify sections
3. Set going-cold threshold to 3 days → Set lastInteractionAt to 4 days ago → Verify thread appears in Going Cold

**Offline:**
1. Disconnect network → Create capture → Reconnect → Verify capture synced to server
2. Create capture offline → Kill app → Reopen → Verify capture still in local store

**Notification:**
1. Create commitment with due date = now + 23h → Verify notification scheduled for now + 23h
2. Mark commitment complete → Verify notification cancelled

### Manual QA Checklist (Pre-Demo)

#### Smoke Tests
- [ ] App loads with seed data on Chrome latest
- [ ] App loads with seed data on Safari latest
- [ ] App loads with seed data on Firefox latest
- [ ] All tab navigation works
- [ ] Quick Capture opens and saves
- [ ] Thread detail all 4 tabs load
- [ ] Pre-Meeting Brief generates for seed thread

#### Edge Case Checks
- [ ] Empty state displays when no threads exist
- [ ] Archived thread does not appear in Today view
- [ ] Snoozed thread does not appear in Today view
- [ ] Duplicate person name warning triggers
- [ ] Offline banner appears when network disconnected
- [ ] AI error fallback displays when AI is unavailable

#### Accessibility Checks
- [ ] All interactive elements are keyboard-navigable
- [ ] Focus ring visible on all interactive elements
- [ ] Colour contrast meets WCAG AA (4.5:1 for normal text, 3:1 for large text)
- [ ] Screen reader announces modal open/close

---

## Demo Checklist

### Technical Readiness (30 minutes before demo)
- [ ] Seed data loaded and verified
- [ ] AI API key confirmed active and has quota
- [ ] App running in production build (not dev mode)
- [ ] Fallback screenshots prepared on phone/iPad
- [ ] Network connection tested (and hotspot as backup)
- [ ] Screen sharing / presentation mode tested
- [ ] Demo user account logged in and verified

### Content Readiness
- [ ] Demo script rehearsed at least twice
- [ ] "Wow moments" (Pre-Meeting Brief, Going Cold, Brain Dump) tested
- [ ] Q&A bank reviewed
- [ ] Recovery plans for each potential failure point known

---

## Known Limitations (Hackathon MVP)

| Limitation | Impact | Mitigation |
|---|---|---|
| Single user, no auth | Cannot show multi-user | Demo only; Auth added in Phase 1 |
| AI summaries are best-effort | May occasionally misrepresent context | Seed data is controlled; fallback visible |
| No real calendar integration | Pre-Meeting Brief uses hardcoded event | Presented as "when calendar is connected" |
| No real-time sync across devices | Changes don't propagate to a second device | Demo uses single device |
| No email/push notifications | Cannot demo notification flow live | Show notification screens as screenshots |
| Limited offline testing | IndexedDB may not be fully reliable | Demo on a reliable connection |


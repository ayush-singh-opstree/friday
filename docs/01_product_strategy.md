# Part 1: Product Strategy and Vision

## Executive Summary

Threadwise is a lightweight relationship-memory app for professionals who manage work through ongoing conversations, commitments, and follow-ups. It gives users a single place to hold the context of every important professional relationship — who said what, what was promised, and what needs to happen next — so nothing gets lost between meetings, emails, or chats.

The product is designed for the 10–50 ongoing-thread sweet spot: complex enough to need a system, small enough that a full CRM is overkill. The core primitive is the **thread** — a living record of a relationship or recurring context. Everything else (people, captures, commitments, attention signals) is organised around threads.

---

## 1. Problem Definition

### Surface Symptoms
- Follow-ups go stale because no one owns the reminder.
- Context lives in too many places: email threads, meeting notes, chat logs, sticky notes.
- Re-reading three months of Slack to recall "where we left off" wastes 10–20 minutes per conversation.
- Promises made in casual conversation are forgotten by both parties.
- Important relationships go cold without anyone noticing.

### Root Cause
There is no single *relationship memory layer* in a professional's toolstack. CRMs serve sales pipelines, not general professional relationships. Note-taking apps lack relational structure. Task managers lack conversational context. The gap is the connective tissue between conversation and action.

### Quantified Impact
- Knowledge workers spend an estimated 20% of their day searching for context they already have.
- 40% of follow-up failures are attributed to context loss, not intent loss.
- Relationship-driven roles (founders, consultants, account managers) report that "dropped balls" are the top source of professional embarrassment.

---

## 2. Vision

> **Threadwise makes professionals feel like they have a perfect memory.**

Five years from now, Threadwise is the ambient layer that surfaces exactly the right relationship context at exactly the right moment — before a meeting, during a call, or when a relationship is going cold — without the user having to ask.

The long-term vision extends to:
- Voice-first and wearable capture
- AI that drafts follow-up messages from thread context
- Team-level shared threads for account management
- Integration with calendar, email, and messaging as a read layer (not write)

---

## 3. Target Market

### Primary Segment: Independent Relationship Managers
Professionals who manage 10–50 active professional relationships without a team CRM. They need personal accountability, not pipeline management.

| Role | Pain Intensity | Willingness to Pay |
|---|---|---|
| Founders / Operators | Very High | High |
| Consultants | Very High | High |
| Freelancers | High | Medium |
| Account Managers | High | Medium–High |
| Product Managers | Medium | Medium |

### Beachhead Persona
**Meera** — Senior product consultant, 12 active client threads, 8 partnership threads, 30+ network contacts. Uses a combination of Notion, Gmail labels, and a physical notebook. Frustrated by context scatter and forgotten follow-ups.

### Market Size
- TAM: ~120 million knowledge workers globally managing relationship-driven work
- SAM: ~18 million who self-identify as needing a relationship-management tool but reject CRM complexity
- SOM (Year 1–2): ~150,000 activated users, 15,000 paid

---

## 4. Value Proposition

| Job To Be Done | Threadwise Solution |
|---|---|
| Remember what we discussed | Thread timeline with captures |
| Know what I promised | Commitments tracker with owner labels |
| Prepare for a meeting fast | Pre-Meeting Brief (1-tap context summary) |
| Notice when a relationship is going cold | Going-Cold Detection + smart nudges |
| Capture a thought before I forget it | Quick Capture — global, frictionless |
| Understand my day | Today view with prioritised attention items |

### Elevator Pitch
*"Threadwise is the relationship memory layer for professionals. It holds the context of every important conversation — what was said, what was promised, what needs to happen next — so you never drop the ball and never have to say 'Sorry, remind me where we left off.'"*

---

## 5. Differentiation

| Dimension | Threadwise | Notion | CRM (HubSpot) | Superhuman |
|---|---|---|---|---|
| Relationship-first structure | ✅ | ❌ (doc-first) | ✅ (pipeline-first) | ❌ (email-first) |
| Opinionated attention engine | ✅ | ❌ | ❌ | Partial |
| Frictionless capture | ✅ | Partial | ❌ | ❌ |
| Pre-meeting brief | ✅ | Manual | ❌ | ❌ |
| Going-cold detection | ✅ | ❌ | Partial | ❌ |
| Simplicity (no config) | ✅ | ❌ | ❌ | ✅ |

The key insight: existing tools make the user do the work of connecting people → conversations → commitments. Threadwise does that connective work automatically.

---

## 6. Business Model

### Pricing Tiers

| Tier | Price | Limits | Target |
|---|---|---|---|
| Free | $0/month | 5 active threads, 25 people, basic capture | Individuals trying the product |
| Pro | $12/month | Unlimited threads & people, AI features, extension | Power users |
| Team | $30/user/month | Shared threads, admin, audit log | Small teams (future) |

### Revenue Drivers
- Pro conversion from organic free-tier growth (content, word-of-mouth)
- Annual billing discount (2 months free) to improve LTV
- Team tier unlocks in Phase 3

### Unit Economics (Year 2 Target)
- CAC: $35 (content-led)
- LTV: $180 (15 months average retention × $12)
- LTV:CAC ratio: ~5.1x

---

## 7. Success Metrics

### North Star Metric
**Weekly Active Threads** — the number of distinct threads a user interacted with in the past 7 days. This measures whether Threadwise is actually embedded in the user's professional workflow, not just installed.

### Supporting Metrics

| Metric | Definition | Target (Month 6) |
|---|---|---|
| D7 Retention | % of users active 7 days after signup | ≥ 40% |
| D30 Retention | % of users active 30 days after signup | ≥ 22% |
| Captures per user per week | Average quick captures created | ≥ 5 |
| Commitments closed | % of commitments marked done within 7 days | ≥ 60% |
| Pre-Meeting Brief opens | % of meetings with a brief opened ≤ 30 min before | ≥ 35% |
| Going-Cold actions taken | % of cold alerts where user took action within 48h | ≥ 50% |

### Anti-Metrics (Things We Will Not Optimise)
- Total features shipped
- Number of integrations
- Time spent in app (we want low time-in-app, high value delivered)

---

## 8. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Users don't form capture habit | High | High | Frictionless global capture, Brain Dump mode, daily digest |
| AI summaries are inaccurate | Medium | High | Confidence scoring, human-readable source citations, easy correction |
| Privacy concerns about contact data | Medium | High | On-device processing option, clear data manifesto, no selling data |
| Feature creep turns it into a CRM | High | Medium | Hard product principle: no pipelines, no deals, no custom fields |
| Low willingness to pay at $12/month | Medium | High | Strong free tier for habit formation; proof-of-value before paywall |
| Goes cold detection causes anxiety | Low | Medium | User-configurable sensitivity, opt-out per thread |

---

## 9. Product Roadmap

### Phase 0 — Hackathon MVP (Week 1)
Goal: Prove the core loop works and tell a compelling story.
- Today view (attention dashboard)
- Threads list + thread detail
- Quick Capture
- Commitments tracker
- Pre-Meeting Brief (static generation)
- Going-Cold Detection (rule-based)
- Seed data for demo

### Phase 1 — Private Beta (Months 1–3)
Goal: Validate core retention with 200 invite-only users.
- Live Capture (in-meeting notes)
- Brain Dump mode
- Smart Snooze
- Where We Left Off (AI summary)
- Search
- iOS app (PWA)

### Phase 2 — Public Launch (Months 4–6)
Goal: 2,000 Pro subscribers.
- Browser Extension Companion
- Email digest
- Calendar integration (read-only)
- Notification system
- Onboarding flow refinement

### Phase 3 — Scale (Months 7–18)
Goal: Team tier, 15,000 paid users.
- Shared threads
- Team workspace
- Admin and audit log
- Advanced AI (draft follow-ups, meeting prep from calendar)
- Mobile (native iOS/Android)

---

## 10. Guiding Principles

1. **Relationship-first, task-second.** Tasks exist in the context of a relationship, not the other way around.
2. **Surface, don't require.** The user should never have to search for what needs attention — Threadwise should surface it.
3. **Friction is the enemy.** Every capture, every note, every check should take seconds, not minutes.
4. **Opinionated defaults.** We make the hard decisions so users don't have to configure their way to value.
5. **Privacy by design.** Relationship data is among the most sensitive a professional has. We treat it accordingly.
6. **No feature without a job.** Every feature must map to a specific job-to-be-done. If it doesn't, it doesn't ship.

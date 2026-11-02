/**
 * Seed dataset (docs/10_pitch_playbook.md -> seed data spec).
 *
 * Tells the Meera story from docs/04_personas_journeys.md:
 *   - Fintech Co. â€” urgent, one overdue commitment, one due tomorrow (pinned)
 *   - Investor Z â€” going cold, no open commitments
 *   - Design Partner â€” warm and healthy
 *   - Startup Y â€” going cold with an undated commitment
 *   - Helios Procurement â€” commitment due today
 *   - Bright Loop Retainer â€” archived
 *   - One Inbox capture so the Inbox state is visible
 */
import { DEFAULT_GOING_COLD_DAYS, DEFAULT_NOTIFICATION_PREFERENCES } from '@/config/constants'
import { isoTimestamp } from './clock'

export const DEMO_USER_ID = 'usr_meera'
export const DEMO_CREDENTIALS = {
  email: 'meera@demo.friday.app',
  password: 'friday',
}

/** A second demo account, used to prove per-user isolation. */
export const SECONDARY_CREDENTIALS = {
  email: 'arjun@demo.friday.app',
  password: 'friday',
}

export const DEFAULT_PROFILE = {
  fullName: 'Meera Krishnamurthy',
  plan: 'pro',
  role: 'owner',
  goingColdThresholdDays: 14,
}

const KNOWN_PROFILES = {
  [DEMO_CREDENTIALS.email]: DEFAULT_PROFILE,
  [SECONDARY_CREDENTIALS.email]: {
    fullName: 'Arjun Mehta',
    plan: 'pro',
    role: 'owner',
    goingColdThresholdDays: 14,
  },
}

/** Stable, readable userId derived from an email address. */
export function userIdForEmail(email) {
  const slug = String(email ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `usr_${slug || 'demo'}`
}

/**
 * Profile for an email. Unknown emails get a sensible name derived from the
 * local part so any address can sign in and still get a tidy workspace.
 */
export function profileForEmail(email) {
  const known = KNOWN_PROFILES[String(email ?? '').toLowerCase()]
  if (known) return known

  const local = String(email ?? '').split('@')[0] ?? ''
  const name = local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

  return { ...DEFAULT_PROFILE, fullName: name || 'Friday User' }
}

const TS = isoTimestamp()

const people = [
  { id: 'per_aditya', fullName: 'Aditya Rao', organisation: 'Fintech Co.', role: 'Head of Product', email: 'aditya@fintechco.example', linkedInUrl: 'https://www.linkedin.com/in/adityarao', notes: 'Preference: async updates. Decision maker for Q3 scope.' },
  { id: 'per_imran', fullName: 'Imran Qureshi', organisation: 'Fintech Co.', role: 'Engineering Manager', email: 'imran@fintechco.example' },
  { id: 'per_rahul', fullName: 'Rahul Menon', organisation: 'Aureus Capital', role: 'Principal', email: 'rahul@aureus.example', linkedInUrl: 'https://www.linkedin.com/in/rahulmenon', notes: 'Promised a warm intro to their Series A lead.' },
  { id: 'per_priya', fullName: 'Priya Nair', organisation: 'Northwind Studio', role: 'Design Lead', email: 'priya@northwind.example', linkedInUrl: 'https://www.linkedin.com/in/priyanair', notes: 'Open to a design-systems retainer.' },
  { id: 'per_kavya', fullName: 'Kavya Iyer', organisation: 'Startup Y', role: 'Founder & CEO', email: 'kavya@startupy.example' },
  { id: 'per_sandeep', fullName: 'Sandeep Verma', organisation: 'Helios Procurement', role: 'Procurement Manager', email: 'sandeep@helios.example' },
  { id: 'per_tara', fullName: 'Tara Bose', organisation: 'Formerly Bright Loop', role: 'Account Director', email: 'tara.bose@example.com' },
]

const threads = [
  { id: 'thr_fintech', title: 'Fintech Co. â€” Aditya', description: 'Q3 platform expansion. Budget approved; timeline and design review in flight.', status: 'active', isPinned: true, goingColdThresholdDays: DEFAULT_GOING_COLD_DAYS, lastInteractionAt: TS.days(-10) },
  { id: 'thr_investor', title: 'Investor Z â€” Rahul', description: 'Series A conversation. Waiting on the metrics pack before the next catch-up.', status: 'active', isPinned: false, goingColdThresholdDays: DEFAULT_GOING_COLD_DAYS, lastInteractionAt: TS.days(-22) },
  { id: 'thr_design', title: 'Design Partner â€” Priya', description: 'Design system partnership for the Q4 launch.', status: 'active', isPinned: false, goingColdThresholdDays: DEFAULT_GOING_COLD_DAYS, lastInteractionAt: TS.days(-2) },
  { id: 'thr_startupy', title: 'Startup Y â€” Kavya', description: 'Discovery workshops; scope not yet signed off.', status: 'active', isPinned: false, goingColdThresholdDays: DEFAULT_GOING_COLD_DAYS, lastInteractionAt: TS.days(-16) },
  { id: 'thr_helios', title: 'Helios Procurement â€” Sandeep', description: 'Vendor onboarding paperwork and security review.', status: 'active', isPinned: false, goingColdThresholdDays: 10, lastInteractionAt: TS.days(-5) },
  { id: 'thr_brightloop', title: 'Bright Loop Retainer', description: 'Legacy retainer, wrapped up last quarter.', status: 'archived', isPinned: false, goingColdThresholdDays: DEFAULT_GOING_COLD_DAYS, lastInteractionAt: TS.days(-95), archivedAt: TS.days(-88) },
]

const threadPeople = [
  { threadId: 'thr_fintech', personId: 'per_aditya' },
  { threadId: 'thr_fintech', personId: 'per_imran' },
  { threadId: 'thr_investor', personId: 'per_rahul' },
  { threadId: 'thr_design', personId: 'per_priya' },
  { threadId: 'thr_startupy', personId: 'per_kavya' },
  { threadId: 'thr_helios', personId: 'per_sandeep' },
  { threadId: 'thr_brightloop', personId: 'per_tara' },
]

const captures = [
  { id: 'cap_f1', threadId: 'thr_fintech', personId: 'per_aditya', type: 'note', content: 'Budget approved for the Q3 expansion. Aditya wants the rollout staged by region.', capturedAt: TS.days(-12) },
  { id: 'cap_f2', threadId: 'thr_fintech', personId: 'per_aditya', type: 'action', content: 'Aditya wants the API spec by Monday.', capturedAt: TS.days(-10) },
  { id: 'cap_f3', threadId: 'thr_fintech', personId: 'per_aditya', type: 'decision', content: 'Go with the staged migration approach rather than a hard cutover.', capturedAt: TS.days(-10) },
  { id: 'cap_f4', threadId: 'thr_fintech', personId: 'per_imran', type: 'question', content: 'Does the new spec cover the reconciliation edge cases Imran raised?', capturedAt: TS.days(-9) },
  { id: 'cap_f5', threadId: 'thr_fintech', personId: 'per_aditya', type: 'note', content: 'Scope sign-off for Q3 expected once the revised timeline lands.', capturedAt: TS.days(-10) },
  { id: 'cap_i1', threadId: 'thr_investor', personId: 'per_rahul', type: 'note', content: 'Rahul wants the metrics pack before committing to a second meeting.', capturedAt: TS.days(-27) },
  { id: 'cap_i2', threadId: 'thr_investor', personId: 'per_rahul', type: 'question', content: 'Worth asking about a warm intro to their Series A lead.', capturedAt: TS.days(-22) },
  { id: 'cap_d1', threadId: 'thr_design', personId: 'per_priya', type: 'note', content: 'Priya shared the token architecture draft â€” very close to ours.', capturedAt: TS.days(-4) },
  { id: 'cap_d2', threadId: 'thr_design', personId: 'per_priya', type: 'action', content: 'Send the component inventory so Priya can scope the retainer.', capturedAt: TS.days(-2) },
  { id: 'cap_s1', threadId: 'thr_startupy', personId: 'per_kavya', type: 'note', content: 'Kavya is weighing two vendors; pricing is the deciding factor.', capturedAt: TS.days(-18) },
  { id: 'cap_s2', threadId: 'thr_startupy', personId: 'per_kavya', type: 'action', content: 'Follow up on the discovery workshop recap.', capturedAt: TS.days(-16) },
  { id: 'cap_h1', threadId: 'thr_helios', personId: 'per_sandeep', type: 'note', content: 'Security questionnaire returned with two open items.', capturedAt: TS.days(-6) },
  { id: 'cap_h2', threadId: 'thr_helios', personId: 'per_sandeep', type: 'action', content: 'Send the SOC2 summary to Sandeep today.', capturedAt: TS.days(-5) },
  { id: 'cap_b1', threadId: 'thr_brightloop', personId: 'per_tara', type: 'note', content: 'Retainer wrapped; Tara will ping me if the budget returns.', capturedAt: TS.days(-95) },
  { id: 'cap_inbox1', threadId: null, personId: null, type: 'note', content: 'Look into the pricing teardown article Tara mentioned.', capturedAt: TS.hours(-9) },
]

const commitments = [
  { id: 'com_f1', threadId: 'thr_fintech', captureId: 'cap_f2', description: 'Send the updated delivery timeline', ownerType: 'me', status: 'open', dueDate: TS.days(-1), createdAt: TS.days(-10) },
  { id: 'com_f2', threadId: 'thr_fintech', description: 'Schedule the design review with Priya', ownerType: 'me', status: 'open', dueDate: TS.days(1), createdAt: TS.days(-9) },
  { id: 'com_f3', threadId: 'thr_fintech', description: 'Aditya to confirm the regional rollout order', ownerType: 'person', ownerPersonId: 'per_aditya', status: 'open', dueDate: TS.days(6), createdAt: TS.days(-10) },
  { id: 'com_f4', threadId: 'thr_fintech', description: 'Share the API spec with Imran', ownerType: 'me', status: 'completed', dueDate: TS.days(-7), completedAt: TS.days(-8), completionNote: 'Sent the spec over email.', createdAt: TS.days(-11) },
  { id: 'com_i1', threadId: 'thr_investor', description: 'Share the metrics pack with Rahul', ownerType: 'me', status: 'completed', dueDate: TS.days(-20), completedAt: TS.days(-21), createdAt: TS.days(-27) },
  { id: 'com_d1', threadId: 'thr_design', captureId: 'cap_d2', description: 'Send the component inventory', ownerType: 'me', status: 'open', dueDate: TS.days(10), createdAt: TS.days(-2) },
  { id: 'com_s1', threadId: 'thr_startupy', captureId: 'cap_s2', description: 'Follow up on the workshop recap', ownerType: 'me', status: 'open', createdAt: TS.days(-16) },
  { id: 'com_h1', threadId: 'thr_helios', captureId: 'cap_h2', description: 'Send the SOC2 summary', ownerType: 'me', status: 'open', dueDate: TS.today(), createdAt: TS.days(-5) },
  { id: 'com_b1', threadId: 'thr_brightloop', description: 'Send the final retainer invoice', ownerType: 'me', status: 'completed', dueDate: TS.days(-90), completedAt: TS.days(-91), createdAt: TS.days(-95) },
]

const summaries = [
  {
    id: 'sum_f1',
    threadId: 'thr_fintech',
    type: 'where_we_left_off',
    content: {
      lastContactDate: TS.days(-10),
      lastContactSummary:
        'Budget was approved for the Q3 expansion and we agreed on a staged, region-by-region rollout. Aditya is waiting on the revised delivery timeline before signing off scope.',
      keyTopics: ['Q3 budget approval', 'Staged regional rollout', 'Revised delivery timeline'],
      openCommitments: ['Send the updated delivery timeline', 'Schedule the design review with Priya'],
      nextSteps: ['Send the revised timeline today', 'Confirm the design review slot with Priya'],
      talkingPoints: ['Confirm the timeline after the scope change', 'Agree the design review date'],
    },
    sourceCaptures: ['cap_f1', 'cap_f2', 'cap_f3', 'cap_f5'],
    generatedAt: TS.days(-10),
    isStale: true,
  },
  {
    id: 'sum_f2',
    threadId: 'thr_fintech',
    type: 'pre_meeting_brief',
    content: {
      lastContactDate: TS.days(-10),
      lastContactSummary: 'Last conversation covered the approved Q3 budget and the staged rollout decision.',
      keyTopics: ['Q3 budget', 'Rollout staging'],
      openCommitments: ['Send the updated delivery timeline'],
      nextSteps: ['Open with the timeline', 'Ask about the regional order'],
      talkingPoints: [
        'Confirm the timeline after the scope change',
        'Discuss design review scheduling',
        'Ask about the reconciliation edge cases Imran raised',
      ],
    },
    sourceCaptures: ['cap_f1', 'cap_f2', 'cap_f3', 'cap_f4'],
    generatedAt: TS.hours(-3),
    isStale: false,
  },
]

/** Derive the thread timeline from captures, commitments and summaries. */
function buildTimeline() {
  const events = []

  for (const thread of threads) {
    events.push({
      id: `tl_${thread.id}_created`,
      threadId: thread.id,
      type: 'thread_created',
      referenceId: thread.id,
      metadata: { title: thread.title },
      occurredAt: TS.days(-120),
    })
  }

  for (const capture of captures) {
    if (!capture.threadId) continue
    events.push({
      id: `tl_${capture.id}`,
      threadId: capture.threadId,
      type: 'capture_added',
      referenceId: capture.id,
      metadata: { captureType: capture.type },
      occurredAt: capture.capturedAt,
    })
  }

  for (const commitment of commitments) {
    events.push({
      id: `tl_${commitment.id}_created`,
      threadId: commitment.threadId,
      type: 'commitment_created',
      referenceId: commitment.id,
      metadata: { description: commitment.description },
      occurredAt: commitment.createdAt,
    })
    if (commitment.status === 'completed' && commitment.completedAt) {
      events.push({
        id: `tl_${commitment.id}_done`,
        threadId: commitment.threadId,
        type: 'commitment_completed',
        referenceId: commitment.id,
        metadata: { description: commitment.description },
        occurredAt: commitment.completedAt,
      })
    }
  }

  for (const summary of summaries) {
    events.push({
      id: `tl_${summary.id}`,
      threadId: summary.threadId,
      type: 'summary_generated',
      referenceId: summary.id,
      metadata: { summaryType: summary.type },
      occurredAt: summary.generatedAt,
    })
  }

  return events.sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt))
}

/**
 * Fresh copy of the demo dataset. A brand-new object graph each call, so
 * "Reset demo data" in Settings is always a clean slate.
 */
export function createSeedData({ userId = DEMO_USER_ID, profile = DEFAULT_PROFILE } = {}) {
  return structuredClone({
    user: {
      id: userId,
      email: profile.email ?? DEMO_CREDENTIALS.email,
      fullName: profile.fullName ?? DEFAULT_PROFILE.fullName,
      plan: profile.plan ?? DEFAULT_PROFILE.plan,
      role: profile.role ?? DEFAULT_PROFILE.role,
      goingColdThresholdDays:
        profile.goingColdThresholdDays ?? DEFAULT_PROFILE.goingColdThresholdDays,
      digestTime: '08:00',
      digestEnabled: true,
      emailDigestEnabled: false,
      onboardingComplete: false,
      notificationPreferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
      createdAt: TS.days(-120),
      lastActiveAt: TS.now(),
    },
    people: people.map((person) => ({
      userId,
      notes: null,
      createdAt: TS.days(-110),
      updatedAt: TS.days(-20),
      ...person,
    })),
    threads: threads.map((thread) => ({
      userId,
      description: null,
      createdAt: TS.days(-120),
      updatedAt: thread.lastInteractionAt,
      ...thread,
    })),
    threadPeople: threadPeople.map((link) => ({ ...link, addedAt: TS.days(-110) })),
    captures: captures.map((capture) => ({
      userId,
      personId: null,
      source: 'manual',
      status: capture.threadId ? 'filed' : 'inbox',
      createdAt: capture.capturedAt,
      updatedAt: capture.capturedAt,
      isEdited: false,
      syncStatus: 'synced',
      ...capture,
    })),
    commitments: commitments.map((commitment) => ({
      userId,
      updatedAt: commitment.createdAt,
      ...commitment,
    })),
    timeline: buildTimeline(),
    summaries,
    snoozes: [],
    notifications: [],
  })
}

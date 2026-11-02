/**
 * JSDoc type definitions mirroring the Threadwise data model.
 * Kept in plain JS (this project is JavaScript, not TypeScript) so editors
 * still get intellisense via `@typedef`.
 *
 * Source of truth: docs/06_data_model.md
 */

/**
 * @typedef {'active' | 'archived'} ThreadStatus
 * @typedef {'note' | 'action' | 'decision' | 'question'} CaptureType
 * @typedef {'manual' | 'live_capture' | 'brain_dump' | 'extension'} CaptureSource
 * @typedef {'inbox' | 'filed'} CaptureStatus
 * @typedef {'me' | 'person'} CommitmentOwnerType
 * @typedef {'open' | 'completed'} CommitmentStatus
 * @typedef {'system' | 'light' | 'dark'} ThemeMode
 */

/**
 * @typedef {Object} Thread
 * @property {string} id
 * @property {string} userId
 * @property {string} title
 * @property {string} [description]
 * @property {ThreadStatus} status
 * @property {boolean} isPinned
 * @property {number} goingColdThresholdDays
 * @property {number} attentionScore
 * @property {string} lastInteractionAt ISO timestamp
 * @property {string} createdAt ISO timestamp
 * @property {string} updatedAt ISO timestamp
 * @property {string} [archivedAt] ISO timestamp
 * @property {string} [attentionReason] Server-computed plain-language reason
 */

/**
 * @typedef {Object} Person
 * @property {string} id
 * @property {string} userId
 * @property {string} fullName
 * @property {string} [organisation]
 * @property {string} [role]
 * @property {string} [email]
 * @property {string} [phone]
 * @property {string} [linkedInUrl]
 * @property {string} [notes]
 * @property {string} createdAt ISO timestamp
 * @property {string} updatedAt ISO timestamp
 */

/**
 * @typedef {Object} ThreadPerson
 * @property {string} threadId
 * @property {string} personId
 * @property {string} addedAt ISO timestamp
 */

/**
 * @typedef {Object} Capture
 * @property {string} id
 * @property {string} userId
 * @property {string | null} threadId Null means the Inbox
 * @property {string | null} personId
 * @property {CaptureType} type
 * @property {string} content
 * @property {CaptureSource} source
 * @property {CaptureStatus} status
 * @property {string} capturedAt ISO timestamp
 * @property {string} createdAt ISO timestamp
 * @property {string} updatedAt ISO timestamp
 * @property {boolean} isEdited
 * @property {string} [editedAt] ISO timestamp
 * @property {'synced' | 'pending_sync' | 'failed'} [syncStatus]
 */

/**
 * @typedef {Object} Commitment
 * @property {string} id
 * @property {string} userId
 * @property {string} threadId
 * @property {string} [captureId]
 * @property {string} description
 * @property {CommitmentOwnerType} ownerType
 * @property {string} [ownerPersonId]
 * @property {CommitmentStatus} status
 * @property {string} [dueDate] ISO timestamp
 * @property {string} [completedAt] ISO timestamp
 * @property {string} [completionNote]
 * @property {string} createdAt ISO timestamp
 * @property {string} updatedAt ISO timestamp
 */

/**
 * @typedef {Object} TimelineEvent
 * @property {string} id
 * @property {string} threadId
 * @property {string} userId
 * @property {'capture_added' | 'commitment_created' | 'commitment_completed' | 'person_added' | 'person_removed' | 'thread_created' | 'summary_generated' | 'brief_opened'} type
 * @property {string} [referenceId]
 * @property {Record<string, unknown>} metadata
 * @property {string} occurredAt ISO timestamp
 */

/**
 * @typedef {Object} SummaryContent
 * @property {string} lastContactDate ISO timestamp
 * @property {string} lastContactSummary
 * @property {string[]} keyTopics Max 3
 * @property {string[]} openCommitments
 * @property {string[]} nextSteps Max 2
 * @property {string[]} [talkingPoints]
 */

/**
 * @typedef {Object} Summary
 * @property {string} id
 * @property {string} threadId
 * @property {string} userId
 * @property {'where_we_left_off' | 'pre_meeting_brief'} type
 * @property {SummaryContent} content
 * @property {string[]} sourceCaptures Capture IDs used
 * @property {string} generatedAt ISO timestamp
 * @property {boolean} isStale
 */

/**
 * @typedef {Object} SnoozeRecord
 * @property {string} id
 * @property {string} userId
 * @property {'thread' | 'commitment'} targetType
 * @property {string} targetId
 * @property {string} snoozeUntil ISO timestamp
 * @property {string} createdAt ISO timestamp
 */

/**
 * @typedef {Object} NotificationPreferences
 * @property {boolean} dailyDigest
 * @property {boolean} commitmentDue
 * @property {boolean} goingCold
 * @property {boolean} preMeetingBrief
 * @property {boolean} reengagementDigest
 */

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} email
 * @property {string} fullName
 * @property {string} [avatarUrl]
 * @property {'free' | 'pro' | 'team'} plan
 * @property {'owner' | 'member' | 'viewer'} role
 * @property {number} goingColdThresholdDays
 * @property {string} digestTime HH:MM
 * @property {boolean} digestEnabled
 * @property {boolean} emailDigestEnabled
 * @property {NotificationPreferences} notificationPreferences
 * @property {string} createdAt ISO timestamp
 * @property {string} lastActiveAt ISO timestamp
 */

/**
 * @typedef {Object} Session
 * @property {string} accessToken
 * @property {string} [refreshToken]
 * @property {string} [expiresAt] ISO timestamp
 * @property {User} user
 */

/**
 * Context extracted from the page currently open in the browser. Per
 * Feature 13 the extension only ever reads a display name, an optional email
 * and the page URL - never page body content.
 *
 * @typedef {Object} PageContext
 * @property {string} url
 * @property {'linkedin' | 'gmail' | null} source
 * @property {string | null} name
 * @property {string | null} email
 * @property {string | null} organisation
 * @property {string | null} role
 */

/**
 * @typedef {Object} DetectedMatch
 * @property {'matched' | 'unmatched' | 'unknown'} state
 * @property {Person | null} person
 * @property {Thread[]} threads
 * @property {Commitment[]} commitments
 * @property {number} confidence
 */

export {}

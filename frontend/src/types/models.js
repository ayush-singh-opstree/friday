/**
 * Data-model contract.
 *
 * Plain-JS `@typedef`s mirroring docs/06_data_model.md so editors still provide
 * intellisense without a TypeScript build step. The same contract is shared with
 * the browser extension through the REST API.
 *
 * @typedef {'active' | 'archived'} ThreadStatus
 * @typedef {'note' | 'action' | 'decision' | 'question'} CaptureType
 * @typedef {'manual' | 'live_capture' | 'brain_dump' | 'extension'} CaptureSource
 * @typedef {'inbox' | 'filed'} CaptureStatus
 * @typedef {'me' | 'person'} CommitmentOwnerType
 * @typedef {'open' | 'completed'} CommitmentStatus
 * @typedef {'system' | 'light' | 'dark'} ThemeMode
 * @typedef {'free' | 'pro' | 'team'} Plan
 * @typedef {'owner' | 'member' | 'viewer'} Role
 * @typedef {'synced' | 'pending_sync' | 'failed'} SyncStatus
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
 * @property {number} attentionScore Server-computed 0-100
 * @property {string} [attentionReason] Server-computed plain-language reason
 * @property {number} [openCommitmentCount]
 * @property {boolean} [isGoingCold]
 * @property {string} [snoozedUntil] ISO timestamp
 * @property {Array<{id: string, fullName: string, organisation?: string|null}>} [people]
 * @property {string} lastInteractionAt ISO timestamp
 * @property {string} createdAt ISO timestamp
 * @property {string} updatedAt ISO timestamp
 * @property {string} [archivedAt] ISO timestamp
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
 * @property {number} [threadCount]
 * @property {number} [openCommitmentCount]
 * @property {Array<{id: string, title: string}>} [threads]
 * @property {string} createdAt ISO timestamp
 * @property {string} updatedAt ISO timestamp
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
 * @property {SyncStatus} [syncStatus]
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
 * @property {{id: string, fullName: string} | null} [ownerPerson]
 * @property {CommitmentStatus} status
 * @property {string} [dueDate] ISO timestamp
 * @property {string} [completedAt] ISO timestamp
 * @property {string} [completionNote]
 * @property {'overdue'|'soon'|'ok'} [urgency] Server-computed
 * @property {string} [threadTitle]
 * @property {string} createdAt ISO timestamp
 * @property {string} updatedAt ISO timestamp
 */

export {}

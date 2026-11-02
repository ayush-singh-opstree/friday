/**
 * Additional model definitions: timeline, summaries, notifications, session.
 * Split from `models.js` to keep each file a readable size.
 *
 * @typedef {Object} TimelineEvent
 * @property {string} id
 * @property {string} threadId
 * @property {string} userId
 * @property {'capture_added'|'commitment_created'|'commitment_completed'|'person_added'|'person_removed'|'thread_created'|'summary_generated'|'brief_opened'} type
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
 * @property {'where_we_left_off'|'pre_meeting_brief'} type
 * @property {SummaryContent} content
 * @property {string[]} sourceCaptures Capture ids used
 * @property {string} generatedAt ISO timestamp
 * @property {boolean} isStale
 */

/**
 * @typedef {Object} SnoozeRecord
 * @property {string} id
 * @property {string} userId
 * @property {'thread'|'commitment'} targetType
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
 * @property {Plan} plan
 * @property {Role} role
 * @property {number} goingColdThresholdDays
 * @property {string} digestTime HH:MM
 * @property {boolean} digestEnabled
 * @property {boolean} emailDigestEnabled
 * @property {boolean} [onboardingComplete]
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
 * Payload returned by `GET /attention/today` - the Today view contract.
 *
 * @typedef {Object} TodayPayload
 * @property {string} generatedAt ISO timestamp
 * @property {Thread[]} topThreads Up to 5, ranked by attention score
 * @property {Commitment[]} dueToday
 * @property {Commitment[]} overdue
 * @property {Thread[]} goingCold
 * @property {Array<{id: string, title: string, startsAt: string, threadId?: string}>} upcoming
 * @property {number} inboxCount
 */

export {}

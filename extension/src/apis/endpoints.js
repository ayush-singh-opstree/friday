/**
 * REST endpoint map.
 *
 * Mirrors the API design in docs/08_system_architecture.md exactly, so the
 * frontend team and the backend team share one contract. Path builders are
 * plain functions to keep resource ids explicit at the call site.
 */
export const ENDPOINTS = Object.freeze({
  auth: {
    login: () => '/auth/login',
    logout: () => '/auth/logout',
    me: () => '/auth/me',
  },

  threads: {
    list: () => '/threads',
    create: () => '/threads',
    detail: (threadId) => `/threads/${threadId}`,
    update: (threadId) => `/threads/${threadId}`,
    remove: (threadId) => `/threads/${threadId}`,
    archive: (threadId) => `/threads/${threadId}/archive`,
    restore: (threadId) => `/threads/${threadId}/restore`,
    snooze: (threadId) => `/threads/${threadId}/snooze`,
  },

  captures: {
    list: () => '/captures',
    create: () => '/captures',
    update: (captureId) => `/captures/${captureId}`,
    remove: (captureId) => `/captures/${captureId}`,
    assign: (captureId) => `/captures/${captureId}/assign`,
  },

  commitments: {
    list: () => '/commitments',
    create: () => '/commitments',
    update: (commitmentId) => `/commitments/${commitmentId}`,
    complete: (commitmentId) => `/commitments/${commitmentId}/complete`,
  },

  people: {
    list: () => '/people',
    create: () => '/people',
    detail: (personId) => `/people/${personId}`,
    update: (personId) => `/people/${personId}`,
    remove: (personId) => `/people/${personId}`,
    merge: () => '/people/merge',
  },

  ai: {
    summarise: (threadId) => `/ai/summarise/${threadId}`,
    brief: (threadId) => `/ai/brief/${threadId}`,
    classify: () => '/ai/classify',
  },

  attention: {
    today: () => '/attention/today',
    recompute: (threadId) => `/attention/recompute/${threadId}`,
  },

  search: () => '/search',

  sync: {
    pull: () => '/sync',
    push: () => '/sync/batch',
  },

  notifications: {
    list: () => '/notifications',
    read: (notificationId) => `/notifications/${notificationId}/read`,
    preferences: () => '/notifications/preferences',
  },
})

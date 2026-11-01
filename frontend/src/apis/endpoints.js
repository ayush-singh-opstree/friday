/**
 * REST endpoint map.
 *
 * Mirrors docs/08_system_architecture.md exactly. This module is the written
 * contract between the web app, the Phase 2 browser extension and the backend.
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
    detail: (id) => `/threads/${id}`,
    update: (id) => `/threads/${id}`,
    remove: (id) => `/threads/${id}`,
    archive: (id) => `/threads/${id}/archive`,
    restore: (id) => `/threads/${id}/restore`,
    snooze: (id) => `/threads/${id}/snooze`,
  },

  captures: {
    list: () => '/captures',
    create: () => '/captures',
    update: (id) => `/captures/${id}`,
    remove: (id) => `/captures/${id}`,
    assign: (id) => `/captures/${id}/assign`,
  },

  commitments: {
    list: () => '/commitments',
    create: () => '/commitments',
    update: (id) => `/commitments/${id}`,
    complete: (id) => `/commitments/${id}/complete`,
    reopen: (id) => `/commitments/${id}/reopen`,
  },

  people: {
    list: () => '/people',
    create: () => '/people',
    detail: (id) => `/people/${id}`,
    update: (id) => `/people/${id}`,
    remove: (id) => `/people/${id}`,
    merge: () => '/people/merge',
  },

  ai: {
    summarise: (threadId) => `/ai/summarise/${threadId}`,
    brief: (threadId) => `/ai/brief/${threadId}`,
    classify: () => '/ai/classify',
    draftFollowUp: (threadId) => `/ai/draft-follow-up/${threadId}`,
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
    read: (id) => `/notifications/${id}/read`,
    preferences: () => '/notifications/preferences',
    subscribe: () => '/notifications/subscribe',
  },
})

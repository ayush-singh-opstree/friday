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
    // Audit-trail feed (backend routers/threads.py -> GET /threads/{id}/timeline)
    timeline: (id) => `/threads/${id}/timeline`,
    // Thread <-> person links (backend routers/people.py -> threads_people_router)
    people: (id) => `/threads/${id}/people`,
    person: (id, personId) => `/threads/${id}/people/${personId}`,
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
    threads: (id) => `/people/${id}/threads`,
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

  // Mirrors backend routers/notifications.py exactly (Feature 14).
  notifications: {
    list: () => '/notifications',
    create: () => '/notifications',
    read: (id) => `/notifications/${id}/read`,
    readAll: () => '/notifications/read-all',
    remove: (id) => `/notifications/${id}`,
    preferences: () => '/notifications/preferences',
    // Evaluate background triggers (commitments due < 24h, going-cold threads)
    // and materialise new in-app notifications server-side.
    checkTriggers: () => '/notifications/check-triggers',
  },
})

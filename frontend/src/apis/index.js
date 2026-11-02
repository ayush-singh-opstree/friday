/**
 * API layer barrel. Stores and hooks import from here so the transport stays an
 * implementation detail (mock dataset today, REST tomorrow).
 */
export { apiRequest, http } from './client'
export { ENDPOINTS } from './endpoints'
export { authApi } from './auth.api'
export { threadsApi, capturesApi } from './threads.api'
export { commitmentsApi } from './commitments.api'
export { clubsApi } from './clubs.api'
export { peopleApi } from './people.api'
export { attentionApi, aiApi, searchApi, syncApi, notificationsApi } from './attention.api'

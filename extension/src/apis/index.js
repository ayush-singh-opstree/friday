/**
 * Single entry point for the API layer.
 *
 * Every store and hook imports from here so the transport (mock today, REST
 * tomorrow) stays an implementation detail.
 */
export { apiRequest, http } from './client'
export { ENDPOINTS } from './endpoints'
export { authApi } from './auth.api'
export { threadsApi } from './threads.api'
export { peopleApi } from './people.api'
export { capturesApi } from './captures.api'
export { commitmentsApi } from './commitments.api'
export { attentionApi, aiApi, searchApi } from './attention.api'

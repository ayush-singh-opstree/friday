/** Error raised by the API layer. Carries the HTTP status and raw payload. */
export class ApiError extends Error {
  /**
   * @param {string} message
   * @param {{ status?: number, code?: string, details?: unknown }} [options]
   */
  constructor(message, { status = 0, code = 'api_error', details } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }

  /** True when the request never reached the server (offline / DNS / CORS). */
  get isNetworkError() {
    return this.status === 0
  }

  get isUnauthorized() {
    return this.status === 401 || this.status === 403
  }

  get isNotFound() {
    return this.status === 404
  }
}

/** Error raised when the user is not authenticated for a protected action. */
export class AuthError extends Error {
  constructor(message = 'You need to sign in to Threadwise to continue.') {
    super(message)
    this.name = 'AuthError'
  }
}

/** Error raised when a plan/role gate blocks an action. */
export class AuthorizationError extends Error {
  /**
   * @param {string} capability
   * @param {string} message
   */
  constructor(capability, message = 'Your current plan does not include this feature.') {
    super(message)
    this.name = 'AuthorizationError'
    this.capability = capability
  }
}

/** Normalise anything thrown into an Error with a safe user-facing message. */
export function toError(error) {
  if (error instanceof Error) return error
  return new Error(typeof error === 'string' ? error : 'Something went wrong.')
}

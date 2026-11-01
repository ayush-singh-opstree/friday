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

  /** The request never reached the server (offline / DNS / CORS). */
  get isNetworkError() {
    return this.status === 0
  }

  get isUnauthorized() {
    return this.status === 401 || this.status === 403
  }

  get isNotFound() {
    return this.status === 404
  }

  get isValidation() {
    return this.status === 422
  }
}

/** The user must sign in before the action can proceed. */
export class AuthError extends Error {
  constructor(message = 'Please sign in to continue.') {
    super(message)
    this.name = 'AuthError'
  }
}

/** A plan or role gate blocked the action. */
export class AuthorizationError extends Error {
  /**
   * @param {string} capability
   * @param {string} [message]
   */
  constructor(capability, message = 'Your current plan does not include this feature.') {
    super(message)
    this.name = 'AuthorizationError'
    this.capability = capability
  }
}

/** A quota (e.g. Free tier thread limit) was exceeded. */
export class LimitError extends Error {
  /**
   * @param {string} resource
   * @param {number} limit
   */
  constructor(resource, limit) {
    super(`You've reached the ${resource} limit on the Free plan (${limit}).`)
    this.name = 'LimitError'
    this.resource = resource
    this.limit = limit
  }
}

/** Normalise anything thrown into an Error with a safe, user-facing message. */
export function toError(error) {
  if (error instanceof Error) return error
  return new Error(typeof error === 'string' ? error : 'Something went wrong.')
}

/** Best-effort user-facing message for any thrown value. */
export function errorMessage(error, fallback = 'Something went wrong.') {
  const normalised = toError(error)
  return normalised.message || fallback
}

/**
 * Standardized error handling for DSH plugins.
 * Maps upstream API errors to model-friendly error messages.
 */

/** Known plugin error codes. */
export const PluginErrorCode = {
  AUTH_FAILED: 'AUTH_FAILED',
  RATE_LIMITED: 'RATE_LIMITED',
  UPSTREAM_ERROR: 'UPSTREAM_ERROR',
  TIMEOUT: 'TIMEOUT',
  INVALID_PARAMS: 'INVALID_PARAMS',
  NOT_FOUND: 'NOT_FOUND',
  FORBIDDEN: 'FORBIDDEN',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
} as const

export type PluginErrorCode = (typeof PluginErrorCode)[keyof typeof PluginErrorCode]

/** Structured plugin error with a machine-readable code. */
export class PluginError extends Error {
  readonly code: PluginErrorCode
  readonly statusCode?: number
  readonly upstreamBody?: string

  constructor(code: PluginErrorCode, message: string, statusCode?: number, upstreamBody?: string) {
    super(message)
    this.name = 'PluginError'
    this.code = code
    this.statusCode = statusCode
    this.upstreamBody = upstreamBody
  }
}

/** Map HTTP status codes to plugin error codes. */
function httpStatusToCode(status: number): PluginErrorCode {
  if (status === 401 || status === 403) return PluginErrorCode.AUTH_FAILED
  if (status === 429) return PluginErrorCode.RATE_LIMITED
  if (status === 404) return PluginErrorCode.NOT_FOUND
  if (status === 408 || status === 504) return PluginErrorCode.TIMEOUT
  if (status >= 500) return PluginErrorCode.UPSTREAM_ERROR
  return PluginErrorCode.UPSTREAM_ERROR
}

/**
 * Handle an upstream API error and return a model-friendly error message.
 * The error is thrown as a PluginError so the tool execution pipeline can
 * present a structured error to the model.
 */
export function handleUpstreamError(
  err: unknown,
  toolName: string,
  context?: string,
): never {
  if (err instanceof PluginError) throw err

  if (err instanceof DOMException && err.name === 'AbortError') {
    throw new PluginError(
      PluginErrorCode.TIMEOUT,
      `${toolName}: request timed out${context ? ` while ${context}` : ''}.`,
    )
  }

  const message = err instanceof Error ? err.message : String(err)

  // Try to extract HTTP status from error message
  const httpMatch = message.match(/^HTTP (\d{3}):/)
  if (httpMatch) {
    const status = parseInt(httpMatch[1], 10)
    const code = httpStatusToCode(status)
    throw new PluginError(
      code,
      `${toolName}: upstream API returned ${status}${context ? ` while ${context}` : ''}.`,
      status,
      message,
    )
  }

  throw new PluginError(
    PluginErrorCode.UPSTREAM_ERROR,
    `${toolName}: ${message}${context ? ` (${context})` : ''}.`,
  )
}
/**
 * Standardized HTTP fetch client with retry, timeout, and error handling
 * for DSH plugins calling upstream APIs.
 */

export interface FetchClientOptions {
  /** Base URL for the upstream API. */
  baseUrl: string
  /** Default timeout in milliseconds. */
  timeoutMs?: number
  /** Maximum number of retries on transient errors. */
  maxRetries?: number
  /** Additional headers to include in every request. */
  defaultHeaders?: Record<string, string>
}

export interface FetchClient {
  /** Perform a GET request. */
  get<T = unknown>(path: string, signal?: AbortSignal): Promise<T>
  /** Perform a POST request with JSON body. */
  post<T = unknown>(path: string, body: unknown, signal?: AbortSignal): Promise<T>
  /** Perform a raw fetch with full control. */
  fetch(path: string, init?: RequestInit): Promise<Response>
}

/** Create a fetch client with retry, timeout, and base URL resolution. */
export function createFetchClient(options: FetchClientOptions): FetchClient {
  const baseUrl = options.baseUrl.replace(/\/$/, '')
  const timeoutMs = options.timeoutMs ?? 30_000
  const maxRetries = options.maxRetries ?? 2
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.defaultHeaders,
  }

  async function doFetch(path: string, init?: RequestInit): Promise<Response> {
    const url = `${baseUrl}${path}`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    // Merge external signal if provided
    const externalSignal = init?.signal
    if (externalSignal) {
      externalSignal.addEventListener('abort', () => controller.abort())
    }

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
        headers: {
          ...defaultHeaders,
          ...init?.headers as Record<string, string>,
        },
      })
      return response
    } finally {
      clearTimeout(timeout)
    }
  }

  async function request<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    let lastError: Error | undefined

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const init: RequestInit = {
          method,
          signal,
        }
        if (body !== undefined) {
          init.body = JSON.stringify(body)
        }
        const response = await doFetch(path, init)

        if (!response.ok) {
          const text = await response.text().catch(() => '')
          throw new Error(`HTTP ${response.status}: ${text.slice(0, 500)}`)
        }

        return (await response.json()) as T
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err))

        // Don't retry on abort or 4xx errors
        if (err instanceof DOMException && err.name === 'AbortError') {
          throw lastError
        }
        if (lastError.message.startsWith('HTTP 4')) {
          throw lastError
        }
        // Only retry on last attempt
        if (attempt === maxRetries) {
          throw lastError
        }
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 500))
      }
    }

    throw lastError!
  }

  return {
    get<T = unknown>(path: string, signal?: AbortSignal): Promise<T> {
      return request<T>('GET', path, undefined, signal)
    },
    post<T = unknown>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
      return request<T>('POST', path, body, signal)
    },
    fetch(path: string, init?: RequestInit): Promise<Response> {
      return doFetch(path, init)
    },
  }
}
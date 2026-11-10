/**
 * Shared SandBase request path.
 *
 * Models and data APIs run through `POST /v1/run` with a flat body
 * `{ model, ...input }`. Fast runs answer synchronously with
 * `{ id, model, status: 'completed', output, outputs }`; slow runs answer with
 * a pending status and are polled via `GET /v1/run/{id}`. Chat models use the
 * OpenAI-compatible `POST /v1/chat/completions`.
 */

import type { Context } from '@deepseek-ai/cordis'
import { resolveCredential } from './credential-resolver.ts'
import { createFetchClient } from './fetch-client.ts'
import { PluginError, PluginErrorCode, handleUpstreamError } from './error-handler.ts'

export const SANDBASE_BASE_URL = 'https://api.sandbase.ai'

/** One entry of a run's `outputs` (`url` for media, `value` for text, `data` for JSON APIs). */
export interface SandbaseRunOutput {
  type?: string
  url?: string
  value?: unknown
  data?: unknown
  [key: string]: unknown
}

/** Run object returned by `POST /v1/run` and `GET /v1/run/{id}`. */
export interface SandbaseRunResult {
  id?: string
  status?: string
  model?: string
  output?: unknown
  outputs?: SandbaseRunOutput[]
  error?: unknown
  [key: string]: unknown
}

export interface RunSandbaseModelOptions {
  /** Tool name used in error messages. */
  toolName: string
  /** SandBase model / API id, e.g. `scholar/search-web`. */
  model: string
  /** Input fields sent flat next to `model`; `undefined`, `null` and `''` are dropped. */
  input?: Record<string, unknown>
  /** Overall budget for submit plus polling. */
  timeoutMs?: number
  /** First poll delay; later polls back off up to 5 s. */
  pollIntervalMs?: number
  signal?: AbortSignal
  baseUrl?: string
}

const PENDING = new Set(['pending', 'queued', 'processing', 'running', 'starting', 'in_progress'])
const FAILED = new Set(['failed', 'timeout', 'canceled', 'cancelled', 'error'])
const MAX_POLL_INTERVAL_MS = 5_000

function stripEmpty(input: Record<string, unknown> = {}): Record<string, unknown> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined && value !== null && value !== ''))
}

function errorText(error: unknown): string {
  if (!error) return 'no error details'
  if (typeof error === 'string') return error
  if (typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message
  return JSON.stringify(error)
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'))
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    function onAbort() {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function checkTerminal(toolName: string, run: SandbaseRunResult): void {
  const status = run.status?.toLowerCase()
  if (status && FAILED.has(status)) {
    throw new PluginError(
      PluginErrorCode.UPSTREAM_ERROR,
      `${toolName}: SandBase run${run.id ? ` ${run.id}` : ''} ${status}: ${errorText(run.error)}`,
    )
  }
}

/**
 * Run a SandBase model or data API and wait for its result.
 * When `timeoutMs` elapses while the run is still pending, the pending run
 * (`id`, `status`) is returned so the caller can report it instead of failing.
 */
export async function runSandbaseModel(ctx: Context, options: RunSandbaseModelOptions): Promise<SandbaseRunResult> {
  const { toolName, model, signal } = options
  const timeoutMs = options.timeoutMs ?? 30_000
  const baseUrl = options.baseUrl ?? SANDBASE_BASE_URL
  const deadline = Date.now() + timeoutMs
  try {
    const apiKey = await resolveCredential(ctx, 'sandbase', 'api_key')
    const headers = { Authorization: `Bearer ${apiKey}` }
    // Never retry the submit: a retried 5xx could start (and bill) a second run.
    const submitClient = createFetchClient({ baseUrl, timeoutMs, maxRetries: 0, defaultHeaders: headers })
    let run = await submitClient.post<SandbaseRunResult>('/v1/run', { model, ...stripEmpty(options.input) }, signal)
    checkTerminal(toolName, run)
    if (!run.id || !PENDING.has(String(run.status).toLowerCase())) return run

    const pollClient = createFetchClient({ baseUrl, timeoutMs: Math.min(timeoutMs, 30_000), defaultHeaders: headers })
    let delay = options.pollIntervalMs ?? 2_000
    while (PENDING.has(String(run.status).toLowerCase())) {
      const remaining = deadline - Date.now()
      if (remaining <= 0) return { id: run.id, status: run.status, model: run.model ?? model }
      await sleep(Math.min(delay, remaining), signal)
      delay = Math.min(Math.round(delay * 1.5), MAX_POLL_INTERVAL_MS)
      const polled = await pollClient.get<SandbaseRunResult>(`/v1/run/${encodeURIComponent(run.id!)}`, signal)
      run = { ...polled, id: polled.id ?? run.id }
      checkTerminal(toolName, run)
    }
    return run
  } catch (err) {
    handleUpstreamError(err, toolName)
  }
}

export interface SandbaseChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface SandbaseChatOptions {
  toolName: string
  /** Chat model id, e.g. `deepseek/deepseek-v4-pro`. */
  model: string
  messages: SandbaseChatMessage[]
  maxTokens?: number
  temperature?: number
  timeoutMs?: number
  signal?: AbortSignal
  baseUrl?: string
}

export interface SandbaseChatResult {
  content: string
  /** Reasoning text returned by reasoning models (`reasoning_content`). */
  reasoning?: string
  finishReason?: string
  model?: string
}

interface ChatCompletionResponse {
  model?: string
  choices?: Array<{ finish_reason?: string; message?: { content?: string | null; reasoning_content?: string | null } }>
}

/** Call an OpenAI-compatible SandBase chat model. */
export async function sandbaseChat(ctx: Context, options: SandbaseChatOptions): Promise<SandbaseChatResult> {
  const { toolName } = options
  try {
    const apiKey = await resolveCredential(ctx, 'sandbase', 'api_key')
    const client = createFetchClient({
      baseUrl: options.baseUrl ?? SANDBASE_BASE_URL,
      timeoutMs: options.timeoutMs ?? 120_000,
      maxRetries: 0,
      defaultHeaders: { Authorization: `Bearer ${apiKey}` },
    })
    const data = await client.post<ChatCompletionResponse>('/v1/chat/completions', {
      model: options.model,
      messages: options.messages,
      max_tokens: options.maxTokens,
      temperature: options.temperature,
    }, options.signal)
    const choice = data?.choices?.[0]
    return {
      content: choice?.message?.content ?? '',
      reasoning: choice?.message?.reasoning_content || undefined,
      finishReason: choice?.finish_reason,
      model: data?.model,
    }
  } catch (err) {
    handleUpstreamError(err, toolName)
  }
}

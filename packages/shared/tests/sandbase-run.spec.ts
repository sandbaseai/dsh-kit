import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { PluginError } from '../src/error-handler.ts'
import { runSandbaseModel, sandbaseChat } from '../src/sandbase-run.ts'

const ctx = { get: () => undefined } as unknown as Context

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.stubEnv('SANDBASE_API_KEY', 'test-key')
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('runSandbaseModel', () => {
  it('posts a flat body with the model and returns a sync result', async () => {
    const completed = { id: 'r1', model: 'scholar/search-web', status: 'completed', outputs: [{ data: { results: [] } }] }
    fetchMock.mockResolvedValueOnce(json(completed))
    const result = await runSandbaseModel(ctx, {
      toolName: 'web_search',
      model: 'scholar/search-web',
      input: { query: 'sandbase', max_num_results: 3, as_ylo: undefined, as_yhi: null, extra: '' },
    })
    expect(result).toEqual(completed)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.sandbase.ai/v1/run')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({ model: 'scholar/search-web', query: 'sandbase', max_num_results: 3 })
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer test-key')
  })

  it('keeps empty strings listed in keepEmpty', async () => {
    fetchMock.mockResolvedValueOnce(json({ id: 'r0', status: 'completed', outputs: [] }))
    await runSandbaseModel(ctx, {
      toolName: 'token_price',
      model: 'coingecko/simple-price',
      input: { symbols: 'btc,eth', ids: '', names: '', extra: '' },
      keepEmpty: ['ids', 'names'],
    })
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toEqual({ model: 'coingecko/simple-price', symbols: 'btc,eth', ids: '', names: '' })
  })
  it('polls a pending run until it completes', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ id: 'r2', status: 'pending', model: 'm' }, 202))
      .mockResolvedValueOnce(json({ id: 'r2', status: 'processing' }))
      .mockResolvedValueOnce(json({ id: 'r2', status: 'completed', outputs: [{ url: 'https://cdn/x.png' }] }))
    const result = await runSandbaseModel(ctx, { toolName: 't', model: 'm', input: {}, pollIntervalMs: 1 })
    expect(result.status).toBe('completed')
    expect(result.outputs?.[0]?.url).toBe('https://cdn/x.png')
    expect(fetchMock).toHaveBeenCalledTimes(3)
    const [pollUrl, pollInit] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(pollUrl).toBe('https://api.sandbase.ai/v1/run/r2')
    expect(pollInit.method).toBe('GET')
  })

  it('rejects with PluginError when the run fails', async () => {
    fetchMock
      .mockResolvedValueOnce(json({ id: 'r3', status: 'pending' }, 202))
      .mockResolvedValueOnce(json({ id: 'r3', status: 'failed', error: { message: 'bad prompt' } }))
    const error = await runSandbaseModel(ctx, { toolName: 't', model: 'm', pollIntervalMs: 1 }).catch(err => err)
    expect(error).toBeInstanceOf(PluginError)
    expect(error.code).toBe('UPSTREAM_ERROR')
    expect(error.message).toContain('bad prompt')
  })

  it('does not retry the submit on a 5xx', async () => {
    fetchMock.mockResolvedValue(new Response('boom', { status: 500 }))
    const error = await runSandbaseModel(ctx, { toolName: 't', model: 'm' }).catch(err => err)
    expect(error).toBeInstanceOf(PluginError)
    expect(error.statusCode).toBe(500)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns the pending run when the timeout elapses', async () => {
    fetchMock.mockImplementation(async () => json({ id: 'r4', status: 'pending', model: 'm' }))
    const result = await runSandbaseModel(ctx, { toolName: 't', model: 'm', timeoutMs: 30, pollIntervalMs: 10 })
    expect(result).toEqual({ id: 'r4', status: 'pending', model: 'm' })
  })
})

describe('sandbaseChat', () => {
  it('posts to /v1/chat/completions and returns content and reasoning', async () => {
    fetchMock.mockResolvedValueOnce(json({
      model: 'deepseek/deepseek-v4-pro',
      choices: [{ finish_reason: 'stop', message: { content: 'OK', reasoning_content: 'thinking' } }],
    }))
    const result = await sandbaseChat(ctx, {
      toolName: 'deepseek_chat',
      model: 'deepseek/deepseek-v4-pro',
      messages: [{ role: 'user', content: 'Reply OK' }],
      maxTokens: 16,
    })
    expect(result).toMatchObject({ content: 'OK', reasoning: 'thinking', finishReason: 'stop' })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://api.sandbase.ai/v1/chat/completions')
    expect(JSON.parse(String(init.body))).toMatchObject({ model: 'deepseek/deepseek-v4-pro', max_tokens: 16 })
  })
})

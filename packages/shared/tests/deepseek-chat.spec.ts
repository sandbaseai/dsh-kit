import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { apply } from '../../deepseek-chat/src/index.ts'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('deepseek-chat', () => {
  it('deepseek_chat calls /v1/chat/completions with the default model', async () => {
    vi.stubEnv('SANDBASE_API_KEY', 'test-key')
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: 'OK' } }] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const tools: Array<{ name: string; execute: (args: unknown, exec: unknown) => Promise<unknown> }> = []
    await apply({ get: () => undefined, tools: { register: (tool: (typeof tools)[number]) => { tools.push(tool) } } } as unknown as Context, {})
    const chat = tools.find(tool => tool.name === 'deepseek_chat')!
    await expect(chat.execute({ prompt: 'Reply OK' }, {})).resolves.toBe('OK')
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.sandbase.ai/v1/chat/completions')
    expect(JSON.parse(String(init.body)).model).toBe('deepseek/deepseek-v4-pro')
  })
})

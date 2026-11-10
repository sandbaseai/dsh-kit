import { afterEach, describe, expect, it, vi } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// Requires built bundles (`pnpm build` or `pnpm pack:plugins`), like loading.spec.ts.
const root = resolve(import.meta.dirname, '../..')
const directories = readdirSync(root).filter(name => name !== 'shared' && name !== 'dsh-store')

interface JsonSchemaProperty {
  type?: string
  enum?: unknown[]
  description?: string
}

interface RegisteredTool {
  name: string
  parameters: { properties?: Record<string, JsonSchemaProperty>; required?: string[] }
  execute: (args: unknown, exec: unknown) => Promise<unknown>
}

/** Build the smallest valid argument object from a tool's JSON schema. */
function sampleArgs(tool: RegisteredTool): Record<string, unknown> {
  const args: Record<string, unknown> = {}
  for (const key of tool.parameters.required ?? []) {
    const property = tool.parameters.properties?.[key] ?? {}
    if (property.enum?.length) args[key] = property.enum[0]
    else if (property.type === 'number' || property.type === 'integer') {
      const minimum = /Minimum (-?\d+(?:\.\d+)?)\./.exec(property.description ?? '')?.[1]
      args[key] = minimum !== undefined ? Number(minimum) : 1
    } else if (property.type === 'boolean') args[key] = true
    else args[key] = 'test'
  }
  return args
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('SandBase request mapping', () => {
  it.each(directories)('%s calls SandBase with POST and a model id', async name => {
    const src = readFileSync(resolve(root, name, 'src/index.ts'), 'utf8')
    // Packages without a SandBase mapping still use the legacy GET path (open decision).
    if (src.includes("client.get('/v1/run'")) return
    const endpoint = name === 'deepseek-chat' ? '/v1/chat/completions' : '/v1/run'

    vi.stubEnv('SANDBASE_API_KEY', 'test-key')
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ status: 'completed', outputs: [] }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const plugin = await import(pathToFileURL(resolve(root, name, 'lib/index.js')).href)
    const tools: RegisteredTool[] = []
    await plugin.apply({
      get: () => undefined,
      tools: { register: (tool: RegisteredTool) => { tools.push(tool) } },
    }, {})
    expect(tools.length).toBeGreaterThan(0)

    for (const tool of tools) {
      fetchMock.mockClear()
      await tool.execute(sampleArgs(tool), { signal: new AbortController().signal })
      expect(fetchMock).toHaveBeenCalled()
      const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
      expect(url).toBe(`https://api.sandbase.ai${endpoint}`)
      expect(init.method).toBe('POST')
      const body = JSON.parse(String(init.body))
      expect(typeof body.model).toBe('string')
      expect(body.model.length).toBeGreaterThan(0)
      expect(String(init.body)).not.toContain('test-key')
    }
  })
})

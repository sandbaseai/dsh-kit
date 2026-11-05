import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type {} from '@deepseek-ai/dsh-web'
import { defineTool, createFetchClient, resolveCredential, handleUpstreamError } from '@sandbaseai/dsh-plugin-shared'

export const name = 'dsh_plugin_google_maps_places'
export const inject = ['tools', 'web', 'systemPrompt'] as const

export interface Config {
  /** Prefix used to avoid collisions with host tools. */
  toolPrefix?: string
  enabled?: boolean
  timeoutMs?: number
}

export const Config: z<Config> = z.object({
  toolPrefix: z.string().default(''),
  enabled: z.boolean().default(true),
  timeoutMs: z.number().default(30000),
})

export function apply(ctx: Context, config: Config = {}) {
  if (config.enabled === false) return
  return (async () => {

    ctx.tools.register(defineTool({
      name: (config.toolPrefix ?? '') + 'google_maps_places',
      description: 'Search for places on Google Maps by name, type, or location.',
      parameters: {
        query: { type: 'string', required: true, description: 'Place name or type to search for.' },
        location: { type: 'string', description: 'Location to search near (city, address, or coordinates).' },
        maxResults: { type: 'number', description: 'Max results (default 20).', minimum: 1, maximum: 60 },
      },
      output: {
        schema: { type: 'string' },
        render: (_args, value) => [{ type: 'text', text: value }],
      },
      async execute(args, exec) {
        try {
          const apiKey = await resolveCredential(ctx, 'sandbase', 'api_key')
          const client = createFetchClient({
            baseUrl: 'https://api.sandbase.ai',
            timeoutMs: config.timeoutMs ?? 30000,
            defaultHeaders: { Authorization: `Bearer ${apiKey}` },
          })
          const params = new URLSearchParams()
          for (const [key, value] of Object.entries(args as Record<string, unknown>)) {
            if (value !== undefined && value !== null && value !== '') {
              params.append(key, String(value))
            }
          }
          const qs = params.toString()
          const data = await client.get('/v1/run' + (qs ? '?' + qs : ''), exec.signal)
          return JSON.stringify(data, null, 2)
        } catch (err) {
          handleUpstreamError(err, 'google_maps_places')
  throw new Error('unreachable')
        }
      },
    }))
  })()
}